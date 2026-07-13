# Mock IdP - API Integration Documentation

This document describes how the **Department Portal** and downstream microservices integrate with the Mock Enterprise Identity Provider (IdP) for authentication and signature verification.

---

## 1. Authentication Endpoint (Login)

Acquires a signed RS256 JWT access token after validating Active Directory credentials.

* **Endpoint**: `POST /api/auth` (or `POST /api/login`)
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "username": "dev",
  "password": "password123"
}
```

* **Success Response (200 OK)**:
```json
{
  "access_token": "eyJraWQiOiJtb2NrLWlk...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

* **Error Response (401 Unauthorized)**:
```json
{
  "error": "Invalid username or password"
}
```

* **Error Response (429 Too Many Requests)**:
Returned if client exceeds rate limiting (5 requests per 60s).
```json
{
  "error": "Too many requests. Please try again later."
}
```

---

## 2. JSON Web Key Set (JWKS) Endpoint

Exposes the active RSA public key in standard JWKS format. Client applications (such as Resource Servers or Gateways) should use this endpoint to fetch the keys needed for JWT signature verification.

* **Endpoint**: `GET /.well-known/jwks.json`
* **Response (200 OK)**:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "mock-idp-key-id",
      "alg": "RS256",
      "n": "ul64NqFdDUMzrB3c83j_CBBwbWXri1IhXaAx4IFTZi5nzh9CDZzE7LXO3hRBEfRrH56Cl3wYhe03jnh4tUZqct6ODL0vBblm6_PaarZ3OL21EG7zJJoiSvB1C2dw2a15BlyEZrD7mtSij6LHFJOEGcAPh2DWPuj8v1vFK5UJi22x39m0bpxumvQz-af5veCnI4Mj_hojLZM0xh-R94gKg5RKsWO87N2CaQPu4bMHuPnZHaSYecOuY2piOXyA65FXy5Dl498wtrS3Tn4GRgV2ug63q7-wid7EwTchhkE_vzr7sZhYYcwLmBI2IFbaxDJKIwUXcYgdri6nIJEejPBQnQ",
      "e": "AQAB"
    }
  ]
}
```

---

## 3. Public Key PEM Endpoint

Exposes the active public key formatted as a traditional X.509 PEM string. Use this if your client framework doesn't support OIDC JWKS natively.

* **Endpoint**: `GET /public-key`
* **Response (200 OK)**:
```text
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAul64NqFdDUMzrB3c83j/
...
-----END PUBLIC KEY-----
```

---

## 4. JWT Claims Structure

Tokens issued by the Mock IdP contain standard OIDC claims alongside enterprise Active Directory properties:

| Claim | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `iss` | String | Token Issuer | `"mock-idp"` |
| `sub` | String | Subject (Unique identifier) | `"dev"` |
| `sAMAccountName` | String | AD Login Username | `"dev"` |
| `userPrincipalName`| String | AD Principal Name | `"dev@msil.co.in"` |
| `displayName` | String | Formatted Display Name | `"Dev"` |
| `name` | String | Full Name | `"Dev"` |
| `surname` | String | Last Name | `"Kumar"` |
| `mail` | String | Email Address | `"dev@company.com"` |
| `distinguishedName`| String | Full LDAP DN | `"uid=dev,ou=People,dc=company,dc=com"` |
| `memberOf` | Array | Mapped LDAP Groups | `["DE_CGV4", "Employees"]` |
| `roles` | Array | Mapped Access Roles | `["EMPLOYEE"]` |
| `iat` | Long | Issued At (Epoch time) | `1783930730` |
| `exp` | Long | Expiry time (Epoch time) | `1783934330` |

---

## 5. Integrating with Spring Boot Resource Server

Configure your Departmental Portal backend application properties as follows to automate incoming token verification:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          # Automatically retrieves, caches, and verifies keys using the JWKS endpoint
          jwk-set-uri: http://localhost:8080/.well-known/jwks.json
          issuer-uri: mock-idp
```
