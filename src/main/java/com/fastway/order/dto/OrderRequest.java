package com.fastway.order.dto;

import com.fastway.order.PaymentMode;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequest {

    @NotNull(message = "Address ID is required")
    private Long addressId;

    @NotNull(message = "Payment mode is required")
    private PaymentMode paymentMode;

    private String couponCode;

    private Boolean usePoints;
}
