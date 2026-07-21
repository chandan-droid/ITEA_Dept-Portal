# Attendance Module API Documentation

This document describes the REST API endpoints provided by the `attendance-management` module in the ITEA Department Portal Backend.

All endpoints require standard Bearer JWT authorization unless specified otherwise. Response formats utilize a generic `ApiResponse` container:
```json
{
  "success": true,
  "message": "Retrieval status message",
  "data": { ... },
  "timestamp": "2026-07-16T12:00:00"
}
```

---

## 1. Attendance Management (`/api/attendance`)

### 1.1 POST `/api/attendance/check-in`
Records the employee's check-in time, IP address, and geographic location coordinates for the current working day.
- **Authority Requirement**: `ATTENDANCE_CHECK_IN`
- **Request Body**: (Optional)
  ```json
  {
    "latitude": 28.4595,
    "longitude": 77.0266
  }
  ```
- **Response Data Example**:
  ```json
  {
    "attendanceId": 125,
    "checkInTime": "2026-07-16T09:00:00",
    "message": "Check-in recorded successfully"
  }
  ```

### 1.2 POST `/api/attendance/check-out`
Records the employee's check-out time and computes their total working minutes.
- **Authority Requirement**: `ATTENDANCE_CHECK_OUT`
- **Response Data Example**:
  ```json
  {
    "workingMinutes": 480,
    "attendanceStatus": "PRESENT",
    "message": "Check-out recorded successfully"
  }
  ```

### 1.3 GET `/api/attendance/today`
Retrieves the check-in and check-out information of the current authenticated user for today.
- **Authority Requirement**: `ATTENDANCE_VIEW_SELF`
- **Response Data Example**:
  ```json
  {
    "attendanceDate": "2026-07-16",
    "checkInTime": "09:00:00",
    "checkOutTime": "17:00:00",
    "workingMinutes": 480,
    "status": "PRESENT"
  }
  ```

### 1.4 GET `/api/attendance/calendar`
Retrieves day-by-day status objects for a given month and year to build a calendar view.
- **Authority Requirement**: `ATTENDANCE_VIEW_SELF`
- **Query Parameters**:
  - `month` (Integer, Optional): Default is the current month.
  - `year` (Integer, Optional): Default is the current year.
- **Response Data Example**:
  ```json
  [
    {
      "date": "2026-07-01",
      "status": "PRESENT",
      "isHoliday": false,
      "holidayName": null
    },
    {
      "date": "2026-07-05",
      "status": "WEEKEND",
      "isHoliday": false,
      "holidayName": null
    }
  ]
  ```

### 1.5 GET `/api/attendance/history`
Returns a paginated list of the user's historical attendance records with support for filtering.
- **Authority Requirement**: `ATTENDANCE_HISTORY_VIEW`
- **Query Parameters**:
  - `fromDate` (ISO-Date, Optional)
  - `toDate` (ISO-Date, Optional)
  - `status` (String, Optional)
  - `page` (Integer, Default: `0`)
  - `size` (Integer, Default: `20`)
  - `sort` (String, Default: `attendanceDate,desc`)

### 1.6 GET `/api/attendance/search`
Enables managers or administrators to search and view team-wide attendance records.
- **Authority Requirement**: `ATTENDANCE_VIEW_TEAM`
- **Query Parameters**:
  - `search` (String, Optional): Searches by employee ID, email, or name.
  - `status` (String, Optional)
  - `fromDate` (ISO-Date, Optional)
  - `toDate` (ISO-Date, Optional)
  - `page` (Integer, Default: `0`)
  - `size` (Integer, Default: `20`)
  - `sort` (String, Default: `attendanceDate,desc`)

---

## 2. Leave Management (`/api/leaves`)

### 2.1 GET `/api/leaves/types`
Lists all supported leave types.
- **Authority Requirement**: `LEAVE_VIEW_SELF`
- **Response Data Example**:
  ```json
  [
    {
      "leaveTypeId": 1,
      "typeName": "Sick Leave",
      "description": "Paid time off for sickness or medical reasons",
      "maxDaysPerYear": 12
    }
  ]
  ```

### 2.2 GET `/api/leaves/balances`
Retrieves the leave balances (total allocated, used, remaining) of the user for the current year.
- **Authority Requirement**: `LEAVE_VIEW_SELF`
- **Response Data Example**:
  ```json
  [
    {
      "leaveTypeId": 1,
      "leaveTypeName": "Sick Leave",
      "totalDays": 12,
      "usedDays": 2,
      "remainingDays": 10,
      "year": 2026
    }
  ]
  ```

### 2.3 POST `/api/leaves/requests`
Submits a new leave request.
- **Authority Requirement**: `LEAVE_CREATE`
- **Request Body**:
  ```json
  {
    "leaveTypeId": 1,
    "fromDate": "2026-08-01",
    "toDate": "2026-08-05",
    "reason": "Family gathering"
  }
  ```
- **Response Data Example**:
  ```json
  {
    "leaveRequestId": 48,
    "status": "PENDING",
    "fromDate": "2026-08-01",
    "toDate": "2026-08-05",
    "reason": "Family gathering"
  }
  ```

### 2.4 GET `/api/leaves/requests/my`
Retrieves the leave requests submitted by the currently logged-in user.
- **Authority Requirement**: `LEAVE_VIEW_SELF`

### 2.5 GET `/api/leaves/requests/pending`
Lists all leave requests currently awaiting approval.
- **Authority Requirement**: `LEAVE_APPROVE`

### 2.6 POST `/api/leaves/requests/{id}/approve`
Approves a pending leave request.
- **Authority Requirement**: `LEAVE_APPROVE`

### 2.7 POST `/api/leaves/requests/{id}/reject`
Rejects a pending leave request.
- **Authority Requirement**: `LEAVE_REJECT`
- **Query Parameters**:
  - `reason` (String, Default: "Rejected by manager")

---

## 3. Work From Home (WFH) Management (`/api/wfh`)

### 3.1 POST `/api/wfh/requests`
Submits a request to work from home on a specific date.
- **Authority Requirement**: `WFH_CREATE`
- **Request Body**:
  ```json
  {
    "wfhDate": "2026-07-20",
    "reason": "Home repair scheduling"
  }
  ```

### 3.2 GET `/api/wfh/requests/my`
Retrieves WFH requests submitted by the current user.
- **Authority Requirement**: `ATTENDANCE_VIEW_SELF`

### 3.3 POST `/api/wfh/requests/{id}/approve`
Approves a WFH request.
- **Authority Requirement**: `WFH_APPROVE`

### 3.4 POST `/api/wfh/requests/{id}/reject`
Rejects a WFH request.
- **Authority Requirement**: `WFH_APPROVE`

---

## 4. Holiday Directory (`/api/holidays`)

### 4.1 GET `/api/holidays`
Lists holidays, optionally filtered by a date range.
- **Authority Requirement**: `ATTENDANCE_VIEW_SELF`
- **Query Parameters**:
  - `fromDate` (ISO-Date, Optional)
  - `toDate` (ISO-Date, Optional)
- **Response Data Example**:
  ```json
  [
    {
      "holidayId": 1,
      "holidayDate": "2026-01-01",
      "holidayName": "New Year's Day",
      "isOptional": false
    }
  ]
  ```

---

## 5. Team Attendance Monitoring (`/api/team`)

### 5.1 GET `/api/team/attendance`
Retrieves list-based attendance summaries of team members for a specific day.
- **Authority Requirement**: `ATTENDANCE_VIEW_TEAM`
- **Query Parameters**:
  - `date` (ISO-Date, Optional): Defaults to today's date.

---

## 6. Reports Monitoring (`/api/reports`)

### 6.1 GET `/api/reports/attendance`
Returns personal attendance summary counts (e.g., total days present, absent, half-days, leaves) within a given date range.
- **Authority Requirement**: `ATTENDANCE_REPORT_VIEW`
- **Query Parameters**:
  - `fromDate` (ISO-Date, Required)
  - `toDate` (ISO-Date, Required)

### 6.2 GET `/api/reports/team-attendance`
Generates a comparative attendance summary list for the manager's team within a date range.
- **Authority Requirement**: `ATTENDANCE_REPORT_VIEW`
- **Query Parameters**:
  - `fromDate` (ISO-Date, Required)
  - `toDate` (ISO-Date, Required)
