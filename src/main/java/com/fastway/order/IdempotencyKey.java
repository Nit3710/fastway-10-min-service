package com.fastway.order;

import com.fastway.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Stores checkout attempt keys so network retries return the original order. */
@Entity
@Table(name = "order_idempotency_keys", uniqueConstraints = @UniqueConstraint(name = "uk_order_idempotency_user_key", columnNames = {"user_id", "idempotency_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdempotencyKey {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String key;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
