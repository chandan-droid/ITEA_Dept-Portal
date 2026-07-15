package com.msil.iteadeptportal.auth.filter;

import com.auth0.jwt.interfaces.Claim;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.msil.iteadeptportal.auth.service.AuthService;
import com.msil.iteadeptportal.employee.api.UserFacade;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class JwtAuthenticationFilterTest {

    @Mock
    private AuthService authService;

    @Mock
    private UserFacade userFacade;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @Mock
    private DecodedJWT decodedJwt;

    @Mock
    private Claim usernameClaim;

    @Mock
    private Claim memberOfClaim;

    @InjectMocks
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    public void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    public void testDoFilterInternal_NoAuthorizationHeader() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    public void testDoFilterInternal_InvalidHeaderFormat() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer");

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    public void testDoFilterInternal_ValidToken_RoleUser() throws Exception {
        String token = "valid-token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(authService.validateToken(token)).thenReturn(decodedJwt);

        when(decodedJwt.getClaim("sAMAccountName")).thenReturn(usernameClaim);
        when(usernameClaim.asString()).thenReturn("testuser");

        when(decodedJwt.getClaim("memberOf")).thenReturn(memberOfClaim);
        when(memberOfClaim.asList(String.class)).thenReturn(List.of("DE_CGV4"));

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertEquals("testuser", authentication.getName());
        assertEquals(token, authentication.getCredentials());
        assertTrue(authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
    }

    @Test
    public void testDoFilterInternal_ValidToken_RoleAdmin() throws Exception {
        String token = "admin-token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(authService.validateToken(token)).thenReturn(decodedJwt);

        when(decodedJwt.getClaim("sAMAccountName")).thenReturn(usernameClaim);
        when(usernameClaim.asString()).thenReturn("adminuser");

        when(decodedJwt.getClaim("memberOf")).thenReturn(memberOfClaim);
        when(memberOfClaim.asList(String.class)).thenReturn(List.of("DE_CGV4", "DE_CGV4_ADMIN"));

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertEquals("adminuser", authentication.getName());
        assertTrue(authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    public void testDoFilterInternal_InvalidToken() throws Exception {
        String token = "invalid-token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(authService.validateToken(token)).thenThrow(new IllegalArgumentException("Invalid signature"));

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
