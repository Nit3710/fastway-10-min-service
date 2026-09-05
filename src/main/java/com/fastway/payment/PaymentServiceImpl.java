package com.fastway.payment;

import com.fastway.config.RazorpayConfig;
import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.order.Order;
import com.fastway.order.OrderRepository;
import com.fastway.order.OrderStatus;
import com.fastway.order.PaymentMode;
import com.fastway.order.PaymentStatus;
import com.fastway.payment.dto.PaymentVerificationRequest;
import com.fastway.payment.dto.RazorpayOrderResponse;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final RazorpayClient razorpayClient;
    private final RazorpayConfig razorpayConfig;
    private final com.fastway.notification.NotificationService notificationService;
    private final com.fastway.notification.EmailNotificationService emailNotificationService;
    private final com.fastway.delivery.AutoAssignmentService autoAssignmentService;

    @Override
    @Transactional
    public RazorpayOrderResponse createRazorpayOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (order.getPaymentMode() != PaymentMode.ONLINE) {
            throw new IllegalArgumentException("Order payment mode is not ONLINE");
        }

        if (order.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("Order is already paid");
        }

        try {
            JSONObject orderRequest = new JSONObject();
            // Convert to paise (e.g. 10.00 INR -> 1000 paise)
            int amountInPaise = order.getTotalAmount().multiply(new BigDecimal(100)).intValue();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "order_rcpt_" + orderId);

            com.razorpay.Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            String razorpayOrderId = razorpayOrder.get("id");

            // Persist the transaction details
            Payment payment = Payment.builder()
                    .order(order)
                    .razorpayOrderId(razorpayOrderId)
                    .amount(order.getTotalAmount())
                    .status(PaymentGatewayStatus.CREATED)
                    .build();
            paymentRepository.save(payment);

            return RazorpayOrderResponse.builder()
                    .razorpayOrderId(razorpayOrderId)
                    .amount(order.getTotalAmount())
                    .currency("INR")
                    .razorpayKeyId(razorpayConfig.getKeyId())
                    .build();

        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for order ID {}: {}", orderId, e.getMessage());
            throw new IllegalArgumentException("Failed to create payment gateway order: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void verifyPayment(PaymentVerificationRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + request.getOrderId()));

        Payment payment = paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment record not found for Razorpay order: " + request.getRazorpayOrderId()));

        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", request.getRazorpayOrderId());
            attributes.put("razorpay_payment_id", request.getRazorpayPaymentId());
            attributes.put("razorpay_signature", request.getRazorpaySignature());

            boolean isSignatureValid = com.razorpay.Utils.verifyPaymentSignature(attributes, razorpayConfig.getKeySecret());

            if (!isSignatureValid) {
                payment.setStatus(PaymentGatewayStatus.FAILED);
                paymentRepository.save(payment);
                try {
                    notificationService.sendToUser(
                        order.getUser().getId(),
                        "Payment Failed",
                        "The payment transaction for your order #FW-" + order.getId() + " has failed. Please try again.",
                        "ORDER",
                        order.getId()
                    );
                } catch (Exception ex) {
                    log.error("Failed to send payment failure push: {}", ex.getMessage());
                }
                emailNotificationService.sendPaymentUpdate(order, false);
                notificationService.sendToAdmins("Payment failed", "Payment failed for order #FW-" + order.getId(), "PAYMENT", order.getId());
                throw new IllegalArgumentException("Invalid signature. Payment verification failed.");
            }

            // Verification Success
            payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
            payment.setRazorpaySignature(request.getRazorpaySignature());
            payment.setStatus(PaymentGatewayStatus.PAID);
            paymentRepository.save(payment);

            // Update order payment status to PAID and status to CONFIRMED
            order.setPaymentStatus(PaymentStatus.PAID);
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
            autoAssignmentService.tryAssign(order.getId());

            try {
                notificationService.sendToUser(
                    order.getUser().getId(),
                    "Payment Successful",
                    "Thank you! The payment for your order #FW-" + order.getId() + " was successful.",
                    "ORDER",
                    order.getId()
                );
            } catch (Exception ex) {
                log.error("Failed to send payment success push: {}", ex.getMessage());
            }
            emailNotificationService.sendPaymentUpdate(order, true);
            notificationService.sendToAdmins("Payment received", "Payment received for order #FW-" + order.getId(), "PAYMENT", order.getId());

        } catch (RazorpayException e) {
            payment.setStatus(PaymentGatewayStatus.FAILED);
            paymentRepository.save(payment);
            try {
                notificationService.sendToUser(
                    order.getUser().getId(),
                    "Payment Failed",
                    "The payment transaction for your order #FW-" + order.getId() + " has failed. Please try again.",
                    "ORDER",
                    order.getId()
                );
            } catch (Exception ex) {
                log.error("Failed to send payment failure push: {}", ex.getMessage());
            }
            emailNotificationService.sendPaymentUpdate(order, false);
            notificationService.sendToAdmins("Payment verification failed", "Payment verification failed for order #FW-" + order.getId(), "PAYMENT", order.getId());
            throw new IllegalArgumentException("Signature verification failed: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public void initiateRefund(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment record not found for order: " + orderId));
        if (order.getPaymentStatus() == PaymentStatus.REFUNDED || payment.getStatus() == PaymentGatewayStatus.REFUNDED) return;
        if (payment.getRazorpayPaymentId() == null || payment.getRazorpayPaymentId().isBlank()) {
            throw new IllegalArgumentException("Paid order has no Razorpay payment id");
        }
        try {
            JSONObject request = new JSONObject();
            request.put("amount", payment.getAmount().multiply(new BigDecimal("100")).intValueExact());
            request.put("speed", "normal");
            razorpayClient.payments.refund(payment.getRazorpayPaymentId(), request);
            // Razorpay has accepted the request; refund.processed changes this to REFUNDED.
            payment.setStatus(PaymentGatewayStatus.REFUND_INITIATED);
            paymentRepository.save(payment);
            log.info("Refund initiated for order {} payment {}", orderId, payment.getRazorpayPaymentId());
        } catch (RazorpayException | ArithmeticException ex) {
            log.error("Refund API failed for order {} payment {}: {}", orderId, payment.getRazorpayPaymentId(), ex.getMessage());
            payment.setStatus(PaymentGatewayStatus.REFUND_FAILED);
            paymentRepository.save(payment);
            throw new IllegalStateException("Razorpay refund could not be initiated", ex);
        }
    }

    @Override
    @Transactional
    public void handleWebhook(String event, String payload) {
        JSONObject root = new JSONObject(payload);
        JSONObject payloadObject = root.optJSONObject("payload");
        JSONObject wrapper = payloadObject == null ? null : payloadObject.optJSONObject(event.startsWith("refund.") ? "refund" : "payment");
        JSONObject entity = wrapper == null ? null : wrapper.optJSONObject("entity");
        if (entity == null) { log.warn("Ignoring {} webhook: entity missing", event); return; }
        String paymentId = entity.optString("payment_id", entity.optString("id", null));
        String orderId = entity.optString("order_id", null);
        Payment payment = paymentId == null ? null : paymentRepository.findByRazorpayPaymentId(paymentId).orElse(null);
        if (payment == null && orderId != null) payment = paymentRepository.findByRazorpayOrderId(orderId).orElse(null);
        if (payment == null) { log.warn("Ignoring {} webhook: payment not found (paymentId={}, orderId={})", event, paymentId, orderId); return; }
        Order order = payment.getOrder();
        if ("payment.captured".equals(event)) {
            if (payment.getStatus() == PaymentGatewayStatus.PAID && order.getPaymentStatus() == PaymentStatus.PAID) return;
            if (paymentId != null) payment.setRazorpayPaymentId(paymentId);
            payment.setStatus(PaymentGatewayStatus.PAID); order.setPaymentStatus(PaymentStatus.PAID); order.setStatus(OrderStatus.CONFIRMED);
        } else if ("payment.failed".equals(event)) {
            if (payment.getStatus() == PaymentGatewayStatus.FAILED) return;
            payment.setStatus(PaymentGatewayStatus.FAILED);
        } else if ("refund.processed".equals(event)) {
            if (payment.getStatus() == PaymentGatewayStatus.REFUNDED && order.getPaymentStatus() == PaymentStatus.REFUNDED) return;
            payment.setStatus(PaymentGatewayStatus.REFUNDED); order.setPaymentStatus(PaymentStatus.REFUNDED);
        } else { log.info("Ignoring unsupported Razorpay webhook event {}", event); return; }
        paymentRepository.save(payment); orderRepository.save(order);
        if ("payment.captured".equals(event)) autoAssignmentService.tryAssign(order.getId());
        log.info("Processed {} webhook for order {} payment {}", event, order.getId(), paymentId);
    }
}
