package com.fastway.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminUserDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Seed default admin 8888888888
        String adminPhone1 = "8888888888";
        if (userRepository.findByPhone(adminPhone1).isEmpty()) {
            log.info("Seeding default admin user with phone: {}", adminPhone1);
            User admin = User.builder()
                    .name("System Admin")
                    .phone(adminPhone1)
                    .email("admin@fastway.com")
                    .passwordHash(passwordEncoder.encode("Test@123"))
                    .role(UserRole.ADMIN)
                    .build();
            userRepository.save(admin);
        }

        // Seed/Ensure 9999999996 as Admin user
        String adminPhone2 = "9999999996";
        userRepository.findByPhone(adminPhone2).ifPresentOrElse(
            existingUser -> {
                existingUser.setRole(UserRole.ADMIN);
                existingUser.setPasswordHash(passwordEncoder.encode("Test@123"));
                userRepository.save(existingUser);
                log.info("Updated existing user {} to ADMIN role.", adminPhone2);
            },
            () -> {
                log.info("Seeding admin user with phone: {}", adminPhone2);
                User admin2 = User.builder()
                        .name("Fastway Admin")
                        .phone(adminPhone2)
                        .email("admin2@fastway.com")
                        .passwordHash(passwordEncoder.encode("Test@123"))
                        .role(UserRole.ADMIN)
                        .build();
                userRepository.save(admin2);
            }
        );
    }
}
