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
        String adminPhone = "8888888888";
        if (userRepository.findByPhone(adminPhone).isEmpty()) {
            log.info("Seeding default admin user with phone: {}", adminPhone);
            User admin = User.builder()
                    .name("System Admin")
                    .phone(adminPhone)
                    .email("admin@fastway.com")
                    .passwordHash(passwordEncoder.encode("Test@123"))
                    .role(UserRole.ADMIN)
                    .build();
            userRepository.save(admin);
            log.info("Default admin user created successfully.");
        }
    }
}
