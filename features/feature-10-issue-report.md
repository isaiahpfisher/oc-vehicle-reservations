# Feature: Issue Report

**Feature ID:** 10
**Branch pattern:** `feature/10-issue-report`
**Status:** Draft
**Created:** 2026-10-23
**Input:** A signed-in user reports an issue for a vehicle before, during, or after a trip. The report stores who wrote it. A vehicle request and an assignee are optional. An admin sees every report. An area admin sees and manages reports for areas they administer. Issue reports are added and edited with a dialog.
**Depends on:** Feature 1 [User Auth], Feature 3 [User Roles], Feature 5 [Vehicles], Feature 8 [Vehicle Requests]

---

## User Stories

### US-10.1: Create issue reports

**As a** signed-in user
**I want to** report an issue for a vehicle
**So that** problems found before, during, or after a trip are recorded

**Priority:** P1
**Independent test:** Open the issue report dialog, create a report; it appears in the issue reports view with the signed-in user as the author
**Acceptance scenarios:** see ### US-10.1 under Acceptance Criteria

### US-10.2: View all issue reports

**As an** admin
**I want to** see all issue reports, and to load the reports written by one user or filed for one vehicle
**So that** I can see which issues have been reported

**Priority:** P1
**Independent test:** An admin opens the issue reports view and sees every report; `GET /api/issue-reports?userId=` and `GET /api/issue-reports?vehicleId=` return the matching reports
**Acceptance scenarios:** see ### US-10.2 under Acceptance Criteria

### US-10.3: View area issue reports

**As an** area admin
**I want to** see issue reports for areas I manage, including reports for one user or one vehicle in those areas
**So that** I can see which issues have been reported in my areas

**Priority:** P1
**Independent test:** An area admin opens the issue reports view and sees only reports for vehicles in areas they administer
**Acceptance scenarios:** see ### US-10.3 under Acceptance Criteria

### US-10.4: Manage issue report rows

**As an** admin or area admin
**I want** each issue report row I am allowed to manage to have **edit** and **delete** actions
**So that** I can manage issue reports from the issue reports view

**Priority:** P1
**Independent test:** Admin rows, and area-admin rows in that admin's areas, expose edit and delete icon actions; other signed-in users do not see those actions
**Acceptance scenarios:** see ### US-10.4 under Acceptance Criteria

### US-10.5: Edit and delete issue reports

**As an** admin or area admin
**I want to** edit or delete an issue report I am allowed to manage
**So that** I can correct, assign, resolve, or remove a report

**Priority:** P2
**Independent test:** An admin edits or deletes any report; an area admin edits or deletes a report in their area; the author does not change
**Acceptance scenarios:** see ### US-10.5 under Acceptance Criteria

### US-10.6: Session and role access

**As an** admin or area admin
**I want** issue report data limited to signed-in users, and list and edit actions limited by role
**So that** unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** A signed-out visit to `/issue-reports` redirects to `/login`; a request with no session returns `401`; a signed-in user who is not an admin or area admin cannot list every report or edit one
**Acceptance scenarios:** see ### US-10.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All issue report endpoints MUST require a valid session (`authenticate` middleware). A missing session MUST return `401`.
- **FR-002**: An issue report MUST store `vehicleId`, `authorId`, `type`, `description`, and `status`. `vehicleRequestId`, `assigneeId`, and `resolvedAt` are optional. `id` is assigned by the database.
- **FR-003**: `authorId` MUST be set from the authenticated session on create. An `authorId` in the request body MUST be ignored. An update MUST NOT change `authorId`.
- **FR-004**: `vehicleId` MUST reference an existing vehicle. A missing `vehicleId` MUST be rejected. A `vehicleId` that does not exist MUST be rejected.
- **FR-005**: `vehicleRequestId` MAY be omitted or `null`. When it is sent, it MUST reference an existing vehicle request.
- **FR-006**: `assigneeId` MAY be omitted or `null`. When it is sent, it MUST reference an existing user.
- **FR-007**: `type` MUST be one of `low_gas`, `dirty`, `maintenance`, or `other`. A missing or other value MUST be rejected.
- **FR-008**: `description` MUST be trimmed before save. An empty or whitespace-only description MUST be rejected.
- **FR-009**: `status` MUST be one of `pending`, `resolved`, or `cancelled`. A missing or other value MUST be rejected.
- **FR-010**: When `status` is `resolved`, `resolvedAt` MUST be a valid calendar date (`YYYY-MM-DD`). When `status` is `pending` or `cancelled`, `resolvedAt` MUST be `null` or omitted.
- **FR-011**: `GET /api/issue-reports` with no query MUST return every issue report for an admin. For an area admin it MUST return only reports whose vehicle belongs to an area they administer. A signed-in user with neither role MUST receive `403`.
- **FR-012**: `GET /api/issue-reports?userId=` MUST return reports whose `authorId` is that user. An admin MAY request any user. An area admin receives only that user's reports in areas they administer. Any other signed-in user MAY request only their own `userId`. Another user's id MUST return `403`. An unknown `userId` MUST return `404`.
- **FR-013**: `GET /api/issue-reports?vehicleId=` MUST return reports for that vehicle. An admin MAY request any vehicle. An area admin MAY request it only when the vehicle belongs to an area they administer; otherwise the response MUST be `403`. A signed-in user with neither role MUST receive `403`. An unknown `vehicleId` MUST return `404`.
- **FR-014**: `GET /api/issue-reports/:issueReportId`, `PUT`, and `DELETE` MUST allow an admin for any report. An area admin MAY use them only when the report's vehicle belongs to an area they administer. The author MAY `GET` their own report. Any other signed-in user MUST receive `403` for `PUT` and `DELETE`. A report that does not exist MUST return `404`.

---

## Assumptions

- Issue reports use **dialog-based** workflows (no split sidebar / main panel).
- Feature 3 provides `admin` and `area_admin`. An admin may access every issue report. An area admin may access issue reports whose vehicle belongs to an area they administer. A signed-in user with neither role may create a report and read their own reports. The maintenance role does not grant issue-report access.
- A report belongs to the area of its vehicle.
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
- Signed-in user who is not an admin or area admin calls `GET /api/issue-reports` with no query, `GET /api/issue-reports?vehicleId=`, `PUT`, or `DELETE` → `403`.
- Area admin requests a vehicle or report outside their areas → `403`.
- `userId` or `vehicleId` query that does not match a row → `404`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: An admin can view every issue report and edit or delete any report. An area admin can view, edit, and delete issue reports for areas they administer. A signed-in user can create a report and see their own reports.
- **SC-003**: `npm test` passes for issue reports API and issue reports view behavior.

---

## Data Ownership & Isolation

An admin may read and write every issue report. An area admin may read and write issue reports whose vehicle belongs to an area they administer. Any signed-in user may create a report and read reports they authored. The `authorId` on a row is the user who wrote it.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/issue-reports` with no query: admin sees every report; area admin sees reports in their areas; anyone else receives `403`. `GET /api/issue-reports?userId=` returns that author's reports, still limited by the caller's role. `GET /api/issue-reports?vehicleId=` returns that vehicle's reports for an admin, or for an area admin when the vehicle is in their area. `GET /api/issue-reports/:issueReportId` follows the same role and area rules; the author may also read their own report. |
| **Write scope** | `PUT` and `DELETE` require an admin, or an area admin for a report in an area they administer. |
| **Create scope** | `POST` requires a Bearer token. `authorId` comes from that token. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/issue-reports` | Yes — admin or area admin | Admin: fetch all issue reports. Area admin: fetch issue reports for vehicles in areas they administer. |
| `GET` | `/api/issue-reports?userId=:userId` | Yes — admin, area admin, or that user | Fetch issue reports written by that user. Area-admin results stay inside their areas. Another signed-in user may pass only their own id. |
| `GET` | `/api/issue-reports?vehicleId=:vehicleId` | Yes — admin or area admin | Fetch issue reports for that vehicle. An area admin may use this only when the vehicle is in an area they administer. |
| `GET` | `/api/issue-reports/:issueReportId` | Yes — admin, area admin for that vehicle's area, or the author | Fetch a single issue report |
| `POST` | `/api/issue-reports` | Yes | Create an issue report |
| `PUT` | `/api/issue-reports/:issueReportId` | Yes — admin, or area admin for that vehicle's area | Edit an issue report |
| `DELETE` | `/api/issue-reports/:issueReportId` | Yes — admin, or area admin for that vehicle's area | Delete an issue report |

`userId` and `vehicleId` may be sent together. Both filters apply. `userId` matches `authorId`.

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
**Not found:** `404` for a missing issue report, user, vehicle, or vehicle request.
**Forbidden:** `403` when the signed-in user is not allowed to read or change that report. Do not use `403` for a missing record.

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
- Display issue reports as rows. An admin loads `GET /api/issue-reports` and sees every report. An area admin loads `GET /api/issue-reports` and sees reports for vehicles in areas they administer. Another signed-in user loads `GET /api/issue-reports?userId=` with their own id and sees only reports they wrote. Each row shows the vehicle `universityId`, the type label, the status label, the description, the author's first and last name, the assignee's first and last name when set, and the resolved date when set.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current vehicle, vehicle request, type, description, status, assignee, and resolved date; **Save** / **Cancel**. The icon is shown to an admin on every row, and to an area admin on rows in areas they administer. It is hidden from other signed-in users.
  - The author is not editable.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder. The same role rules as **Edit** decide when it is shown.
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

### US-10.2 — View all issue reports

#### Scenario: Admin issue reports view lists all issue reports

- **Given** I am signed in as an admin
- **And** an issue report exists for vehicle `V-100` in area Athletics, type `low_gas`, status `pending`, description `Tank is on empty.`, written by Jane Doe, with no assignee
- **And** an issue report exists for vehicle `V-200` in area Music
- **When** I open the issue reports view
- **Then** I see a row with `V-100`, `Low gas`, `Pending`, `Tank is on empty.`, and `Jane Doe`
- **And** I see the `V-200` report
- **And** the `V-100` row has no assignee name

#### Scenario: Admin issue reports empty state

- **Given** I am signed in as an admin and there are no issue reports
- **When** I open the issue reports view
- **Then** I see **"No issue reports yet. Create your first issue report."**

#### Scenario: Admin requests issue reports from a specific user

- **Given** I am signed in as an admin
- **And** Jane Doe, user id `2`, wrote an issue report for vehicle `V-100`
- **And** another user wrote an issue report for vehicle `V-200`
- **When** I request `GET /api/issue-reports?userId=2`
- **Then** the API returns `200`
- **And** the list includes the `V-100` report
- **And** the list does not include the `V-200` report

#### Scenario: Admin requests issue reports for a specific vehicle

- **Given** I am signed in as an admin
- **And** vehicle `V-100` has id `3` and has an issue report
- **And** vehicle `V-200` has an issue report
- **When** I request `GET /api/issue-reports?vehicleId=3`
- **Then** the API returns `200`
- **And** every returned report has `vehicleId` `3`
- **And** the `V-200` report is not included

#### Scenario: Admin requests issue reports for a user that does not exist

- **Given** I am signed in as an admin
- **And** a user with id `999` does not exist
- **When** I request `GET /api/issue-reports?userId=999`
- **Then** the API returns `404` with `{ "message": "User not found." }`

#### Scenario: Admin requests issue reports for a vehicle that does not exist

- **Given** I am signed in as an admin
- **And** a vehicle with id `999` does not exist
- **When** I request `GET /api/issue-reports?vehicleId=999`
- **Then** the API returns `404` with `{ "message": "Vehicle not found." }`

---

### US-10.3 — View area issue reports

#### Scenario: Area admin issue reports view lists reports for their areas

- **Given** I am signed in as an area admin for Athletics
- **And** an issue report exists for vehicle `V-100` in Athletics
- **And** an issue report exists for vehicle `V-200` in Music
- **When** I open the issue reports view
- **Then** I see the `V-100` report
- **And** I do not see the `V-200` report

#### Scenario: Area admin requests issue reports from a specific user

- **Given** I am signed in as an area admin for Athletics
- **And** Jane Doe, user id `2`, wrote an issue report for vehicle `V-100` in Athletics
- **And** Jane Doe wrote an issue report for vehicle `V-200` in Music
- **When** I request `GET /api/issue-reports?userId=2`
- **Then** the API returns `200`
- **And** the list includes the `V-100` report
- **And** the list does not include the `V-200` report

#### Scenario: Area admin requests issue reports for a vehicle in their area

- **Given** I am signed in as an area admin for Athletics
- **And** vehicle `V-100` has id `3` and belongs to Athletics
- **And** that vehicle has an issue report
- **When** I request `GET /api/issue-reports?vehicleId=3`
- **Then** the API returns `200`
- **And** the list includes that report

#### Scenario: Area admin requests issue reports for a vehicle outside their area

- **Given** I am signed in as an area admin for Athletics
- **And** vehicle `V-200` has id `4` and belongs to Music
- **When** I request `GET /api/issue-reports?vehicleId=4`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

---

### US-10.4 — Manage issue report rows

#### Scenario: Admin issue report rows have edit and delete actions

- **Given** I am signed in as an admin and at least one issue report exists
- **When** I view the issue reports list
- **Then** each row shows **Edit issue report** and **Delete issue report**

#### Scenario: Area admin issue report rows have edit and delete actions

- **Given** I am signed in as an area admin for Athletics
- **And** an issue report exists for a vehicle in Athletics
- **When** I view the issue reports list
- **Then** that row shows **Edit issue report** and **Delete issue report**

#### Scenario: Signed-in user without admin or area admin does not see edit and delete actions

- **Given** I am signed in and I am not an admin or area admin
- **And** I wrote an issue report
- **When** I view the issue reports list
- **Then** my row does not show **Edit issue report** or **Delete issue report**

---

### US-10.5 — Edit and delete issue reports

#### Scenario: Admin edits an issue report description

- **Given** I am signed in as an admin and an issue report with description `Tank is on empty.` exists
- **When** I change the description to `Tank is below a quarter.` and submit
- **Then** the API returns `200` with the updated issue report
- **And** the list shows `Tank is below a quarter.`

#### Scenario: Admin edits an issue report type

- **Given** I am signed in as an admin and an issue report with type `low_gas` exists
- **When** I change the type to **Maintenance** and submit
- **Then** the API returns `200` with `type` `maintenance`
- **And** the list shows `Maintenance`

#### Scenario: Admin edits an issue report to resolved

- **Given** I am signed in as an admin and a pending issue report exists
- **When** I change the status to **Resolved**, set the resolved date to `2026-10-24`, and submit
- **Then** the API returns `200` with `status` `resolved` and `resolvedAt` `2026-10-24`
- **And** the list shows `Resolved` and `2026-10-24`

#### Scenario: Admin clears an issue report assignee

- **Given** I am signed in as an admin and an issue report assigned to Alex Kim exists
- **When** I clear the assignee and submit
- **Then** the API returns `200` with `assigneeId` `null`
- **And** the list no longer shows `Alex Kim` on that row

#### Scenario: Admin edits an issue report to have a missing description

- **Given** I am signed in as an admin on the issue reports view
- **And** I am editing an existing issue report
- **When** I submit the edit dialog without a description
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin requests to edit an issue report to have a missing description

- **Given** I am signed in as an admin
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "low_gas", "description": " ", "status": "pending" }`
- **Then** the API returns `400` with `{ "message": "Missing description." }`

#### Scenario: Admin requests to edit an issue report to have an invalid type

- **Given** I am signed in as an admin
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "broken", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `400` with `{ "message": "Invalid type." }`

#### Scenario: Admin requests to edit an issue report to resolved without a resolved date

- **Given** I am signed in as an admin
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "other", "description": "Spare key is missing.", "status": "resolved" }`
- **Then** the API returns `400` with `{ "message": "Missing resolved date." }`

#### Scenario: Admin requests to edit an issue report to pending with a resolved date

- **Given** I am signed in as an admin
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "low_gas", "description": "Tank is on empty.", "status": "pending", "resolvedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Resolved date must be empty." }`

#### Scenario: Admin requests to edit an issue report to a vehicle that does not exist

- **Given** I am signed in as an admin
- **And** an issue report with id `1` exists
- **And** a vehicle with id `999` does not exist
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 999, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `404` with `{ "message": "Vehicle not found." }`

#### Scenario: Admin requests to edit an issue report with a different authorId

- **Given** I am signed in as an admin
- **And** an issue report with id `1` was written by user id `2`
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "authorId": 8, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `200`
- **And** the stored `authorId` is still `2`

#### Scenario: Admin deletes an issue report

- **Given** I am signed in as an admin and an issue report with description `Tank is on empty.` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that issue report is removed from the list

#### Scenario: Admin updates an issue report that does not exist

- **Given** I am signed in as an admin
- **And** an issue report with id `999` does not exist
- **When** I request `PUT /api/issue-reports/999` with a valid body
- **Then** the API returns `404`

#### Scenario: Admin updates an issue report with an invalid issueReportId

- **Given** I am signed in as an admin
- **When** I request `PUT /api/issue-reports/abc` with a valid body
- **Then** the API returns `400`

#### Scenario: Admin deletes an issue report that does not exist

- **Given** I am signed in as an admin
- **And** an issue report with id `999` does not exist
- **When** I request `DELETE /api/issue-reports/999`
- **Then** the API returns `404`

#### Scenario: Admin deletes an issue report with an invalid issueReportId

- **Given** I am signed in as an admin
- **When** I request `DELETE /api/issue-reports/abc`
- **Then** the API returns `400`

#### Scenario: Area admin edits an issue report in their area

- **Given** I am signed in as an area admin for Athletics
- **And** an issue report for a vehicle in Athletics has description `Tank is on empty.`
- **When** I change the description to `Tank is below a quarter.` and submit
- **Then** the API returns `200`
- **And** the list shows `Tank is below a quarter.`

#### Scenario: Area admin updates an issue report outside their area

- **Given** I am signed in as an area admin for Athletics
- **And** an issue report with id `1` is for a vehicle in Music
- **And** a vehicle with id `4` belongs to Music
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 4, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Area admin deletes an issue report outside their area

- **Given** I am signed in as an area admin for Athletics
- **And** an issue report with id `1` is for a vehicle in Music
- **When** I request `DELETE /api/issue-reports/1`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Signed-in user without admin or area admin updates an issue report

- **Given** I am signed in and I am not an admin or area admin
- **And** an issue report with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/issue-reports/1` with `{ "vehicleId": 3, "type": "low_gas", "description": "Tank is on empty.", "status": "pending" }`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Signed-in user without admin or area admin deletes an issue report

- **Given** I am signed in and I am not an admin or area admin
- **And** an issue report with id `1` exists
- **When** I request `DELETE /api/issue-reports/1`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

---

### US-10.6: Session and role access

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

#### Scenario: Signed-in user without admin or area admin requests all issue reports

- **Given** I am signed in and I am not an admin or area admin
- **When** I request `GET /api/issue-reports`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Signed-in user requests their own issue reports

- **Given** I am signed in as Jane Doe, user id `2`, and I am not an admin or area admin
- **And** I wrote an issue report for vehicle `V-100`
- **And** another user wrote an issue report for vehicle `V-200`
- **When** I request `GET /api/issue-reports?userId=2`
- **Then** the API returns `200`
- **And** the list includes the `V-100` report
- **And** the list does not include the `V-200` report

#### Scenario: Signed-in user requests another user's issue reports

- **Given** I am signed in as user id `2` and I am not an admin or area admin
- **When** I request `GET /api/issue-reports?userId=8`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Signed-in user without admin or area admin requests issue reports for a vehicle

- **Given** I am signed in and I am not an admin or area admin
- **And** a vehicle with id `3` exists
- **When** I request `GET /api/issue-reports?vehicleId=3`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

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
| US-10.2 | Admin issue reports view lists all issue reports | `frontend/tests/IssueReports.test.js` | `Admin issue reports view lists all issue reports` |
| US-10.2 | Admin issue reports empty state | `frontend/tests/IssueReports.test.js` | `Admin issue reports empty state` |
| US-10.2 | Admin requests issue reports from a specific user | `backend/tests/issueReports.test.js` | `Admin requests issue reports from a specific user` |
| US-10.2 | Admin requests issue reports for a specific vehicle | `backend/tests/issueReports.test.js` | `Admin requests issue reports for a specific vehicle` |
| US-10.2 | Admin requests issue reports for a user that does not exist | `backend/tests/issueReports.test.js` | `Admin requests issue reports for a user that does not exist` |
| US-10.2 | Admin requests issue reports for a vehicle that does not exist | `backend/tests/issueReports.test.js` | `Admin requests issue reports for a vehicle that does not exist` |
| US-10.3 | Area admin issue reports view lists reports for their areas | `frontend/tests/IssueReports.test.js` | `Area admin issue reports view lists reports for their areas` |
| US-10.3 | Area admin requests issue reports from a specific user | `backend/tests/issueReports.test.js` | `Area admin requests issue reports from a specific user` |
| US-10.3 | Area admin requests issue reports for a vehicle in their area | `backend/tests/issueReports.test.js` | `Area admin requests issue reports for a vehicle in their area` |
| US-10.3 | Area admin requests issue reports for a vehicle outside their area | `backend/tests/issueReports.test.js` | `Area admin requests issue reports for a vehicle outside their area` |
| US-10.4 | Admin issue report rows have edit and delete actions | `frontend/tests/IssueReports.test.js` | `Admin issue report rows have edit and delete actions` |
| US-10.4 | Area admin issue report rows have edit and delete actions | `frontend/tests/IssueReports.test.js` | `Area admin issue report rows have edit and delete actions` |
| US-10.4 | Signed-in user without admin or area admin does not see edit and delete actions | `frontend/tests/IssueReports.test.js` | `Signed-in user without admin or area admin does not see edit and delete actions` |
| US-10.5 | Admin edits an issue report description | `backend/tests/issueReports.test.js` | `Admin edits an issue report description` |
| US-10.5 | Admin edits an issue report description | `frontend/tests/IssueReports.test.js` | `Admin edits an issue report description` |
| US-10.5 | Admin edits an issue report type | `backend/tests/issueReports.test.js` | `Admin edits an issue report type` |
| US-10.5 | Admin edits an issue report type | `frontend/tests/IssueReports.test.js` | `Admin edits an issue report type` |
| US-10.5 | Admin edits an issue report to resolved | `backend/tests/issueReports.test.js` | `Admin edits an issue report to resolved` |
| US-10.5 | Admin edits an issue report to resolved | `frontend/tests/IssueReports.test.js` | `Admin edits an issue report to resolved` |
| US-10.5 | Admin clears an issue report assignee | `backend/tests/issueReports.test.js` | `Admin clears an issue report assignee` |
| US-10.5 | Admin clears an issue report assignee | `frontend/tests/IssueReports.test.js` | `Admin clears an issue report assignee` |
| US-10.5 | Admin edits an issue report to have a missing description | `frontend/tests/IssueReports.test.js` | `Admin edits an issue report to have a missing description` |
| US-10.5 | Admin requests to edit an issue report to have a missing description | `backend/tests/issueReports.test.js` | `Admin requests to edit an issue report to have a missing description` |
| US-10.5 | Admin requests to edit an issue report to have an invalid type | `backend/tests/issueReports.test.js` | `Admin requests to edit an issue report to have an invalid type` |
| US-10.5 | Admin requests to edit an issue report to resolved without a resolved date | `backend/tests/issueReports.test.js` | `Admin requests to edit an issue report to resolved without a resolved date` |
| US-10.5 | Admin requests to edit an issue report to pending with a resolved date | `backend/tests/issueReports.test.js` | `Admin requests to edit an issue report to pending with a resolved date` |
| US-10.5 | Admin requests to edit an issue report to a vehicle that does not exist | `backend/tests/issueReports.test.js` | `Admin requests to edit an issue report to a vehicle that does not exist` |
| US-10.5 | Admin requests to edit an issue report with a different authorId | `backend/tests/issueReports.test.js` | `Admin requests to edit an issue report with a different authorId` |
| US-10.5 | Admin deletes an issue report | `backend/tests/issueReports.test.js` | `Admin deletes an issue report` |
| US-10.5 | Admin deletes an issue report | `frontend/tests/IssueReports.test.js` | `Admin deletes an issue report` |
| US-10.5 | Admin updates an issue report that does not exist | `backend/tests/issueReports.test.js` | `Admin updates an issue report that does not exist` |
| US-10.5 | Admin updates an issue report with an invalid issueReportId | `backend/tests/issueReports.test.js` | `Admin updates an issue report with an invalid issueReportId` |
| US-10.5 | Admin deletes an issue report that does not exist | `backend/tests/issueReports.test.js` | `Admin deletes an issue report that does not exist` |
| US-10.5 | Admin deletes an issue report with an invalid issueReportId | `backend/tests/issueReports.test.js` | `Admin deletes an issue report with an invalid issueReportId` |
| US-10.5 | Area admin edits an issue report in their area | `backend/tests/issueReports.test.js` | `Area admin edits an issue report in their area` |
| US-10.5 | Area admin edits an issue report in their area | `frontend/tests/IssueReports.test.js` | `Area admin edits an issue report in their area` |
| US-10.5 | Area admin updates an issue report outside their area | `backend/tests/issueReports.test.js` | `Area admin updates an issue report outside their area` |
| US-10.5 | Area admin deletes an issue report outside their area | `backend/tests/issueReports.test.js` | `Area admin deletes an issue report outside their area` |
| US-10.5 | Signed-in user without admin or area admin updates an issue report | `backend/tests/issueReports.test.js` | `Signed-in user without admin or area admin updates an issue report` |
| US-10.5 | Signed-in user without admin or area admin deletes an issue report | `backend/tests/issueReports.test.js` | `Signed-in user without admin or area admin deletes an issue report` |
| US-10.6 | Un-signed-in user accesses issue reports page | `frontend/tests/IssueReports.test.js` | `Un-signed-in user accesses issue reports page` |
| US-10.6 | Unauthenticated API request to issue reports | `backend/tests/issueReports.test.js` | `Unauthenticated API request to issue reports` |
| US-10.6 | Unauthenticated API request to a particular issue report | `backend/tests/issueReports.test.js` | `Unauthenticated API request to a particular issue report` |
| US-10.6 | Unauthenticated API request to create an issue report | `backend/tests/issueReports.test.js` | `Unauthenticated API request to create an issue report` |
| US-10.6 | Unauthenticated API request to update an issue report | `backend/tests/issueReports.test.js` | `Unauthenticated API request to update an issue report` |
| US-10.6 | Unauthenticated API request to delete an issue report | `backend/tests/issueReports.test.js` | `Unauthenticated API request to delete an issue report` |
| US-10.6 | Signed-in user without admin or area admin requests all issue reports | `backend/tests/issueReports.test.js` | `Signed-in user without admin or area admin requests all issue reports` |
| US-10.6 | Signed-in user requests their own issue reports | `backend/tests/issueReports.test.js` | `Signed-in user requests their own issue reports` |
| US-10.6 | Signed-in user requests another user's issue reports | `backend/tests/issueReports.test.js` | `Signed-in user requests another user's issue reports` |
| US-10.6 | Signed-in user without admin or area admin requests issue reports for a vehicle | `backend/tests/issueReports.test.js` | `Signed-in user without admin or area admin requests issue reports for a vehicle` |

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

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-014** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Creating a maintenance need from an issue report
- Notes attached to an issue report
- Requiring the report's vehicle to match the vehicle on the linked vehicle request
- Blocking delete when a later feature references an issue report
- Maintenance-role access to issue reports

---

## Delivered to later features

- An issue report row with `id`, `vehicleId`, `vehicleRequestId`, `authorId`, `assigneeId`, `type`, `description`, `status`, and `resolvedAt`
- `GET /api/issue-reports` returns every issue report for an admin, and area-scoped issue reports for an area admin
- `GET /api/issue-reports?userId=` returns reports written by that user, within the caller's role
- `GET /api/issue-reports?vehicleId=` returns reports for that vehicle, within the caller's role
- Delete removes an existing issue report the caller is allowed to manage and returns `200`
