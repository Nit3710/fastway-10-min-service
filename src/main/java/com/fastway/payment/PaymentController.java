package com.fastway.payment;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fastway.common.dto.ApiResponse;
import com.fastway.config.RazorpayConfig;
import com.fastway.payment.dto.PaymentVerificationRequest;
import com.fastway.payment.dto.RazorpayOrderResponse;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import com.razorpay.Utils;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final RazorpayConfig razorpayConfig;

    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<RazorpayOrderResponse>> createPaymentOrder(
            @Valid @RequestBody CreateOrderRequest request
    ) {
        RazorpayOrderResponse response = paymentService.createRazorpayOrder(request.getOrderId());
        return ResponseEntity.ok(ApiResponse.success(response, "Payment gateway order created successfully"));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Void>> verifyPayment(
            @Valid @RequestBody PaymentVerificationRequest request
    ) {
        paymentService.verifyPayment(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Payment verified and order confirmed successfully"));
    }

    /**
     * Configure Razorpay Dashboard -> Account & Settings -> Webhooks with
     * https://your-domain/api/payments/webhook (use an ngrok HTTPS URL locally).
     * This endpoint is public only because Razorpay authenticates it with the
     * X-Razorpay-Signature HMAC; it is not callable as a normal app endpoint.
     */
    @PostMapping("/webhook")
    public ResponseEntity<ApiResponse<Void>> webhook(
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestBody String payload
    ) {
        try {
            if (signature == null || !Utils.verifyWebhookSignature(payload, signature, razorpayConfig.getWebhookSecret())) {
                log.warn("Rejected Razorpay webhook because signature verification failed");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Invalid webhook signature"));
            }
            org.json.JSONObject json = new org.json.JSONObject(payload);
            paymentService.handleWebhook(json.optString("event", ""), payload);
            return ResponseEntity.ok(ApiResponse.success(null, "Webhook processed"));
        } catch (Exception ex) {
            // Do not expose secrets or the full signature in logs/responses.
            log.warn("Rejected malformed Razorpay webhook payload: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Invalid webhook payload"));
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateOrderRequest {
        @JsonProperty("order_id")
        private Long orderId;
    }
}
