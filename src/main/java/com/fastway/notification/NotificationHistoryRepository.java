package com.fastway.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface NotificationHistoryRepository extends JpaRepository<NotificationHistory, Long> {
    Page<NotificationHistory> findByUserId(Long userId, Pageable pageable);

    @Query("select count(n) from NotificationHistory n where n.user.id = :userId and n.isRead = false")
    long countUnreadByUserId(@Param("userId") Long userId);
}
