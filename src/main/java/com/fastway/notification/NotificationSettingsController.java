package com.fastway.notification;

import com.fastway.common.dto.ApiResponse;
import com.fastway.config.CustomUserDetails;
import com.fastway.notification.dto.NotificationSettingsRequest;
import com.fastway.notification.dto.NotificationSettingsResponse;
import com.fastway.user.User;
import com.fastway.user.UserRepository;
import com.fastway.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/notification-settings")
@RequiredArgsConstructor
public class NotificationSettingsController {

    private final NotificationSettingsRepository settingsRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<NotificationSettingsResponse>> getSettings(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails.getUser().getId();
        NotificationSettings settings = settingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(userId));

        return ResponseEntity.ok(ApiResponse.success(mapToResponse(settings), "Notification settings retrieved"));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<NotificationSettingsResponse>> updateSettings(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody NotificationSettingsRequest request
    ) {
        Long userId = userDetails.getUser().getId();
        NotificationSettings settings = settingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(userId));

        if (request.getInAppEnabled() != null) {
            settings.setInAppEnabled(request.getInAppEnabled());
        }
        if (request.getPushEnabled() != null) {
            settings.setPushEnabled(request.getPushEnabled());
        }
        if (request.getEmailEnabled() != null) {
            settings.setEmailEnabled(request.getEmailEnabled());
        }
        if (request.getWhatsappEnabled() != null) {
            settings.setWhatsappEnabled(request.getWhatsappEnabled());
        }

        settings = settingsRepository.save(settings);
        return ResponseEntity.ok(ApiResponse.success(mapToResponse(settings), "Notification settings updated"));
    }

    private NotificationSettings createDefaultSettings(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        NotificationSettings settings = NotificationSettings.builder()
                .user(user)
                .inAppEnabled(true)
                .pushEnabled(true)
                .emailEnabled(true)
                .whatsappEnabled(true)
                .build();
        
        return settingsRepository.save(settings);
    }

    private NotificationSettingsResponse mapToResponse(NotificationSettings settings) {
        return NotificationSettingsResponse.builder()
                .inAppEnabled(settings.getInAppEnabled())
                .pushEnabled(settings.getPushEnabled())
                .emailEnabled(settings.getEmailEnabled())
                .whatsappEnabled(settings.getWhatsappEnabled())
                .build();
    }
}
