package com.fastway.notification.dto;

import com.fastway.notification.DeviceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegisterTokenRequest {
    @NotBlank(message = "FCM token is required")
    private String fcmToken;

    @NotNull(message = "Device type is required")
    private DeviceType deviceType;
}
