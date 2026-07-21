# Project Management Module API Documentation

This document describes the REST API endpoints provided by the `projects-management` module in the ITEA Department Portal Backend.

All endpoints require standard Bearer JWT authorization. Response formats utilize a generic `ApiResponse` container:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-07-17T12:00:00"
}
```

---

## 1. Create Project
Creates a new project record and automatically registers the creator/owner.
* **Endpoint**: `POST /api/projects`
* **Permission / Authority Required**: `PROJECT_CREATE`
* **Request Body**:
  ```json
  {
      "projectName": "DE-CGV4 Portal",
      "description": "Enterprise Governance Portal",
      "objectives": "Digitize department operations",
      "ownerId": 15,
      "plannedStartDate": "2026-08-01",
      "plannedEndDate": "2026-12-31"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
      "success": true,
      "message": "Project created successfully.",
      "data": {
          "projectId": 12,
          "projectCode": "PRJ-0012",
          "status": "PLANNING"
      },
      "timestamp": "2026-07-17T15:30:00"
  }
  ```
* **Validations**:
  * Project name is required and cannot be blank.
  * Project name must be unique.
  * Planned end date must be greater than or equal to planned start date.
  * Owner ID must belong to an existing employee user.

---

## 2. View Assigned Projects
Returns projects where the authenticated user is currently an active member.
* **Endpoint**: `GET /api/projects/my`
* **Permission / Authority Required**: `PROJECT_VIEW_ASSIGNED`
* **Query Parameters**:
  * `page` (default `0`): Page index.
  * `size` (default `10`): Number of records per page.
  * `status` (optional): Filter projects by status (`PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`, `ARCHIVED`).
  * `search` (optional): Case-insensitive search on project name.
* **Success Response (200 OK)**: Paginated response containing list of projects.

---

## 3. View Team Projects
Returns all projects visible to managers or administrators based on filter parameters.
* **Endpoint**: `GET /api/projects`
* **Permission / Authority Required**: `PROJECT_VIEW_TEAM`
* **Query Parameters**:
  * `page` (default `0`)
  * `size` (default `10`)
  * `search` (optional): Case-insensitive match on name or project code.
  * `ownerId` (optional): Filter projects by owner ID.
  * `status` (optional): Filter by project status.
  * `startDate` (optional): Filter planned start date starting from this date (`YYYY-MM-DD`).
  * `endDate` (optional): Filter planned end date up to this date (`YYYY-MM-DD`).
  * `sortBy` (default `projectId`): Sorting field name.
  * `sortDirection` (default `DESC`): Sort order (`ASC` or `DESC`).

---

## 4. Get Project Details
Retrieves detailed overview of a project including membership lists, milestone summaries, recent activities, and statistics.
* **Endpoint**: `GET /api/projects/{projectId}`
* **Permission / Authority Required**: `PROJECT_VIEW_ASSIGNED` OR `PROJECT_VIEW_TEAM`
* **Business Rule**: Users with `PROJECT_VIEW_ASSIGNED` can only retrieve details of projects they are members of.
* **Success Response (200 OK)**: Returns project summary, members list, statistics, milestones list, and recent activities list.

---

## 5. Update Project
Modifies the name, objectives, description, and planned dates of an active project.
* **Endpoint**: `PUT /api/projects/{projectId}`
* **Permission / Authority Required**: `PROJECT_UPDATE`
* **Request Body**:
  ```json
  {
      "projectName": "DE-CGV4 Portal v2",
      "description": "Enterprise Governance Portal Updated",
      "objectives": "Digitize operations further",
      "plannedStartDate": "2026-08-01",
      "plannedEndDate": "2027-01-31"
  }
  ```
* **Validations & Business Rules**:
  * Completed or Archived projects cannot be updated.
  * Project name is required and must be unique.
  * End date must be greater than or equal to start date.

---

## 6. Delete Project
Permanently deletes a project from the workspace.
* **Endpoint**: `DELETE /api/projects/{projectId}`
* **Permission / Authority Required**: `PROJECT_DELETE`
* **Business Rules**:
  * Cannot delete completed projects.
  * Cannot delete archived projects.
  * Cannot delete projects containing active tasks.

---

## 7. Change Project Status
Updates the status of a project.
* **Endpoint**: `PATCH /api/projects/{projectId}/status`
* **Permission / Authority Required**: `PROJECT_CHANGE_STATUS`
* **Request Body**:
  ```json
  {
      "status": "ACTIVE"
  }
  ```
* **Business Rules**:
  * Allowed values: `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`.
  * Archived projects are read-only and status cannot be changed.
  * Recording of transitions (e.g., setting actual start date upon transition to `ACTIVE`) is handled automatically.

---

## 8. Archive Project
Marks a completed project as read-only.
* **Endpoint**: `PATCH /api/projects/{projectId}/archive`
* **Permission / Authority Required**: `PROJECT_ARCHIVE`
* **Business Rules**:
  * Only projects with status `COMPLETED` can be archived.
  * Once archived, status becomes `ARCHIVED`, and the project becomes read-only.

---

## 9. Assign Project Manager
Changes the project manager (`owner_id`) for a project.
* **Endpoint**: `PATCH /api/projects/{projectId}/manager`
* **Permission / Authority Required**: `PROJECT_ASSIGN_MANAGER`
* **Request Body**:
  ```json
  {
      "managerId": 22
  }
  ```
* **Business Rules**:
  * Archived projects cannot be modified.
  * The designated manager must be an existing employee and must already be registered as a member of the project.

---

## 10. Manage Project Members

### 10.1 Add Members
Assigns employee users to a project with specific roles.
* **Endpoint**: `POST /api/projects/{projectId}/members`
* **Permission / Authority Required**: `PROJECT_MANAGE_MEMBERS`
* **Request Body**:
  ```json
  {
      "members": [
          {
              "userId": 15,
              "projectRole": "TEAM_MEMBER"
          },
          {
              "userId": 20,
              "projectRole": "TESTER"
          }
      ]
  }
  ```

### 10.2 List Members
Lists all active project members.
* **Endpoint**: `GET /api/projects/{projectId}/members`
* **Permission / Authority Required**: `PROJECT_VIEW_ASSIGNED`

### 10.3 Update Member Role
Updates the role of a member on a project.
* **Endpoint**: `PUT /api/projects/{projectId}/members/{memberId}`
* **Permission / Authority Required**: `PROJECT_MANAGE_MEMBERS`
* **Request Body**:
  ```json
  {
      "projectRole": "TESTER"
  }
  ```

### 10.4 Remove Member
Removes a member from a project.
* **Endpoint**: `DELETE /api/projects/{projectId}/members/{memberId}`
* **Permission / Authority Required**: `PROJECT_MANAGE_MEMBERS`
* **Business Rules**:
  * Removed members are soft deleted (the `leftAt` field is set to current time).
  * Members with active tasks assigned to them cannot be removed.

---

## 11. Project Documents

### 11.1 Upload Document
Uploads a document to S3 bucket.
* **Endpoint**: `POST /api/projects/{projectId}/documents`
* **Permission / Authority Required**: `PROJECT_DOCUMENT_UPLOAD`
* **Multipart Form Data**:
  * `file`: File attachment stream.

### 11.2 List Documents
Lists document metadata records associated with the project.
* **Endpoint**: `GET /api/projects/{projectId}/documents`
* **Permission / Authority Required**: `PROJECT_VIEW_ASSIGNED`

### 11.3 Download Document
Downloads the original document from S3.
* **Endpoint**: `GET /api/projects/{projectId}/documents/{documentId}`
* **Permission / Authority Required**: `PROJECT_VIEW_ASSIGNED`

### 11.4 Delete Document
Deletes document record from storage and DB.
* **Endpoint**: `DELETE /api/projects/{projectId}/documents/{documentId}`
* **Permission / Authority Required**: `PROJECT_DOCUMENT_DELETE`

---

## 12. Project Comments

### 12.1 Create Comment
Creates a discussion comment on a project.
* **Endpoint**: `POST /api/projects/{projectId}/comments`
* **Permission / Authority Required**: `PROJECT_COMMENT_CREATE`
* **Request Body**:
  ```json
  {
      "comment": "Project kickoff completed."
  }
  ```

### 12.2 View Comments
Retrieves comments associated with a project.
* **Endpoint**: `GET /api/projects/{projectId}/comments`
* **Permission / Authority Required**: `PROJECT_VIEW_ASSIGNED`

### 12.3 Delete Comment
Deletes a comment.
* **Endpoint**: `DELETE /api/projects/{projectId}/comments/{commentId}`
* **Permission / Authority Required**: `PROJECT_COMMENT_DELETE`
* **Business Rule**: Users can delete their own comments. Project managers or admins can delete any comment in the project.

---

## 13. Milestones

### 13.1 Create Milestone
* **Endpoint**: `POST /api/projects/{projectId}/milestones`
* **Permission / Authority Required**: `PROJECT_UPDATE`
* **Request Body**:
  ```json
  {
      "milestoneName": "Requirements Signoff",
      "description": "Finalize core requirements details",
      "targetDate": "2026-08-30"
  }
  ```

### 13.2 View Milestones
* **Endpoint**: `GET /api/projects/{projectId}/milestones`
* **Permission / Authority Required**: `PROJECT_VIEW_ASSIGNED`

### 13.3 Update Milestone
* **Endpoint**: `PUT /api/projects/{projectId}/milestones/{milestoneId}`
* **Permission / Authority Required**: `PROJECT_UPDATE`

### 13.4 Delete Milestone
* **Endpoint**: `DELETE /api/projects/{projectId}/milestones/{milestoneId}`
* **Permission / Authority Required**: `PROJECT_UPDATE`

### 13.5 Complete Milestone
Marks a milestone as completed.
* **Endpoint**: `PATCH /api/projects/{projectId}/milestones/{milestoneId}/complete`
* **Permission / Authority Required**: `PROJECT_UPDATE`

---

## 14. Project Activity History
Retrieves audit trail of events.
* **Endpoint**: `GET /api/projects/{projectId}/activities`
* **Permission / Authority Required**: `PROJECT_ACTIVITY_VIEW`
* **Returned Event Types**:
  * `Project Created`
  * `Project Updated`
  * `Member Added`
  * `Member Removed`
  * `Member Role Updated`
  * `Status Changed`
  * `Manager Changed`
  * `Document Uploaded`
  * `Document Deleted`
  * `Comment Added`
  * `Milestone Created`
  * `Milestone Updated`
  * `Milestone Deleted`
  * `Milestone Completed`
  * `Project Archived`

---

## 15. Project Reports

### 15.1 View Report
Generates project details report.
* **Endpoint**: `GET /api/projects/{projectId}/report`
* **Permission / Authority Required**: `PROJECT_REPORT_VIEW`

### 15.2 Export Report
Downloads report in Excel or PDF format.
* **Endpoint**: `GET /api/projects/{projectId}/report/export`
* **Permission / Authority Required**: `PROJECT_REPORT_EXPORT`
* **Query Parameters**:
  * `format` (default `pdf`): Format of download (`pdf` or `excel`).

---

## 16. Project Dashboard
Retrieves global metrics summary across all projects.
* **Endpoint**: `GET /api/projects/dashboard`
* **Permission / Authority Required**: `PROJECT_VIEW_TEAM`
* **Success Response Example**:
  ```json
  {
      "success": true,
      "message": "Project dashboard details retrieved.",
      "data": {
          "totalProjects": 15,
          "activeProjects": 8,
          "completedProjects": 5,
          "planningProjects": 1,
          "overdueProjects": 1,
          "upcomingMilestones": 6,
          "recentActivities": []
      },
      "timestamp": "2026-07-17T15:30:00"
  }
  ```

---

## 17. Project Statistics
Retrieves statistics metadata for a project.
* **Endpoint**: `GET /api/projects/{projectId}/statistics`
* **Permission / Authority Required**: `PROJECT_VIEW_ASSIGNED`
* **Success Response Example**:
  ```json
  {
      "success": true,
      "message": "Project statistics retrieved.",
      "data": {
          "members": 10,
          "tasks": 0,
          "completedTasks": 0,
          "pendingTasks": 0,
          "progress": 63,
          "milestones": 8,
          "completedMilestones": 5
      },
      "timestamp": "2026-07-17T15:30:00"
  }
  ```
