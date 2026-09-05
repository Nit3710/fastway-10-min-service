package com.fastway.payment;

import com.fastway.payment.dto.PaymentVerificationRequest;
import com.fastway.payment.dto.RazorpayOrderResponse;

public interface PaymentService {
    RazorpayOrderResponse createRazorpayOrder(Long orderId);
    void verifyPayment(PaymentVerificationRequest request);
    /** Starts a full refund for the payment belonging to an order. */
    void initiateRefund(Long orderId);
    /** Processes Razorpay webhook payload after its signature has been verified. */
    void handleWebhook(String event, String payload);
}
