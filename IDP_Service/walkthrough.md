# Walkthrough - Enterprise JWT-Based LDAP Authentication and Management Service

Successfully upgraded the Spring Boot Mock IdP to behave like an enterprise Identity Provider:
- Authenticates users against the embedded LDAP directory server.
- Automatically maps LDAP user entries into AD-compatible identity claims.
- Searches and extracts dynamic group memberships (`memberOf`).
- Signs the tokens using **RS256 (RSA 2048-bit)** with an internally generated key pair.
- Exposes JWKS and PEM public key verification endpoints.
- Returns a standard OAuth access token wrapper rather than returning user JSON object.

## Changes Made

### 1. Embedded LDAP Groups Configuration
- **[setup.ldif](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/main/resources/setup.ldif)**: Added groups (`ou=Groups`, `cn=DE_CGV4`, `cn=Employees`) using `groupOfNames` class to enable testing dynamic memberships.

### 2. Services & Architecture
- **[JwtService.java](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/main/java/com/msil/idpservice/service/JwtService.java)**: 
  - Dynamically generates an RSA 2048-bit key pair on startup.
  - Generates secure RS256 tokens with standard claims (`iss`, `sub`, `iat`, `exp`, `nbf`, `jti`).
  - Serializes public key to PEM format and JSON Web Key Set (JWKS).
- **[GroupService.java](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/main/java/com/msil/idpservice/service/GroupService.java)**: Search LDAP dynamically for matching user groups based on member DN attribute.
- **[ActiveDirectoryMapper.java](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/main/java/com/msil/idpservice/service/ActiveDirectoryMapper.java)**: Map LDAP user to AD-compatible claims (`sAMAccountName`, `userPrincipalName`, `displayName`, `name`, `surname`, `mail`, `distinguishedName`, `memberOf`, `roles`).
- **[AuthenticationService.java](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/main/java/com/msil/idpservice/service/AuthenticationService.java)**: Orchestrates LDAP bind authentication, mappings, token creation, and formatting of response payload.
- **[LdapServerService.java](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/main/java/com/msil/idpservice/service/LdapServerService.java)**: Exposed access to directory server instances and base DN.

### 3. Controller Endpoints & Security
- **[AuthController.java](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/main/java/com/msil/idpservice/controller/AuthController.java)**:
  - Exposes `GET /public-key` returning public key in PEM format.
  - Exposes `GET /.well-known/jwks.json` returning JSON Web Key Set (JWKS).
  - Handles `/api/auth` (and `/api/login`) returning token wrapper containing only: `access_token`, `token_type`, and `expires_in`.
- **[SecurityConfig.java](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/main/java/com/msil/idpservice/config/SecurityConfig.java)**: Configured explicitly to permit access to public key / JWKS endpoints.

## Verification Results

### 1. Automated Integration Tests
Comprehensive integration tests were updated/added in **[IdpServiceApplicationTests.java](file:///C:/My%20Projects/ITEA_Dept-Portal/IDP_Service/src/test/java/com/msil/idpservice/IdpServiceApplicationTests.java)**.
- `testAuthSuccess`: Verifies authenticating a user returns the OAuth wrapper, decoded JWT matches expected issuer, subject, AD-compatible claims (`sAMAccountName`, `userPrincipalName`, `displayName`, `name`, `surname`, `mail`, `distinguishedName`, `memberOf`, `roles`).
- `testPublicKeyAndJwks`: Verifies PEM public key format and JWKS structure (`RSA`, `RS256`, `kid`).
- `testRateLimiting`, `testAuthFailure`, `testUserManagementLifecycle`, `testReset`.

All **7 integration tests** passed successfully:
```text
[INFO] Running com.msil.idpservice.IdpServiceApplicationTests
Started mock LDAP/AD server on port: 8389
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 6.205 s -- in com.msil.idpservice.IdpServiceApplicationTests
[INFO] Results:
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### 2. Docker Execution & Verification
The container was built and launched successfully via Docker Compose:
- **Run container**: `docker-compose down ; docker-compose up -d --force-recreate --build` launched `idp-service` running latest JRE.
- **Verification Outputs**:
  - `POST http://localhost:8080/api/auth`:
    ```json
    {
      "access_token": "eyJraWQiOiJtb2NrLWlkcC...",
      "token_type": "Bearer",
      "expires_in": 3600
    }
    ```
  - `GET http://localhost:8080/public-key` returned valid `-----BEGIN PUBLIC KEY-----` PEM wrapper.
  - `GET http://localhost:8080/.well-known/jwks.json` returned the complete keyset:
    ```json
    {
      "keys": [
        {
          "kty": "RSA",
          "e": "AQAB",
          "use": "sig",
          "kid": "mock-idp-key-id",
          "alg": "RS256",
          "n": "ul64NqFdDUMzrB3c..."
        }
      ]
    }
    ```



