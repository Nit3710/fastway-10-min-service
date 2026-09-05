package com.fastway.delivery.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignDeliveryRequest {
    @NotNull(message = "Delivery partner ID is required")
    @JsonProperty("delivery_partner_id")
    private Long deliveryPartnerId;
}
