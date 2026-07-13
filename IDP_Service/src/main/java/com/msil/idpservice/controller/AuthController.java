package com.msil.idpservice.controller;

import com.msil.idpservice.service.AuthenticationService;
import com.msil.idpservice.service.JwtService;
import com.msil.idpservice.service.LdapServerService;
import com.msil.idpservice.service.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
public class AuthController {
 
    private final LdapServerService ldapServerService;
    private final RateLimiterService rateLimiterService;
    private final AuthenticationService authenticationService;
    private final JwtService jwtService;
 
    @Autowired
    public AuthController(LdapServerService ldapServerService,
                          RateLimiterService rateLimiterService,
                          AuthenticationService authenticationService,
                          JwtService jwtService) {
        this.ldapServerService = ldapServerService;
        this.rateLimiterService = rateLimiterService;
        this.authenticationService = authenticationService;
        this.jwtService = jwtService;
    }
 
    @PostMapping({"/api/auth", "/api/login"})
    public ResponseEntity<?> authenticate(@RequestBody AuthRequest request, HttpServletRequest servletRequest) {
        try {
            String ip = getClientIp(servletRequest);
            if (!rateLimiterService.tryConsume(ip)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("error", "Too many requests. Please try again later."));
            }
            String username = request.getUsername();
            String password = request.getPassword();
 
            Map<String, Object> response = authenticationService.authenticate(username, password);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Authentication error: " + e.getMessage()));
        }
    }
 
    @GetMapping("/public-key")
    public ResponseEntity<String> getPublicKey() {
        return ResponseEntity.ok(jwtService.getPublicKeyPem());
    }
 
    @GetMapping("/.well-known/jwks.json")
    public ResponseEntity<Map<String, Object>> getJwks() {
        return ResponseEntity.ok(jwtService.getJwks());
    }

    @GetMapping("/api/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<String> userDns = ldapServerService.getAllUserDns();
            return ResponseEntity.ok(userDns);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve users: " + e.getMessage()));
        }
    }

    @PostMapping("/api/users")
    public ResponseEntity<?> createUser(@RequestBody UserCreateRequest request) {
        try {
            if (request.getUid() == null || request.getUid().trim().isEmpty() ||
                request.getPassword() == null || request.getPassword().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "uid and password are required"));
            }

            ldapServerService.createUser(
                    request.getUid(),
                    request.getCn(),
                    request.getSn(),
                    request.getMail(),
                    request.getPassword(),
                    request.getEmployeeId()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "User created successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create user: " + e.getMessage()));
        }
    }

    @DeleteMapping("/api/users/{uid}")
    public ResponseEntity<?> deleteUser(@PathVariable String uid) {
        try {
            ldapServerService.deleteUser(uid);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete user: " + e.getMessage()));
        }
    }

    @PostMapping("/api/import-ldif")
    public ResponseEntity<?> importLdif(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "File is empty"));
            }
            ldapServerService.importLdif(file.getInputStream());
            return ResponseEntity.ok(Map.of("message", "LDIF imported successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to import LDIF: " + e.getMessage()));
        }
    }

    @PostMapping("/api/reset")
    public ResponseEntity<?> reset() {
        try {
            ldapServerService.reset();
            return ResponseEntity.ok(Map.of("message", "LDAP server reset successfully from setup.ldif"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to reset LDAP server: " + e.getMessage()));
        }
    }

    // Static DTO classes for Request Binding
    public static class AuthRequest {
        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class UserCreateRequest {
        private String uid;
        private String cn;
        private String sn;
        private String mail;
        private String password;
        private String employeeId;

        public String getUid() {
            return uid;
        }

        public void setUid(String uid) {
            this.uid = uid;
        }

        public String getCn() {
            return cn;
        }

        public void setCn(String cn) {
            this.cn = cn;
        }

        public String getSn() {
            return sn;
        }

        public void setSn(String sn) {
            this.sn = sn;
        }

        public String getMail() {
            return mail;
        }

        public void setMail(String mail) {
            this.mail = mail;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getEmployeeId() {
            return employeeId;
        }

        public void setEmployeeId(String employeeId) {
            this.employeeId = employeeId;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
