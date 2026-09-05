package com.fastway.common.health;

import com.fastway.common.dto.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> checkHealth() {
        Map<String, Object> details = new HashMap<>();
        details.put("status", "UP");
        details.put("database", "Configured (MySQL)");
        details.put("service", "fastway");
        
        return ApiResponse.success(details, "Application is healthy and running!");
    }
}
