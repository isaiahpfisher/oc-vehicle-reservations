# Feature: Mileage Log

**Feature ID:** 9
**Branch pattern:** `feature/9-mileage-log`
**Status:** Draft
**Created:** 2026-10-23
**Input:** Signed-in users record one odometer reading for a vehicle. Each row stores which user added it. Mileage logs are added and edited with a dialog.
**Depends on:** Feature 1 [User Auth], Feature 3 [User Roles], Feature 5 [Vehicles]

---

## User Stories

### US-9.1: Create mileage logs

**As a** admin or area-admin
**I want to** record an odometer reading for a vehicle
**So that** the vehicle has a mileage history and the system knows who added the reading

**Priority:** P1
**Independent test:** Open the mileage log dialog, create a reading; it appears in the mileage logs view with the signed-in user
**Acceptance scenarios:** see ### US-9.1 under Acceptance Criteria

### US-9.2: View mileage logs

**As a** admin or area-admin
**I want to** see all mileage logs for the vehicle
**So that** I can see the odometer readings that have been recorded

**Priority:** P1
**Independent test:** Mileage logs view loads a single list of mileage logs for `vehicleId`
**Acceptance scenarios:** see ### US-9.2 under Acceptance Criteria

### US-9.3: Manage mileage log rows

**As a** admin or area-admin
**I want** each mileage log row to have **edit** and **delete** actions
**So that** I can manage mileage logs for a vehicle from the mileage logs view

**Priority:** P1
**Independent test:** Each mileage log row exposes edit and delete icon actions
**Acceptance scenarios:** see ### US-9.3 under Acceptance Criteria

### US-9.4: Edit and delete mileage logs

**As a** admin or area-admin
**I want to** edit or delete a mileage log
**So that** I can correct or remove an odometer reading

**Priority:** P2
**Independent test:** Edit and delete mileage logs from row actions; the mileage logs view updates; the user who added the row does not change
**Acceptance scenarios:** see ### US-9.4 under Acceptance Criteria

### US-9.5: Session and role access
**As an** admin or area admin
**I want** mileage logs limited to signed-in admins and area admins for vehicles they can access
**So that** unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** A signed-out visit to `/vehicles/:vehicleId/mileage-logs` redirects to `/login`; a request with no session returns `401`; a regular user, or an area admin for a vehicle outside their area, receives `403`
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
- The user who added a row is shown with that user's first and last name.
- The page heading shows that vehicle's `universityId`. Each row shows the odometer reading, the recorded date, and the name of the user who added it.
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
- **SC-002**: Admin or Area-admin can create, view, edit, and delete mileage logs on one screen.
- **SC-003**: `npm test` passes for mileage logs API and mileage logs view behavior.

---

## Data Ownership & Isolation

An admin may create, view, edit, and delete mileage logs for any vehicle. An area admin may do those same actions only for vehicles in areas they administer. Any other signed-in user receives `403`. The `userId` on a row is the user who added the reading, not the permission check.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/mileage-logs?vehicleId=:vehicleId` and `GET /api/mileage-logs/:mileageLogId` require a Bearer token. An admin may read any vehicle's logs. An area admin may read them only when the vehicle belongs to an area they administer. Anyone else receives `403`. |
| **Write scope** | `PUT` and `DELETE` require an admin, or an area admin for a log whose vehicle is in an area they administer. Anyone else receives `403`. |
| **Create scope** | `POST` requires an admin, or an area admin for that `vehicleId`. `userId` comes from the Bearer token. Anyone else receives `403`. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/mileage-logs?vehicleId=:vehicleId` | Yes- Admin or Area Admin for vehicles in area | Fetch all mileage logs for that vehicle |
| `GET` | `/api/mileage-logs/:mileageLogId` | Yes- Admin or Area Admin | Fetch a single mileage log |
| `POST` | `/api/mileage-logs` | Yes- Admin or Area Admin | Create a mileage log |
| `PUT` | `/api/mileage-logs/:mileageLogId` | Yes- Admin or Area Admin | Edit a mileage log |
| `DELETE` | `/api/mileage-logs/:mileageLogId` | Yes- Admin or Area Admin | Delete a mileage log |

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
**Not found:** `404` for missing mileage logs or vehicles.
**Forbidden** `403` when signed-in user is not allowed to view or manage that log. 

---

## Screen Requirements

### [View: Mileage Logs] — route name `vehicle-mileage-logs` (`/vehicles/:vehicleId/mileage-logs`)

**Single Vue view** (`MileageLogs.vue`) — no sidebar / main-panel split. The vehicle page links here. This spec does not build the vehicle page. The route's `vehicleId` is the only vehicle on this screen.

- Heading: **Mileage Log** for that vehicle's `universityId`.
- The list loads `GET /api/mileage-logs?vehicleId=:vehicleId` and shows only that vehicle's readings.
- Primary action: **+ New Mileage Log** opens a `<v-dialog>` with **Odometer reading** and **Recorded date**, plus **Create** / **Cancel**.
  - There is no vehicle field and no user field. The route supplies `vehicleId`. The signed-in user is stored by the API.
- Display mileage logs as rows. Each row shows the **odometer reading**, the **recorded date**, and the first and last name of the user who added it.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current odometer reading and recorded date; **Save** / **Cancel**.
  - The vehicle and the user who added the row are not editable.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit mileage log**, **Delete mileage log**).
- **Empty state:** **"No mileage logs yet for this vehicle."** when that vehicle has no mileage logs.
- **Loading state:** skeleton or progress indicator while mileage logs are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for one vehicle's mileage logs; delete dialog is a reusable component in `components/common` folder; create and edit dialogs should be components stored in a dedicated `components/mileageLogs` folder and modeled after existing create and edit dialogs in `components/` folders.

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

#### Scenario: Admin creates mileage log

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **When** I click **+ New Mileage Log**
- **Then** a dialog opens with **Odometer reading** and **Recorded date**
- **And** the dialog has no vehicle field and no user field

#### Scenario: Admin saves mileage log

- **Given** I am signed in as Jane Doe, an admin, on `/vehicles/3/mileage-logs`
- **And** vehicle `3` has university id `V-100` and belongs to Athletics
- **When** I submit the create dialog with odometer reading `12050` and recorded date `2026-10-23`
- **Then** the API returns `201` with `vehicleId` `3` and `odometerReading` `12050`
- **And** `userId` is my user id
- **And** the list shows `12050`, `2026-10-23`, and `Jane Doe`

#### Scenario: Area admin saves mileage log for a vehicle in their area

- **Given** I am signed in as an area admin for Athletics
- **And** vehicle `3` belongs to Athletics
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `201` with `vehicleId` `3`

#### Scenario: Admin saves mileage log with an odometer reading of zero

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** vehicle `3` exists
- **When** I submit the create dialog with odometer reading `0` and recorded date `2026-10-23`
- **Then** the API returns `201` with `odometerReading` `0`

#### Scenario: Admin creates mileage log with missing odometer reading

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **When** I submit the create dialog without an odometer reading
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin creates mileage log with missing recorded date

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **When** I submit the create dialog without a recorded date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin requests to create a mileage log with a missing vehicle

- **Given** I am signed in as an admin
- **When** I request `POST /api/mileage-logs` with `{ "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Missing vehicle." }`

#### Scenario: Admin requests to create a mileage log with a missing odometer reading

- **Given** I am signed in as an admin
- **And** vehicle `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Missing odometer reading." }`

#### Scenario: Admin requests to create a mileage log with a missing recorded date

- **Given** I am signed in as an admin
- **And** vehicle `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": 12050 }`
- **Then** the API returns `400` with `{ "message": "Missing recorded date." }`

#### Scenario: Admin creates mileage log with a non-whole-number odometer reading

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **When** I submit the create dialog with odometer reading `12050.5`
- **Then** validation blocks the request and I see an `Odometer reading must be a whole number.` message

#### Scenario: Admin requests to create a mileage log with a non-whole-number odometer reading

- **Given** I am signed in as an admin
- **And** vehicle `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": 12050.5, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Odometer reading must be a whole number." }`

#### Scenario: Admin creates mileage log with a negative odometer reading

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **When** I submit the create dialog with odometer reading `-1`
- **Then** validation blocks the request and I see an `Odometer reading must be zero or greater.` message

#### Scenario: Admin requests to create a mileage log with a negative odometer reading

- **Given** I am signed in as an admin
- **And** vehicle `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": -1, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Odometer reading must be zero or greater." }`

#### Scenario: Admin creates mileage log with an invalid recorded date

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **When** I submit the create dialog with recorded date `not-a-date`
- **Then** validation blocks the request and I see an `Invalid recorded date.` message

#### Scenario: Admin requests to create a mileage log with an invalid recorded date

- **Given** I am signed in as an admin
- **And** vehicle `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": 12050, "recordedAt": "not-a-date" }`
- **Then** the API returns `400` with `{ "message": "Invalid recorded date." }`

#### Scenario: Admin requests to create a mileage log for a vehicle that does not exist

- **Given** I am signed in as an admin
- **And** a vehicle with id `999` does not exist
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 999, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `404` with `{ "message": "Vehicle not found." }`

#### Scenario: Admin requests to create a mileage log with a different userId

- **Given** I am signed in as an admin with user id `2`
- **And** vehicle `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "userId": 8, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `201`
- **And** the stored `userId` is `2`

---

### US-9.2 — View mileage logs

#### Scenario: Admin mileage logs view lists that vehicle's mileage logs

- **Given** I am signed in as an admin
- **And** vehicle `3`, university id `V-100`, has a mileage log with odometer reading `12050`, recorded date `2026-10-23`, added by Jane Doe
- **And** vehicle `4` has a mileage log with odometer reading `800`
- **When** I open `/vehicles/3/mileage-logs`
- **Then** the heading shows `V-100`
- **And** I see a row with `12050`, `2026-10-23`, and `Jane Doe`
- **And** I do not see `800`

#### Scenario: Admin mileage logs empty state

- **Given** I am signed in as an admin
- **And** vehicle `3` exists and has no mileage logs
- **When** I open `/vehicles/3/mileage-logs`
- **Then** I see **"No mileage logs yet for this vehicle."**

#### Scenario: Area admin views mileage logs for a vehicle in their area

- **Given** I am signed in as an area admin for Athletics
- **And** vehicle `3` belongs to Athletics and has a mileage log with odometer reading `12050`
- **When** I request `GET /api/mileage-logs?vehicleId=3`
- **Then** the API returns `200`
- **And** the list includes the reading `12050`

---

### US-9.3 — Manage mileage log rows

#### Scenario: Admin mileage log rows have edit and delete actions

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** that vehicle has at least one mileage log
- **When** I view the list
- **Then** each row shows **Edit mileage log** and **Delete mileage log**

#### Scenario: Area admin mileage log rows have edit and delete actions

- **Given** I am signed in as an area admin for Athletics
- **And** vehicle `3` belongs to Athletics and has a mileage log
- **When** I open `/vehicles/3/mileage-logs`
- **Then** that row shows **Edit mileage log** and **Delete mileage log**

---

### US-9.4 — Edit and delete mileage logs

#### Scenario: Admin edits a mileage log odometer reading

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** a mileage log for vehicle `3` has odometer reading `12050`
- **When** I change the odometer reading to `12100` and submit
- **Then** the API returns `200`
- **And** the list shows `12100`
- **And** `vehicleId` is still `3`

#### Scenario: Admin edits a mileage log recorded date

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** a mileage log for vehicle `3` was recorded on `2026-10-23`
- **When** I change the recorded date to `2026-10-24` and submit
- **Then** the API returns `200`
- **And** the list shows `2026-10-24`

#### Scenario: Admin edits a mileage log to have a missing odometer reading

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog without an odometer reading
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin edits a mileage log to have a missing recorded date

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog without a recorded date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin requests to edit a mileage log to have a missing vehicle

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` exists for vehicle `3`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": null, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Missing vehicle." }`

#### Scenario: Admin requests to edit a mileage log to have a missing odometer reading

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` exists for vehicle `3`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Missing odometer reading." }`

#### Scenario: Admin requests to edit a mileage log to have a missing recorded date

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` exists for vehicle `3`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": 12050 }`
- **Then** the API returns `400` with `{ "message": "Missing recorded date." }`

#### Scenario: Admin edits a mileage log to have a non-whole-number odometer reading

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog with odometer reading `12050.5`
- **Then** validation blocks the request and I see an `Odometer reading must be a whole number.` message

#### Scenario: Admin requests to edit a mileage log to have a non-whole-number odometer reading

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` exists for vehicle `3`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": 12050.5, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Odometer reading must be a whole number." }`

#### Scenario: Admin edits a mileage log to have a negative odometer reading

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog with odometer reading `-1`
- **Then** validation blocks the request and I see an `Odometer reading must be zero or greater.` message

#### Scenario: Admin requests to edit a mileage log to have a negative odometer reading

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` exists for vehicle `3`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": -1, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Odometer reading must be zero or greater." }`

#### Scenario: Admin edits a mileage log to have an invalid recorded date

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** I am editing an existing mileage log
- **When** I submit the edit dialog with recorded date `not-a-date`
- **Then** validation blocks the request and I see an `Invalid recorded date.` message

#### Scenario: Admin requests to edit a mileage log to have an invalid recorded date

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` exists for vehicle `3`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": 12050, "recordedAt": "not-a-date" }`
- **Then** the API returns `400` with `{ "message": "Invalid recorded date." }`

#### Scenario: Admin requests to edit a mileage log to a different vehicle

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` belongs to vehicle `3`
- **And** vehicle `4` exists
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 4, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `400` with `{ "message": "Vehicle cannot be changed." }`

#### Scenario: Admin requests to edit a mileage log to a vehicle that does not exist

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` exists
- **And** a vehicle with id `999` does not exist
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 999, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `404` with `{ "message": "Vehicle not found." }`

#### Scenario: Admin requests to edit a mileage log with a different userId

- **Given** I am signed in as an admin
- **And** a mileage log with id `1` was added by user id `2` for vehicle `3`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "userId": 8, "odometerReading": 12100, "recordedAt": "2026-10-23" }`
- **Then** the API returns `200`
- **And** the stored `userId` is still `2`

#### Scenario: Admin deletes a mileage log

- **Given** I am signed in as an admin on `/vehicles/3/mileage-logs`
- **And** that vehicle has a mileage log with odometer reading `12050`
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that mileage log is removed from the list

#### Scenario: Area admin edits a mileage log in their area

- **Given** I am signed in as an area admin for Athletics
- **And** a mileage log with id `1` belongs to vehicle `3` in Athletics and has odometer reading `12050`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": 12100, "recordedAt": "2026-10-23" }`
- **Then** the API returns `200` with `odometerReading` `12100`

#### Scenario: Admin updates a mileage log that does not exist

- **Given** I am signed in as an admin
- **And** a mileage log with id `999` does not exist
- **When** I request `PUT /api/mileage-logs/999` with a valid body
- **Then** the API returns `404`

#### Scenario: Admin updates a mileage log with an invalid mileageLogId

- **Given** I am signed in as an admin
- **When** I request `PUT /api/mileage-logs/abc` with a valid body
- **Then** the API returns `400`

#### Scenario: Admin deletes a mileage log that does not exist

- **Given** I am signed in as an admin
- **And** a mileage log with id `999` does not exist
- **When** I request `DELETE /api/mileage-logs/999`
- **Then** the API returns `404`

#### Scenario: Admin deletes a mileage log with an invalid mileageLogId

- **Given** I am signed in as an admin
- **When** I request `DELETE /api/mileage-logs/abc`
- **Then** the API returns `400`

---

### US-9.5 — Session and role access

#### Scenario: Un-signed-in user accesses mileage logs page

- **Given** I am not signed in
- **When** I navigate to `/vehicles/3/mileage-logs` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to mileage logs for a vehicle

- **Given** I have no valid session token
- **When** I request `GET /api/mileage-logs?vehicleId=3`
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

#### Scenario: Regular user requests mileage logs for a vehicle

- **Given** I am signed in and I am not an admin or area admin
- **And** vehicle `3` exists
- **When** I request `GET /api/mileage-logs?vehicleId=3`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Regular user creates a mileage log

- **Given** I am signed in and I am not an admin or area admin
- **And** vehicle `3` exists
- **When** I request `POST /api/mileage-logs` with `{ "vehicleId": 3, "odometerReading": 12050, "recordedAt": "2026-10-23" }`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Regular user updates a mileage log

- **Given** I am signed in and I am not an admin or area admin
- **And** a mileage log with id `1` exists for vehicle `3`
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 3, "odometerReading": 12100, "recordedAt": "2026-10-23" }`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Regular user deletes a mileage log

- **Given** I am signed in and I am not an admin or area admin
- **And** a mileage log with id `1` exists
- **When** I request `DELETE /api/mileage-logs/1`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Area admin requests mileage logs for a vehicle outside their area

- **Given** I am signed in as an area admin for Athletics
- **And** vehicle `4` belongs to Music
- **When** I request `GET /api/mileage-logs?vehicleId=4`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

#### Scenario: Area admin updates a mileage log outside their area

- **Given** I am signed in as an area admin for Athletics
- **And** a mileage log with id `1` belongs to vehicle `4` in Music
- **When** I request `PUT /api/mileage-logs/1` with `{ "vehicleId": 4, "odometerReading": 12100, "recordedAt": "2026-10-23" }`
- **Then** the API returns `403` with `{ "message": "Forbidden." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-9.1 | Admin creates mileage log | `frontend/tests/MileageLogs.test.js` | `Admin creates mileage log` |
| US-9.1 | Admin saves mileage log | `backend/tests/mileageLogs.test.js` | `Admin saves mileage log` |
| US-9.1 | Admin saves mileage log | `frontend/tests/MileageLogs.test.js` | `Admin saves mileage log` |
| US-9.1 | Area admin saves mileage log for a vehicle in their area | `backend/tests/mileageLogs.test.js` | `Area admin saves mileage log for a vehicle in their area` |
| US-9.1 | Admin saves mileage log with an odometer reading of zero | `backend/tests/mileageLogs.test.js` | `Admin saves mileage log with an odometer reading of zero` |
| US-9.1 | Admin saves mileage log with an odometer reading of zero | `frontend/tests/MileageLogs.test.js` | `Admin saves mileage log with an odometer reading of zero` |
| US-9.1 | Admin creates mileage log with missing odometer reading | `frontend/tests/MileageLogs.test.js` | `Admin creates mileage log with missing odometer reading` |
| US-9.1 | Admin creates mileage log with missing recorded date | `frontend/tests/MileageLogs.test.js` | `Admin creates mileage log with missing recorded date` |
| US-9.1 | Admin requests to create a mileage log with a missing vehicle | `backend/tests/mileageLogs.test.js` | `Admin requests to create a mileage log with a missing vehicle` |
| US-9.1 | Admin requests to create a mileage log with a missing odometer reading | `backend/tests/mileageLogs.test.js` | `Admin requests to create a mileage log with a missing odometer reading` |
| US-9.1 | Admin requests to create a mileage log with a missing recorded date | `backend/tests/mileageLogs.test.js` | `Admin requests to create a mileage log with a missing recorded date` |
| US-9.1 | Admin creates mileage log with a non-whole-number odometer reading | `frontend/tests/MileageLogs.test.js` | `Admin creates mileage log with a non-whole-number odometer reading` |
| US-9.1 | Admin requests to create a mileage log with a non-whole-number odometer reading | `backend/tests/mileageLogs.test.js` | `Admin requests to create a mileage log with a non-whole-number odometer reading` |
| US-9.1 | Admin creates mileage log with a negative odometer reading | `frontend/tests/MileageLogs.test.js` | `Admin creates mileage log with a negative odometer reading` |
| US-9.1 | Admin requests to create a mileage log with a negative odometer reading | `backend/tests/mileageLogs.test.js` | `Admin requests to create a mileage log with a negative odometer reading` |
| US-9.1 | Admin creates mileage log with an invalid recorded date | `frontend/tests/MileageLogs.test.js` | `Admin creates mileage log with an invalid recorded date` |
| US-9.1 | Admin requests to create a mileage log with an invalid recorded date | `backend/tests/mileageLogs.test.js` | `Admin requests to create a mileage log with an invalid recorded date` |
| US-9.1 | Admin requests to create a mileage log for a vehicle that does not exist | `backend/tests/mileageLogs.test.js` | `Admin requests to create a mileage log for a vehicle that does not exist` |
| US-9.1 | Admin requests to create a mileage log with a different userId | `backend/tests/mileageLogs.test.js` | `Admin requests to create a mileage log with a different userId` |
| US-9.2 | Admin mileage logs view lists that vehicle's mileage logs | `frontend/tests/MileageLogs.test.js` | `Admin mileage logs view lists that vehicle's mileage logs` |
| US-9.2 | Admin mileage logs empty state | `frontend/tests/MileageLogs.test.js` | `Admin mileage logs empty state` |
| US-9.2 | Area admin views mileage logs for a vehicle in their area | `backend/tests/mileageLogs.test.js` | `Area admin views mileage logs for a vehicle in their area` |
| US-9.3 | Admin mileage log rows have edit and delete actions | `frontend/tests/MileageLogs.test.js` | `Admin mileage log rows have edit and delete actions` |
| US-9.3 | Area admin mileage log rows have edit and delete actions | `frontend/tests/MileageLogs.test.js` | `Area admin mileage log rows have edit and delete actions` |
| US-9.4 | Admin edits a mileage log odometer reading | `backend/tests/mileageLogs.test.js` | `Admin edits a mileage log odometer reading` |
| US-9.4 | Admin edits a mileage log odometer reading | `frontend/tests/MileageLogs.test.js` | `Admin edits a mileage log odometer reading` |
| US-9.4 | Admin edits a mileage log recorded date | `backend/tests/mileageLogs.test.js` | `Admin edits a mileage log recorded date` |
| US-9.4 | Admin edits a mileage log recorded date | `frontend/tests/MileageLogs.test.js` | `Admin edits a mileage log recorded date` |
| US-9.4 | Admin edits a mileage log to have a missing odometer reading | `frontend/tests/MileageLogs.test.js` | `Admin edits a mileage log to have a missing odometer reading` |
| US-9.4 | Admin edits a mileage log to have a missing recorded date | `frontend/tests/MileageLogs.test.js` | `Admin edits a mileage log to have a missing recorded date` |
| US-9.4 | Admin requests to edit a mileage log to have a missing vehicle | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log to have a missing vehicle` |
| US-9.4 | Admin requests to edit a mileage log to have a missing odometer reading | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log to have a missing odometer reading` |
| US-9.4 | Admin requests to edit a mileage log to have a missing recorded date | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log to have a missing recorded date` |
| US-9.4 | Admin edits a mileage log to have a non-whole-number odometer reading | `frontend/tests/MileageLogs.test.js` | `Admin edits a mileage log to have a non-whole-number odometer reading` |
| US-9.4 | Admin requests to edit a mileage log to have a non-whole-number odometer reading | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log to have a non-whole-number odometer reading` |
| US-9.4 | Admin edits a mileage log to have a negative odometer reading | `frontend/tests/MileageLogs.test.js` | `Admin edits a mileage log to have a negative odometer reading` |
| US-9.4 | Admin requests to edit a mileage log to have a negative odometer reading | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log to have a negative odometer reading` |
| US-9.4 | Admin edits a mileage log to have an invalid recorded date | `frontend/tests/MileageLogs.test.js` | `Admin edits a mileage log to have an invalid recorded date` |
| US-9.4 | Admin requests to edit a mileage log to have an invalid recorded date | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log to have an invalid recorded date` |
| US-9.4 | Admin requests to edit a mileage log to a different vehicle | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log to a different vehicle` |
| US-9.4 | Admin requests to edit a mileage log to a vehicle that does not exist | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log to a vehicle that does not exist` |
| US-9.4 | Admin requests to edit a mileage log with a different userId | `backend/tests/mileageLogs.test.js` | `Admin requests to edit a mileage log with a different userId` |
| US-9.4 | Admin deletes a mileage log | `backend/tests/mileageLogs.test.js` | `Admin deletes a mileage log` |
| US-9.4 | Admin deletes a mileage log | `frontend/tests/MileageLogs.test.js` | `Admin deletes a mileage log` |
| US-9.4 | Area admin edits a mileage log in their area | `backend/tests/mileageLogs.test.js` | `Area admin edits a mileage log in their area` |
| US-9.4 | Admin updates a mileage log that does not exist | `backend/tests/mileageLogs.test.js` | `Admin updates a mileage log that does not exist` |
| US-9.4 | Admin updates a mileage log with an invalid mileageLogId | `backend/tests/mileageLogs.test.js` | `Admin updates a mileage log with an invalid mileageLogId` |
| US-9.4 | Admin deletes a mileage log that does not exist | `backend/tests/mileageLogs.test.js` | `Admin deletes a mileage log that does not exist` |
| US-9.4 | Admin deletes a mileage log with an invalid mileageLogId | `backend/tests/mileageLogs.test.js` | `Admin deletes a mileage log with an invalid mileageLogId` |
| US-9.5 | Un-signed-in user accesses mileage logs page | `frontend/tests/MileageLogs.test.js` | `Un-signed-in user accesses mileage logs page` |
| US-9.5 | Unauthenticated API request to mileage logs for a vehicle | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to mileage logs for a vehicle` |
| US-9.5 | Unauthenticated API request to a particular mileage log | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to a particular mileage log` |
| US-9.5 | Unauthenticated API request to create a mileage log | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to create a mileage log` |
| US-9.5 | Unauthenticated API request to update a mileage log | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to update a mileage log` |
| US-9.5 | Unauthenticated API request to delete a mileage log | `backend/tests/mileageLogs.test.js` | `Unauthenticated API request to delete a mileage log` |
| US-9.5 | Regular user requests mileage logs for a vehicle | `backend/tests/mileageLogs.test.js` | `Regular user requests mileage logs for a vehicle` |
| US-9.5 | Regular user creates a mileage log | `backend/tests/mileageLogs.test.js` | `Regular user creates a mileage log` |
| US-9.5 | Regular user updates a mileage log | `backend/tests/mileageLogs.test.js` | `Regular user updates a mileage log` |
| US-9.5 | Regular user deletes a mileage log | `backend/tests/mileageLogs.test.js` | `Regular user deletes a mileage log` |
| US-9.5 | Area admin requests mileage logs for a vehicle outside their area | `backend/tests/mileageLogs.test.js` | `Area admin requests mileage logs for a vehicle outside their area` |
| US-9.5 | Area admin updates a mileage log outside their area | `backend/tests/mileageLogs.test.js` | `Area admin updates a mileage log outside their area` |

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

- Creating or editing vehicles from this screen
- Requiring a new reading to be greater than the vehicle's previous reading

---