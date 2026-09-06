package com.fastway.delivery;

import com.fastway.config.CustomUserDetails;
import com.fastway.common.dto.ApiResponse;
import com.fastway.delivery.dto.DeliveryAssignmentResponse;
import com.fastway.delivery.dto.LocationRequest;
import com.fastway.delivery.dto.StatusUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DELIVERY_PARTNER')")
public class DeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping("/assignments")
    public ResponseEntity<ApiResponse<Page<DeliveryAssignmentResponse>>> getMyAssignments(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) DeliveryAssignmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<DeliveryAssignmentResponse> response = deliveryService.getAssignmentsForPartner(
                userDetails.getUser().getId(), status, page, size
        );
        return ResponseEntity.ok(ApiResponse.success(response, "Assignments retrieved successfully"));
    }

    @GetMapping("/assignments/{id}")
    public ResponseEntity<ApiResponse<DeliveryAssignmentResponse>> getAssignmentDetails(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        DeliveryAssignmentResponse response = deliveryService.getAssignmentDetails(
                userDetails.getUser().getId(), id
        );
        return ResponseEntity.ok(ApiResponse.success(response, "Assignment details retrieved successfully"));
    }

    @PutMapping("/assignments/{id}/status")
    public ResponseEntity<ApiResponse<DeliveryAssignmentResponse>> updateAssignmentStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        DeliveryAssignmentResponse response = deliveryService.updateAssignmentStatus(
                userDetails.getUser().getId(), id, request.getStatus(), request.getOtp()
        );
        return ResponseEntity.ok(ApiResponse.success(response, "Assignment status updated successfully"));
    }

    @GetMapping("/duty-status")
    public ResponseEntity<ApiResponse<Boolean>> getDutyStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Boolean status = deliveryService.getDutyStatus(userDetails.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success(status, "Duty status retrieved successfully"));
    }

    @PutMapping("/duty-status")
    public ResponseEntity<ApiResponse<Boolean>> updateDutyStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam Boolean isAvailable
    ) {
        deliveryService.updateDutyStatus(userDetails.getUser().getId(), isAvailable);
        return ResponseEntity.ok(ApiResponse.success(isAvailable, "Duty status updated successfully"));
    }

    @PutMapping("/location")
    public ResponseEntity<ApiResponse<Void>> updateLocation(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody LocationRequest request
    ) {
        deliveryService.updatePartnerLocation(
                userDetails.getUser().getId(), request.getLat(), request.getLng()
        );
        return ResponseEntity.ok(ApiResponse.success(null, "Location updated successfully"));
    }
}
