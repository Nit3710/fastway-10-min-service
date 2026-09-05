package com.fastway.coupon;

import com.fastway.common.dto.ApiResponse;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<CouponValidationResponse>> validateCoupon(
            @RequestParam String code,
            @RequestParam BigDecimal subTotal
    ) {
        Coupon coupon = couponService.getAndValidateCoupon(code, subTotal);
        BigDecimal discount = couponService.calculateDiscount(coupon, subTotal);

        CouponValidationResponse response = CouponValidationResponse.builder()
                .code(coupon.getCode())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .discountAmount(discount)
                .minOrderValue(coupon.getMinOrderValue())
                .maxDiscountAmount(coupon.getMaxDiscountAmount())
                .build();

        return ResponseEntity.ok(ApiResponse.success(response, "Coupon applied successfully"));
    }

    @Data
    @Builder
    public static class CouponValidationResponse {
        private String code;
        private String discountType;
        private BigDecimal discountValue;
        private BigDecimal discountAmount;
        private BigDecimal minOrderValue;
        private BigDecimal maxDiscountAmount;
    }
}
