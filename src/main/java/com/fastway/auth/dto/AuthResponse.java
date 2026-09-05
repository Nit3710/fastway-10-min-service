package com.fastway.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    /** Additive fields; token remains the access-token field used by existing clients. */
    private String refreshToken;
    private long expiresIn;
    private UserResponse user;
}
