package com.fastway.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductResponse {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private CategoryResponse category;
    private BrandResponse brand;
    private BigDecimal price;
    private BigDecimal mrp;
    private String sku;
    private Integer stockQty;
    private String unit;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
