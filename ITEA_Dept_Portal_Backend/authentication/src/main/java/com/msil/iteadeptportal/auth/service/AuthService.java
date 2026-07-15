package com.msil.iteadeptportal.auth.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.msil.iteadeptportal.auth.dto.LoginRequest;
import com.msil.iteadeptportal.auth.dto.LoginResponse;
import com.msil.iteadeptportal.auth.exception.DepartmentAuthorizationException;
import com.msil.iteadeptportal.auth.exception.RateLimitExceededException;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserFacade userFacade;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${MOCKIDP_URL:http://localhost:8080}")
    private String idpUrl;

    private RSAPublicKey cachedPublicKey;

    public LoginResponse authenticate(LoginRequest request, String ipAddress, String userAgent) {
        // Step 1: Validate input request credentials and perform an initial lookup in the database 
        // to retrieve the user's ID if they have logged in before.
        if (request.getUsername() == null || request.getUsername().trim().isEmpty() ||
            request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Username and password are required");
        }

        String username = request.getUsername();
        Optional<UserDTO> existingUserOpt = userFacade.getUserBySamAccountName(username);
        Long userId = existingUserOpt.map(UserDTO::getUserId).orElse(null);

        // Step 2: Authenticate with the Mock Identity Provider (IdP) by posting the username
        // and password. If the IdP returns 401 or 429 errors, we capture and log a FAILED audit.
        String idpAuthUrl = idpUrl + "/api/auth";
        Map<String, String> authPayload = new HashMap<>();
        authPayload.put("username", username);
        authPayload.put("password", request.getPassword());

        Map<String, Object> idpResponse;
        try {
            idpResponse = restTemplate.postForObject(idpAuthUrl, authPayload, Map.class);
        } catch (HttpClientErrorException e) {
            String reason = "Authentication failed: " + e.getResponseBodyAsString();
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                reason = "Invalid username or password";
                userFacade.auditLogin(userId, null, ipAddress, userAgent, "FAILED", reason);
                throw new IllegalArgumentException(reason);
            } else if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                reason = "Too many requests. Please try again later.";
                userFacade.auditLogin(userId, null, ipAddress, userAgent, "FAILED", reason);
                throw new RateLimitExceededException(reason);
            }
            userFacade.auditLogin(userId, null, ipAddress, userAgent, "FAILED", reason);
            throw new IllegalArgumentException(reason);
        } catch (Exception e) {
            String reason = "Connection to Identity Provider failed: " + e.getMessage();
            userFacade.auditLogin(userId, null, ipAddress, userAgent, "FAILED", reason);
            throw new IllegalStateException(reason);
        }

        if (idpResponse == null || !idpResponse.containsKey("access_token")) {
            String reason = "Invalid response from Identity Provider";
            userFacade.auditLogin(userId, null, ipAddress, userAgent, "FAILED", reason);
            throw new IllegalArgumentException(reason);
        }

        String accessToken = (String) idpResponse.get("access_token");

        // Step 3: Validate the signature of the received JWT token using the IdP's JWKS public key.
        DecodedJWT decodedJwt;
        try {
            decodedJwt = verifyJwt(accessToken);
        } catch (Exception e) {
            String reason = "JWT validation failed: " + e.getMessage();
            userFacade.auditLogin(userId, null, ipAddress, userAgent, "FAILED", reason);
            throw new IllegalArgumentException(reason);
        }

        // Step 4: Extract user identity details and claims from the validated JWT token.
        String jwtId = decodedJwt.getId();
        String sAMAccountName = decodedJwt.getClaim("sAMAccountName").asString();
        String userPrincipalName = decodedJwt.getClaim("userPrincipalName").asString();
        String displayName = decodedJwt.getClaim("displayName").asString();
        String surname = decodedJwt.getClaim("surname").asString();
        String mail = decodedJwt.getClaim("mail").asString();
        String employeeId = decodedJwt.getClaim("employeeId").asString();
        List<String> memberOf = decodedJwt.getClaim("memberOf").asList(String.class);

        if (memberOf == null) {
            memberOf = Collections.emptyList();
        }

        // Step 5: Department Authorization. Ensure the user belongs to the DE_CGV4 Active Directory group.
        if (!memberOf.contains("DE_CGV4")) {
            String reason = "Access Denied: User is not a member of department DE_CGV4";
            userFacade.auditLogin(userId, jwtId, ipAddress, userAgent, "FAILED", reason);
            throw new DepartmentAuthorizationException(reason);
        }

        // Map Active Directory security groups to target Portal roles:
        // DE_CGV4           -> ROLE_USER
        // DE_CGV4 + ADMIN   -> ROLE_ADMIN
        // DE_CGV4 + MANAGER -> ROLE_MANAGER
        String portalRole = "ROLE_USER";
        if (memberOf.contains("DE_CGV4_ADMIN")) {
            portalRole = "ROLE_ADMIN";
        } else if (memberOf.contains("DE_CGV4_MANAGER")) {
            portalRole = "ROLE_MANAGER";
        }

        // Step 6: Just-in-Time (JIT) User Provisioning. Create a new user record or update
        // an existing user's attributes, primary mapped role, and update their last login date.
        UserDTO userDTO = UserDTO.builder()
                .employeeId(employeeId)
                .samAccountName(sAMAccountName)
                .userPrincipalName(userPrincipalName)
                .displayName(displayName)
                .surname(surname)
                .email(mail)
                .role(portalRole)
                .status("ACTIVE")
                .firstLogin(userId == null)
                .lastLoginAt(java.time.LocalDateTime.now())
                .build();

        userDTO = userFacade.createOrUpdateUser(userDTO);
        Long finalUserId = userDTO.getUserId();

        // Step 7: Create Spring Security Authentication context for session management.
        org.springframework.security.core.userdetails.User principal = 
                new org.springframework.security.core.userdetails.User(
                        sAMAccountName, 
                        "", 
                        List.of(new SimpleGrantedAuthority(portalRole))
                );
        UsernamePasswordAuthenticationToken authentication = 
                new UsernamePasswordAuthenticationToken(principal, accessToken, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Step 8: Log a SUCCESS audit in the login_audit table containing the provisioned user ID.
        userFacade.auditLogin(finalUserId, jwtId, ipAddress, userAgent, "SUCCESS", null);

        return LoginResponse.builder()
                .token(accessToken)
                .email(userDTO.getEmail())
                .name(userDTO.getDisplayName())
                .role(userDTO.getRole())
                .build();
    }

    private DecodedJWT verifyJwt(String token) {
        try {
            RSAPublicKey publicKey = getPublicKeyFromJwks();
            Algorithm algorithm = Algorithm.RSA256(publicKey, null);
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer("mock-idp")
                    .build();
            return verifier.verify(token);
        } catch (com.auth0.jwt.exceptions.SignatureVerificationException ex) {
            // Invalidate cache and retry once
            cachedPublicKey = null;
            RSAPublicKey publicKey = getPublicKeyFromJwks();
            Algorithm algorithm = Algorithm.RSA256(publicKey, null);
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer("mock-idp")
                    .build();
            return verifier.verify(token);
        }
    }

    public DecodedJWT validateToken(String token) {
        return verifyJwt(token);
    }

    @SuppressWarnings("unchecked")
    private RSAPublicKey getPublicKeyFromJwks() {
        if (cachedPublicKey != null) {
            return cachedPublicKey;
        }
        try {
            String jwksUrl = idpUrl + "/.well-known/jwks.json";
            Map<String, Object> response = restTemplate.getForObject(jwksUrl, Map.class);
            if (response != null && response.containsKey("keys")) {
                List<Map<String, Object>> keys = (List<Map<String, Object>>) response.get("keys");
                if (!keys.isEmpty()) {
                    Map<String, Object> key = keys.get(0);
                    String n = (String) key.get("n");
                    String e = (String) key.get("e");

                    byte[] nBytes = Base64.getUrlDecoder().decode(n);
                    byte[] eBytes = Base64.getUrlDecoder().decode(e);

                    BigInteger modulus = new BigInteger(1, nBytes);
                    BigInteger publicExponent = new BigInteger(1, eBytes);

                    RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, publicExponent);
                    KeyFactory factory = KeyFactory.getInstance("RSA");
                    this.cachedPublicKey = (RSAPublicKey) factory.generatePublic(spec);
                    return cachedPublicKey;
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to retrieve public key from IdP JWKS endpoint: " + e.getMessage(), e);
        }
        throw new IllegalStateException("No keys found in IdP JWKS response");
    }
}
