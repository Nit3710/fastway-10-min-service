package com.fastway.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressResponse {
    private Long id;
    private String addressLine;
    private String city;
    private String pincode;
    private Double latitude;
    private Double longitude;
}
