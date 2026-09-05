package com.fastway.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationSettingsResponse {
    private Boolean inAppEnabled;
    private Boolean pushEnabled;
    private Boolean emailEnabled;
    private Boolean whatsappEnabled;
}
