package com.fastway.address;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ServiceablePincodeDataInitializer implements CommandLineRunner {

    private final ServiceablePincodeRepository repository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() == 0) {
            log.info("Seeding serviceable pincodes...");
            List<ServiceablePincode> seeds = Arrays.asList(
                    ServiceablePincode.builder().pincode("110001").deliveryCharge(new BigDecimal("50.00")).isActive(true).build(),
                    ServiceablePincode.builder().pincode("400001").deliveryCharge(new BigDecimal("60.00")).isActive(true).build(),
                    ServiceablePincode.builder().pincode("560001").deliveryCharge(new BigDecimal("40.00")).isActive(true).build(),
                    ServiceablePincode.builder().pincode("700001").deliveryCharge(new BigDecimal("45.00")).isActive(true).build()
            );
            repository.saveAll(seeds);
            log.info("Successfully seeded {} serviceable pincodes.", seeds.size());
        }
    }
}
