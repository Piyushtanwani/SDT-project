package com.elearning.services;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class RequestThrottle {

    private record Window(long startedAt, int count) {}

    private static final int PRUNE_THRESHOLD = 10_000;

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public boolean isBlocked(String key, int maxAttempts, Duration window) {
        Window current = windows.get(key);
        if (current == null) {
            return false;
        }
        if (System.currentTimeMillis() - current.startedAt() >= window.toMillis()) {
            return false;
        }
        return current.count() >= maxAttempts;
    }

    public void hit(String key, Duration window) {
        long now = System.currentTimeMillis();
        windows.compute(key, (k, current) ->
                current == null || now - current.startedAt() >= window.toMillis()
                        ? new Window(now, 1)
                        : new Window(current.startedAt(), current.count() + 1));
        if (windows.size() > PRUNE_THRESHOLD) {
            windows.entrySet().removeIf(e -> now - e.getValue().startedAt() >= window.toMillis());
        }
    }

    /**
     * Counts the call against the window and reports whether it is still allowed.
     * Used for legitimate traffic such as chat, where every call counts.
     */
    public boolean tryAcquire(String key, int maxAttempts, Duration window) {
        long now = System.currentTimeMillis();
        AtomicBoolean allowed = new AtomicBoolean(false);
        windows.compute(key, (k, current) -> {
            if (current == null || now - current.startedAt() >= window.toMillis()) {
                allowed.set(true);
                return new Window(now, 1);
            }
            if (current.count() >= maxAttempts) {
                return current;
            }
            allowed.set(true);
            return new Window(current.startedAt(), current.count() + 1);
        });
        if (windows.size() > PRUNE_THRESHOLD) {
            windows.entrySet().removeIf(e -> now - e.getValue().startedAt() >= window.toMillis());
        }
        return allowed.get();
    }

    public void reset(String key) {
        windows.remove(key);
    }
}
