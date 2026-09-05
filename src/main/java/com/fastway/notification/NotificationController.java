package com.fastway.notification;

import com.fastway.common.dto.ApiResponse;
import com.fastway.config.CustomUserDetails;
import com.fastway.notification.dto.NotificationResponse;
import com.fastway.notification.dto.RegisterTokenRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/register-token")
    public ResponseEntity<ApiResponse<Void>> registerToken(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody RegisterTokenRequest request
    ) {
        notificationService.registerToken(userDetails.getUser().getId(), request);
        return ResponseEntity.ok(ApiResponse.success(null, "Device token registered successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getMyNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<NotificationResponse> notifications = notificationService.getUserNotifications(
                userDetails.getUser().getId(), page, size
        );
        return ResponseEntity.ok(ApiResponse.success(notifications, "Notifications history loaded successfully"));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getUnreadCount(userDetails.getUser().getId()), "Unread notification count loaded"));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        notificationService.markAsRead(userDetails.getUser().getId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read"));
    }
}
