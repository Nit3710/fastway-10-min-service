package com.fastway.auth;

import com.fastway.auth.dto.*;
import com.fastway.config.CustomUserDetails;
import com.fastway.config.JwtUtil;
import com.fastway.user.User;
import com.fastway.user.UserRepository;
import com.fastway.user.UserRole;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.extern.slf4j.Slf4j;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final GoogleAuthService googleAuthService;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpCodeRepository otpCodeRepository;

    @org.springframework.beans.factory.annotation.Value("${auth.refresh-expiration-days:30}")
    private long refreshExpirationDays;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new IllegalArgumentException("Phone number is already registered");
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty() && userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        user = userRepository.save(user);

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getPhone(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid phone number or password");
        }

        User user = userRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with phone: " + request.getPhone()));

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        GoogleIdToken.Payload payload = googleAuthService.verifyToken(request.getIdToken());
        String email = payload.getEmail();
        String name = (String) payload.get("name");

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // Register a new customer via Google Social login
            user = User.builder()
                    .name(name != null ? name : "Google User")
                    .email(email)
                    .role(UserRole.CUSTOMER) // Default role for social register
                    .build();
            user = userRepository.save(user);
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        // Lock the token row so two simultaneous refresh requests cannot both rotate it.
        RefreshToken stored = refreshTokenRepository.findByTokenHashForUpdate(hash(rawRefreshToken))
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        if (stored.isRevoked() || stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("Refresh token expired or revoked");
        }
        stored.setRevoked(true); // rotation: every refresh token is single-use
        refreshTokenRepository.save(stored);
        return issueTokens(stored.getUser());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) return;
        refreshTokenRepository.findByTokenHash(hash(rawRefreshToken)).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    private AuthResponse issueTokens(User user) {
        CustomUserDetails details = new CustomUserDetails(user);
        String accessToken = jwtUtil.generateToken(details);
        byte[] bytes = new byte[64];
        SECURE_RANDOM.nextBytes(bytes);
        String refreshToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokenRepository.save(RefreshToken.builder().user(user).tokenHash(hash(refreshToken))
                .expiresAt(LocalDateTime.now().plusDays(refreshExpirationDays)).build());
        return AuthResponse.builder().token(accessToken).refreshToken(refreshToken)
                .expiresIn(jwtUtil.getAccessTokenExpirationMillis() / 1000)
                .user(mapToUserResponse(user)).build();
    }

    private String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(64);
            for (byte b : digest) result.append(String.format("%02x", b));
            return result.toString();
        } catch (Exception e) { throw new IllegalStateException("Unable to hash refresh token", e); }
    }

    public UserResponse getCurrentUserResponse(String username) {
        User user;
        if (username.contains("@")) {
            user = userRepository.findByEmail(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));
        } else {
            user = userRepository.findByPhone(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with phone: " + username));
        }
        return mapToUserResponse(user);
    }

    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .role(user.getRole())
                .profilePictureUrl(user.getProfilePictureUrl())
                .loyaltyPoints(user.getLoyaltyPoints())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Transactional
    public void sendOtp(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            throw new IllegalArgumentException("Phone number is required");
        }
        
        String cleanPhone = phone.trim();
        String otpCode = String.valueOf(100000 + SECURE_RANDOM.nextInt(900000));
        
        otpCodeRepository.deleteByPhone(cleanPhone);
        
        OtpCode otp = OtpCode.builder()
                .phone(cleanPhone)
                .code(otpCode)
                .expiryTime(LocalDateTime.now().plusMinutes(5))
                .build();
        
        otpCodeRepository.save(otp);
        
        log.info("[OTP] Generated verification code for {}: {}", cleanPhone, otpCode);
        System.out.println("[OTP] Generated verification code for " + cleanPhone + ": " + otpCode);
    }

    @Transactional
    public AuthResponse verifyOtp(String phone, String code) {
        if (phone == null || phone.trim().isEmpty() || code == null || code.trim().isEmpty()) {
            throw new IllegalArgumentException("Phone number and OTP code are required");
        }
        
        String cleanPhone = phone.trim();
        String cleanCode = code.trim();
        
        OtpCode otp = otpCodeRepository.findByPhone(cleanPhone)
                .orElseThrow(() -> new IllegalArgumentException("No OTP requested for this phone number"));
        
        if (otp.getExpiryTime().isBefore(LocalDateTime.now())) {
            otpCodeRepository.delete(otp);
            throw new IllegalArgumentException("OTP code has expired");
        }
        
        if (!otp.getCode().equals(cleanCode)) {
            throw new IllegalArgumentException("Invalid OTP code");
        }
        
        otpCodeRepository.delete(otp);
        
        User user = userRepository.findByPhone(cleanPhone).orElse(null);
        if (user == null) {
            String displayName = "User " + (cleanPhone.length() >= 4 ? cleanPhone.substring(cleanPhone.length() - 4) : cleanPhone);
            user = User.builder()
                    .name(displayName)
                    .phone(cleanPhone)
                    .role(UserRole.CUSTOMER)
                    .loyaltyPoints(0)
                    .build();
            user = userRepository.save(user);
            log.info("[OTP] Auto-registered new user: {}", cleanPhone);
        }
        
        return issueTokens(user);
    }
}
