package com.fastway.delivery.dto;

import com.fastway.delivery.DeliveryAssignmentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StatusUpdateRequest {
    @NotNull(message = "Status is required")
    private DeliveryAssignmentStatus status;
}
