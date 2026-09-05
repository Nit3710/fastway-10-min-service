package com.fastway.delivery;

import com.fastway.common.dto.ApiResponse;
import com.fastway.delivery.dto.AssignDeliveryRequest;
import com.fastway.delivery.dto.DeliveryAssignmentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDeliveryController {

    private final DeliveryService deliveryService;

    @PostMapping("/{id}/assign-delivery")
    public ResponseEntity<ApiResponse<DeliveryAssignmentResponse>> assignDelivery(
            @PathVariable Long id,
            @Valid @RequestBody AssignDeliveryRequest request
    ) {
        DeliveryAssignmentResponse response = deliveryService.assignDelivery(id, request.getDeliveryPartnerId());
        return new ResponseEntity<>(ApiResponse.success(response, "Delivery assigned successfully"), HttpStatus.CREATED);
    }
}
