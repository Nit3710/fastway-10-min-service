package com.fastway.cart;

import com.fastway.catalog.Product;
import com.fastway.catalog.ProductRepository;
import com.fastway.common.dto.ApiResponse;
import com.fastway.config.CustomUserDetails;
import com.fastway.user.User;
import com.fastway.user.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails.getUser().getId();
        List<CartItem> items = cartItemRepository.findByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(mapToCartResponse(items)));
    }

    @PostMapping("/items")
    @Transactional
    public ResponseEntity<ApiResponse<CartResponse>> addToCart(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody CartItemRequest request
    ) {
        Long userId = userDetails.getUser().getId();
        Long productId = request.getProduct_id();
        int quantity = request.getQuantity() != null ? request.getQuantity() : 1;

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        Optional<CartItem> existingItemOpt = cartItemRepository.findByUserIdAndProductId(userId, productId);
        CartItem cartItem;
        if (existingItemOpt.isPresent()) {
            cartItem = existingItemOpt.get();
            cartItem.setQuantity(cartItem.getQuantity() + quantity);
        } else {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            cartItem = CartItem.builder()
                    .user(user)
                    .product(product)
                    .quantity(quantity)
                    .build();
        }
        cartItemRepository.save(cartItem);

        List<CartItem> items = cartItemRepository.findByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(mapToCartResponse(items), "Item added to cart"));
    }

    @PutMapping("/items/{productId}")
    @Transactional
    public ResponseEntity<ApiResponse<CartResponse>> updateCartItem(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productId,
            @RequestBody CartUpdateItemRequest request
    ) {
        Long userId = userDetails.getUser().getId();
        int quantity = request.getQuantity();

        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found in cart"));

        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
        } else {
            cartItem.setQuantity(quantity);
            cartItemRepository.save(cartItem);
        }

        List<CartItem> items = cartItemRepository.findByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(mapToCartResponse(items), "Cart updated"));
    }

    @DeleteMapping("/items/{productId}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> removeCartItem(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long productId
    ) {
        Long userId = userDetails.getUser().getId();
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found in cart"));

        cartItemRepository.delete(cartItem);
        return ResponseEntity.ok(ApiResponse.success(null, "Item removed from cart"));
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails.getUser().getId();
        cartItemRepository.deleteByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Cart cleared"));
    }

    private CartResponse mapToCartResponse(List<CartItem> items) {
        BigDecimal total = BigDecimal.ZERO;
        List<CartItemResponse> responseItems = new ArrayList<>();

        for (CartItem item : items) {
            Product product = item.getProduct();
            BigDecimal price = product.getPrice();
            BigDecimal subtotal = price.multiply(BigDecimal.valueOf(item.getQuantity()));
            total = total.add(subtotal);

            responseItems.add(CartItemResponse.builder()
                    .productId(product.getId())
                    .name(product.getName())
                    .image(product.getImageUrl())
                    .price(price)
                    .quantity(item.getQuantity())
                    .subtotal(subtotal)
                    .build());
        }

        return CartResponse.builder()
                .items(responseItems)
                .total(total)
                .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CartResponse {
        private List<CartItemResponse> items;
        private BigDecimal total;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CartItemResponse {
        private Long productId;
        private String name;
        private String image;
        private BigDecimal price;
        private Integer quantity;
        private BigDecimal subtotal;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItemRequest {
        private Long product_id;
        private Integer quantity;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartUpdateItemRequest {
        private Integer quantity;
    }
}
