package com.fastway.order.dto;

import com.fastway.order.OrderStatus;
import com.fastway.order.PaymentMode;
import com.fastway.order.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {
    private Long id;
    private Long userId;
    private AddressResponse deliveryAddress;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private BigDecimal discount;
    private BigDecimal deliveryCharge;
    private PaymentStatus paymentStatus;
    private PaymentMode paymentMode;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;
    private Long warehouseId;
    private Integer estimatedDeliveryMinutes;
    private String couponCode;
    private Integer loyaltyPointsEarned;
    private Integer loyaltyPointsDeducted;
    private String deliveryOtp;
}
