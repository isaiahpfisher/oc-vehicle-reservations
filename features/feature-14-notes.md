# Feature: Notes

**Feature ID:** 14
**Branch pattern:** `feature/14-notes`
**Status:** Draft
**Created:** 2026-11-04
**Input:** Users can add notes to vehicle requests, issue reports, and maintenance needs. Notes function like comments.
**Depends on:** Feature 8, 10, 11 (Vehicle Requests, Issue Reports, Maintenance Needs)

---

## User Stories

### US-14.1: Add notes to entities

**As a** signed-in user
**I want to** add notes/comments to vehicle requests, issue reports, and maintenance needs that I have access to
**So that** I can add additional context or have short discussions about the request/report/need.

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can submit notes.
**Acceptance scenarios:** see ### US-14.1 under Acceptance Criteria

### US-14.2: View notes on entities

**As a** signed-in user
**I want to** see notes that are attached to vehicle requests, issue reports, and/or maintenance needs
**So that** I can see any additional info that people have attached to the request.

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can see any existing notes.
**Acceptance scenarios:** see ### US-14.2 under Acceptance Criteria

### US-14.3: Toggle visibility

**As a** signed-in admin or area_admin or maintenance user
**I want to** be able to submit notes that are only visible to other admin/maintenance users (not to the person making the request)
**So that** I can have private conversation with other admin/maintenance users

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can see notes that only admin/maintenance users can see.
**Acceptance scenarios:** see ### US-14.3 under Acceptance Criteria

### US-14.4: Admin can delete notes

**As a** signed-in admin user (not area_admin or maintenance)
**I want to** be able to delete notes
**So that** I can do some clean up if need be.

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can delete existing comments.
**Acceptance scenarios:** see ### US-14.4 under Acceptance Criteria

### US-14.5: Users can delete their own notes if no one has responded

**As a** signed-in user
**I want to** be able to delete my own notes if no one has responded yet
**So that** I can fix typos and other mistakes

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can delete your own comments if they're the newest comments.
**Acceptance scenarios:** see ### US-14.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All note endpoints must enforce access. Admins can view everything, area_admins and maintenance users can view notes for entities they have access to, regular users can only view notes on their own requests.
- **FR-002**: The note content should be trimmed and sanitized before save. An empty note should be rejected.
- **FR-003**: A note that is marked as **not visible** should be hidden from regular users.
- **FR-004**: Users can only delete a note if no one else has responded since the note was created. Admins can delete any notes.
- **FR-005**: Note content must be sanitized before being saved or shown to users.

---

## Assumptions

- The implementation will re-use the same logic for vehicle requests, issue reports, and maintenance needs. Just leave the FK blank if the note isn't for that type.

## Edge Cases

- Empty or whitespace-only note content → client block and/or `400`.
- Unauthenticated API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in users can create and see notes on all requests, reports, and needs that they have access to.
- **SC-003**: `npm test` passes for note API and note view behavior.

---

## Data Ownership & Isolation

A note belongs to exactly one parent: a vehicle request, an issue report, or a maintenance need. Who can read or add notes depends on who can read the parent, as set by that parent's feature (Features 8, 10, 11). Hidden notes (`isVisible: false`) are only shown to `admin`, `area_admin`, and `maintenance` users who can read the parent.

| Rule              | Requirement                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parent access** | Every note endpoint requires a Bearer token. The caller must be able to read the parent. Admins can read every parent. Area admins and maintenance users can read the parents their role allows. Other users can read only parents they created. Otherwise `403`.                                                                                                                               |
| **Read scope**    | The parent list endpoints (`GET /api/requests/:requestId/notes`, `GET /api/issue-reports/:issueReportId/notes`, `GET /api/maintenance-needs/:maintenanceNeedId/notes`) and `GET /api/notes/:noteId` return notes on parents the caller can read. Users without `admin`, `area_admin`, or `maintenance` never receive hidden notes. A hidden note requested by id returns `404` for those users. |
| **Create scope**  | `POST /api/notes` is open to any user who can read the parent. `authorId` is always the current user. Only `admin`, `area_admin`, or `maintenance` may set `isVisible: false`. Anyone else gets `403`.                                                                                                                                                                                          |
| **Delete scope**  | `admin` may delete any note. Any other user may delete only their own note, and only if no later note by someone else on the same parent exists. Another user's note → `403`. A note that already has a reply gives `400`.                                                                                                                                                                      |
| **No edit**       | Notes cannot be edited. To fix a mistake, delete the note (see US-14.5) and post it again.                                                                                                                                                                                                                                                                                                      |

---

## API Requirements

| Method   | Endpoint                                          | Auth                                                 | Purpose                               |
| -------- | ------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- |
| `GET`    | `/api/requests/:requestId/notes`                  | Yes - can read that vehicle request                  | Fetch the notes on a vehicle request  |
| `GET`    | `/api/issue-reports/:issueReportId/notes`         | Yes - can read that issue report                     | Fetch the notes on an issue report    |
| `GET`    | `/api/maintenance-needs/:maintenanceNeedId/notes` | Yes - can read that maintenance need                 | Fetch the notes on a maintenance need |
| `GET`    | `/api/notes/:noteId`                              | Yes - can read the note's parent (and the note)      | Fetch a single note                   |
| `POST`   | `/api/notes`                                      | Yes - can read the parent                            | Create a note                         |
| `DELETE` | `/api/notes/:noteId`                              | Yes - admin, or the author before anyone has replied | Delete a note                         |

- A parent id that is not a valid integer → `400` (for example `{ "message": "Invalid request id." }`). A parent that does not exist → `404`.
- All three parent list endpoints share one controller handler. Each passes the matching foreign key (`vehicleRequestId`, `issueReportId`, or `maintenanceNeedId`).
- Lists are ordered by `createdAt`, oldest first.

**Create note request body:**

```json
{
  "vehicleRequestId": 12,
  "content": "Can we pick up the van at 7am instead?",
  "isVisible": true,
  "includeInEmail": false
}
```

- The body must have exactly one of `vehicleRequestId`, `issueReportId`, or `maintenanceNeedId`. None or more than one → `400`. If the parent does not exist → `404`.
- `content` is required. It is trimmed and sanitized before save (FR-002, FR-005). Empty or whitespace-only content → `400`.
- `isVisible` is optional and defaults to `true`. `includeInEmail` is optional and defaults to `false`. `includeInEmail` is out of scope for now.
- Any `authorId` in the body is ignored.

**Note success response** (`200` / `201`):

```json
{
  "id": 1,
  "vehicleRequestId": 12,
  "issueReportId": null,
  "maintenanceNeedId": null,
  "authorId": 4,
  "author": { "id": 4, "firstName": "Jane", "lastName": "Doe" },
  "content": "Can we pick up the van at 7am instead?",
  "isVisible": true,
  "includeInEmail": false,
  "createdAt": "2026-11-04T12:00:00.000Z",
  "updatedAt": "2026-11-04T12:00:00.000Z"
}
```

Each parent list endpoint returns an array of this shape. `DELETE` returns `204` with no body.

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Bad id:** `400` `{ "message": "Invalid note id." }` (or the matching parent id message).
**Not found:** `404` `{ "message": "Note with id=${id} not found." }`. This includes hidden notes requested by users who cannot see them.
**Unauthenticated:** `401` `{ "message": "Unauthorized! No token provided." }`.
**Forbidden:** `403`. This covers a parent the caller cannot read, a user without `admin`/`area_admin`/`maintenance` setting `isVisible: false`, and deleting another user's note without the `admin` role.
**Already replied:** `400` `{ "message": "Notes can only be deleted before someone replies." }`.

---

## Screen Requirements

There are no new screens for this feature. The following existing screens should receive a new notes section:

- Vehicle Request
- Issue Report
- Maintenance Need

The UI should look a lot like a standard comment section. Depending on the page in question, this could be a new section at the bottom, or a side panel on the right side of the screen. It should include a textarea to draft a note at the bottom, then show notes like a text thread with avatars and timestamps. If the active user is an admin, area_admin, or maintenance user, then they can toggle `isVisible` before saving new notes. Ignore `includeInEmail` for now. That will be used by a later feature.

---

## Key Entities

- **Note**: a comment left on a vehicle request, issue report, or maintenance need

---

## Data Model Requirements

### `notes` table

| Field               | Type       | Rules                                                                                           |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `id`                | INTEGER PK | Auto-increment                                                                                  |
| `vehicleRequestId`  | INTEGER FK | Optional; `null` or must reference `vehicleRequests.id`; deleting the request deletes its notes |
| `issueReportId`     | INTEGER FK | Optional; `null` or must reference `issueReports.id`; deleting the report deletes its notes     |
| `maintenanceNeedId` | INTEGER FK | Optional; `null` or must reference `maintenanceNeeds.id`; deleting the need deletes its notes   |
| `authorId`          | INTEGER FK | Required; set from the session; must reference `users.id`                                       |
| `content`           | TEXT       | Required; trimmed; sanitized; not whitespace-only                                               |
| `isVisible`         | BOOLEAN    | Required; defaults to `true`                                                                    |
| `includeInEmail`    | BOOLEAN    | Required; defaults to `false`; unused until a later feature                                     |
| `createdAt`         | DATE       | Sequelize timestamps                                                                            |
| `updatedAt`         | DATE       | Sequelize timestamps                                                                            |

Exactly one of `vehicleRequestId`, `issueReportId`, or `maintenanceNeedId` must be set. The other two are `null`.

### Associations (in `models/index.js`)

- `Note` belongs to `VehicleRequest`
- `Note` belongs to `IssueReport`
- `Note` belongs to `MaintenanceNeed`
- `Note` belongs to `User` as `author` through `authorId`
- `VehicleRequest` has many `Note`
- `IssueReport` has many `Note`
- `MaintenanceNeed` has many `Note`
- `User` has many `Note` as author

---

## Acceptance Criteria (Gherkin)

### US-14.1 — Add notes to entities

#### Scenario: Unauthenticated user cannot create notes

- **Given** I have no valid session token
- **When** I request to create a note
- **Then** the API rejects my request

Scenario: Unauthorized standard user cannot create notes on requests they don't have access to

- **Given** I am sign-in as a standard user
- **When** I request to create a note on a request I did not make
- **Then** the API rejects my request

Scenario: Unauthorized area_admin user cannot create notes on requests they don't have access to

- **Given** I am sign-in as an area_admin
- **When** I request to create a note on a request that I do not have access to
- **Then** the API rejects my request

Scenario: Standard user can create notes

- **Given** I am sign-in as a standard user
- **When** I request to create a note on a request I made
- **Then** the request is successful

Scenario: Area admin and maintenance users can create notes

- **Given** I am sign-in as an area_admin or maintenance user
- **When** I request to create a note on a request I have access to
- **Then** the request is successful

Scenario: Admin user can create notes

- **Given** I am sign-in as an admin user
- **When** I request to create a note on any request
- **Then** the request is successful

---

### US-14.2 — View notes on entities

Scenario: Users can view notes on requests, issue reports, maintenance needs

- **Given** I am a signed-in user
- **When** I open a vehicle request, issue report, or maintenance need that I have access to
- **Then** I see the notes for that entity

---

### US-14.3 — Toggle visibility

Scenario: Admin, area_admins, maintenance users can toggle visibility

- **Given** I am sign-in as a non-standard user
- **When** I can toggle isVisible when creating a note for a request
- **Then** that note is only visible to other non-standard users with access to the request

Scenario: Standard user cannot toggle note visibility

- **Given** I am sign-in as a standard user
- **When** I am creating a note
- **Then** that I cannot toggle note visibility

Scenario: Standard user cannot see notes with isVisible set to false

- **Given** I am sign-in as a standard user
- **When** viewing a request
- **Then** I do not see any notes that have isVisible toggled to false

---

### US-14.4 — Admin can delete notes

Scenario: Admin can delete all notes

- **Given** I am sign-in as an admin user
- **When** I view notes on requests
- **Then** I can successfully delete any note

---

### US-14.5 — Users can delete their own notes if no one has responded

Scenario: All sign-in users can delete their own notes if no one has responded

- **Given** I am sign-in as any kind of user
- **When** I view notes on a request
- **Then** I can delete a note only if it belongs to me and no one has responded to it yet

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-14.1 | Unauthenticated user cannot create notes | `backend/tests/notes.test.js` | `Unauthenticated user cannot create notes` |
| US-14.1 | Unauthorized standard user cannot create notes on requests they don't have access to | `backend/tests/notes.test.js` | `Unauthorized standard user cannot create notes on requests they don't have access to` |
| US-14.1 | Unauthorized area_admin user cannot create notes on requests they don't have access to | `backend/tests/notes.test.js` | `Unauthorized area_admin user cannot create notes on requests they don't have access to` |
| US-14.1 | Standard user can create notes | `backend/tests/notes.test.js` | `Standard user can create notes` |
| US-14.1 | Area admin and maintenance users can create notes | `backend/tests/notes.test.js` | `Area admin and maintenance users can create notes` |
| US-14.1 | Admin user can create notes | `backend/tests/notes.test.js` | `Admin user can create notes` |
| US-14.3 | Admin, area_admins, maintenance users can toggle visibility | `backend/tests/notes.test.js` | `Admin, area_admins, maintenance users can toggle visibility` |
| US-14.3 | Admin, area_admins, maintenance users can toggle visibility | `frontend/tests/Notes.test.js` | `Admin, area_admins, maintenance users can toggle visibility` |
| US-14.3 | Standard user cannot toggle note visibility | `backend/tests/notes.test.js` | `Standard user cannot toggle note visibility` |
| US-14.3 | Standard user cannot toggle note visibility | `frontend/tests/Notes.test.js` | `Standard user cannot toggle note visibility` |
| US-14.3 | Standard user cannot see notes with isVisible set to false | `backend/tests/notes.test.js` | `Standard user cannot see notes with isVisible set to false` |
| US-14.4 | Admin can delete all notes | `backend/tests/notes.test.js` | `Admin can delete all notes` |
| US-14.4 | Admin can delete all notes | `frontend/tests/Notes.test.js` | `Admin can delete all notes` |
| US-14.5 | All sign-in users can delete their own notes if no one has responded | `backend/tests/notes.test.js` | `All sign-in users can delete their own notes if no one has responded` |
| US-14.5 | All sign-in users can delete their own notes if no one has responded | `frontend/tests/Notes.test.js` | `All sign-in users can delete their own notes if no one has responded` |

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-001**–**FR-004** satisfied)
- [x] **Success Criteria (SC-001**–**SC-003)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Sending notifications about notes
- `includeInEmail`: still make the column, but ignore it for now. Let it default to false.

---

## Delivered to later features

- `includeInEmail` for emails feature
