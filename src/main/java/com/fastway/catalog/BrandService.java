package com.fastway.catalog;

import com.fastway.catalog.dto.BrandRequest;
import com.fastway.catalog.dto.BrandResponse;
import com.fastway.common.security.TextSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;
    private final TextSanitizer textSanitizer;

    @Transactional(readOnly = true)
    public List<BrandResponse> getAllBrands() {
        return brandRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public BrandResponse createBrand(BrandRequest request) {
        if (brandRepository.findByName(request.getName()).isPresent()) {
            throw new IllegalArgumentException("Brand with name '" + request.getName() + "' already exists");
        }

        Brand brand = Brand.builder()
                .name(textSanitizer.clean(request.getName()))
                .logoUrl(request.getLogoUrl())
                .build();

        brand = brandRepository.save(brand);
        return convertToResponse(brand);
    }

    public BrandResponse convertToResponse(Brand brand) {
        if (brand == null) {
            return null;
        }
        return BrandResponse.builder()
                .id(brand.getId())
                .name(brand.getName())
                .logoUrl(brand.getLogoUrl())
                .build();
    }
}
