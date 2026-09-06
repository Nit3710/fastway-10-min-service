package com.fastway.order;

import com.fastway.user.Address;
import com.fastway.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.fastway.warehouse.Warehouse;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull(message = "User is required")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_address_id", nullable = false)
    @NotNull(message = "Delivery address is required")
    private Address deliveryAddress;

    @NotNull(message = "Order status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status;

    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.0", inclusive = true)
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @NotNull(message = "Discount is required")
    @DecimalMin(value = "0.0", inclusive = true)
    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @NotNull(message = "Delivery charge is required")
    @DecimalMin(value = "0.0", inclusive = true)
    @Column(name = "delivery_charge", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal deliveryCharge = BigDecimal.ZERO;

    @NotNull(message = "Payment status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    private PaymentStatus paymentStatus;

    @NotNull(message = "Payment mode is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode", nullable = false, length = 30)
    private PaymentMode paymentMode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse fulfillingWarehouse;

    @Column(name = "estimated_delivery_minutes")
    private Integer estimatedDeliveryMinutes;

    @Column(name = "coupon_code", length = 50)
    private String couponCode;

    @Column(name = "loyalty_points_earned", nullable = false)
    @Builder.Default
    private Integer loyaltyPointsEarned = 0;

    @Column(name = "loyalty_points_deducted", nullable = false)
    @Builder.Default
    private Integer loyaltyPointsDeducted = 0;

    @Column(name = "delivery_otp", length = 6)
    private String deliveryOtp;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> orderItems = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.deliveryOtp == null || this.deliveryOtp.isBlank()) {
            this.deliveryOtp = String.format("%04d", new java.util.Random().nextInt(10000));
        }
    }
}
