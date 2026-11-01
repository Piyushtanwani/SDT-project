package com.elearning.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    /**
     * The questions a candidate was actually served for one attempt. Grading a submission
     * against this list is what keeps the score denominator honest when the exam draws a
     * subset of a much larger question bank.
     */
    public record ExamDrawClaims(Long userId, Long courseId, List<Long> questionIds) {
    }

    private static final String DRAW_TOKEN_TYPE = "exam-draw";

    private final String secretKey;
    private final long expirationTime;

    public JwtService(
            @Value("${app.jwt.secret:}") String secretKey,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationTime) {
        if (secretKey == null || secretKey.isBlank()) {
            // Development fallback: rotate on every restart rather than ship a known key.
            byte[] generated = new byte[32];
            new SecureRandom().nextBytes(generated);
            secretKey = Base64.getEncoder().encodeToString(generated);
            System.err.println("WARN: app.jwt.secret is not set. Generated an ephemeral signing key; "
                    + "existing sessions will be invalidated on restart.");
        }
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

    /**
     * Signs the exact set of question ids served for one exam attempt. The client carries the
     * token but cannot forge it, so the server still decides both the draw and its size.
     */
    public String generateExamDrawToken(Long userId, Long courseId, List<Long> questionIds, long ttlMillis) {
        String joined = String.join(",", questionIds.stream().map(String::valueOf).toList());
        Date now = new Date();
        return Jwts.builder()
                .setSubject(DRAW_TOKEN_TYPE)
                .claim("typ", DRAW_TOKEN_TYPE)
                .claim("uid", userId)
                .claim("cid", courseId)
                .claim("qids", joined)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + ttlMillis))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * @throws IllegalArgumentException when the token is missing, forged, expired, a different
     *                                  token type, or carries a malformed question id list.
     */
    public ExamDrawClaims parseExamDrawToken(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Exam draw token is missing.");
        }
        Claims claims = getAllClaimsFromToken(token);
        if (!DRAW_TOKEN_TYPE.equals(claims.get("typ", String.class))) {
            throw new IllegalArgumentException("Token is not an exam draw token.");
        }
        Number uid = claims.get("uid", Number.class);
        Number cid = claims.get("cid", Number.class);
        String qids = claims.get("qids", String.class);
        if (uid == null || cid == null || qids == null || qids.isBlank()) {
            throw new IllegalArgumentException("Exam draw token is incomplete.");
        }
        List<Long> ids = new ArrayList<>();
        for (String part : qids.split(",")) {
            try {
                ids.add(Long.parseLong(part.trim()));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Exam draw token is malformed.");
            }
        }
        if (ids.isEmpty()) {
            throw new IllegalArgumentException("Exam draw token contains no questions.");
        }
        return new ExamDrawClaims(uid.longValue(), cid.longValue(), List.copyOf(ids));
    }
}