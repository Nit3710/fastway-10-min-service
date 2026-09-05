package com.fastway.address.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceabilityResponse {
    private String pincode;
    private boolean serviceable;
    private BigDecimal deliveryCharge;
}
