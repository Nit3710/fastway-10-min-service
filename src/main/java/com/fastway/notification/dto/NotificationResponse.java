package com.fastway.notification.dto;

import com.fastway.notification.NotificationHistory;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String title;
    private String body;
    @JsonProperty("isRead")
    private boolean isRead;
    private String relatedType;
    private Long relatedId;
    private LocalDateTime sentAt;

    public static NotificationResponse fromEntity(NotificationHistory entity) {
        return NotificationResponse.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .body(entity.getBody())
                .isRead(entity.isRead())
                .relatedType(entity.getRelatedType())
                .relatedId(entity.getRelatedId())
                .sentAt(entity.getSentAt())
                .build();
    }
}
