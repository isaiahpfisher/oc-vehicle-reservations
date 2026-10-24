# Feature: Mileage Log

**Feature ID:** 9
**Branch pattern:** `feature/9-mileage-log`
**Status:** Draft
**Created:** 2026-10-23
**Input:** Signed-in users record one odometer reading for a vehicle. Each row stores which user added it. Mileage logs are added and edited with a dialog.
**Depends on:** Feature 1 [User Auth], Feature 5 [Vehicles]

---

## User Stories

### US-9.1: Create mileage logs

**As a** signed-in user
**I want to** record an odometer reading for a vehicle
**So that** the vehicle has a mileage history and the system knows who added the reading

**Priority:** P1
**Independent test:** Open the mileage log dialog, create a reading; it appears in the mileage logs view with the signed-in user
**Acceptance scenarios:** see ### US-9.1 under Acceptance Criteria

### US-9.2: View mileage logs

**As a** signed-in user
**I want to** see all mileage logs
**So that** I can see the odometer readings that have been recorded

**Priority:** P1
**Independent test:** Mileage logs view loads a single list of mileage logs
**Acceptance scenarios:** see ### US-9.2 under Acceptance Criteria

### US-9.3: Manage mileage log rows

**As a** signed-in user
**I want** each mileage log row to have **edit** and **delete** actions
**So that** I can manage mileage logs from the mileage logs view

**Priority:** P1
**Independent test:** Each mileage log row exposes edit and delete icon actions
**Acceptance scenarios:** see ### US-9.3 under Acceptance Criteria

### US-9.4: Edit and delete mileage logs

**As a** signed-in user
**I want to** edit or delete a mileage log
**So that** I can correct or remove an odometer reading

**Priority:** P2
**Independent test:** Edit and delete mileage logs from row actions; the mileage logs view updates; the user who added the row does not change
**Acceptance scenarios:** see ### US-9.4 under Acceptance Criteria

### US-9.5: Signed-in user access only

**As a** signed-in user
**I want to** have mileage logs visible only to signed-in users
**So that** unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/mileage-logs` is redirected to `/login`; unauthorized API requests receive errors
**Acceptance scenarios:** see ### US-9.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All mileage log endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: A mileage log MUST store `vehicleId`, `userId`, `odometerReading`, and `recordedAt`. `id` is assigned by the database.
- **FR-003**: `userId` MUST be set from the authenticated session on create. A `userId` in the request body MUST be ignored. An update MUST NOT change `userId`.
- **FR-004**: `vehicleId` MUST reference an existing vehicle. A missing `vehicleId` MUST be rejected. A `vehicleId` that does not exist MUST be rejected.
- **FR-005**: `odometerReading` MUST be an integer greater than or equal to `0`. A missing, non-integer, or negative reading MUST be rejected. `0` is valid.
- **FR-006**: `recordedAt` MUST be a valid calendar date (`YYYY-MM-DD`). A missing or invalid date MUST be rejected.

---

## Assumptions

- Mileage logs use **dialog-based** workflows (no split sidebar / main panel).
- Feature 1 provides sign in but no roles. Updating mileage log code to restrict based on roles will be in a later feature.
- Feature 5 provides vehicles. The create and edit dialogs choose one of those vehicles. This feature does not create vehicles.
- The user who added a row is shown with that user's first and last name.
- A vehicle in the list is shown by its `universityId`.
- Delete removes the mileage log row. No other table references `mileageLogs` yet, so this feature does not block a delete.

## Edge Cases

- Missing vehicle, odometer reading, or recorded date → client block and/or `400`.
- Odometer reading that is not a whole number, or is negative → `400`.
- Recorded date that is not a valid `YYYY-MM-DD` date → `400`.
- `vehicleId` that does not exist → `404`.
- Request body `userId` different from the signed-in user → stored `userId` stays the session user on create, and stays unchanged on update.
- Unauthenticated mileage logs screen → redirect.
- Unauthenticated API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in user can create, view, edit, and delete mileage logs on one screen.
- **SC-003**: `npm test` passes for mileage logs API and mileage logs view behavior.

---

## Data Ownership & Isolation

Any signed in user may create, edit, delete, or read the list of mileage logs. The `userId` on a row is the user who added it, not a permission scope.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/mileage-logs` and `GET /api/mileage-logs/:mileageLogId` require a Bearer token. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token. |
| **Create scope** | `POST` requires a Bearer token. `userId` comes from that token. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/mileage-logs` | Yes | Fetch all mileage logs |
| `GET` | `/api/mileage-logs/:mileageLogId` | Yes | Fetch a single mileage log |
| `POST` | `/api/mileage-logs` | Yes | Create a mileage log |
| `PUT` | `/api/mileage-logs/:mileageLogId` | Yes | Edit a mileage log |
| `DELETE` | `/api/mileage-logs/:mileageLogId` | Yes | Delete a mileage log |

**Create mileage log request body:**

```json
{
  "vehicleId": 3,
  "odometerReading": 12050,
  "recordedAt": "2026-10-23"
}
```

**Mileage log success response** (`200` / `201`):

```json
{
  "id": 1,
  "vehicleId": 3,
  "userId": 2,
  "odometerReading": 12050,
  "recordedAt": "2026-10-23",
  "user": {
    "id": 2,
    "firstName": "Jane",
    "lastName": "Doe"
  },
  "vehicle": {
    "id": 3,
    "universityId": "V-100"
  },
  "createdAt": "2026-10-23T12:00:00.000Z",
  "updatedAt": "2026-10-23T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404` (do not use `403`).

---

## Screen Requirements

### [View: Mileage Logs] — route name `mileage-logs`

**Single Vue view** (`MileageLogs.vue`) — no sidebar / main-panel split.

- Heading: **Mileage Log**
- Primary action: **+ New Mileage Log** opens a `<v-dialog>` with **Vehicle**, **Odometer reading**, and **Recorded date**, plus **Create** / **Cancel**.
  - **Vehicle** is a `<v-select>` of existing vehicles, labeled by `universityId`.
  - There is no user field. The signed-in user is stored by the API.
- Display mileage logs as rows. Each row shows the vehicle `universityId`, the **odometer reading**, the **recorded date**, and the first and last name of the user who added it.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current vehicle, odometer reading, and recorded date; **Save** / **Cancel**.
  - **Vehicle** is a `<v-select>`.
  - The user who added the row is not editable.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit mileage log**, **Delete mileage log**).
- **Empty state:** **"No mileage logs yet. Create your first mileage log."** when there are no mileage logs.
- **Loading state:** skeleton or progress indicator while mileage logs are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for mileage logs; delete dialog is a reusable component in `components/common` folder; create and edit dialogs should be components stored in a dedicated `components/mileageLogs` folder and modeled after existing create and edit dialogs in `components/` folders.

---

## Key Entities

- **MileageLog**: one odometer reading for a single vehicle, recorded by one user on a date.
- **Vehicle**: the vehicle the reading belongs to. Provided by Feature 5.
- **User**: the signed-in user who added the reading.

---

## Data Model Requirements

### `mileageLogs` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `vehicleId` | INTEGER FK | Required; must reference `vehicles.id` |
| `userId` | INTEGER FK | Required; set from the session; must reference `users.id` |
| `odometerReading` | INTEGER | Required; integer ≥ 0 |
| `recordedAt` | DATEONLY | Required; valid calendar date |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- `MileageLog` belongs to `Vehicle`
- `MileageLog` belongs to `User`
- `Vehicle` has many `MileageLog`
- `User` has many `MileageLog`

---

## Acceptance Criteria (Gherkin)

### US-9.1 — Create mileage logs

#### Scenario: User creates mileage log

- **Given** I am signed in on the mileage logs view
- **When** I click **+ New Mileage Log**
- **Then** a dialog opens with **Vehicle**, **Odometer reading**, and **Recorded date**
- **And** the dialog has no user field

#### Scenario: User saves mileage log

- **Given** I am signed in as Jane Doe on the mileage logs view
- **And** a vehicle with id `3` and university id `V-100` exists
- **When** I submit the create dialog with that vehicle, odometer reading `12050`, and recorded date `2026-10-23`
- **Then** the API returns `201` with that mileage log
- **And** `userId` is my user id
- **And** the mileage logs list shows `V-100`, `12050`, `2026-10-23`, and `Jane Doe`

#### Scenario: User saves mileage log with an odometer reading of zero

- **Given** I am signed in on the mileage logs view
- **And** a vehicle with id `3` exists
- **When** I submit the create dialog with that vehicle, odometer reading `0`, and recorded date `2026-10-23`
- **Then** the API returns `201` with `odometerReading` `0`

#### Scenario: User creates mileage log with missing vehicle

- **Given** I am signed in on the mileage logs view
- **When** I submit the create dialog without a vehicle
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User creates mileage log with missing odometer reading

- **Given** I am signed in on the mileage logs view
- **When** I submit the create dialog without an odometer reading
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User creates mileage log with missing recorded date

- **Given** I am signed in on the mileage logs view
- **When** I submit the create dialog without a recorded date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User requests to create a mileage log with a missing vehicle

- **Given** I am signed in
- **When** I request `POST /api/mileage-logs` with `{ "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Missing vehicle." }`

#### Scenario: User requests to create a mileage log with a missing odometer reading

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Missing odometer reading." }`

#### Scenario: User requests to create a mileage log with a missing recorded date

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": 12050 }`
- **Then** the API returns `400` with `{ "message": "Missing recorded date." }`

#### Scenario: User creates mileage log with a non-whole-number odometer reading

- **Given** I am signed in on the mileage logs view
- **When** I submit the create dialog with odometer reading `12050.5`
- **Then** validation blocks the request and I see an `Odometer reading must be a whole number.` message

#### Scenario: User requests to create a mileage log with a non-whole-number odometer reading

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": 12050.5, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Odometer reading must be a whole number." }`

#### Scenario: User creates mileage log with a negative odometer reading

- **Given** I am signed in on the mileage logs view
- **When** I submit the create dialog with odometer reading `-1`
- **Then** validation blocks the request and I see an `Odometer reading must be zero or greater.` message

#### Scenario: User requests to create a mileage log with a negative odometer reading

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": -1, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Odometer reading must be zero or greater." }`

#### Scenario: User creates mileage log with an invalid recorded date

- **Given** I am signed in on the mileage logs view
- **When** I submit the create dialog with recorded date `not-a-date`
- **Then** validation blocks the request and I see an `Invalid recorded date.` message

#### Scenario: User requests to create a mileage log with an invalid recorded date

- **Given** I am signed in
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": 12050, "recordedAt": "not-a-date" }`
- **Then** the API returns `400` with `{ "message": "Invalid recorded date." }`

#### Scenario: User requests to create a mileage log for a vehicle that does not exist

- **Given** I am signed in
- **And** a vehicle with id `999` does not exist
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 999, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `404` with `{ "message": "Vehicle not found." }`

#### Scenario: User requests to create a mileage log with a different userId

- **Given** I am signed in as user id `2`
- **And** a vehicle with id `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "userId": 8, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `201`
- **And** the stored `userId` is `2`

---

### US-9.2 — View mileage logs

#### Scenario: Mileage logs view lists mileage logs

- **Given** I am signed in
- **And** a mileage log exists for vehicle `V-100` with odometer reading `12050`, recorded date `2026-10-23`, added by Jane Doe
- **When** I open the mileage logs view
- **Then** I see a row with `V-100`, `12050`, `2026-10-23`, and `Jane Doe`

#### Scenario: Mileage logs empty state

- **Given** I am signed in and there are no mileage logs
- **When** I open the mileage logs view
- **Then** I see **"No mileage logs yet. Create your first mileage log."**

---

### US-9.3 — Manage mileage log rows

#### Scenario: Mileage log rows have edit and delete actions

- **Given** I am signed in and at least one mileage log exists
- **When** I view the mileage logs list
- **Then** each row shows **Edit mileage log** and **Delete mileage log**

---

### US-9.4 — Edit and delete mileage logs

#### Scenario: User edits a mileage log odometer reading

- **Given** I am signed in and a mileage log with odometer reading `12050` exists
- **When** I change the odometer reading to `12100` and submit
- **Then** the API returns `200` with the updated mileage log
- **And** the list shows `12100`

#### Scenario: User edits a mileage log recorded date

- **Given** I am signed in and a mileage log recorded on `2026-10-23` exists
- **When** I change the recorded date to `2026-10-24` and submit
- **Then** the API returns `200` with the updated mileage log
- **And** the list shows `2026-10-24`

#### Scenario: User edits a mileage log vehicle

- **Given** I am signed in
- **And** vehicles `V-100` and `V-200` exist
- **And** a mileage log for `V-100` exists
- **When** I change the vehicle to `V-200` and submit
- **Then** the API returns `200` with the updated mileage log
- **And** the list shows `V-200`

#### Scenario: User edits a mileage log to have a missing vehicle

- **Given** I am signed in on the mileage logs view
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog without a vehicle
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User edits a mileage log to have a missing odometer reading

- **Given** I am signed in on the mileage logs view
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog without an odometer reading
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User edits a mileage log to have a missing recorded date

- **Given** I am signed in on the mileage logs view
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog without a recorded date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User requests to edit a mileage log to have a missing vehicle

- **Given** I am signed in
- **And** a mileage log with id `1` exists
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": null, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Missing vehicle." }`

#### Scenario: User requests to edit a mileage log to have a missing odometer reading

- **Given** I am signed in
- **And** a mileage log with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Missing odometer reading." }`

#### Scenario: User requests to edit a mileage log to have a missing recorded date

- **Given** I am signed in
- **And** a mileage log with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": 12050 }`
- **Then** the API returns `400` with `{ "message": "Missing recorded date." }`

#### Scenario: User edits a mileage log to have a non-whole-number odometer reading

- **Given** I am signed in on the mileage logs view
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog with odometer reading `12050.5`
- **Then** validation blocks the request and I see an `Odometer reading must be a whole number.` message

#### Scenario: User requests to edit a mileage log to have a non-whole-number odometer reading

- **Given** I am signed in
- **And** a mileage log with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": 12050.5, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Odometer reading must be a whole number." }`

#### Scenario: User edits a mileage log to have a negative odometer reading

- **Given** I am signed in on the mileage logs view
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog with odometer reading `-1`
- **Then** validation blocks the request and I see an `Odometer reading must be zero or greater.` message

#### Scenario: User requests to edit a mileage log to have a negative odometer reading

- **Given** I am signed in
- **And** a mileage log with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": -1, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Odometer reading must be zero or greater." }`

#### Scenario: User edits a mileage log to have an invalid recorded date

- **Given** I am signed in on the mileage logs view
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog with recorded date `not-a-date`
- **Then** validation blocks the request and I see an `Invalid recorded date.` message

#### Scenario: User requests to edit a mileage log to have an invalid recorded date

- **Given** I am signed in
- **And** a mileage log with id `1` exists
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": 12050, "recordedAt": "not-a-date" }`
- **Then** the API returns `400` with `{ "message": "Invalid recorded date." }`

#### Scenario: User requests to edit a mileage log to a vehicle that does not exist

- **Given** I am signed in
- **And** a mileage log with id `1` exists
- **And** a vehicle with id `999` does not exist
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 999, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `404` with `{ "message": "Vehicle not found." }`

#### Scenario: User requests to edit a mileage log with a different userId

- **Given** I am signed in
- **And** a mileage log with id `1` was added by user id `2`
- **And** a vehicle with id `3` exists
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "userId": 8, "odometerReading": 12100, "recordedAt": "2026-10-23" }`
- **Then** the API returns `200`
- **And** the stored `userId` is still `2`

#### Scenario: User deletes a mileage log

- **Given** I am signed in and a mileage log for vehicle `V-100` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that mileage log is removed from the list

#### Scenario: User updates a mileage log that does not exist

- **Given** I am signed in
- **And** a mileage log with id `999` does not exist
- **When** I request `PUT /api/mileage-logs/999` with a valid body
- **Then** the API returns `404`

#### Scenario: User updates a mileage log with an invalid mileageLogId

- **Given** I am signed in
- **When** I request `PUT /api/mileage-logs/abc` with a valid body
- **Then** the API returns `400`

#### Scenario: User deletes a mileage log that does not exist

- **Given** I am signed in
- **And** a mileage log with id `999` does not exist
- **When** I request `DELETE /api/mileage-logs/999`
- **Then** the API returns `404`

#### Scenario: User deletes a mileage log with an invalid mileageLogId

- **Given** I am signed in
- **When** I request `DELETE /api/mileage-logs/abc`
- **Then** the API returns `400`

---

### US-9.5: Signed-in user access only

#### Scenario: Un-signed-in user accesses mileage logs page

- **Given** I am not signed in
- **When** I navigate to `/mileage-logs` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to mileage logs

- **Given** I have no valid session token
- **When** I request `GET /api/mileage-logs`
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

#### Scenario: Unauthenticated API request to a particular mileage log

- **Given** I have no valid session token
- **And** a mileage log with id `1` exists
- **When** I request `GET /api/mileage-logs/1`
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

#### Scenario: Unauthenticated API request to create a mileage log

- **Given** I have no valid session token
- **When** I request `POST /api/mileage-logs` with a valid body
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

#### Scenario: Unauthenticated API request to update a mileage log

- **Given** I have no valid session token
- **And** a mileage log with id `1` exists
- **When** I request `PUT /api/mileage-logs/1` with a valid body
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

#### Scenario: Unauthenticated API request to delete a mileage log

- **Given** I have no valid session token
- **And** a mileage log with id `1` exists
- **When** I request `DELETE /api/mileage-logs/1`
- **Then** the API returns `401` with `{ "message": "Unauthorized." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-9.1 | User creates mileage log | `frontend/tests/MileageLogs.test.js` | `User creates mileage log` |
| US-9.1 | User saves mileage log | `backend/tests/mileageLogs.test.js` | `User saves mileage log` |
| US-9.1 | User saves mileage log | `frontend/tests/MileageLogs.test.js` | `User saves mileage log` |
| US-9.1 | User saves mileage log with an odometer reading of zero | `backend/tests/mileageLogs.test.js` | `User saves mileage log with an odometer reading of zero` |
| US-9.1 | User creates mileage log with missing vehicle | `frontend/tests/MileageLogs.test.js` | `User creates mileage log with missing vehicle` |
| US-9.1 | User creates mileage log with missing odometer reading | `frontend/tests/MileageLogs.test.js` | `User creates mileage log with missing odometer reading` |
| US-9.1 | User creates mileage log with missing recorded date | `frontend/tests/MileageLogs.test.js` | `User creates mileage log with missing recorded date` |
| US-9.1 | User requests to create a mileage log with a missing vehicle | `backend/tests/mileageLogs.test.js` | `User requests to create a mileage log with a missing vehicle` |
| US-9.1 | User requests to create a mileage log with a missing odometer reading | `backend/tests/mileageLogs.test.js` | `User requests to create a mileage log with a missing odometer reading` |
| US-9.1 | User requests to create a mileage log with a missing recorded date | `backend/tests/mileageLogs.test.js` | `User requests to create a mileage log with a missing recorded date` |
| US-9.1 | User creates mileage log with a non-whole-number odometer reading | `frontend/tests/MileageLogs.test.js` | `User creates mileage log with a non-whole-number odometer reading` |
| US-9.1 | User requests to create a mileage log with a non-whole-number odometer reading | `backend/tests/mileageLogs.test.js` | `User requests to create a mileage log with a non-whole-number odometer reading` |
| US-9.1 | User creates mileage log with a negative odometer reading | `frontend/tests/MileageLogs.test.js` | `User creates mileage log with a negative odometer reading` |
| US-9.1 | User requests to create a mileage log with a negative odometer reading | `backend/tests/mileageLogs.test.js` | `User requests to create a mileage log with a negative odometer reading` |
| US-9.1 | User creates mileage log with an invalid recorded date | `frontend/tests/MileageLogs.test.js` | `User creates mileage log with an invalid recorded date` |
| US-9.1 | User requests to create a mileage log with an invalid recorded date | `backend/tests/mileageLogs.test.js` | `User requests to create a mileage log with an invalid recorded date` |
| US-9.1 | User requests to create a mileage log for a vehicle that does not exist | `backend/tests/mileageLogs.test.js` | `User requests to create a mileage log for a vehicle that does not exist` |
| US-9.1 | User requests to create a mileage log with a different userId | `backend/tests/mileageLogs.test.js` | `User requests to create a mileage log with a different userId` |
| US-9.2 | Mileage logs view lists mileage logs | `frontend/tests/MileageLogs.test.js` | `Mileage logs view lists mileage logs` |
| US-9.2 | Mileage logs empty state | `frontend/tests/MileageLogs.test.js` | `Mileage logs empty state` |
| US-9.3 | Mileage log rows have edit and delete actions | `frontend/tests/MileageLogs.test.js` | `Mileage log rows have edit and delete actions` |
| US-9.4 | User edits a mileage log odometer reading | `backend/tests/mileageLogs.test.js` | `User edits a mileage log odometer reading` |
| US-9.4 | User edits a mileage log odometer reading | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log odometer reading` |
| US-9.4 | User edits a mileage log recorded date | `backend/tests/mileageLogs.test.js` | `User edits a mileage log recorded date` |
| US-9.4 | User edits a mileage log recorded date | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log recorded date` |
| US-9.4 | User edits a mileage log vehicle | `backend/tests/mileageLogs.test.js` | `User edits a mileage log vehicle` |
| US-9.4 | User edits a mileage log vehicle | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log vehicle` |
| US-9.4 | User edits a mileage log to have a missing vehicle | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log to have a missing vehicle` |
| US-9.4 | User edits a mileage log to have a missing odometer reading | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log to have a missing odometer reading` |
| US-9.4 | User edits a mileage log to have a missing recorded date | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log to have a missing recorded date` |
| US-9.4 | User requests to edit a mileage log to have a missing vehicle | `backend/tests/mileageLogs.test.js` | `User requests to edit a mileage log to have a missing vehicle` |
| US-9.4 | User requests to edit a mileage log to have a missing odometer reading | `backend/tests/mileageLogs.test.js` | `User requests to edit a mileage log to have a missing odometer reading` |
| US-9.4 | User requests to edit a mileage log to have a missing recorded date | `backend/tests/mileageLogs.test.js` | `User requests to edit a mileage log to have a missing recorded date` |
| US-9.4 | User edits a mileage log to have a non-whole-number odometer reading | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log to have a non-whole-number odometer reading` |
| US-9.4 | User requests to edit a mileage log to have a non-whole-number odometer reading | `backend/tests/mileageLogs.test.js` | `User requests to edit a mileage log to have a non-whole-number odometer reading` |
| US-9.4 | User edits a mileage log to have a negative odometer reading | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log to have a negative odometer reading` |
| US-9.4 | User requests to edit a mileage log to have a negative odometer reading | `backend/tests/mileageLogs.test.js` | `User requests to edit a mileage log to have a negative odometer reading` |
| US-9.4 | User edits a mileage log to have an invalid recorded date | `frontend/tests/MileageLogs.test.js` | `User edits a mileage log to have an invalid recorded date` |
| US-9.4 | User requests to edit a mileage log to have an invalid recorded date | `backend/tests/mileageLogs.test.js` | `User requests to edit a mileage log to have an invalid recorded date` |
| US-9.4 | User requests to edit a mileage log to a vehicle that does not exist | `backend/tests/mileageLogs.test.js` | `User requests to edit a mileage log to a vehicle that does not exist` |
| US-9.4 | User requests to edit a mileage log with a different userId | `backend/tests/mileageLogs.test.js` | `User requests to edit a mileage log with a different userId` |
| US-9.4 | User deletes a mileage log | `backend/tests/mileageLogs.test.js` | `User deletes a mileage log` |
| US-9.4 | User deletes a mileage log | `frontend/tests/MileageLogs.test.js` | `User deletes a mileage log` |
| US-9.4 | User updates a mileage log that does not exist | `backend/tests/mileageLogs.test.js` | `User updates a mileage log that does not exist` |
| US-9.4 | User updates a mileage log with an invalid mileageLogId | `backend/tests/mileageLogs.test.js` | `User updates a mileage log with an invalid mileageLogId` |
| US-9.4 | User deletes a mileage log that does not exist | `backend/tests/mileageLogs.test.js` | `User deletes a mileage log that does not exist` |
| US-9.4 | User deletes a mileage log with an invalid mileageLogId | `backend/tests/mileageLogs.test.js` | `User deletes a mileage log with an invalid mileageLogId` |
| US-9.5 | Un-signed-in user accesses mileage logs page | `frontend/tests/MileageLogs.test.js` | `Un-signed-in user accesses mileage logs page` |
| US-9.5 | Unauthenticated API request to mileage logs | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to mileage logs` |
| US-9.5 | Unauthenticated API request to a particular mileage log | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to a particular mileage log` |
| US-9.5 | Unauthenticated API request to create a mileage log | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to create a mileage log` |
| US-9.5 | Unauthenticated API request to update a mileage log | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to update a mileage log` |
| US-9.5 | Unauthenticated API request to delete a mileage log | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to delete a mileage log` |

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 9 from @features/feature-9-mileage-log.md on branch `feature/9-mileage-log`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `api.md`, `data-model.md`, `behavior.md`.

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-006** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Role checks on mileage log endpoints
- Creating or editing vehicles from this screen
- Requiring a new reading to be greater than the vehicle's previous reading
- Blocking delete when a later feature (service log) references a mileage log

---

## Delivered to later features

- A mileage log row with `id`, `vehicleId`, `userId`, `odometerReading`, and `recordedAt`
- `GET /api/mileage-logs` returns every mileage log for any valid session
- Delete removes an existing mileage log unconditionally and returns `200`
