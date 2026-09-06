package com.fastway.delivery;

import com.fastway.delivery.dto.DeliveryAssignmentResponse;
import org.springframework.data.domain.Page;

public interface DeliveryService {
    DeliveryAssignmentResponse assignDelivery(Long orderId, Long deliveryPartnerId);
    Page<DeliveryAssignmentResponse> getAssignmentsForPartner(Long userId, DeliveryAssignmentStatus status, int page, int size);
    DeliveryAssignmentResponse getAssignmentDetails(Long userId, Long assignmentId);
    DeliveryAssignmentResponse updateAssignmentStatus(Long userId, Long assignmentId, DeliveryAssignmentStatus nextStatus, String otp);
    void updatePartnerLocation(Long userId, Double lat, Double lng);
    void updateDutyStatus(Long userId, Boolean isAvailable);
    Boolean getDutyStatus(Long userId);
}
