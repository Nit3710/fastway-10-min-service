package com.fastway.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {
    Optional<OtpCode> findByPhone(String phone);
    void deleteByPhone(String phone);
}
