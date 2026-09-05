package com.fastway.coupon;

import com.fastway.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CouponService {

    private final CouponRepository couponRepository;

    public Coupon getAndValidateCoupon(String code, BigDecimal subTotal) {
        Coupon coupon = couponRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon code '" + code + "' not found"));

        if (!coupon.isActive()) {
            throw new IllegalArgumentException("Coupon code '" + code + "' is no longer active");
        }

        if (coupon.getExpiryDate() != null && coupon.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Coupon code '" + code + "' has expired");
        }

        if (subTotal.compareTo(coupon.getMinOrderValue()) < 0) {
            throw new IllegalArgumentException("Minimum order value to apply this coupon is Rs. " + coupon.getMinOrderValue().setScale(0, RoundingMode.HALF_UP));
        }

        return coupon;
    }

    public BigDecimal calculateDiscount(Coupon coupon, BigDecimal subTotal) {
        BigDecimal discount = BigDecimal.ZERO;

        if ("FLAT".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = coupon.getDiscountValue();
        } else if ("PERCENTAGE".equalsIgnoreCase(coupon.getDiscountType())) {
            BigDecimal factor = coupon.getDiscountValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            discount = subTotal.multiply(factor);

            if (coupon.getMaxDiscountAmount() != null && discount.compareTo(coupon.getMaxDiscountAmount()) > 0) {
                discount = coupon.getMaxDiscountAmount();
            }
        }

        // Discount cannot be greater than subtotal
        if (discount.compareTo(subTotal) > 0) {
            discount = subTotal;
        }

        return discount.setScale(2, RoundingMode.HALF_UP);
    }
}
