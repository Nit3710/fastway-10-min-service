package com.fastway.order;

import com.fastway.cart.CartItem;
import com.fastway.cart.CartItemRepository;
import com.fastway.catalog.Product;
import com.fastway.catalog.ProductRepository;
import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.delivery.DeliveryAssignment;
import com.fastway.delivery.DeliveryAssignmentRepository;
import com.fastway.delivery.FirebaseService;
import com.fastway.order.dto.*;
import com.fastway.user.Address;
import com.fastway.user.AddressRepository;
import com.fastway.user.User;
import com.fastway.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import com.fastway.warehouse.WarehouseService;
import com.fastway.delivery.AutoAssignmentService;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final IdempotencyKeyRepository idempotencyKeyRepository;
    private final FirebaseService firebaseService;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final com.fastway.notification.NotificationService notificationService;
    private final com.fastway.notification.EmailNotificationService emailNotificationService;
    private final com.fastway.payment.PaymentService paymentService;
    private final WarehouseService warehouseService;
    private final AutoAssignmentService autoAssignmentService;
    private final com.fastway.coupon.CouponService couponService;

    @Transactional
    public OrderResponse placeOrder(Long userId, OrderRequest request, String idempotencyKey) {
        if (request.getPaymentMode() != PaymentMode.COD && request.getPaymentMode() != PaymentMode.ONLINE) {
            throw new IllegalArgumentException("Payment mode must be COD or ONLINE");
        }
        if (idempotencyKey != null && (idempotencyKey.isBlank() || idempotencyKey.length() > 100)) {
            throw new IllegalArgumentException("Idempotency-Key must be between 1 and 100 characters");
        }

        // Lock the user row to serialize idempotency-key checks for this user's concurrent retries.
        User user = userRepository.findByIdForOrder(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (idempotencyKey != null) {
            IdempotencyKey existing = idempotencyKeyRepository.findByUserIdAndKey(userId, idempotencyKey).orElse(null);
            if (existing != null) return convertToResponse(existing.getOrder());
        }
        // 1. Validate Address
        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
        if (!address.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Address does not belong to the authenticated user");
        }

        // 2. Fetch Cart Items
        List<CartItem> cartItems = cartItemRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new IllegalArgumentException("Cannot place order: Cart is empty");
        }

        WarehouseService.Reservation reservation = warehouseService.reserve(cartItems, address);

        // 3. Validate Stock & Calculate Total
        BigDecimal subTotal = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        Order order = Order.builder()
                .user(user)
                .deliveryAddress(address)
                .status(OrderStatus.PLACED)
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMode(request.getPaymentMode())
                .fulfillingWarehouse(reservation == null ? null : reservation.getWarehouse())
                .estimatedDeliveryMinutes(reservation == null ? null : reservation.getEtaMinutes())
                .build();

        // Lock products in a stable order to prevent overselling and reduce deadlock risk for multi-item carts.
        cartItems.sort(Comparator.comparing(item -> item.getProduct().getId()));
        for (CartItem cartItem : cartItems) {
            Product product = productRepository.findByIdForUpdate(cartItem.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            if (reservation == null && product.getStockQty() < cartItem.getQuantity()) {
                throw new IllegalArgumentException("Sorry, item '" + product.getName() + "' just sold out or has insufficient stock. Please review your cart and try again.");
            }

            // Decrement Stock
            if (reservation == null) { product.setStockQty(product.getStockQty() - cartItem.getQuantity()); productRepository.save(product); }

            // Calculate subtotal
            BigDecimal itemTotal = product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            subTotal = subTotal.add(itemTotal);

            // Create Order Item
            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(cartItem.getQuantity())
                    .priceAtPurchase(product.getPrice())
                    .build();
            orderItems.add(orderItem);
        }

        // Calculate delivery charge (50 flat, 0 if subtotal > 500)
        BigDecimal deliveryCharge = subTotal.compareTo(BigDecimal.valueOf(500)) > 0 ? BigDecimal.ZERO : BigDecimal.valueOf(50);
        BigDecimal discount = BigDecimal.ZERO;

        if (request.getCouponCode() != null && !request.getCouponCode().isBlank()) {
            com.fastway.coupon.Coupon coupon = couponService.getAndValidateCoupon(request.getCouponCode(), subTotal);
            discount = couponService.calculateDiscount(coupon, subTotal);
            order.setCouponCode(coupon.getCode());
        }

        BigDecimal totalAmount = subTotal.add(deliveryCharge).subtract(discount);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        // 3.5 Apply Loyalty Points Redemption (10 points = ₹1)
        int pointsDeducted = 0;
        if (Boolean.TRUE.equals(request.getUsePoints()) && user.getLoyaltyPoints() != null && user.getLoyaltyPoints() > 0) {
            int currentPoints = user.getLoyaltyPoints();
            BigDecimal pointsValue = BigDecimal.valueOf(currentPoints).divide(BigDecimal.valueOf(10), 2, java.math.RoundingMode.DOWN);
            
            if (totalAmount.compareTo(pointsValue) <= 0) {
                pointsDeducted = totalAmount.multiply(BigDecimal.valueOf(10)).intValue();
                totalAmount = BigDecimal.ZERO;
                user.setLoyaltyPoints(currentPoints - pointsDeducted);
            } else {
                pointsDeducted = currentPoints;
                totalAmount = totalAmount.subtract(pointsValue);
                user.setLoyaltyPoints(0);
            }
        }

        // Calculate Loyalty Points Earned (10% of final total amount)
        int pointsEarned = totalAmount.multiply(BigDecimal.valueOf(0.1)).intValue();
        user.setLoyaltyPoints((user.getLoyaltyPoints() != null ? user.getLoyaltyPoints() : 0) + pointsEarned);

        // Save updated user points
        userRepository.save(user);

        order.setOrderItems(orderItems);
        order.setDeliveryCharge(deliveryCharge);
        order.setDiscount(discount);
        order.setTotalAmount(totalAmount);
        order.setLoyaltyPointsDeducted(pointsDeducted);
        order.setLoyaltyPointsEarned(pointsEarned);

        // 4. Save Order
        order = orderRepository.save(order);
        if (request.getPaymentMode() == PaymentMode.COD) autoAssignmentService.tryAssign(order.getId());

        if (idempotencyKey != null) {
            idempotencyKeyRepository.save(IdempotencyKey.builder().user(user).key(idempotencyKey).order(order).build());
        }

        // 5. Clear user's cart
        cartItemRepository.deleteByUserId(userId);

        try {
            notificationService.sendToUser(
                order.getUser().getId(),
                "Order Placed Successfully",
                "Your order #FW-" + order.getId() + " of \u20B9" + order.getTotalAmount().setScale(0, java.math.RoundingMode.HALF_UP) + " has been placed.",
                "ORDER",
                order.getId()
            );
        } catch (Exception e) {
            log.error("Failed to send order placement push: {}", e.getMessage());
        }
        emailNotificationService.sendOrderPlaced(order);
        notificationService.sendToAdmins(
                "New order placed",
                "Order #FW-" + order.getId() + " was placed for \u20B9" + order.getTotalAmount(),
                "ORDER",
                order.getId()
        );

        return convertToResponse(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getUserOrders(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return orderRepository.findByUserId(userId, pageable).map(this::convertToResponse);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderDetails(Long orderId, Long userId, boolean isAdmin) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (!isAdmin && !order.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to view this order");
        }

        return convertToResponse(order);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, Long userId, boolean isAdmin) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (!isAdmin && !order.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to cancel this order");
        }

        if (order.getStatus() != OrderStatus.PLACED && order.getStatus() != OrderStatus.CONFIRMED) {
            throw new IllegalArgumentException("Order cannot be cancelled at status: " + order.getStatus());
        }

        // Restore stock in the same store that fulfilled the order; legacy orders use Product stock.
        if (order.getFulfillingWarehouse() != null) warehouseService.release(order.getOrderItems(), order.getFulfillingWarehouse());
        else for (OrderItem item : order.getOrderItems()) {
            Product product = productRepository.findByIdForUpdate(item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            product.setStockQty(product.getStockQty() + item.getQuantity());
            productRepository.save(product);
        }

        revertLoyaltyPoints(order);
        order.setStatus(OrderStatus.CANCELLED);
        boolean refundRequired = order.getPaymentMode() == PaymentMode.ONLINE
                && order.getPaymentStatus() == PaymentStatus.PAID;
        if (refundRequired) order.setPaymentStatus(PaymentStatus.REFUND_INITIATED);
        order = orderRepository.save(order);

        if (refundRequired) {
            try {
                paymentService.initiateRefund(orderId);
            } catch (Exception ex) {
                // Cancellation/stock restoration must succeed even if Razorpay is temporarily unavailable.
                log.error("Order {} cancelled but refund needs manual follow-up: {}", orderId, ex.getMessage());
                order.setPaymentStatus(PaymentStatus.REFUND_FAILED);
                orderRepository.save(order);
            }
        }

        // Sync to Firebase
        DeliveryAssignment assignment = deliveryAssignmentRepository.findByOrderId(orderId).orElse(null);
        Long partnerUserId = (assignment != null) ? assignment.getDeliveryPartner().getUser().getId() : null;
        firebaseService.updateOrderStatus(order.getId(), OrderStatus.CANCELLED.name(), order.getUser().getId(), partnerUserId);

        return convertToResponse(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> adminGetOrders(OrderStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (status != null) {
            return orderRepository.findByStatus(status, pageable).map(this::convertToResponse);
        }
        return orderRepository.findAll(pageable).map(this::convertToResponse);
    }

    @Transactional
    public OrderResponse adminUpdateStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        OrderStatus currentStatus = order.getStatus();

        // Enforce state transitions
        if (!isValidTransition(currentStatus, newStatus)) {
            throw new IllegalArgumentException("Invalid status transition from " + currentStatus + " to " + newStatus);
        }

        if (newStatus == OrderStatus.CANCELLED && currentStatus != OrderStatus.CANCELLED) {
            // Restore Stock
            if (order.getFulfillingWarehouse() != null) warehouseService.release(order.getOrderItems(), order.getFulfillingWarehouse());
            else for (OrderItem item : order.getOrderItems()) {
                Product product = productRepository.findByIdForUpdate(item.getProduct().getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
                product.setStockQty(product.getStockQty() + item.getQuantity());
                productRepository.save(product);
            }
            revertLoyaltyPoints(order);
        }

        boolean refundRequired = newStatus == OrderStatus.CANCELLED
                && order.getPaymentMode() == PaymentMode.ONLINE
                && order.getPaymentStatus() == PaymentStatus.PAID;
        if (refundRequired) order.setPaymentStatus(PaymentStatus.REFUND_INITIATED);

        if (newStatus == OrderStatus.DELIVERED) {
            order.setPaymentStatus(PaymentStatus.PAID);
        }

        order.setStatus(newStatus);
        order = orderRepository.save(order);

        if (refundRequired) {
            try {
                paymentService.initiateRefund(orderId);
            } catch (Exception ex) {
                log.error("Admin cancelled order {} but refund needs manual follow-up: {}", orderId, ex.getMessage());
                order.setPaymentStatus(PaymentStatus.REFUND_FAILED);
                orderRepository.save(order);
            }
        }

        // Sync to Firebase
        DeliveryAssignment assignment = deliveryAssignmentRepository.findByOrderId(orderId).orElse(null);
        Long partnerUserId = (assignment != null) ? assignment.getDeliveryPartner().getUser().getId() : null;
        firebaseService.updateOrderStatus(order.getId(), newStatus.name(), order.getUser().getId(), partnerUserId);

        // Trigger Notifications
        try {
            if (newStatus == OrderStatus.OUT_FOR_DELIVERY) {
                notificationService.sendToUser(
                    order.getUser().getId(),
                    "Order Out for Delivery",
                    "Your order #FW-" + order.getId() + " is out for delivery. Our partner is on the way!",
                    "ORDER",
                    order.getId()
                );
            } else if (newStatus == OrderStatus.DELIVERED) {
                notificationService.sendToUser(
                    order.getUser().getId(),
                    "Order Delivered",
                    "Your order #FW-" + order.getId() + " has been successfully delivered. Thank you!",
                    "ORDER",
                    order.getId()
                );
            }
        } catch (Exception e) {
            log.error("Failed to send order status transition push: {}", e.getMessage());
        }

        return convertToResponse(order);
    }

    private void revertLoyaltyPoints(Order order) {
        User user = order.getUser();
        int earned = order.getLoyaltyPointsEarned() != null ? order.getLoyaltyPointsEarned() : 0;
        int deducted = order.getLoyaltyPointsDeducted() != null ? order.getLoyaltyPointsDeducted() : 0;

        int currentPoints = user.getLoyaltyPoints() != null ? user.getLoyaltyPoints() : 0;
        int newPoints = Math.max(0, currentPoints - earned) + deducted;
        user.setLoyaltyPoints(newPoints);
        userRepository.save(user);

        order.setLoyaltyPointsEarned(0);
        order.setLoyaltyPointsDeducted(0);
    }

    private boolean isValidTransition(OrderStatus current, OrderStatus next) {
        if (current == next) return true;
        if (current == OrderStatus.DELIVERED || current == OrderStatus.CANCELLED) {
            return false;
        }

        switch (current) {
            case PLACED:
                return next == OrderStatus.CONFIRMED || next == OrderStatus.CANCELLED;
            case CONFIRMED:
                return next == OrderStatus.PACKED || next == OrderStatus.CANCELLED;
            case PACKED:
                return next == OrderStatus.OUT_FOR_DELIVERY || next == OrderStatus.CANCELLED;
            case OUT_FOR_DELIVERY:
                return next == OrderStatus.DELIVERED || next == OrderStatus.CANCELLED;
            default:
                return false;
        }
    }

    private OrderResponse convertToResponse(Order order) {
        List<OrderItemResponse> items = order.getOrderItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getPriceAtPurchase())
                        .build())
                .collect(Collectors.toList());

        Address address = order.getDeliveryAddress();
        AddressResponse addressResp = AddressResponse.builder()
                .id(address.getId())
                .addressLine(address.getAddressLine())
                .city(address.getCity())
                .pincode(address.getPincode())
                .latitude(address.getLatitude())
                .longitude(address.getLongitude())
                .build();

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .deliveryAddress(addressResp)
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .discount(order.getDiscount())
                .deliveryCharge(order.getDeliveryCharge())
                .paymentStatus(order.getPaymentStatus())
                .paymentMode(order.getPaymentMode())
                .createdAt(order.getCreatedAt())
                .items(items)
                .warehouseId(order.getFulfillingWarehouse() == null ? null : order.getFulfillingWarehouse().getId())
                .estimatedDeliveryMinutes(order.getEstimatedDeliveryMinutes())
                .couponCode(order.getCouponCode())
                .loyaltyPointsEarned(order.getLoyaltyPointsEarned())
                .loyaltyPointsDeducted(order.getLoyaltyPointsDeducted())
                .deliveryOtp(order.getDeliveryOtp())
                .build();
    }
}
