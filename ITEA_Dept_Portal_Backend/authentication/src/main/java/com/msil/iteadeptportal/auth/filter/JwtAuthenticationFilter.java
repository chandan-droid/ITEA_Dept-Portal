package com.msil.iteadeptportal.auth.filter;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.msil.iteadeptportal.auth.service.AuthService;
import com.msil.iteadeptportal.employee.api.UserFacade;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final AuthService authService;
    private final UserFacade userFacade;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        //1. Token extraction from header
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        //2. Token validation from IDP
        String token = authHeader.substring(7);
        try {
            DecodedJWT decodedJwt = authService.validateToken(token);
            String username = decodedJwt.getClaim("sAMAccountName").asString();
            List<String> memberOf = decodedJwt.getClaim("memberOf").asList(String.class);
            if (memberOf == null) {
                memberOf = Collections.emptyList();
            }

            //3. Map AD groups to roles, matching the AuthService login logic
            String portalRole = "ROLE_USER";
            if (memberOf.contains("DE_CGV4_ADMIN")) {
                portalRole = "ROLE_ADMIN";
            } else if (memberOf.contains("DE_CGV4_MANAGER")) {
                portalRole = "ROLE_MANAGER";
            }

            // Load user details & permissions from database to populate authorities list
            List<String> authorityNames = userFacade.getUserAuthorities(username);
            List<SimpleGrantedAuthority> authorities;
            if (authorityNames.isEmpty()) {
                // If user doesn't exist in DB yet (e.g. first login JIT flow), fallback to AD mapped role
                authorities = List.of(new SimpleGrantedAuthority(portalRole));
            } else {
                authorities = authorityNames.stream()
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList());
            }

            //4. Set authentication in security context
            org.springframework.security.core.userdetails.User principal =
                    new org.springframework.security.core.userdetails.User(
                            username,
                            "",
                            authorities
                    );
            //5. Create authentication token
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(principal, token, principal.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception e) {
            log.error("JWT authentication failed: {}", e.getMessage());
            //Clear context if verification fails, to avoid any unintended authorization leaks
            SecurityContextHolder.clearContext();
        }
        
        filterChain.doFilter(request, response);
    }
}
