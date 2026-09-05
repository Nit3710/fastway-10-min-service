package com.fastway.payment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRazorpayOrderRequest {
    @NotNull(message = "Order ID is required")
    private Long orderId;
}
