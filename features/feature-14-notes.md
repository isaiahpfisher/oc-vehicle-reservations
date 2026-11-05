# Feature: Notes

**Feature ID:** 12
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

### [View: Service Types] — route name `service-types`

**Single Vue view** (`ServiceTypes.vue`) — no sidebar / main-panel split.

- Heading: **Service Type Management**
- Primary action: **+ New Service Type** opens a `<v-dialog>` with **Name**, **Frequency Days**, and **Frequency Miles**. **Cancel** and **Create** sit in the dialog footer.
- Display service types in a `<v-data-table>` (10 per page). Columns are **Name**, **Frequency Days**, **Frequency Miles**, and **Actions**. Row icon buttons use `size="small"` and `variant="text"`, matching the users table.
- **Edit** icon turns that row into inline fields pre-filled with the current name, frequency days, and frequency miles; **Save** / **Cancel**. Cancel restores the row without saving.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit service type**, **Delete service type**).
- **Empty state:** **"No service types yet. Create your first service type."** when there are no service types.
- **Loading state:** skeleton or progress indicator while service types are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for service types; delete dialog is a reusable component in `components/common` folder; the create dialog is a component in `components/serviceTypes`, modeled after existing create dialogs. Edit stays in the table row.

---

## Key Entities

- **ServiceType**: a type of service such as `Oil Change`, `Tire Rotation`, or `Spark Plug Replacement`.

---

## Data Model Requirements

### `serviceTypes` table

| Field                     | Type       | Rules                                                                             |
| ------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `id`                      | INTEGER PK | Auto-increment                                                                    |
| `name`                    | STRING     | Required; trimmed; unique; not case-sensitive; max 255                            |
| `service_frequency_days`  | INT        | Optional; positive when present. At least one of the two frequencies is required. |
| `service_frequency_miles` | INT        | Optional; positive when present. At least one of the two frequencies is required. |
| `createdAt`               | DATE       | Sequelize timestamps                                                              |
| `updatedAt`               | DATE       | Sequelize timestamps                                                              |

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-14.1 — Create service types

#### Scenario: Admin user creates a service type

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I click **+ New Service Type**
- **Then** a dialog opens with a **Name** , **Frequency Days** and **Frequency Miles** fields.

#### Scenario: Admin user saves service type

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with name `Oil Change`, frequency days `500`, frequence miles `5000`
- **Then** the API returns `201` with that service type
- **And** `Oil Change` appears in the service types list

#### Scenario: Admin user creates service type with missing name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates service type with missing field

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with a name and neither frequency
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a service type with only one frequency

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with name `Oil Change` and frequency days `500`, and leave frequency miles empty
- **Then** the API returns `201` with that service type and `service_frequency_miles` is `null`
- **And** `Oil Change` appears in the service types list

#### Scenario: Admin user requests to create a service type with a missing name

- **Given** I am signed in as admin, area admin, or maintenance
- **When** I request `POST /api/service-types` with a missing filed
- **Then** the API returns `400` with the missing field specified

#### Scenario: Admin user creates service type with a whitespace-only name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates service type with name longer than 255 characters

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with a service type name longer than 255 characters
- **Then** validation blocks the request and I see a `Name too long.` message

#### Scenario: Admin user creates a service type with a non-unique name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** A service type with name `Oil Change` exists
- **When** I submit the create dialog with name `Oil Change`
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user creates a service type with a non-unique name that is not case-sensitive

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** A service type with name `Oil Change` exists
- **When** I submit the create dialog with name `oil change`
- **Then** validation blocks the request and I see a `Name already taken.` message

---

### US-14.2 — View service types

#### Scenario: Service types view lists service types

- **Given** I am signed in as admin , area admin, or maintenance and service types exist
- **When** I open the service types view
- **Then** each row shows the service type name, Frequency Days, Frequency Miles

#### Scenario: Service types empty state

- **Given** I am signed in as admin , area admin, or maintenance and there are no service types
- **When** I open the service types view
- **Then** I see **"No service types yet. Create your first service type."**

---

### US-14.3 — Manage service type rows

#### Scenario: Service type rows have edit and delete actions

- **Given** I am signed in as admin , area admin, or maintenance and at least one service type exists
- **When** I view the service type list
- **Then** each row shows **Edit** and **Delete** actions

---

### US-14.4 — Edit and delete service types

#### Scenario: Admin user edits a service type name

- **Given** I am signed in as admin , area admin, or maintenance and a service type named `Oil Change` exists
- **When** I change the name to `Tire Rotation` and submit
- **Then** the API returns `200` with the updated service type
- **And** the list shows `Tire Rotation`

#### Scenario: Admin user edits a service type to have a missing name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** I am editing an existing service type
- **When** I save the row without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a service type to have a whitespace-only name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** I am editing an existing service type
- **When** I save the row with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user updates a service type to have a non-unique name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** Service types with names `Oil Change` and `Tire Rotation` exist
- **And** I edit `Tire Rotation` to have name `Oil Change`
- **When** I save the row
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user edits a service type to have a non-unique name that is not case-sensitive

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** A service type with name `Oil Change` exists
- **And** Another service type exists with name `Tire Rotation`
- **When** I save the `Tire Rotation` row with name `oil change`
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user deletes a service type

- **Given** I am signed in as admin , area admin, or maintenance and a service type named `Oil Change` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that service type is removed from the list

#### Scenario: Admin user updates a service type that does not exist

- **Given** I am signed in as admin, area admin, or maintenance
- **And** A service type with id `999` does not exist
- **When** I request `PUT /api/service-types/999` with a valid body
- **Then** the API returns `404`

#### Scenario: Admin user updates a service type with an invalid serviceTypeId

- **Given** I am signed in as admin, area admin, or maintenance
- **When** I request `PUT /api/service-types/abc` with a valid body
- **Then** the API returns `400`

#### Scenario: Admin user deletes a service type that does not exist

- **Given** I am signed in as admin, area admin, or maintenance
- **And** A service type with id `999` does not exist
- **When** I request `DELETE /api/service-types/999`
- **Then** the API returns `404`

#### Scenario: Admin user deletes a service type with an invalid serviceTypeId

- **Given** I am signed in as admin, area admin, or maintenance
- **When** I request `DELETE /api/service-types/abc`
- **Then** the API returns `400`

---

### US-14.5: Signed-in admin , area admin, or maintenance user access only

#### Scenario: Un-signed-in user accesses service types page

- **Given** I am not signed in
- **When** I navigate to `/service-types` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to service types

- **Given** I have no valid session token
- **When** I request `GET /api/service-types`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular service type

- **Given** I have no valid session token
- **And** A service type with id `1` exists
- **When** I request `GET /api/service-types/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to create a service type

- **Given** I have no valid session token
- **When** I request `POST /api/service-types` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to update a service type

- **Given** I have no valid session token
- **And** A service type with id `1` exists
- **When** I request `PUT /api/service-types/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to delete a service type

- **Given** I have no valid session token
- **And** A service type with id `1` exists
- **When** I request `DELETE /api/service-types/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role accesses service types page

- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance
- **When** I navigate to `/service-types` by URL
- **Then** I am redirected to `/home`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to service types

- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance
- **When** I request `GET /api/service-types`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to a particular service type

- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance
- **And** A service type with id `1` exists
- **When** I request `GET /api/service-types/1`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to create a service type

- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance
- **When** I request `POST /api/service-types` with a valid body
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to update a service type

- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance
- **And** A service type with id `1` exists
- **When** I request `PUT /api/service-types/1` with a valid body
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to delete a service type

- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance
- **And** A service type with id `1` exists
- **When** I request `DELETE /api/service-types/1`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

---

## Test Coverage Map

| Story   | Scenario                                                                                                | Test file                             | Test name                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| US-14.1 | Admin user creates a service type                                                                       | `frontend/tests/ServiceTypes.test.js` | `Admin user creates a service type`                                                                       |
| US-14.1 | Admin user saves service type                                                                           | `backend/tests/serviceTypes.test.js`  | `Admin user saves service type`                                                                           |
| US-14.1 | Admin user saves service type                                                                           | `frontend/tests/ServiceTypes.test.js` | `Admin user saves service type`                                                                           |
| US-14.1 | Admin user creates service type with missing name                                                       | `frontend/tests/ServiceTypes.test.js` | `Admin user creates service type with missing name`                                                       |
| US-14.1 | Admin user creates service type with missing field                                                      | `frontend/tests/ServiceTypes.test.js` | `Admin user creates service type with missing field`                                                      |
| US-14.1 | Admin user creates a service type with only one frequency                                               | `backend/tests/serviceTypes.test.js`  | `Admin user creates a service type with only one frequency`                                               |
| US-14.1 | Admin user creates a service type with only one frequency                                               | `frontend/tests/ServiceTypes.test.js` | `Admin user creates a service type with only one frequency`                                               |
| US-14.1 | Admin user requests to create a service type with a missing name                                        | `backend/tests/serviceTypes.test.js`  | `Admin user requests to create a service type with a missing name`                                        |
| US-14.1 | Admin user creates service type with a whitespace-only name                                             | `frontend/tests/ServiceTypes.test.js` | `Admin user creates service type with a whitespace-only name`                                             |
| US-14.1 | Admin user creates service type with a whitespace-only name                                             | `backend/tests/serviceTypes.test.js`  | `Admin user creates service type with a whitespace-only name`                                             |
| US-14.1 | Admin user creates service type with name longer than 255 characters                                    | `frontend/tests/ServiceTypes.test.js` | `Admin user creates service type with name longer than 255 characters`                                    |
| US-14.1 | Admin user creates service type with name longer than 255 characters                                    | `backend/tests/serviceTypes.test.js`  | `Admin user creates service type with name longer than 255 characters`                                    |
| US-14.1 | Admin user creates a service type with a non-unique name                                                | `frontend/tests/ServiceTypes.test.js` | `Admin user creates a service type with a non-unique name`                                                |
| US-14.1 | Admin user creates a service type with a non-unique name                                                | `backend/tests/serviceTypes.test.js`  | `Admin user creates a service type with a non-unique name`                                                |
| US-14.1 | Admin user creates a service type with a non-unique name that is not case-sensitive                     | `frontend/tests/ServiceTypes.test.js` | `Admin user creates a service type with a non-unique name that is not case-sensitive`                     |
| US-14.1 | Admin user creates a service type with a non-unique name that is not case-sensitive                     | `backend/tests/serviceTypes.test.js`  | `Admin user creates a service type with a non-unique name that is not case-sensitive`                     |
| US-14.2 | Service types view lists service types                                                                  | `frontend/tests/ServiceTypes.test.js` | `Service types view lists service types`                                                                  |
| US-14.2 | Service types empty state                                                                               | `frontend/tests/ServiceTypes.test.js` | `Service types empty state`                                                                               |
| US-14.3 | Service type rows have edit and delete actions                                                          | `frontend/tests/ServiceTypes.test.js` | `Service type rows have edit and delete actions`                                                          |
| US-14.4 | Admin user edits a service type name                                                                    | `backend/tests/serviceTypes.test.js`  | `Admin user edits a service type name`                                                                    |
| US-14.4 | Admin user edits a service type name                                                                    | `frontend/tests/ServiceTypes.test.js` | `Admin user edits a service type name`                                                                    |
| US-14.4 | Admin user edits a service type to have a missing name                                                  | `frontend/tests/ServiceTypes.test.js` | `Admin user edits a service type to have a missing name`                                                  |
| US-14.4 | Admin user edits a service type to have a missing name                                                  | `backend/tests/serviceTypes.test.js`  | `Admin user edits a service type to have a missing name`                                                  |
| US-14.4 | Admin user edits a service type to have a whitespace-only name                                          | `frontend/tests/ServiceTypes.test.js` | `Admin user edits a service type to have a whitespace-only name`                                          |
| US-14.4 | Admin user edits a service type to have a whitespace-only name                                          | `backend/tests/serviceTypes.test.js`  | `Admin user edits a service type to have a whitespace-only name`                                          |
| US-14.4 | Admin user updates a service type to have a non-unique name                                             | `frontend/tests/ServiceTypes.test.js` | `Admin user updates a service type to have a non-unique name`                                             |
| US-14.4 | Admin user updates a service type to have a non-unique name                                             | `backend/tests/serviceTypes.test.js`  | `Admin user updates a service type to have a non-unique name`                                             |
| US-14.4 | Admin user edits a service type to have a non-unique name that is not case-sensitive                    | `frontend/tests/ServiceTypes.test.js` | `Admin user edits a service type to have a non-unique name that is not case-sensitive`                    |
| US-14.4 | Admin user edits a service type to have a non-unique name that is not case-sensitive                    | `backend/tests/serviceTypes.test.js`  | `Admin user edits a service type to have a non-unique name that is not case-sensitive`                    |
| US-14.4 | Admin user deletes a service type                                                                       | `backend/tests/serviceTypes.test.js`  | `Admin user deletes a service type`                                                                       |
| US-14.4 | Admin user deletes a service type                                                                       | `frontend/tests/ServiceTypes.test.js` | `Admin user deletes a service type`                                                                       |
| US-14.4 | Admin user updates a service type that does not exist                                                   | `backend/tests/serviceTypes.test.js`  | `Admin user updates a service type that does not exist`                                                   |
| US-14.4 | Admin user updates a service type with an invalid serviceTypeId                                         | `backend/tests/serviceTypes.test.js`  | `Admin user updates a service type with an invalid serviceTypeId`                                         |
| US-14.4 | Admin user deletes a service type that does not exist                                                   | `backend/tests/serviceTypes.test.js`  | `Admin user deletes a service type that does not exist`                                                   |
| US-14.4 | Admin user deletes a service type with an invalid serviceTypeId                                         | `backend/tests/serviceTypes.test.js`  | `Admin user deletes a service type with an invalid serviceTypeId`                                         |
| US-14.5 | Un-signed-in user accesses service types page                                                           | `frontend/tests/ServiceTypes.test.js` | `Un-signed-in user accesses service types page`                                                           |
| US-14.5 | Unauthenticated API request to service types                                                            | `backend/tests/serviceTypes.test.js`  | `Unauthenticated API request to service types`                                                            |
| US-14.5 | Unauthenticated API request to a particular service type                                                | `backend/tests/serviceTypes.test.js`  | `Unauthenticated API request to a particular service type`                                                |
| US-14.5 | Unauthenticated API request to create a service type                                                    | `backend/tests/serviceTypes.test.js`  | `Unauthenticated API request to create a service type`                                                    |
| US-14.5 | Unauthenticated API request to update a service type                                                    | `backend/tests/serviceTypes.test.js`  | `Unauthenticated API request to update a service type`                                                    |
| US-14.5 | Unauthenticated API request to delete a service type                                                    | `backend/tests/serviceTypes.test.js`  | `Unauthenticated API request to delete a service type`                                                    |
| US-14.5 | Signed-in user without admin , area admin, or maintenance role accesses service types page              | `frontend/tests/ServiceTypes.test.js` | `Signed-in user without admin , area admin, or maintenance role accesses service types page`              |
| US-14.5 | Signed-in user without admin , area admin, or maintenance role API request to service types             | `backend/tests/serviceTypes.test.js`  | `Signed-in user without admin , area admin, or maintenance role API request to service types`             |
| US-14.5 | Signed-in user without admin , area admin, or maintenance role API request to a particular service type | `backend/tests/serviceTypes.test.js`  | `Signed-in user without admin , area admin, or maintenance role API request to a particular service type` |
| US-14.5 | Signed-in user without admin , area admin, or maintenance role API request to create a service type     | `backend/tests/serviceTypes.test.js`  | `Signed-in user without admin , area admin, or maintenance role API request to create a service type`     |
| US-14.5 | Signed-in user without admin , area admin, or maintenance role API request to update a service type     | `backend/tests/serviceTypes.test.js`  | `Signed-in user without admin , area admin, or maintenance role API request to update a service type`     |
| US-14.5 | Signed-in user without admin , area admin, or maintenance role API request to delete a service type     | `backend/tests/serviceTypes.test.js`  | `Signed-in user without admin , area admin, or maintenance role API request to delete a service type`     |

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

---

## Delivered to later features

- A service type row with `id`, `name`, `service_frequency_days`, and `service_frequency_miles`
- `GET /api/service-types` returns every service type for any valid session with `admin`, `area_admin`, or `maintenance` role
- Delete removes an existing service type unconditionally and returns `200`
