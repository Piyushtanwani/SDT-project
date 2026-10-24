package com.elearning.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private final String secretKey;
    private final long expirationTime;

    public JwtService(
            @Value("${app.jwt.secret:ismailkaranhamzahabcd12349999zahabcd12349999d12349999}") String secretKey,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationTime) {
        this.secretKey = secretKey;
        this.expirationTime = expirationTime;
    }

    private Key getSigningKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // Extract the username from token
    public String getUsernameFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    // Extract the user ID from token
    public Long getUserIdFromToken(String token) {
        String idStr = getClaimFromToken(token, claims -> claims.get("id", String.class));
        return idStr != null ? Long.parseLong(idStr) : null;
    }

    // Get all claims from the token
    private Claims getAllClaimsFromToken(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (JwtException e) {
            throw new IllegalArgumentException("Invalid JWT token", e);
        }
    }

    // Generate JWT token with username and userId
    public String generateToken(String username, Long userId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", userId != null ? userId.toString() : "");

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationTime);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Check if the token is valid
    public boolean isTokenValid(String token) {
        try {
            getAllClaimsFromToken(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    // Extract a specific claim
    private <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    // Get expiration date from token
    private Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    // Check if the token is expired
    public boolean isTokenExpired(String token) {
        try {
            return getExpirationDateFromToken(token).before(new Date());
        } catch (Exception e) {
            return true;
        }
    }
}