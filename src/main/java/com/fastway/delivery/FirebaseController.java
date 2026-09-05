package com.fastway.delivery;

import com.fastway.config.CustomUserDetails;
import com.fastway.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/firebase")
@RequiredArgsConstructor
public class FirebaseController {

    private final FirebaseService firebaseService;

    @GetMapping("/token")
    public ResponseEntity<ApiResponse<Map<String, String>>> getCustomToken(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        String token = firebaseService.generateCustomToken(userDetails.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("token", token), "Firebase custom token generated"));
    }
}
