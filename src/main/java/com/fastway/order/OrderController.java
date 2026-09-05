package com.fastway.order;

import com.fastway.config.CustomUserDetails;
import com.fastway.common.dto.ApiResponse;
import com.fastway.order.dto.OrderRequest;
import com.fastway.order.dto.OrderResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> placeOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody OrderRequest request
    ) {
        OrderResponse response = orderService.placeOrder(userDetails.getUser().getId(), request, idempotencyKey);
        return new ResponseEntity<>(ApiResponse.success(response, "Order placed successfully"), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getMyOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<OrderResponse> orders = orderService.getUserOrders(userDetails.getUser().getId(), page, size);
        return ResponseEntity.ok(ApiResponse.success(orders, "Orders retrieved successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderDetails(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        boolean isAdmin = userDetails.getUser().getRole().name().equals("ADMIN");
        OrderResponse response = orderService.getOrderDetails(id, userDetails.getUser().getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(response, "Order details retrieved successfully"));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        boolean isAdmin = userDetails.getUser().getRole().name().equals("ADMIN");
        OrderResponse response = orderService.cancelOrder(id, userDetails.getUser().getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(response, "Order cancelled successfully"));
    }
}
