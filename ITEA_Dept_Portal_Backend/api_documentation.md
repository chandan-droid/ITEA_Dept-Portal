# ITEA Department Portal Backend API Documentation

API endpoints for User Authentication, Profile Retrieval, and Employee Management.

---

## 1. POST /api/auth/login

Authenticates a user against the Active Directory Identity Provider (IdP) and returns a JWT access token.

- **HTTP Method**: `POST`
- **Path**: `/api/auth/login`
- **Security**: Public (No authentication required)
- **Headers**:
  - `Content-Type`: `application/json`
  - `User-Agent`: Used for session audit logs
  - `X-Forwarded-For`: (Optional) Client IP for audit logging

### Request Body
```json
{
  "username": "dev",
  "password": "password123"
}
```

### Responses

#### 200 OK (Success)
Returned when user credentials are valid and user has access to the `DE_CGV4` department.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzQU1BY2NvdW50TmFtZSI6ImRldiIsIm1haWwiOiJkZXZAY29tcGFueS5jb20iLCJtZW1iZXJPZiI6WyJERV9DR1Y0Il19...",
    "email": "dev@msil.co.in",
    "name": "Dev Kumar",
    "role": "ROLE_USER"
  },
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

#### 401 Unauthorized (Error)
Returned when the username or password is invalid.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": false,
  "message": "Invalid username or password",
  "data": null,
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

#### 403 Forbidden (Error)
Returned when authentication succeeds, but the user is not authorized because they do not belong to the department Active Directory group `DE_CGV4`.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": false,
  "message": "Access Denied: User is not a member of department DE_CGV4",
  "data": null,
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

#### 429 Too Many Requests (Error)
Returned if the rate limit for login attempts has been exceeded.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "data": null,
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

---

## 2. GET /api/me

Retrieve the profile details, mapped roles, and module-grouped permissions of the currently authenticated user session.

- **HTTP Method**: `GET`
- **Path**: `/api/me`
- **Security**: Required (`Authorization: Bearer <token>`)
- **Headers**:
  - `Authorization`: `Bearer <jwt_token>` (Required)

### Responses

#### 200 OK (Success)
Returned when the caller has a valid token and their record exists in the local database.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "userId": 1,
      "employeeId": "1001",
      "samAccountName": "dev",
      "userPrincipalName": "dev@msil.co.in",
      "displayName": "Dev Kumar",
      "surname": "Kumar",
      "email": "dev@msil.co.in",
      "status": "ACTIVE",
      "firstLogin": false,
      "lastLoginAt": "2026-07-14T10:15:32",
      "createdAt": "2026-07-13T12:00:00",
      "updatedAt": "2026-07-14T10:15:32",
      "role": "ROLE_USER"
    },
    "roles": [
      {
        "roleId": 1,
        "roleName": "ROLE_USER"
      }
    ],
    "permissions": {
      "Dashboard": [
        "VIEW"
      ],
      "Attendance": [
        "VIEW_SELF",
        "CHECK_IN",
        "CHECK_OUT",
        "HISTORY_VIEW"
      ],
      "Employee": [
        "PROFILE_VIEW",
        "PROFILE_UPDATE_PREFERENCES"
      ]
    }
  },
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

#### 401 Unauthorized (Error)
Returned if the token is missing, malformed, expired, or signature validation failed.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": false,
  "message": "Unauthorized",
  "data": null,
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

#### 404 Not Found (Error)
Returned if the token validates successfully, but the user's `sAMAccountName` does not exist in the local database.

- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": false,
  "message": "User not found with username: unknown",
  "data": null,
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

---

## 3. GET /api/employees

Returns a paginated list of portal users with support for searching, filtering, and sorting.

- **HTTP Method**: `GET`
- **Path**: `/api/employees`
- **Security**: Required (`Authorization: Bearer <token>`) AND the user must have authority `EMPLOYEE_VIEW_ALL`.
- **Query Parameters**:
  - `page` (Integer, Optional): Page index to retrieve (default: `0`).
  - `size` (Integer, Optional): Page record size (default: `20`).
  - `search` (String, Optional): Substring search against Employee ID, Name, or Email (case-insensitive).
  - `role` (String, Optional): Filter by role name (e.g. `ROLE_USER`, `ROLE_ADMIN`).
  - `status` (String, Optional): Filter by status (e.g. `ACTIVE`, `INACTIVE`, `LOCKED`).
  - `sort` (String, Optional): Field and direction parameter (default: `displayName,asc`).

### Responses

#### 200 OK (Success)
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "data": {
    "content": [
      {
        "userId": 1,
        "employeeId": "1001",
        "displayName": "Dev Kumar",
        "email": "dev@msil.co.in",
        "roles": [
          "ROLE_USER"
        ],
        "status": "ACTIVE",
        "lastLoginAt": "2026-07-14T10:15:32"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  },
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

#### 401 Unauthorized (Error)
Returned if the token is invalid, expired, or missing.

#### 403 Forbidden (Error)
Returned if the user lacks the `EMPLOYEE_VIEW_ALL` authority.
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": false,
  "message": "Access denied",
  "data": null,
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

---

## 4. GET /api/employees/{userId}

Returns detailed profile information, roles, and permissions of a single user.

- **HTTP Method**: `GET`
- **Path**: `/api/employees/{userId}`
- **Security**: Required (`Authorization: Bearer <token>`) AND the user must have authority `EMPLOYEE_VIEW_ALL`.
- **Path Parameters**:
  - `userId` (Long, Required): The primary key ID of the user.

> [!NOTE]
> For privacy reasons, the `roles` field will contain `null` in the JSON response if the requesting user does *not* have `ROLE_ADMIN` role.

### Responses

#### 200 OK (Success) - Requesting User has `ROLE_ADMIN`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": true,
  "message": "Employee details retrieved successfully",
  "data": {
    "userId": 1,
    "employeeId": "1001",
    "displayName": "Dev Kumar",
    "email": "dev@msil.co.in",
    "status": "ACTIVE",
    "roles": [
      "ROLE_USER"
    ],
    "permissions": [
      "EMPLOYEE_VIEW_ALL"
    ],
    "lastLoginAt": "2026-07-14T10:15:32",
    "createdAt": "2026-07-13T12:00:00"
  },
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

#### 200 OK (Success) - Requesting User does NOT have `ROLE_ADMIN`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": true,
  "message": "Employee details retrieved successfully",
  "data": {
    "userId": 1,
    "employeeId": "1001",
    "displayName": "Dev Kumar",
    "email": "dev@msil.co.in",
    "status": "ACTIVE",
    "roles": null,
    "permissions": [
      "EMPLOYEE_VIEW_ALL"
    ],
    "lastLoginAt": "2026-07-14T10:15:32",
    "createdAt": "2026-07-13T12:00:00"
  },
  "timestamp": "2026-07-14T12:09:59.123456"
}
```

#### 403 Forbidden (Error)
Returned if the requesting user lacks the `EMPLOYEE_VIEW_ALL` authority.

#### 400 Bad Request (Error)
Returned if the specified user ID does not exist in the database.
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "success": false,
  "message": "User not found with ID: 999",
  "data": null,
  "timestamp": "2026-07-14T12:09:59.123456"
}
```
