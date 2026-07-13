package com.msil.idpservice.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class RateLimiterService {

    @Value("${mockidp.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${mockidp.rate-limit.max-requests:5}")
    private int maxRequests;

    @Value("${mockidp.rate-limit.duration-seconds:60}")
    private int durationSeconds;

    private double refillRate;
    private final ConcurrentHashMap<String, TokenBucket> ipBuckets = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        long refillPeriodNs = TimeUnit.SECONDS.toNanos(durationSeconds);
        this.refillRate = (double) maxRequests / refillPeriodNs;
    }

    public boolean tryConsume(String ip) {
        if (!enabled) {
            return true;
        }

        TokenBucket bucket = ipBuckets.computeIfAbsent(ip, k -> new TokenBucket(maxRequests));
        return bucket.tryConsume(maxRequests, refillRate);
    }

    private static class TokenBucket {
        private double tokens;
        private long lastRefillTime;

        TokenBucket(double maxTokens) {
            this.tokens = maxTokens;
            this.lastRefillTime = System.nanoTime();
        }

        synchronized boolean tryConsume(double maxTokens, double refillRate) {
            long now = System.nanoTime();
            long elapsed = now - lastRefillTime;
            lastRefillTime = now;
            tokens = Math.min(maxTokens, tokens + (elapsed * refillRate));
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }
    }
}
