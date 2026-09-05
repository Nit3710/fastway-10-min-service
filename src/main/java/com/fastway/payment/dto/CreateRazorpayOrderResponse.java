package com.fastway.payment.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CreateRazorpayOrderResponse {
    String razorpayOrderId;
    long amount;
    String currency;
    String razorpayKeyId;
}
