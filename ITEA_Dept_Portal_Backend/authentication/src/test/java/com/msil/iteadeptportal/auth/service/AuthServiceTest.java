package com.msil.iteadeptportal.auth.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.msil.iteadeptportal.auth.dto.LoginRequest;
import com.msil.iteadeptportal.auth.dto.LoginResponse;
import com.msil.iteadeptportal.auth.exception.DepartmentAuthorizationException;
import com.msil.iteadeptportal.auth.exception.RateLimitExceededException;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserFacade userFacade;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AuthService authService;

    private RSAPublicKey publicKey;
    private RSAPrivateKey privateKey;

    @BeforeEach
    public void setUp() throws Exception {
        ReflectionTestUtils.setField(authService, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(authService, "idpUrl", "http://localhost:8080");

        // Generate RSA keys
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair kp = kpg.generateKeyPair();
        this.publicKey = (RSAPublicKey) kp.getPublic();
        this.privateKey = (RSAPrivateKey) kp.getPrivate();
    }

    private String generateToken(String username, List<String> memberOf) {
        return JWT.create()
                .withIssuer("mock-idp")
                .withSubject(username)
                .withJWTId(UUID.randomUUID().toString())
                .withClaim("sAMAccountName", username)
                .withClaim("userPrincipalName", username + "@msil.co.in")
                .withClaim("distinguishedName", "uid=" + username + ",ou=People,dc=company,dc=dc")
                .withClaim("displayName", "Test User")
                .withClaim("surname", "User")
                .withClaim("mail", username + "@company.com")
                .withClaim("employeeId", "1001")
                .withClaim("memberOf", memberOf)
                .sign(Algorithm.RSA256(publicKey, privateKey));
    }

    private Map<String, Object> createJwksResponse() {
        Map<String, Object> jwk = new HashMap<>();
        jwk.put("kty", "RSA");
        jwk.put("use", "sig");
        jwk.put("alg", "RS256");
        jwk.put("kid", "mock-idp-key-id");

        byte[] nBytes = publicKey.getModulus().toByteArray();
        if (nBytes.length > 0 && nBytes[0] == 0) {
            byte[] tmp = new byte[nBytes.length - 1];
            System.arraycopy(nBytes, 1, tmp, 0, tmp.length);
            nBytes = tmp;
        }
        jwk.put("n", Base64.getUrlEncoder().withoutPadding().encodeToString(nBytes));

        byte[] eBytes = publicKey.getPublicExponent().toByteArray();
        if (eBytes.length > 0 && eBytes[0] == 0) {
            byte[] tmp = new byte[eBytes.length - 1];
            System.arraycopy(eBytes, 1, tmp, 0, tmp.length);
            eBytes = tmp;
        }
        jwk.put("e", Base64.getUrlEncoder().withoutPadding().encodeToString(eBytes));

        return Map.of("keys", List.of(jwk));
    }

    @Test
    public void testAuthenticate_Success_NewUser() {
        String username = "dev";
        String token = generateToken(username, List.of("DE_CGV4", "Employees"));

        // Mock IDP auth response
        Map<String, Object> authResponse = Map.of("access_token", token);
        when(restTemplate.postForObject(eq("http://localhost:8080/api/auth"), anyMap(), eq(Map.class)))
                .thenReturn(authResponse);

        // Mock JWKS response
        when(restTemplate.getForObject(eq("http://localhost:8080/.well-known/jwks.json"), eq(Map.class)))
                .thenReturn(createJwksResponse());

        // Mock User DB lookup (new user)
        when(userFacade.getUserBySamAccountName(username)).thenReturn(Optional.empty());
        when(userFacade.createOrUpdateUser(any(UserDTO.class))).thenAnswer(invocation -> {
            UserDTO dto = invocation.getArgument(0);
            dto.setUserId(1L);
            return dto;
        });

        // Run
        LoginRequest request = new LoginRequest(username, "password");
        LoginResponse response = authService.authenticate(request, "127.0.0.1", "Mozilla/5.0");

        // Verify
        assertNotNull(response);
        assertEquals(token, response.getToken());
        assertEquals("dev@company.com", response.getEmail());
        assertEquals("Test User", response.getName());
        assertEquals("ROLE_USER", response.getRole());

        // Verify Spring Security Context
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(username, SecurityContextHolder.getContext().getAuthentication().getName());

        // Verify audit logging
        verify(userFacade).auditLogin(eq(1L), anyString(), eq("127.0.0.1"), eq("Mozilla/5.0"), eq("SUCCESS"), isNull());
    }

    @Test
    public void testAuthenticate_Success_ExistingUser() {
        String username = "dev";
        String token = generateToken(username, List.of("DE_CGV4", "DE_CGV4_ADMIN"));

        // Mock IDP auth response
        Map<String, Object> authResponse = Map.of("access_token", token);
        when(restTemplate.postForObject(eq("http://localhost:8080/api/auth"), anyMap(), eq(Map.class)))
                .thenReturn(authResponse);

        // Mock JWKS response
        when(restTemplate.getForObject(eq("http://localhost:8080/.well-known/jwks.json"), eq(Map.class)))
                .thenReturn(createJwksResponse());

        // Mock User DB lookup (existing user)
        UserDTO existing = UserDTO.builder()
                .userId(1L)
                .samAccountName(username)
                .displayName("Old Name")
                .email("old@company.com")
                .role("ROLE_ADMIN")
                .build();
        when(userFacade.getUserBySamAccountName(username)).thenReturn(Optional.of(existing));
        when(userFacade.createOrUpdateUser(any(UserDTO.class))).thenAnswer(invocation -> {
            UserDTO dto = invocation.getArgument(0);
            dto.setUserId(1L);
            return dto;
        });

        // Run
        LoginRequest request = new LoginRequest(username, "password");
        LoginResponse response = authService.authenticate(request, "127.0.0.1", "Mozilla/5.0");

        // Verify
        assertNotNull(response);
        assertEquals("Test User", response.getName());
        assertEquals("ROLE_ADMIN", response.getRole());
        verify(userFacade).createOrUpdateUser(any(UserDTO.class));
        verify(userFacade).auditLogin(eq(1L), anyString(), eq("127.0.0.1"), eq("Mozilla/5.0"), eq("SUCCESS"), isNull());
    }

    @Test
    public void testAuthenticate_InvalidCredentials() {
        // Mock unauthorized response from Mock IdP
        HttpClientErrorException ex = new HttpClientErrorException(HttpStatus.UNAUTHORIZED);
        when(restTemplate.postForObject(eq("http://localhost:8080/api/auth"), anyMap(), eq(Map.class)))
                .thenThrow(ex);

        when(userFacade.getUserBySamAccountName("dev")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest("dev", "wrongpass");
        assertThrows(IllegalArgumentException.class, () -> authService.authenticate(request, "127.0.0.1", "Mozilla/5.0"));

        verify(userFacade).auditLogin(isNull(), isNull(), eq("127.0.0.1"), eq("Mozilla/5.0"), eq("FAILED"), contains("Invalid username"));
    }

    @Test
    public void testAuthenticate_ForbiddenDepartment() {
        String username = "john";
        String token = generateToken(username, List.of("Employees")); // Not a member of DE_CGV4

        Map<String, Object> authResponse = Map.of("access_token", token);
        when(restTemplate.postForObject(eq("http://localhost:8080/api/auth"), anyMap(), eq(Map.class)))
                .thenReturn(authResponse);

        when(restTemplate.getForObject(eq("http://localhost:8080/.well-known/jwks.json"), eq(Map.class)))
                .thenReturn(createJwksResponse());

        UserDTO existing = UserDTO.builder()
                .userId(2L)
                .samAccountName(username)
                .build();
        when(userFacade.getUserBySamAccountName(username)).thenReturn(Optional.of(existing));

        LoginRequest request = new LoginRequest(username, "password");
        assertThrows(DepartmentAuthorizationException.class, () -> authService.authenticate(request, "127.0.0.1", "Mozilla/5.0"));

        verify(userFacade).auditLogin(eq(2L), anyString(), eq("127.0.0.1"), eq("Mozilla/5.0"), eq("FAILED"), contains("Access Denied"));
    }

    @Test
    public void testAuthenticate_TooManyRequests() {
        HttpClientErrorException ex = new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS);
        when(restTemplate.postForObject(eq("http://localhost:8080/api/auth"), anyMap(), eq(Map.class)))
                .thenThrow(ex);

        when(userFacade.getUserBySamAccountName("dev")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest("dev", "password");
        assertThrows(RateLimitExceededException.class, () -> authService.authenticate(request, "127.0.0.1", "Mozilla/5.0"));

        verify(userFacade).auditLogin(isNull(), isNull(), eq("127.0.0.1"), eq("Mozilla/5.0"), eq("FAILED"), contains("Too many requests"));
    }
}
