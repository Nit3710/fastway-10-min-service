package com.fastway.auth.dto;

import lombok.Data;

@Data
public class LogoutRequest {
    private String refreshToken;
}
