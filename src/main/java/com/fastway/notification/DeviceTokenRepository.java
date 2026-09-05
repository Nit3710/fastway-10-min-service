package com.fastway.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    Optional<DeviceToken> findByUserIdAndFcmToken(Long userId, String fcmToken);
    List<DeviceToken> findByUserId(Long userId);
    
    @Modifying
    @Query("DELETE FROM DeviceToken d WHERE d.fcmToken = :token")
    void deleteByFcmToken(@Param("token") String token);
}
