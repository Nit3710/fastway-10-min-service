package com.fastway.notification;

import com.fastway.notification.dto.NotificationResponse;
import com.fastway.notification.dto.RegisterTokenRequest;
import org.springframework.data.domain.Page;

import java.util.Map;

public interface NotificationService {
    void registerToken(Long userId, RegisterTokenRequest request);
    void sendToUser(Long userId, String title, String body, String relatedType, Long relatedId);
    void sendToUser(Long userId, String title, String body, String relatedType, Long relatedId, Map<String, String> extraData);
    void sendToAdmins(String title, String body, String relatedType, Long relatedId);
    Page<NotificationResponse> getUserNotifications(Long userId, int page, int size);
    long getUnreadCount(Long userId);
    void markAsRead(Long userId, Long notificationId);
}
