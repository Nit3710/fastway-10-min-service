package com.fastway.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByNameAndIsActiveTrue(String name);
    List<Category> findByParentCategoryIsNullAndIsActiveTrue(); // Get active root categories
    List<Category> findAllByIsActiveTrue();
}
