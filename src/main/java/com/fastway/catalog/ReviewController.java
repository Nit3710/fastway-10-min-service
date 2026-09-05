package com.fastway.catalog;

import com.fastway.common.dto.ApiResponse;
import com.fastway.config.CustomUserDetails;
import com.fastway.catalog.dto.ProductRatingStats;
import com.fastway.catalog.dto.ReviewRequest;
import com.fastway.catalog.dto.ReviewResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getProductReviews(
            @PathVariable Long productId
    ) {
        List<ReviewResponse> reviews = reviewService.getReviewsByProduct(productId);
        return ResponseEntity.ok(ApiResponse.success(reviews, "Reviews retrieved successfully"));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<ProductRatingStats>> getProductRatingStats(
            @PathVariable Long productId
    ) {
        ProductRatingStats stats = reviewService.getProductRatingStats(productId);
        return ResponseEntity.ok(ApiResponse.success(stats, "Rating stats retrieved successfully"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> addProductReview(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productId,
            @Valid @RequestBody ReviewRequest request
    ) {
        ReviewResponse review = reviewService.addReview(userDetails.getUser().getId(), productId, request);
        return new ResponseEntity<>(ApiResponse.success(review, "Review added successfully"), HttpStatus.CREATED);
    }
}
