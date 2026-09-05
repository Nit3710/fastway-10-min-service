package com.fastway.auth;

import com.fastway.common.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Small-process limiter. Use a shared Redis/Bucket4j store when running multiple API instances. */
@Component
public class AuthRateLimiter {
    private static final long WINDOW_MILLIS = 15 * 60 * 1000L;
    private static final int MAX_ATTEMPTS = 5;
    private final Map<String, Deque<Long>> attempts = new ConcurrentHashMap<>();


    public void check(String phone, HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
        String key = ip + "|" + phone.trim();
        long now = System.currentTimeMillis();
        Deque<Long> window = attempts.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() >= WINDOW_MILLIS) window.removeFirst();
            if (window.size() >= MAX_ATTEMPTS) throw new TooManyRequestsException("Too many authentication attempts. Please try again later.");
            window.addLast(now);
        }
    }
}
