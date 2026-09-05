package com.fastway.delivery;

import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.delivery.dto.DeliveryAssignmentResponse;
import com.fastway.order.Order;
import com.fastway.order.OrderRepository;
import com.fastway.order.OrderStatus;
import com.fastway.order.PaymentStatus;
import org.springframework.security.access.AccessDeniedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryServiceImpl implements DeliveryService {

    private final OrderRepository orderRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final FirebaseService firebaseService;
    private final com.fastway.notification.NotificationService notificationService;

    @Override
    @Transactional
    public DeliveryAssignmentResponse assignDelivery(Long orderId, Long deliveryPartnerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        DeliveryPartner partner = deliveryPartnerRepository.findById(deliveryPartnerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Delivery partner not found with id: " + deliveryPartnerId));

        Optional<DeliveryAssignment> existing = deliveryAssignmentRepository.findByOrderId(orderId);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Order already assigned to a partner");
        }

        // Set order status to CONFIRMED if it was PLACED
        if (order.getStatus() == OrderStatus.PLACED) {
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
            firebaseService.updateOrderStatus(order.getId(), OrderStatus.CONFIRMED.name(), order.getUser().getId(),
                    partner.getUser().getId());
        }

        DeliveryAssignment assignment = DeliveryAssignment.builder()
                .order(order)
                .deliveryPartner(partner)
                .status(DeliveryAssignmentStatus.ASSIGNED)
                .assignedAt(LocalDateTime.now())
                .build();

        DeliveryAssignment saved = deliveryAssignmentRepository.save(assignment);

        // Push assignment status to Firebase
        firebaseService.updateOrderStatus(order.getId(), OrderStatus.CONFIRMED.name(), order.getUser().getId(),
                partner.getUser().getId());

        // Notify delivery partner
        try {
            notificationService.sendToUser(
                    partner.getUser().getId(),
                    "New Order Assigned",
                    "You have been assigned order #FW-" + order.getId() + ". Tap to view details.",
                    "DELIVERY_ASSIGNMENT",
                    saved.getId());
        } catch (Exception e) {
            log.error("Failed to send partner assignment push: {}", e.getMessage());
        }

        return DeliveryAssignmentResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeliveryAssignmentResponse> getAssignmentsForPartner(Long userId, DeliveryAssignmentStatus status,
            int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("assignedAt").descending());
        Page<DeliveryAssignment> assignments;

        if (status != null) {
            assignments = deliveryAssignmentRepository.findByDeliveryPartnerUserIdAndStatus(userId, status, pageable);
        } else {
            assignments = deliveryAssignmentRepository.findByDeliveryPartnerUserId(userId, pageable);
        }

        return assignments.map(DeliveryAssignmentResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryAssignmentResponse getAssignmentDetails(Long userId, Long assignmentId) {
        DeliveryAssignment assignment = deliveryAssignmentRepository.findById(assignmentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Delivery assignment not found with id: " + assignmentId));

        if (!assignment.getDeliveryPartner().getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to view this assignment");
        }

        return DeliveryAssignmentResponse.fromEntity(assignment);
    }

    @Override
    @Transactional
    public DeliveryAssignmentResponse updateAssignmentStatus(Long userId, Long assignmentId,
            DeliveryAssignmentStatus nextStatus) {
        DeliveryAssignment assignment = deliveryAssignmentRepository.findById(assignmentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Delivery assignment not found with id: " + assignmentId));

        if (!assignment.getDeliveryPartner().getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to update this assignment");
        }

        DeliveryAssignmentStatus currentStatus = assignment.getStatus();

        // Enforce state transitions: ASSIGNED -> PICKED_UP -> OUT_FOR_DELIVERY ->
        // DELIVERED
        if (!isValidTransition(currentStatus, nextStatus)) {
            throw new IllegalArgumentException(
                    "Invalid assignment status transition from " + currentStatus + " to " + nextStatus);
        }

        assignment.setStatus(nextStatus);
        Order order = assignment.getOrder();

        if (nextStatus == DeliveryAssignmentStatus.PICKED_UP) {
            assignment.setPickedUpAt(LocalDateTime.now());
            order.setStatus(OrderStatus.PACKED);
        } else if (nextStatus == DeliveryAssignmentStatus.OUT_FOR_DELIVERY) {
            order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
        } else if (nextStatus == DeliveryAssignmentStatus.DELIVERED) {
            assignment.setDeliveredAt(LocalDateTime.now());
            order.setStatus(OrderStatus.DELIVERED);
            order.setPaymentStatus(PaymentStatus.PAID);
        } else if (nextStatus == DeliveryAssignmentStatus.CANCELLED) {
            order.setStatus(OrderStatus.CANCELLED);
        }

        orderRepository.save(order);
        DeliveryAssignment updated = deliveryAssignmentRepository.save(assignment);

        // Sync order status change to Firebase Realtime Database
        firebaseService.updateOrderStatus(order.getId(), order.getStatus().name(), order.getUser().getId(),
                assignment.getDeliveryPartner().getUser().getId());

        // Notify Customer about status transition
        try {
            if (nextStatus == DeliveryAssignmentStatus.OUT_FOR_DELIVERY) {
                notificationService.sendToUser(
                        order.getUser().getId(),
                        "Order Out for Delivery",
                        "Your order #FW-" + order.getId() + " is out for delivery. Our partner is on the way!",
                        "ORDER",
                        order.getId());
            } else if (nextStatus == DeliveryAssignmentStatus.DELIVERED) {
                notificationService.sendToUser(
                        order.getUser().getId(),
                        "Order Delivered",
                        "Your order #FW-" + order.getId() + " has been successfully delivered. Thank you!",
                        "ORDER",
                        order.getId());
            }
        } catch (Exception e) {
            log.error("Failed to send customer order status transition push: {}", e.getMessage());
        }

        return DeliveryAssignmentResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void updatePartnerLocation(Long userId, Double lat, Double lng) {
        DeliveryPartner partner = deliveryPartnerRepository.findByUserId(userId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Delivery partner details not found for user: " + userId));

        // Check if there is at least one active assignment (not DELIVERED or CANCELLED)
        List<DeliveryAssignmentStatus> completed = Arrays.asList(DeliveryAssignmentStatus.DELIVERED,
                DeliveryAssignmentStatus.CANCELLED);
        boolean hasActive = deliveryAssignmentRepository.existsByDeliveryPartnerUserIdAndStatusNotIn(userId, completed);

        if (!hasActive) {
            throw new IllegalArgumentException("Cannot update location: No active delivery assignments found.");
        }

        partner.setCurrentLat(lat);
        partner.setCurrentLng(lng);
        deliveryPartnerRepository.save(partner);

        // Write location to Firebase RTDB for all active assignments of this partner
        // Let's fetch all assignments and filter for active ones
        List<DeliveryAssignment> all = deliveryAssignmentRepository
                .findByDeliveryPartnerUserId(userId, Pageable.unpaged()).getContent();
        for (DeliveryAssignment ass : all) {
            if (!completed.contains(ass.getStatus())) {
                firebaseService.updateDeliveryLocation(ass.getOrder().getId(), lat, lng);
            }
        }
    }

    private boolean isValidTransition(DeliveryAssignmentStatus current, DeliveryAssignmentStatus next) {
        if (current == next)
            return true;
        if (current == DeliveryAssignmentStatus.DELIVERED || current == DeliveryAssignmentStatus.CANCELLED) {
            return false;
        }

        switch (current) {
            case ASSIGNED:
                return next == DeliveryAssignmentStatus.PICKED_UP || next == DeliveryAssignmentStatus.CANCELLED;
            case PICKED_UP:
                return next == DeliveryAssignmentStatus.OUT_FOR_DELIVERY || next == DeliveryAssignmentStatus.CANCELLED;
            case OUT_FOR_DELIVERY:
                return next == DeliveryAssignmentStatus.DELIVERED || next == DeliveryAssignmentStatus.CANCELLED;
            default:
                return false;
        }
    }
}
