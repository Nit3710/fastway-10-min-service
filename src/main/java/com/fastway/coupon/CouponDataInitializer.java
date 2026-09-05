package com.fastway.coupon;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CouponDataInitializer implements CommandLineRunner {

    private final CouponRepository repository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() == 0) {
            log.info("Seeding initial promo coupons...");
            List<Coupon> seeds = Arrays.asList(
                    Coupon.builder()
                            .code("WELCOME50")
                            .discountType("FLAT")
                            .discountValue(new BigDecimal("50.00"))
                            .minOrderValue(new BigDecimal("150.00"))
                            .isActive(true)
                            .expiryDate(LocalDateTime.now().plusMonths(12))
                            .build(),
                    Coupon.builder()
                            .code("FAST100")
                            .discountType("FLAT")
                            .discountValue(new BigDecimal("100.00"))
                            .minOrderValue(new BigDecimal("500.00"))
                            .isActive(true)
                            .expiryDate(LocalDateTime.now().plusMonths(12))
                            .build(),
                    Coupon.builder()
                            .code("SAVE20")
                            .discountType("PERCENTAGE")
                            .discountValue(new BigDecimal("20.00"))
                            .minOrderValue(new BigDecimal("200.00"))
                            .maxDiscountAmount(new BigDecimal("80.00"))
                            .isActive(true)
                            .expiryDate(LocalDateTime.now().plusMonths(12))
                            .build()
            );
            repository.saveAll(seeds);
            log.info("Successfully seeded {} initial promo coupons.", seeds.size());
        }
    }
}
