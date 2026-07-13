package com.msil.idpservice.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.*;

@Service
public class JwtService {

    @Value("${mockidp.jwt.expiry-seconds:3600}")
    private int expirySeconds;

    private PublicKey publicKey;
    private PrivateKey privateKey;

    @PostConstruct
    public void generateKeyPair() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
            kpg.initialize(2048);
            KeyPair kp = kpg.generateKeyPair();
            this.publicKey = kp.getPublic();
            this.privateKey = kp.getPrivate();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate RSA Key Pair", e);
        }
    }

    public PublicKey getPublicKey() {
        return publicKey;
    }

    public int getExpirySeconds() {
        return expirySeconds;
    }

    public String generateToken(String subject, Map<String, Object> claims) {
        var builder = JWT.create()
                .withKeyId("mock-idp-key-id")
                .withIssuer("mock-idp")
                .withSubject(subject)
                .withJWTId(UUID.randomUUID().toString())
                .withIssuedAt(new Date())
                .withNotBefore(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + expirySeconds * 1000));

        claims.forEach((key, val) -> {
            if (val instanceof List) {
                builder.withClaim(key, (List<?>) val);
            } else if (val instanceof String) {
                builder.withClaim(key, (String) val);
            } else if (val instanceof Integer) {
                builder.withClaim(key, (Integer) val);
            } else if (val instanceof Boolean) {
                builder.withClaim(key, (Boolean) val);
            } else if (val != null) {
                builder.withClaim(key, val.toString());
            }
        });

        return builder.sign(Algorithm.RSA256((RSAPublicKey) publicKey, (RSAPrivateKey) privateKey));
    }

    public String getPublicKeyPem() {
        return "-----BEGIN PUBLIC KEY-----\n" +
                Base64.getMimeEncoder(64, new byte[]{(byte)'\n'}).encodeToString(publicKey.getEncoded()) +
                "\n-----END PUBLIC KEY-----";
    }

    public Map<String, Object> getJwks() {
        Map<String, Object> key = new HashMap<>();
        key.put("kty", "RSA");
        key.put("use", "sig");
        key.put("alg", "RS256");
        key.put("kid", "mock-idp-key-id");

        RSAPublicKey rsaPub = (RSAPublicKey) publicKey;
        key.put("n", toBase64UrlNoPadding(rsaPub.getModulus()));
        key.put("e", toBase64UrlNoPadding(rsaPub.getPublicExponent()));

        return Map.of("keys", List.of(key));
    }

    private String toBase64UrlNoPadding(BigInteger val) {
        byte[] bytes = val.toByteArray();
        if (bytes.length > 0 && bytes[0] == 0) {
            byte[] tmp = new byte[bytes.length - 1];
            System.arraycopy(bytes, 1, tmp, 0, tmp.length);
            bytes = tmp;
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
