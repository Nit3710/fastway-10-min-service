package com.fastway.catalog;

import com.fastway.catalog.dto.ProductRatingStats;
import com.fastway.catalog.dto.ReviewRequest;
import com.fastway.catalog.dto.ReviewResponse;
import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.user.User;
import com.fastway.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByProduct(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found");
        }
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductRatingStats getProductRatingStats(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found");
        }
        Double avg = reviewRepository.getAverageRating(productId).orElse(0.0);
        long count = reviewRepository.countByProductId(productId);
        return ProductRatingStats.builder()
                .averageRating(avg)
                .totalReviews(count)
                .build();
    }

    @Transactional
    public ReviewResponse addReview(Long userId, Long productId, ReviewRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Limit: one review per user per product
        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new IllegalArgumentException("You have already reviewed this product. You cannot add multiple reviews.");
        }

        Review review = Review.builder()
                .product(product)
                .user(user)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        review = reviewRepository.save(review);
        return convertToResponse(review);
    }

    private ReviewResponse convertToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .userId(review.getUser().getId())
                .userName(review.getUser().getName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
