# Feature: Maintenance Log Management

**Feature ID:** 13
**Branch pattern:** `feature/13-service-log`
**Status:** Ready
**Created:** 2026-11-4
**Input:** Signed-in admin, area admin, or maintenance users manage service logs. 
**Depends on:** Feature 3 (Roles), Feature 4 (vehicles), Feature 9 (Mileage Log), Feature 10 (Issue Report), Feature 11 (Maintenance Need), Feature 12 (service-types)

---

## User Stories

### US-13.1: Create service logs

**As a** signed-in admin, area admin, or maintenance user
**I want to** create a service log with a user, vehicle, service_type, mileage, maintenance_need (optional), and serviced_at
**So that** users managing vehicles can track specific services performed on vehicles.

**Priority:** P1
**Independent test:** Open the create service dialog, create a service log; it appears in the service logs view
**Acceptance scenarios:** see ### US-13.1 under Acceptance Criteria

### US-13.2: View service logs

**As a** signed-in admin, area admin, or maintenance user
**I want to** see all service logs for a vehicle
**So that** I can see which service logs exist.

**Priority:** P1
**Independent test:** Service logs view loads a single list of service logs for a vehicle
**Acceptance scenarios:** see ### US-13.2 under Acceptance Criteria

### US-13.3: Manage service log rows

**As a** signed-in admin, area admin, or maintenance user
**I want** each service log row to have **edit** and **delete** actions
**So that** I can manage service logs from the service logs view

**Priority:** P1
**Independent test:** Each service log row exposes edit and delete icon actions 
**Acceptance scenarios:** see ### US-13.3 under Acceptance Criteria

### US-13.4: Edit and delete service logs

**As a** signed-in admin, area admin, or maintenance user
**I want to** edit or delete a service log
**So that** I can keep service logs up to date

**Priority:** P2
**Independent test:** Edit and delete service logs from row actions; the service logs view updates
**Acceptance scenarios:** see ### US-13.4 under Acceptance Criteria

### US-13.5: Signed-in admin, area admin, or maintenance user access only

**As a** signed-in admin, area admin, or maintenance user
**I want to** have service logs visible only to signed-in admin, area admin, or maintenance users
**So that** Unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/service-logs` is redirected to `/login`; unauthorized API requests or requests without `admin`, `area_admin`, or `maintenance` role receive errors; signed in user without `admin`, `area_admin`, or `maintenance` role is redirected to `/home`
**Acceptance scenarios:** see ### US-13.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All service log endpoints MUST require a valid session and `admin`, `area_admin`, or `maintenance` role (`authorizeRoles('admin', 'area_admin', 'maintenance')` middleware).
- **FR-002**: Service log form should take in the current mileage number and use that to create the mileage log that is atached to the service log. This takes the user_id from the current session.
- **FR-03**: `area_admin` must only be able to make service logs for vehicles in their areas.

---

## Assumptions

-  There is no split sidebar / main panel.
- Delete removes the service log row. No other table references `serviceLogs` yet, so this feature does not block a delete.

## Edge Cases

- Unauthenticated service logs screen → redirect. 
- Authenticated service logs screen without `admin`, `area_admin`, or `maintenance` role → redirect. 
- Unauthenticated API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin, area admin, and maintenance user can create, view, edit, and delete service logs on one screen.
- **SC-003**: `npm test` passes for service logs API and service logs view behavior.

---

## Data Ownership & Isolation

Any signed in admin, area admin, or maintenance user may create, edit, delete, or read the list of service logs.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/service-logs` and `GET /api/service-logs/:serviceLogId` require a Bearer token and `admin`, `area_admin`, or `maintenance` role. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token and `admin`, `area_admin`, or `maintenance` role. |
| **Create scope** | `POST` requires a Bearer token and `admin`, `area_admin`, or `maintenance` role. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/service-logs` | Yes - Admin, area admin, or maintenance | Fetch all service logs |
| `GET` | `/api/service-logs/:serviceLogId` | Yes - Admin, area admin, or maintenance | Fetch a single service log |
| `GET` | `/api/service-logs/vehicle/:vehicleId` | Yes - Admin, area admin, or maintenance | Fetch all service logs for a vehicle |
| `POST` | `/api/service-logs` | Yes - Admin, area admin, or maintenance | Create a service log |
| `PUT` | `/api/service-logs/:serviceLogId` | Yes - Admin, area admin, or maintenance | Edit a service log |
| `DELETE` | `/api/service-logs/:serviceLogId` | Yes - Admin, area admin, or maintenance | Delete a service log |

**Create service log request body:**

```json
{
  "user_id" : 1,
  "vehicle_id": 2,
  "service_type_id": 1,
  "miles": 2, //Create new mileage log based off miles entered and attach to service log
  "maintenance_need_id": 1,// "optional"
  "serviced_at": "2026-07-02"
}
```

**Service log success response** (`200` / `201`):

```json
{
  "id": 1,
  "user_id" : 1,
  "vehicle_id": 2,
  "service_type_id": 1,
  "mileage_log_id": 2, //"must log miles at every servicing"
  "maintenance_need_id": 1,// "optional"
  "serviced_at": "2026-07-02",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404`.
**Unauthorized** (lacking `admin`, `area_admin`, `maintenance` role): `403`.

---

## Screen Requirements

### [View: Service Logs] — route name `service-logs`

**Single Vue view** (`ServiceLogs.vue`) — no sidebar / main-panel split.

- Heading: **Service Log Management**
- Primary action: **+ New Service Log** opens a `<v-dialog>` with **User**, **Vehicle**, **Service Type**, **Mileage**, **Maintenance Need**, and **Serviced At**. **Cancel** and **Create** sit in the dialog footer.
- Display service logs in a `<v-data-table>` (10 per page). Columns are **User**, **Vehicle**, **Service Type**, **Mileage**, **Maintenance Need**, **Serviced At**, and **Actions**. Row icon buttons use `size="small"` and `variant="text"`, matching the users table.
- **Edit** icon turns that row into inline fields pre-filled with the current user, vehicle, service type, mileage, maintenance need, and serviced at; **Save** / **Cancel**. Cancel restores the row without saving.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit service log**, **Delete service log**).
- **Empty state:** **"No service logs yet. Create your first service log."** when there are no service logs.
- **Loading state:** skeleton or progress indicator while service logs are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** the route/view for service logs is vehicle dependant and should be linked to from the vehicle page; delete dialog is a reusable component in `components/common` folder; the create dialog is a component in `components/serviceLogs`, modeled after existing create dialogs. Edit stays in the table row.

---

## Key Entities

- **ServiceLog**: 
- **User**:
- **Vehicle**:
- **ServiceLog**:
- **MileageLog**:
- **MaintenanceNeed**:

---

## Data Model Requirements

### `serviceLogs` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `user_id` | INTEGER FK | Required; |
| `vehicle_id` | INTEGER FK | Required; |
| `service_type_id` | INTEGER FK | Required; |
| `mileage_log_id` | INTEGER FK | Required; |
| `maintenance_need_id` | INTEGER FK | optional; |
| `serviced_at` | Date | Required; |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- `User` has many `ServiceLog` as author
- `ServiceLog` belongs to `User` through user_id
- `Vehicle` has many `ServiceLog` 
- `ServiceLog` belongs to `Vehicle` through vehicle_id
- `ServiceLog` has many `ServiceLog` 
- `ServiceLog` belongs to `serviceType` through service_type_id
- `serviceLog` belongs to `mileageLog`  through mileage_log_id
- `maintenanceNeed` has many `ServiceLog` 
- `ServiceLog` belongs to `maintenanceNeed` through maintenance_need_id

---

## Acceptance Criteria (Gherkin)

### US-13.1 — Create service logs

#### Scenario: Admin user creates a service log

- **Given** I am signed in as admin , area admin, or maintenance on the service logs view
- **When** I click **+ New Service Log**
- **Then** a dialog opens with a **User**, **Vehicle**, **Service Type**, **Mileage**, **Maintenance Need**, and **Serviced At** fields.

#### Scenario: Admin user saves service log

- **Given** I am signed in as admin , area admin, or maintenance on the service logs view
- **When** I submit the create dialog with valid data
- **Then** the API returns `201` with that service log
- **And** the log appears in the service logs list

#### Scenario: Admin user creates service log with missing field

- **Given** I am signed in as admin , area admin, or maintenance on the service logs view
- **When** I submit the create dialog without a required field
- **Then** validation blocks the request and I see a `Required field.` message

---

### US-13.2 — View service logs

#### Scenario: Service logs view lists service logs

- **Given** I am signed in as admin , area admin, or maintenance and service logs exist 
- **When** I open the service logs view vehicle_id, service_type_id, mileage_log_id, maintenance_need_id, serviced_at
- **Then** each row shows the service log vehicle_id, service_type_id, mileage_log_id, maintenance_need_id, serviced_at

#### Scenario: Service logs empty state

- **Given** I am signed in as admin , area admin, or maintenance and there are no service logs
- **When** I open the service logs view vehicle_id, service_type_id, mileage_log_id, maintenance_need_id, serviced_at
- **Then** I see **"No service logs yet. Create your first service log."**

---

### US-13.3 — Manage service log rows

#### Scenario: Service log rows have edit and delete actions 

- **Given** I am signed in as admin , area admin, or maintenance and at least one service log exists
- **When** I view the service log list for a vehicle
- **Then** each row shows **Edit** and **Delete** actions

---

### US-13.4 — Edit and delete service logs

#### Scenario: Admin user edits a service log Service Type

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `Service Type` and submit
- **Then** the API returns `200` with the updated service log
- **And** the list shows the updated service type

#### Scenario: Admin user edits a service log Service Type to be empty

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `Service Type` to be empty and submit
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a service log vehicle_id

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `vehicle_id` and submit
- **Then** the API returns `200` with the updated service log
- **And** the list shows the updated service type

#### Scenario: Admin user edits a service log vehicle_id to be empty

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `vehicle_id` to be empty and submit
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a service log mileage_log_id

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `mileage_log_id` and submit
- **Then** the API returns `200` with the updated service log
- **And** the list shows the updated service type

#### Scenario: Admin user edits a service log mileage_log_id to be empty

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `mileage_log_id` to be empty and submit
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a service log maintenance_need_id

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `maintenance_need_id` and submit
- **Then** the API returns `200` with the updated service log
- **And** the list shows the updated service type

#### Scenario: Admin user deletes a service log

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists
- **When** I confirm delete on that service log row
- **Then** the API returns `200`
- **And** that service log is removed from the list

#### Scenario: Admin user deletes a service log that does not exist

-   **Given** I am signed in as admin, area admin, or maintenance 
-   **And** A service log with id `999` does not exist
-   **When** I request `DELETE /api/service-logs/999`
-   **Then** the API returns `404`

#### Scenario: Admin user deletes a service log with an invalid serviceLogId
-   **Given** I am signed in as admin, area admin, or maintenance 
-   **When** I request `DELETE /api/service-logs/abc`
-   **Then** the API returns `400` 

#### Scenario: Admin user edits a service log serviced_at

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `serviced_at` and submit
- **Then** the API returns `200` with the updated serviced at time
- **And** the list shows the updated service type

#### Scenario: Admin user edits a service log serviced_at to after current date

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `serviced_at` to after the current date and submit
- **Then** the API returns `400` and I see a `serviced_at cannot be after current date.` message.

#### Scenario: Admin user edits a service log serviced_at to be empty

- **Given** I am signed in as admin , area admin, or maintenance and a service log exists for a vehicle
- **When** I change the `serviced_at` to be empty and submit
- **Then** validation blocks the request and I see a `Required field.` message

---

### US-13.5: Signed-in admin , area admin, or maintenance user access only

#### Scenario: Un-signed-in user accesses service logs page
- **Given** I am not signed in
- **When** I navigate to `/service-logs` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to service logs
- **Given** I have no valid session token
- **When** I request `GET /api/service-logs`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular service log
- **Given** I have no valid session token
- **And** A service log with id `1` exists
- **When** I request `GET /api/service-logs/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular service log
- **Given** I have no valid session token
- **And** A vehicle with id `1` exists
- **When** I request `GET /api/service-logs/vehicle/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to create a service log
- **Given** I have no valid session token
- **When** I request `POST /api/service-logs` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to update a service log
- **Given** I have no valid session token
- **And** A service log with id `1` exists
- **When** I request `PUT /api/service-logs/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to delete a service log
- **Given** I have no valid session token
- **And** A service log with id `1` exists
- **When** I request `DELETE /api/service-logs/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role accesses service logs page
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **When** I navigate to `/service-logs/:vehicleId` by URL
- **Then** I am redirected to `/home`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to service logs
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **When** I request `GET /api/service-logs`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to a particular service log
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **And** A service log with id `1` exists
- **When** I request `GET /api/service-logs/1`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to create a service log
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **When** I request `POST /api/service-logs` with a valid body
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to update a service log
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **And** A service log with id `1` exists
- **When** I request `PUT /api/service-logs/1` with a valid body
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to delete a service log
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **And** A service log with id `1` exists
- **When** I request `DELETE /api/service-logs/1`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-003** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope


---

## Delivered to later features

- A service log db table
- `GET /api/service-logs` returns every service log for any valid session with `admin`, `area_admin`, or `maintenance` role
- `GET /api/service-logs/vehicle/:vehicleId` returns every service log for a vehicle for any valid session with `admin`, `area_admin`, or `maintenance` role
 