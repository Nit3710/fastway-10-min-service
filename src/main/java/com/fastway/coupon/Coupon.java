package com.fastway.coupon;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Coupon code is required")
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @NotNull(message = "Discount type is required")
    @Column(name = "discount_type", nullable = false, length = 20)
    private String discountType; // "PERCENTAGE" or "FLAT"

    @NotNull(message = "Discount value is required")
    @DecimalMin(value = "0.0", inclusive = false)
    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    @NotNull(message = "Minimum order value is required")
    @DecimalMin(value = "0.0", inclusive = true)
    @Column(name = "min_order_value", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal minOrderValue = BigDecimal.ZERO;

    @Column(name = "max_discount_amount", precision = 10, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;
}
