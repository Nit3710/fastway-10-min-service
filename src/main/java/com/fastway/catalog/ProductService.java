package com.fastway.catalog;

import com.fastway.catalog.dto.ProductRequest;
import com.fastway.catalog.dto.ProductResponse;
import com.fastway.catalog.dto.CategoryResponse;
import com.fastway.catalog.dto.BrandResponse;
import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.common.security.TextSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fastway.user.AddressRepository;
import com.fastway.warehouse.WarehouseService;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final TextSanitizer textSanitizer;
    private final AddressRepository addressRepository;
    private final WarehouseService warehouseService;

    @Cacheable(value = "products", key = "{#page, #size, #categoryId, #brandId, #minPrice, #maxPrice, #search, #addressId, #sortBy, #sortDir}")
    @Transactional(readOnly = true)
    public Page<ProductResponse> getFilteredProducts(
            int page,
            int size,
            Long categoryId,
            Long brandId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String search,
            Long addressId,
            String sortBy,
            String sortDir
    ) {
        // Whitelist sortable fields to prevent injection
        String safeSortBy = "price".equals(sortBy) ? "price" : "id";
        Sort sort = "asc".equalsIgnoreCase(sortDir)
                ? Sort.by(safeSortBy).ascending()
                : Sort.by(safeSortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<Product> spec = Specification.where(ProductSpecifications.isActive())
                .and(ProductSpecifications.hasCategory(categoryId))
                .and(ProductSpecifications.hasBrand(brandId))
                .and(ProductSpecifications.priceGreaterThanOrEqual(minPrice))
                .and(ProductSpecifications.priceLessThanOrEqual(maxPrice))
                .and(ProductSpecifications.searchByName(search));

        Page<Product> productPage = productRepository.findAll(spec, pageable);
        com.fastway.user.Address address = addressId == null ? null : addressRepository.findById(addressId).orElse(null);
        return productPage.map(p -> { ProductResponse r=convertToResponse(p); if(addressId!=null && !warehouseService.hasStock(p.getId(),address)) r.setStockQty(0); return r; });
    }

    @Cacheable(value = "products", key = "'id_' + #id")
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findWithCategoryAndBrandById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        if (!product.getIsActive()) {
            throw new ResourceNotFoundException("Product is inactive or deleted");
        }
        return convertToResponse(product);
    }

    @CacheEvict(value = "products", allEntries = true)
    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        String cleanSku = textSanitizer.clean(request.getSku());
        String cleanUnit = textSanitizer.clean(request.getUnit());
        if (productRepository.findBySku(cleanSku).isPresent()) {
            throw new IllegalArgumentException("Product with SKU '" + cleanSku + "' already exists");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getIsActive()) {
            throw new IllegalArgumentException("Category is inactive");
        }

        Brand brand = resolveBrand(request.getBrandId());

        Product product = Product.builder()
                .name(textSanitizer.clean(request.getName()))
                .description(textSanitizer.clean(request.getDescription()))
                .imageUrl(request.getImageUrl())
                .category(category)
                .brand(brand)
                .price(request.getPrice())
                .mrp(request.getMrp())
                .sku(cleanSku)
                .stockQty(request.getStockQty())
                .unit(cleanUnit)
                .build();

        product = productRepository.save(product);
        return convertToResponse(product);
    }

    @CacheEvict(value = "products", allEntries = true)
    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        if (!product.getIsActive()) {
            throw new IllegalArgumentException("Cannot update an inactive product");
        }

        String cleanSku = textSanitizer.clean(request.getSku());
        String cleanUnit = textSanitizer.clean(request.getUnit());
        if (!product.getSku().equals(cleanSku) && productRepository.findBySku(cleanSku).isPresent()) {
            throw new IllegalArgumentException("Product with SKU '" + cleanSku + "' already exists");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getIsActive()) {
            throw new IllegalArgumentException("Category is inactive");
        }

        Brand brand = resolveBrand(request.getBrandId());

        product.setName(textSanitizer.clean(request.getName()));
        product.setDescription(textSanitizer.clean(request.getDescription()));
        product.setImageUrl(request.getImageUrl());
        product.setCategory(category);
        product.setBrand(brand);
        product.setPrice(request.getPrice());
        product.setMrp(request.getMrp());
        product.setSku(cleanSku);
        product.setStockQty(request.getStockQty());
        product.setUnit(cleanUnit);

        product = productRepository.save(product);
        return convertToResponse(product);
    }

    private Brand resolveBrand(Long brandId) {
        if (brandId != null) {
            return brandRepository.findById(brandId)
                    .orElseThrow(() -> new ResourceNotFoundException("Brand not found"));
        }
        return brandRepository.findAll().stream().findFirst().orElse(null);
    }

    @CacheEvict(value = "products", allEntries = true)
    @Transactional
    public void softDeleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        if (!product.getIsActive()) {
            return;
        }
        product.setIsActive(false);
        productRepository.save(product);
    }

    private ProductResponse convertToResponse(Product product) {
        if (product == null) {
            return null;
        }
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .imageUrl(com.fastway.common.util.ImageUrlUtil.normalizeUrl(product.getImageUrl()))
                // Product rows only need direct category/brand fields. Avoid recursively
                // mapping Category.subCategories because that would add lazy queries per row.
                .category(CategoryResponse.builder()
                        .id(product.getCategory().getId())
                        .name(product.getCategory().getName())
                        .imageUrl(com.fastway.common.util.ImageUrlUtil.normalizeUrl(product.getCategory().getImageUrl()))
                        .parentCategoryId(product.getCategory().getParentCategory() == null ? null : product.getCategory().getParentCategory().getId())
                        .build())
                .brand(product.getBrand() == null ? null : BrandResponse.builder()
                        .id(product.getBrand().getId())
                        .name(product.getBrand().getName())
                        .logoUrl(com.fastway.common.util.ImageUrlUtil.normalizeUrl(product.getBrand().getLogoUrl()))
                        .build())
                .price(product.getPrice())
                .mrp(product.getMrp())
                .sku(product.getSku())
                .stockQty(product.getStockQty())
                .unit(product.getUnit())
                .isActive(product.getIsActive())
                .createdAt(product.getCreatedAt())
                .build();
    }
}
