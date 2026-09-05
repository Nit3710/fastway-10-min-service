package com.fastway.catalog;

import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;

public class ProductSpecifications {

    public static Specification<Product> hasCategory(Long categoryId) {
        return (root, query, criteriaBuilder) -> 
            categoryId == null ? null : criteriaBuilder.equal(root.get("category").get("id"), categoryId);
    }

    public static Specification<Product> hasBrand(Long brandId) {
        return (root, query, criteriaBuilder) -> 
            brandId == null ? null : criteriaBuilder.equal(root.get("brand").get("id"), brandId);
    }

    public static Specification<Product> priceGreaterThanOrEqual(BigDecimal minPrice) {
        return (root, query, criteriaBuilder) -> 
            minPrice == null ? null : criteriaBuilder.greaterThanOrEqualTo(root.get("price"), minPrice);
    }

    public static Specification<Product> priceLessThanOrEqual(BigDecimal maxPrice) {
        return (root, query, criteriaBuilder) -> 
            maxPrice == null ? null : criteriaBuilder.lessThanOrEqualTo(root.get("price"), maxPrice);
    }

    public static Specification<Product> searchByName(String search) {
        return (root, query, criteriaBuilder) -> {
            if (search == null || search.trim().isEmpty()) {
                return null;
            }
            String searchPattern = "%" + search.trim().toLowerCase() + "%";
            return criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), searchPattern);
        };
    }

    public static Specification<Product> isActive() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("isActive"), true);
    }
}
