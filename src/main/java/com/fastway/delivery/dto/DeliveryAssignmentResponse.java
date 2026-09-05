package com.fastway.delivery.dto;

import com.fastway.delivery.DeliveryAssignment;
import com.fastway.delivery.DeliveryAssignmentStatus;
import com.fastway.order.dto.AddressResponse;
import com.fastway.order.dto.OrderItemResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryAssignmentResponse {
    private Long id;
    private Long orderId;
    private Long deliveryPartnerId;
    private DeliveryAssignmentStatus status;
    private LocalDateTime assignedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime deliveredAt;
    private String customerName;
    private String customerPhone;
    private AddressResponse deliveryAddress;
    private List<OrderItemResponse> orderItems;

    public static DeliveryAssignmentResponse fromEntity(DeliveryAssignment assignment) {
        if (assignment == null) return null;
        
        List<OrderItemResponse> items = assignment.getOrder().getOrderItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getPriceAtPurchase())
                        .build())
                .collect(Collectors.toList());

        var addr = assignment.getOrder().getDeliveryAddress();
        AddressResponse addressResp = AddressResponse.builder()
                .id(addr.getId())
                .addressLine(addr.getAddressLine())
                .city(addr.getCity())
                .pincode(addr.getPincode())
                .latitude(addr.getLatitude())
                .longitude(addr.getLongitude())
                .build();

        return DeliveryAssignmentResponse.builder()
                .id(assignment.getId())
                .orderId(assignment.getOrder().getId())
                .deliveryPartnerId(assignment.getDeliveryPartner().getId())
                .status(assignment.getStatus())
                .assignedAt(assignment.getAssignedAt())
                .pickedUpAt(assignment.getPickedUpAt())
                .deliveredAt(assignment.getDeliveredAt())
                .customerName(assignment.getOrder().getUser().getName())
                .customerPhone(assignment.getOrder().getUser().getPhone())
                .deliveryAddress(addressResp)
                .orderItems(items)
                .build();
    }
}
