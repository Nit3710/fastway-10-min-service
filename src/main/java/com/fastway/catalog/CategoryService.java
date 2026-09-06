package com.fastway.catalog;

import com.fastway.catalog.dto.CategoryRequest;
import com.fastway.catalog.dto.CategoryResponse;
import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.common.security.TextSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final TextSanitizer textSanitizer;

    @Cacheable(value = "categories")
    @Transactional(readOnly = true)
    public List<CategoryResponse> getActiveCategoriesTree() {
        List<Category> rootCategories = categoryRepository.findByParentCategoryIsNullAndIsActiveTrue();
        return rootCategories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @CacheEvict(value = "categories", allEntries = true)
    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        Category parent = null;
        if (request.getParentCategoryId() != null) {
            parent = categoryRepository.findById(request.getParentCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found"));
            if (!parent.getIsActive()) {
                throw new IllegalArgumentException("Parent category is inactive");
            }
        }

        Category category = Category.builder()
                .name(textSanitizer.clean(request.getName()))
                .imageUrl(request.getImageUrl())
                .parentCategory(parent)
                .build();

        category = categoryRepository.save(category);
        return convertToResponse(category);
    }

    @CacheEvict(value = "categories", allEntries = true)
    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getIsActive()) {
            throw new IllegalArgumentException("Cannot update an inactive category");
        }

        category.setName(textSanitizer.clean(request.getName()));
        category.setImageUrl(request.getImageUrl());

        if (request.getParentCategoryId() != null) {
            if (request.getParentCategoryId().equals(id)) {
                throw new IllegalArgumentException("Category cannot be its own parent");
            }
            Category parent = categoryRepository.findById(request.getParentCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found"));
            if (!parent.getIsActive()) {
                throw new IllegalArgumentException("Parent category is inactive");
            }
            category.setParentCategory(parent);
        } else {
            category.setParentCategory(null);
        }

        category = categoryRepository.save(category);
        return convertToResponse(category);
    }

    @CacheEvict(value = "categories", allEntries = true)
    @Transactional
    public void softDeleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getIsActive()) {
            return;
        }

        category.setIsActive(false);
        categoryRepository.save(category);

        softDeleteSubcategories(category);
    }

    private void softDeleteSubcategories(Category parent) {
        for (Category sub : parent.getSubCategories()) {
            if (sub.getIsActive()) {
                sub.setIsActive(false);
                categoryRepository.save(sub);
                softDeleteSubcategories(sub);
            }
        }
    }

    public CategoryResponse convertToResponse(Category category) {
        if (category == null) {
            return null;
        }

        List<CategoryResponse> subResponses = category.getSubCategories().stream()
                .filter(Category::getIsActive)
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .imageUrl(com.fastway.common.util.ImageUrlUtil.normalizeUrl(category.getImageUrl()))
                .parentCategoryId(category.getParentCategory() != null ? category.getParentCategory().getId() : null)
                .subCategories(subResponses)
                .build();
    }
}
