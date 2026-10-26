# Feature: Issue Report

**Feature ID:** 10
**Branch pattern:** `feature/10-issue-report`
**Status:** Draft
**Created:** 2026-10-23
**Input:** A signed-in user reports an issue for a vehicle before, during, or after a trip. The report stores who wrote it. A vehicle request and an assignee are optional. Issue reports are added and edited with a dialog.
**Depends on:** Feature 1 [User Auth], Feature 5 [Vehicles], Feature 8 [Vehicle Requests]

---

## User Stories

### US-10.1: Create issue reports

**As a** signed-in user
**I want to** report an issue for a vehicle
**So that** problems found before, during, or after a trip are recorded

**Priority:** P1
**Independent test:** Open the issue report dialog, create a report; it appears in the issue reports view with the signed-in user as the author
**Acceptance scenarios:** see ### US-10.1 under Acceptance Criteria

### US-10.2: View issue reports

**As a** signed-in user
**I want to** see all issue reports
**So that** I can see which issues have been reported

**Priority:** P1
**Independent test:** Issue reports view loads a single list of issue reports
**Acceptance scenarios:** see ### US-10.2 under Acceptance Criteria

### US-10.3: Manage issue report rows

**As a** signed-in user
**I want** each issue report row to have **edit** and **delete** actions
**So that** I can manage issue reports from the issue reports view

**Priority:** P1
**Independent test:** Each issue report row exposes edit and delete icon actions
**Acceptance scenarios:** see ### US-10.3 under Acceptance Criteria

### US-10.4: Edit and delete issue reports

**As a** signed-in user
**I want to** edit or delete an issue report
**So that** I can correct, assign, resolve, or remove a report

**Priority:** P2
**Independent test:** Edit and delete issue reports from row actions; the issue reports view updates; the author does not change
**Acceptance scenarios:** see ### US-10.4 under Acceptance Criteria

### US-10.5: Signed-in user access only

**As a** signed-in user
**I want to** have issue reports visible only to signed-in users
**So that** unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/issue-reports` is redirected to `/login`; unauthorized API requests receive errors
**Acceptance scenarios:** see ### US-10.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All issue report endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: An issue report MUST store `vehicleId`, `authorId`, `type`, `description`, and `status`. `vehicleRequestId`, `assigneeId`, and `resolvedAt` are optional. `id` is assigned by the database.
- **FR-003**: `authorId` MUST be set from the authenticated session on create. An `authorId` in the request body MUST be ignored. An update MUST NOT change `authorId`.
- **FR-004**: `vehicleId` MUST reference an existing vehicle. A missing `vehicleId` MUST be rejected. A `vehicleId` that does not exist MUST be rejected.
- **FR-005**: `vehicleRequestId` MAY be omitted or `null`. When it is sent, it MUST reference an existing vehicle request.
- **FR-006**: `assigneeId` MAY be omitted or `null`. When it is sent, it MUST reference an existing user.
- **FR-007**: `type` MUST be one of `low_gas`, `dirty`, `maintenance`, or `other`. A missing or other value MUST be rejected.
- **FR-008**: `description` MUST be trimmed before save. An empty or whitespace-only description MUST be rejected.
- **FR-009**: `status` MUST be one of `pending`, `resolved`, or `cancelled`. A missing or other value MUST be rejected.
- **FR-010**: When `status` is `resolved`, `resolvedAt` MUST be a valid calendar date (`YYYY-MM-DD`). When `status` is `pending` or `cancelled`, `resolvedAt` MUST be `null` or omitted.

---

## Assumptions

- Issue reports use **dialog-based** workflows (no split sidebar / main panel).
- Feature 1 provides sign in but no roles. Every signed-in user may create and manage issue reports. Restricting that by role will be in a later feature.
- Feature 5 provides vehicles. Feature 8 provides vehicle requests. This feature does not create vehicles or vehicle requests.
- The author is shown with that user's first and last name. An assignee, when set, is shown the same way.
- A vehicle in the list is shown by its `universityId`.
- A vehicle request in the list is shown by its id and `purpose`.
- The create dialog pre-selects status `pending`. The resolved date field is available only when status is `resolved`.
- `type` labels are **Low gas**, **Dirty**, **Maintenance**, and **Other**. Stored values stay `low_gas`, `dirty`, `maintenance`, and `other`.
- `status` labels are **Pending**, **Resolved**, and **Cancelled**. Stored values stay `pending`, `resolved`, and `cancelled`.
- A vehicle request does not have to refer to the same vehicle as the report.
- Delete removes the issue report row. No other table references `issueReports` yet, so this feature does not block a delete.

## Edge Cases

- Missing vehicle, type, description, or status → client block and/or `400`.
- Whitespace-only description → client block and/or `400`.
- `type` or `status` outside the allowed values → `400`.
- `status` `resolved` without a valid `resolvedAt` → `400`.
- `resolvedAt` sent when `status` is `pending` or `cancelled` → `400`.
- `vehicleId`, `vehicleRequestId`, or `assigneeId` that does not exist → `404`.
- Request body `authorId` different from the signed-in user → stored `authorId` stays the session user on create, and stays unchanged on update.
- Unauthenticated issue reports screen → redirect.
- Unauthenticated API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in user can create, view, edit, and delete issue reports on one screen.
- **SC-003**: `npm test` passes for issue reports API and issue reports view behavior.

---

## Data Ownership & Isolation

Any signed in user may create, edit, delete, or read the list of issue reports. The `authorId` on a row is the user who wrote it, not a permission scope.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/issue-reports` and `GET /api/issue-reports/:issueReportId` require a Bearer token. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token. |
| **Create scope** | `POST` requires a Bearer token. `authorId` comes from that token. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/issue-reports` | Yes | Fetch all issue reports |
| `GET` | `/api/issue-reports/:issueReportId` | Yes | Fetch a single issue report |
| `POST` | `/api/issue-reports` | Yes | Create an issue report |
| `PUT` | `/api/issue-reports/:issueReportId` | Yes | Edit an issue report |
| `DELETE` | `/api/issue-reports/:issueReportId` | Yes | Delete an issue report |

**Create issue report request body:**

```json
{
  "vehicleId": 3,
  "vehicleRequestId": 12,
  "assigneeId": 5,
  "type": "low_gas",
  "description": "Tank is on empty.",
  "status": "pending"
}
```

`vehicleRequestId` and `assigneeId` may be omitted or `null`. Do not send `authorId`. Do not send `resolvedAt` unless `status` is `resolved`.

**Issue report success response** (`200` / `201`):

```json
{
  "id": 1,
  "vehicleId": 3,
  "vehicleRequestId": 12,
  "authorId": 2,
  "assigneeId": 5,
  "type": "low_gas",
  "description": "Tank is on empty.",
  "status": "pending",
  "resolvedAt": null,
  "author": {
    "id": 2,
    "firstName": "Jane",
    "lastName": "Doe"
  },
  "assignee": {
    "id": 5,
    "firstName": "Alex",
    "lastName": "Kim"
  },
  "vehicle": {
    "id": 3,
    "universityId": "V-100"
  },
  "vehicleRequest": {
    "id": 12,
    "purpose": "Campus visit"
  },
  "createdAt": "2026-10-23T12:00:00.000Z",
  "updatedAt": "2026-10-23T12:00:00.000Z"
}
```

When `vehicleRequestId` is `null`, `vehicleRequest` is `null`. When `assigneeId` is `null`, `assignee` is `null`.

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404` (do not use `403`).

---

## Screen Requirements

### [View: Issue Reports] — route name `issue-reports`

**Single Vue view** (`IssueReports.vue`) — no sidebar / main-panel split.

- Heading: **Issue Reports**
- Primary action: **+ New Issue Report** opens a `<v-dialog>` with **Vehicle**, **Vehicle request**, **Type**, **Description**, **Status**, **Assignee**, and **Resolved date**, plus **Create** / **Cancel**.
  - **Vehicle** is a `<v-select>` of existing vehicles, labeled by `universityId`.
  - **Vehicle request** is an optional `<v-select>` of existing vehicle requests, labeled by id and `purpose`.
  - **Type** is a `<v-select>` of **Low gas**, **Dirty**, **Maintenance**, and **Other**.
  - **Status** is a `<v-select>` of **Pending**, **Resolved**, and **Cancelled**. It starts on **Pending**.
  - **Assignee** is an optional `<v-select>` of users, labeled by first and last name.
  - **Resolved date** is shown only when status is **Resolved**.
  - There is no author field. The signed-in user is stored by the API.
- Display issue reports as rows. Each row shows the vehicle `universityId`, the type label, the status label, the description, the author's first and last name, the assignee's first and last name when set, and the resolved date when set.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current vehicle, vehicle request, type, description, status, assignee, and resolved date; **Save** / **Cancel**.
  - The author is not editable.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit issue report**, **Delete issue report**).
- **Empty state:** **"No issue reports yet. Create your first issue report."** when there are no issue reports.
- **Loading state:** skeleton or progress indicator while issue reports are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for issue reports; delete dialog is a reusable component in `components/common` folder; create and edit dialogs should be components stored in a dedicated `components/issueReports` folder and modeled after existing create and edit dialogs in `components/` folders.

---

## Key Entities

- **IssueReport**: one reported problem for a single vehicle, written by one user. It may point at a vehicle request and may be assigned to a user.
- **Vehicle**: the vehicle the report is about. Provided by Feature 5.
- **VehicleRequest**: the trip the report is about, when the reporter ties it to a request. Provided by Feature 8.
- **User**: the author who wrote the report, and the optional assignee.

---

## Data Model Requirements

### `issueReports` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `vehicleId` | INTEGER FK | Required; must reference `vehicles.id` |
| `vehicleRequestId` | INTEGER FK | Optional; `null` or must reference `vehicleRequests.id` |
| `authorId` | INTEGER FK | Required; set from the session; must reference `users.id` |
| `assigneeId` | INTEGER FK | Optional; `null` or must reference `users.id` |
| `type` | ENUM | Required; `low_gas`, `dirty`, `maintenance`, or `other` |
| `description` | TEXT | Required; trimmed; not whitespace-only |
| `status` | ENUM | Required; `pending`, `resolved`, or `cancelled` |
| `resolvedAt` | DATEONLY | Required when `status` is `resolved`; otherwise `null` |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- `IssueReport` belongs to `Vehicle`
- `IssueReport` belongs to `VehicleRequest`
- `IssueReport` belongs to `User` as `author` through `authorId`
- `IssueReport` belongs to `User` as `assignee` through `assigneeId`
- `Vehicle` has many `IssueReport`
- `VehicleRequest` has many `IssueReport`
- `User` has many `IssueReport` as author
- `User` has many `IssueReport` as assignee

---

## Acceptance Criteria (Gherkin)

### US-10.1 — Create issue reports

#### Scenario: User creates issue report

- **Given** I am signed in on the issue reports view
- **When** I click **+ New Issue Report**
- **Then** a dialog opens with **Vehicle**, **Vehicle request**, **Type**, **Description**, **Status**, **Assignee**, and no author field
- **And** **Status** is **Pending**
- **And** **Resolved date** is not shown

#### Scenario: User saves issue report

- **Given** I am signed in as Jane Doe on the issue reports view
- **And** a vehicle with id `3` and university id `V-100` exists
- **When** I submit the create dialog with that vehicle, type **Low gas**, description `Tank is on empty.`, and status **Pending**
- **Then** the API returns `201` with that issue report
- **And** `authorId` is my user id
- **And** `vehicleRequestId` is `null`
- **And** `assigneeId` is `null`
- **And** `resolvedAt` is `null`
- **And** the issue reports list shows `V-100`, `Low gas`, `Pending`, `Tank is on empty.`, and `Jane Doe`

#### Scenario: User saves issue report with a vehicle request and assignee

- **Given** I am signed in on the issue reports view
- **And** a vehicle with id `3` exists
- **And** a vehicle request with id `12` and purpose `Campus visit` exists
- **And** a user Alex Kim with id `5` exists
- **When** I submit the create dialog with that vehicle, that vehicle request, that assignee, type **Dirty**, description `Interior needs cleaning.`, and status **Pending**
- **Then** the API returns `201`
- **And** `vehicleRequestId` is `12`
- **And** `assigneeId` is `5`
- **And** the list shows `Campus visit` and `Alex Kim`

#### Scenario: User saves a resolved issue report

- **Given** I am signed in on the issue reports view
- **And** a vehicle with id `3` exists
- **When** I choose status **Resolved**
- **Then** **Resolved date** is shown
- **When** I submit with that vehicle, type **Other**, description `Spare key is missing.`, status **Resolved**, and resolved date `2026-10-23`
- **Then** the API returns `201` with `status` `resolved` and `resolvedAt` `2026-10-23`

#### Scenario: User creates issue report with missing vehicle

- **Given** I am signed in on the issue reports view
- **When** I submit the create dialog without a vehicle
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User creates issue report with missing type

- **Given** I am signed in on the issue reports view
- **When** I submit the create dialog without a type
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User creates issue report with missing description

- **Given** I am signed in on the issue reports view
- **When** I submit the create dialog without a description
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User creates issue report with a whitespace-only description

- **Given** I am signed in on the issue reports view
- **When** I submit the create dialog with description ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User creates issue report with missing status

- **Given** I am signed in on the issue reports view
- **When** I submit the create dialog without a status
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User creates a resolved issue report with missing resolved date

- **Given** I am signed in on the issue reports view
- **When** I submit the create dialog with status **Resolved** and no resolved date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User requests to create an issue report with a missing vehicle

- **Given** I am signed in
- **When** I request `POST /api/issue-reports` with `{ "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `400` with `{ "message": "Missing vehicle." }`

#### Scenario: User requests to create an issue report with a missing type

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `400` with `{ "message": "Missing type." }`

#### Scenario: User requests to create an issue report with an invalid type

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "type": "broken", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `400` with `{ "message": "Invalid type." }`

#### Scenario: User requests to create an issue report with a missing description

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "type": "low_gas", "description": " ", "status": "pending" }`
- **Then** the API returns `400` with `{ "message": "Missing description." }`

#### Scenario: User requests to create an issue report with a missing status

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "type": "low_gas", "description": "Tank is on empty." }`
- **Then** the API returns `400` with `{ "message": "Missing status." }`

#### Scenario: User requests to create an issue report with an invalid status

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "type": "low_gas", "description": "Tank is on empty.", "status": "open" }`
- **Then** the API returns `400` with `{ "message": "Invalid status." }`

#### Scenario: User requests to create a resolved issue report with a missing resolved date

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "type": "other", "description": "Spare key is missing.", "status": "resolved" }`
- **Then** the API returns `400` with `{ "message": "Missing resolved date." }`

#### Scenario: User requests to create a resolved issue report with an invalid resolved date

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "type": "other", "description": "Spare key is missing.", "status": "resolved", "resolvedAt": "not-a-date" }`
- **Then** the API returns `400` with `{ "message": "Invalid resolved date." }`

#### Scenario: User requests to create a pending issue report with a resolved date

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "type": "low_gas", "description": "Tank is on empty.", "status": "pending", "resolvedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Resolved date must be empty." }`

#### Scenario: User requests to create an issue report for a vehicle that does not exist

- **Given** I am signed in
- **And** a vehicle with id `999` does not exist
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 999, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `404` with `{ "message": "Vehicle not found." }`

#### Scenario: User requests to create an issue report for a vehicle request that does not exist

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **And** a vehicle request with id `999` does not exist
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "vehicleRequestId": 999, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `404` with `{ "message": "Vehicle request not found." }`

#### Scenario: User requests to create an issue report with an assignee that does not exist

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **And** a user with id `999` does not exist
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "assigneeId": 999, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `404` with `{ "message": "Assignee not found." }`

#### Scenario: User requests to create an issue report with a different authorId

- **Given** I am signed in as user id `2`
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/issue-reports` with `{ "vehicleId": 3, "authorId": 8, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `201`
- **And** the stored `authorId` is `2`

---

### US-10.2 — View issue reports

#### Scenario: Issue reports view lists issue reports

- **Given** I am signed in
- **And** an issue report exists for vehicle `V-100`, type `low_gas`, status `pending`, description `Tank is on empty.`, written by Jane Doe, with no assignee
- **When** I open the issue reports view
- **Then** I see a row with `V-100`, `Low gas`, `Pending`, `Tank is on empty.`, and `Jane Doe`
- **And** that row has no assignee name

#### Scenario: Issue reports empty state

- **Given** I am signed in and there are no issue reports
- **When** I open the issue reports view
- **Then** I see **"No issue reports yet. Create your first issue report."**

---

### US-10.3 — Manage issue report rows

#### Scenario: Issue report rows have edit and delete actions

- **Given** I am signed in and at least one issue report exists
- **When** I view the issue reports list
- **Then** each row shows **Edit issue report** and **Delete issue report**

---

### US-10.4 — Edit and delete issue reports

#### Scenario: User edits an issue report description

- **Given** I am signed in and an issue report with description `Tank is on empty.` exists
- **When** I change the description to `Tank is below a quarter.` and submit
- **Then** the API returns `200` with the updated issue report
- **And** the list shows `Tank is below a quarter.`

#### Scenario: User edits an issue report type

- **Given** I am signed in and an issue report with type `low_gas` exists
- **When** I change the type to **Maintenance** and submit
- **Then** the API returns `200` with `type` `maintenance`
- **And** the list shows `Maintenance`

#### Scenario: User edits an issue report to resolved

- **Given** I am signed in and a pending issue report exists
- **When** I change the status to **Resolved**, set the resolved date to `2026-10-24`, and submit
- **Then** the API returns `200` with `status` `resolved` and `resolvedAt` `2026-10-24`
- **And** the list shows `Resolved` and `2026-10-24`

#### Scenario: User clears an issue report assignee

- **Given** I am signed in and an issue report assigned to Alex Kim exists
- **When** I clear the assignee and submit
- **Then** the API returns `200` with `assigneeId` `null`
- **And** the list no longer shows `Alex Kim` on that row

#### Scenario: User edits an issue report to have a missing description

- **Given** I am signed in on the issue reports view
- **And** I am editing an existing issue report
- **When** I submit the edit dialog without a description
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User requests to edit an issue report to have a missing description

- **Given** I am signed in
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "low_gas", "description": " ", "status": "pending" }`
- **Then** the API returns `400` with `{ "message": "Missing description." }`

#### Scenario: User requests to edit an issue report to have an invalid type

- **Given** I am signed in
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "broken", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `400` with `{ "message": "Invalid type." }`

#### Scenario: User requests to edit an issue report to resolved without a resolved date

- **Given** I am signed in
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "other", "description": "Spare key is missing.", "status": "resolved" }`
- **Then** the API returns `400` with `{ "message": "Missing resolved date." }`

#### Scenario: User requests to edit an issue report to pending with a resolved date

- **Given** I am signed in
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "low_gas", "description": "Tank is on empty.", "status": "pending", "resolvedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Resolved date must be empty." }`

#### Scenario: User requests to edit an issue report to a vehicle that does not exist

- **Given** I am signed in
- **And** an issue report with id `1` exists
- **And** a vehicle with id `999` does not exist
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 999, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `404` with `{ "message": "Vehicle not found." }`

#### Scenario: User requests to edit an issue report with a different authorId

- **Given** I am signed in
- **And** an issue report with id `1` was written by user id `2`
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "authorId": 8, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `200`
- **And** the stored `authorId` is still `2`

#### Scenario: User deletes an issue report

- **Given** I am signed in and an issue report with description `Tank is on empty.` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that issue report is removed from the list

#### Scenario: User updates an issue report that does not exist

- **Given** I am signed in
- **And** an issue report with id `999` does not exist
- **When** I request `PUT /api/issue-reports/999` with a valid body
- **Then** the API returns `404`

#### Scenario: User updates an issue report with an invalid issueReportId

- **Given** I am signed in
- **When** I request `PUT /api/issue-reports/abc` with a valid body
- **Then** the API returns `400`

#### Scenario: User deletes an issue report that does not exist

- **Given** I am signed in
- **And** an issue report with id `999` does not exist
- **When** I request `DELETE /api/issue-reports/999`
- **Then** the API returns `404`

#### Scenario: User deletes an issue report with an invalid issueReportId

- **Given** I am signed in
- **When** I request `DELETE /api/issue-reports/abc`
- **Then** the API returns `400`

---

### US-10.5: Signed-in user access only

#### Scenario: Un-signed-in user accesses issue reports page

- **Given** I am not signed in
- **When** I navigate to `/issue-reports` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to issue reports

- **Given** I have no valid session token
- **When** I request `GET /api/issue-reports`
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

#### Scenario: Unauthenticated API request to a particular issue report

- **Given** I have no valid session token
- **And** an issue report with id `1` exists
- **When** I request `GET /api/issue-reports/1`
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

#### Scenario: Unauthenticated API request to create an issue report

- **Given** I have no valid session token
- **When** I request `POST /api/issue-reports` with a valid body
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

#### Scenario: Unauthenticated API request to update an issue report

- **Given** I have no valid session token
- **And** an issue report with id `1` exists
- **When** I request `PUT /api/issue-reports/1` with a valid body
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

#### Scenario: Unauthenticated API request to delete an issue report

- **Given** I have no valid session token
- **And** an issue report with id `1` exists
- **When** I request `DELETE /api/issue-reports/1`
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-10.1 | User creates issue report | `frontend/tests/IssueReports.test.js` | `User creates issue report` |
| US-10.1 | User saves issue report | `backend/tests/issueReports.test.js` | `User saves issue report` |
| US-10.1 | User saves issue report | `frontend/tests/IssueReports.test.js` | `User saves issue report` |
| US-10.1 | User saves issue report with a vehicle request and assignee | `backend/tests/issueReports.test.js` | `User saves issue report with a vehicle request and assignee` |
| US-10.1 | User saves issue report with a vehicle request and assignee | `frontend/tests/IssueReports.test.js` | `User saves issue report with a vehicle request and assignee` |
| US-10.1 | User saves a resolved issue report | `backend/tests/issueReports.test.js` | `User saves a resolved issue report` |
| US-10.1 | User saves a resolved issue report | `frontend/tests/IssueReports.test.js` | `User saves a resolved issue report` |
| US-10.1 | User creates issue report with missing vehicle | `frontend/tests/IssueReports.test.js` | `User creates issue report with missing vehicle` |
| US-10.1 | User creates issue report with missing type | `frontend/tests/IssueReports.test.js` | `User creates issue report with missing type` |
| US-10.1 | User creates issue report with missing description | `frontend/tests/IssueReports.test.js` | `User creates issue report with missing description` |
| US-10.1 | User creates issue report with a whitespace-only description | `frontend/tests/IssueReports.test.js` | `User creates issue report with a whitespace-only description` |
| US-10.1 | User creates issue report with missing status | `frontend/tests/IssueReports.test.js` | `User creates issue report with missing status` |
| US-10.1 | User creates a resolved issue report with missing resolved date | `frontend/tests/IssueReports.test.js` | `User creates a resolved issue report with missing resolved date` |
| US-10.1 | User requests to create an issue report with a missing vehicle | `backend/tests/issueReports.test.js` | `User requests to create an issue report with a missing vehicle` |
| US-10.1 | User requests to create an issue report with a missing type | `backend/tests/issueReports.test.js` | `User requests to create an issue report with a missing type` |
| US-10.1 | User requests to create an issue report with an invalid type | `backend/tests/issueReports.test.js` | `User requests to create an issue report with an invalid type` |
| US-10.1 | User requests to create an issue report with a missing description | `backend/tests/issueReports.test.js` | `User requests to create an issue report with a missing description` |
| US-10.1 | User requests to create an issue report with a missing status | `backend/tests/issueReports.test.js` | `User requests to create an issue report with a missing status` |
| US-10.1 | User requests to create an issue report with an invalid status | `backend/tests/issueReports.test.js` | `User requests to create an issue report with an invalid status` |
| US-10.1 | User requests to create a resolved issue report with a missing resolved date | `backend/tests/issueReports.test.js` | `User requests to create a resolved issue report with a missing resolved date` |
| US-10.1 | User requests to create a resolved issue report with an invalid resolved date | `backend/tests/issueReports.test.js` | `User requests to create a resolved issue report with an invalid resolved date` |
| US-10.1 | User requests to create a pending issue report with a resolved date | `backend/tests/issueReports.test.js` | `User requests to create a pending issue report with a resolved date` |
| US-10.1 | User requests to create an issue report for a vehicle that does not exist | `backend/tests/issueReports.test.js` | `User requests to create an issue report for a vehicle that does not exist` |
| US-10.1 | User requests to create an issue report for a vehicle request that does not exist | `backend/tests/issueReports.test.js` | `User requests to create an issue report for a vehicle request that does not exist` |
| US-10.1 | User requests to create an issue report with an assignee that does not exist | `backend/tests/issueReports.test.js` | `User requests to create an issue report with an assignee that does not exist` |
| US-10.1 | User requests to create an issue report with a different authorId | `backend/tests/issueReports.test.js` | `User requests to create an issue report with a different authorId` |
| US-10.2 | Issue reports view lists issue reports | `frontend/tests/IssueReports.test.js` | `Issue reports view lists issue reports` |
| US-10.2 | Issue reports empty state | `frontend/tests/IssueReports.test.js` | `Issue reports empty state` |
| US-10.3 | Issue report rows have edit and delete actions | `frontend/tests/IssueReports.test.js` | `Issue report rows have edit and delete actions` |
| US-10.4 | User edits an issue report description | `backend/tests/issueReports.test.js` | `User edits an issue report description` |
| US-10.4 | User edits an issue report description | `frontend/tests/IssueReports.test.js` | `User edits an issue report description` |
| US-10.4 | User edits an issue report type | `backend/tests/issueReports.test.js` | `User edits an issue report type` |
| US-10.4 | User edits an issue report type | `frontend/tests/IssueReports.test.js` | `User edits an issue report type` |
| US-10.4 | User edits an issue report to resolved | `backend/tests/issueReports.test.js` | `User edits an issue report to resolved` |
| US-10.4 | User edits an issue report to resolved | `frontend/tests/IssueReports.test.js` | `User edits an issue report to resolved` |
| US-10.4 | User clears an issue report assignee | `backend/tests/issueReports.test.js` | `User clears an issue report assignee` |
| US-10.4 | User clears an issue report assignee | `frontend/tests/IssueReports.test.js` | `User clears an issue report assignee` |
| US-10.4 | User edits an issue report to have a missing description | `frontend/tests/IssueReports.test.js` | `User edits an issue report to have a missing description` |
| US-10.4 | User requests to edit an issue report to have a missing description | `backend/tests/issueReports.test.js` | `User requests to edit an issue report to have a missing description` |
| US-10.4 | User requests to edit an issue report to have an invalid type | `backend/tests/issueReports.test.js` | `User requests to edit an issue report to have an invalid type` |
| US-10.4 | User requests to edit an issue report to resolved without a resolved date | `backend/tests/issueReports.test.js` | `User requests to edit an issue report to resolved without a resolved date` |
| US-10.4 | User requests to edit an issue report to pending with a resolved date | `backend/tests/issueReports.test.js` | `User requests to edit an issue report to pending with a resolved date` |
| US-10.4 | User requests to edit an issue report to a vehicle that does not exist | `backend/tests/issueReports.test.js` | `User requests to edit an issue report to a vehicle that does not exist` |
| US-10.4 | User requests to edit an issue report with a different authorId | `backend/tests/issueReports.test.js` | `User requests to edit an issue report with a different authorId` |
| US-10.4 | User deletes an issue report | `backend/tests/issueReports.test.js` | `User deletes an issue report` |
| US-10.4 | User deletes an issue report | `frontend/tests/IssueReports.test.js` | `User deletes an issue report` |
| US-10.4 | User updates an issue report that does not exist | `backend/tests/issueReports.test.js` | `User updates an issue report that does not exist` |
| US-10.4 | User updates an issue report with an invalid issueReportId | `backend/tests/issueReports.test.js` | `User updates an issue report with an invalid issueReportId` |
| US-10.4 | User deletes an issue report that does not exist | `backend/tests/issueReports.test.js` | `User deletes an issue report that does not exist` |
| US-10.4 | User deletes an issue report with an invalid issueReportId | `backend/tests/issueReports.test.js` | `User deletes an issue report with an invalid issueReportId` |
| US-10.5 | Un-signed-in user accesses issue reports page | `frontend/tests/IssueReports.test.js` | `Un-signed-in user accesses issue reports page` |
| US-10.5 | Unauthenticated API request to issue reports | `backend/tests/issueReports.test.js` | `Unauthenticated API request to issue reports` |
| US-10.5 | Unauthenticated API request to a particular issue report | `backend/tests/issueReports.test.js` | `Unauthenticated API request to a particular issue report` |
| US-10.5 | Unauthenticated API request to create an issue report | `backend/tests/issueReports.test.js` | `Unauthenticated API request to create an issue report` |
| US-10.5 | Unauthenticated API request to update an issue report | `backend/tests/issueReports.test.js` | `Unauthenticated API request to update an issue report` |
| US-10.5 | Unauthenticated API request to delete an issue report | `backend/tests/issueReports.test.js` | `Unauthenticated API request to delete an issue report` |

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 10 from @features/feature-10-issue-report.md on branch `feature/10-issue-report`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `api.md`, `data-model.md`, `behavior.md`.

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-010** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Role checks on issue report endpoints
- Creating a maintenance need from an issue report
- Notes attached to an issue report
- Requiring the report's vehicle to match the vehicle on the linked vehicle request
- Blocking delete when a later feature references an issue report

---

## Delivered to later features

- An issue report row with `id`, `vehicleId`, `vehicleRequestId`, `authorId`, `assigneeId`, `type`, `description`, `status`, and `resolvedAt`
- `GET /api/issue-reports` returns every issue report for any valid session
- Delete removes an existing issue report unconditionally and returns `200`
