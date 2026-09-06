package com.fastway.common.util;

import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

public class ImageUrlUtil {

    public static String normalizeUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }

        // If stored URL contains /uploads/<filename> (from local storage fallback)
        if (url.contains("/uploads/")) {
            String fileName = url.substring(url.indexOf("/uploads/"));
            try {
                String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                        .build()
                        .toUriString();
                if (baseUrl.startsWith("http://") && !baseUrl.contains("localhost")) {
                    baseUrl = "https://" + baseUrl.substring(7);
                }
                return baseUrl + fileName;
            } catch (Exception e) {
                return "https://fastway-10-min-service.onrender.com" + fileName;
            }
        }

        // Upgrade http to https for external images to avoid Mixed Content errors on Netlify (HTTPS)
        if (url.startsWith("http://") && !url.contains("localhost")) {
            return "https://" + url.substring(7);
        }

        return url;
    }
}
