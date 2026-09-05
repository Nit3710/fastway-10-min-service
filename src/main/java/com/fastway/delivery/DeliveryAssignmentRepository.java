package com.fastway.delivery;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {
    Optional<DeliveryAssignment> findByOrderId(Long orderId);
    Page<DeliveryAssignment> findByDeliveryPartnerUserId(Long userId, Pageable pageable);
    Page<DeliveryAssignment> findByDeliveryPartnerUserIdAndStatus(Long userId, DeliveryAssignmentStatus status, Pageable pageable);
    
    // Check if delivery partner has any active assignments (not DELIVERED or CANCELLED)
    boolean existsByDeliveryPartnerUserIdAndStatusNotIn(Long userId, List<DeliveryAssignmentStatus> completedStatuses);
}
