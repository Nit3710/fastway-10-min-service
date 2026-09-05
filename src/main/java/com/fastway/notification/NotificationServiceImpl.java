package com.fastway.notification;

import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.notification.dto.NotificationResponse;
import com.fastway.notification.dto.RegisterTokenRequest;
import com.fastway.user.User;
import com.fastway.user.UserRepository;
import com.fastway.user.UserRole;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.MessagingErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final NotificationHistoryRepository notificationHistoryRepository;
    private final UserRepository userRepository;
    private final FirebaseApp firebaseApp;
    private final NotificationSettingsRepository settingsRepository;

    @Autowired
    public NotificationServiceImpl(DeviceTokenRepository deviceTokenRepository,
                                   NotificationHistoryRepository notificationHistoryRepository,
                                   UserRepository userRepository,
                                   ObjectProvider<FirebaseApp> firebaseAppProvider,
                                   NotificationSettingsRepository settingsRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.notificationHistoryRepository = notificationHistoryRepository;
        this.userRepository = userRepository;
        this.firebaseApp = firebaseAppProvider.getIfAvailable();
        this.settingsRepository = settingsRepository;
    }

    @Override
    @Transactional
    public void registerToken(Long userId, RegisterTokenRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Optional<DeviceToken> existing = deviceTokenRepository.findByUserIdAndFcmToken(userId, request.getFcmToken());
        if (existing.isPresent()) {
            DeviceToken token = existing.get();
            token.setDeviceType(request.getDeviceType());
            token.setUpdatedAt(LocalDateTime.now());
            deviceTokenRepository.save(token);
        } else {
            DeviceToken token = DeviceToken.builder()
                    .user(user)
                    .fcmToken(request.getFcmToken())
                    .deviceType(request.getDeviceType())
                    .build();
            deviceTokenRepository.save(token);
        }
    }

    @Override
    @Transactional
    public void sendToUser(Long userId, String title, String body, String relatedType, Long relatedId) {
        sendToUser(userId, title, body, relatedType, relatedId, new HashMap<>());
    }

    @Override
    @Transactional
    public void sendToUser(Long userId, String title, String body, String relatedType, Long relatedId, Map<String, String> extraData) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check user notification settings
        boolean pushEnabled = settingsRepository.findByUserId(userId)
                .map(NotificationSettings::getPushEnabled)
                .orElse(true);
        if (!pushEnabled) {
            log.info("Skipping FCM push notification to user ID: {} because push notifications are disabled.", userId);
            return;
        }

        // 1. Persist to notification history
        NotificationHistory history = NotificationHistory.builder()
                .user(user)
                .title(title)
                .body(body)
                .relatedType(relatedType)
                .relatedId(relatedId)
                .build();
        notificationHistoryRepository.save(history);

        // 2. Fetch all registered tokens for this user
        List<DeviceToken> tokens = deviceTokenRepository.findByUserId(userId);
        if (tokens.isEmpty()) {
            log.info("No registered FCM tokens found for user ID: {}. Push skipped.", userId);
            return;
        }

        // Prepare data payload including order_id and target screen parameters
        Map<String, String> payload = new HashMap<>(extraData);
        payload.put("title", title);
        payload.put("body", body);
        if (relatedType != null) {
            payload.put("relatedType", relatedType);
        }
        if (relatedId != null) {
            payload.put("relatedId", String.valueOf(relatedId));
        }

        // Send to each token asynchronously/individually to isolate failures
        for (DeviceToken token : tokens) {
            sendFcmMessage(token.getFcmToken(), title, body, payload);
        }
    }

    @Override
    @Transactional
    public void sendToAdmins(String title, String body, String relatedType, Long relatedId) {
        userRepository.findByRole(UserRole.ADMIN).forEach(admin -> {
            try {
                sendToUser(admin.getId(), title, body, relatedType, relatedId);
            } catch (Exception ex) {
                log.error("Failed to create admin notification for user {}: {}", admin.getId(), ex.getMessage());
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("sentAt").descending());
        return notificationHistoryRepository.findByUserId(userId, pageable)
                .map(NotificationResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationHistoryRepository.countUnreadByUserId(userId);
    }

    @Override
    @Transactional
    public void markAsRead(Long userId, Long notificationId) {
        NotificationHistory history = notificationHistoryRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification record not found"));

        if (!history.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You are not authorized to mark this notification as read");
        }

        history.setRead(true);
        notificationHistoryRepository.save(history);
    }

    private void sendFcmMessage(String token, String title, String body, Map<String, String> data) {
        if (firebaseApp == null) {
            log.warn("Firebase App is disabled. Skipping FCM sending.");
            return;
        }

        try {
            com.google.firebase.messaging.Notification notification = 
                com.google.firebase.messaging.Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            com.google.firebase.messaging.Message.Builder builder = com.google.firebase.messaging.Message.builder()
                    .setToken(token)
                    .setNotification(notification);

            if (data != null && !data.isEmpty()) {
                builder.putAllData(data);
            }

            com.google.firebase.messaging.Message msg = builder.build();
            FirebaseMessaging.getInstance(firebaseApp).send(msg);
            log.info("FCM push successfully sent to token: {}", token);

        } catch (com.google.firebase.messaging.FirebaseMessagingException e) {
            log.error("FCM push failed for token: {}. Error Code: {}. Message: {}", 
                token, e.getMessagingErrorCode(), e.getMessage());
            
            // Remove token from database if invalid or unregistered
            if (e.getMessagingErrorCode() != null && 
                (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED || 
                 e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT)) {
                log.info("Deleting invalid/expired FCM token: {}", token);
                deviceTokenRepository.deleteByFcmToken(token);
            }
        } catch (Exception e) {
            log.error("Unexpected error sending push notification: {}", e.getMessage());
        }
    }
}
