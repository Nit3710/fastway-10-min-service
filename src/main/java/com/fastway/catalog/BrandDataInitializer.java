package com.fastway.catalog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BrandDataInitializer implements CommandLineRunner {

    private final BrandRepository brandRepository;

    @Override
    public void run(String... args) throws Exception {
        if (brandRepository.count() == 0) {
            log.info("Seeding default hardware and sanitary brands...");
            List<String> defaultBrands = List.of(
                    "Generic / Unbranded",
                    "Supreme",
                    "Astral Pipes",
                    "Finolex",
                    "Ashirvad Pipes",
                    "Jaquar",
                    "Hindware",
                    "Cera",
                    "Havells",
                    "Anchor by Panasonic",
                    "Asian Paints",
                    "Berger Paints",
                    "Godrej Locks"
            );

            for (String brandName : defaultBrands) {
                brandRepository.save(Brand.builder()
                        .name(brandName)
                        .logoUrl("")
                        .build());
            }
            log.info("Successfully seeded {} default brands.", defaultBrands.size());
        }
    }
}
