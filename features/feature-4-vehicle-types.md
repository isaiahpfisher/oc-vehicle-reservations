# Feature: Vehicle Type Management

**Feature ID:** 4
**Branch pattern:** `feature/4-vehicle-types`
**Status:** Ready
**Created:** 2026-10-19
**Input:** Signed-in admin users manage vehicle types. Vehicle types are added/edited with a dialog.
**Depends on:** Feature 3 [Roles]

---

## User Stories

### US-4.1: Create vehicle types

**As a** signed-in admin user
**I want to** create a vehicle type with a name and identifier
**So that** users managing and requesting vehicles can select a particular vehicle type

**Priority:** P1
**Independent test:** Open the create vehicle dialog, create a vehicle type; it appears in the vehicle types view
**Acceptance scenarios:** see ### US-4.1 under Acceptance Criteria

### US-4.2: View vehicle types

**As a** signed-in admin user
**I want to** see all vehicle types
**So that** I can see which vehicle types exist.

**Priority:** P1
**Independent test:** Vehicle types view loads a single list of vehicle types
**Acceptance scenarios:** see ### US-4.2 under Acceptance Criteria

### US-4.3: Manage vehicle type rows

**As a** signed-in admin user
**I want** each vehicle type row to have **edit** and **delete** actions
**So that** I can manage vehicle types from the vehicle types view

**Priority:** P1
**Independent test:** Each vehicle type row exposes edit and delete icon actions 
**Acceptance scenarios:** see ### US-4.3 under Acceptance Criteria

### US-4.4: Edit and delete vehicle types

**As a** signed-in admin user
**I want to** edit or delete a vehicle type
**So that** I can keep vehicle types up to date

**Priority:** P2
**Independent test:** Edit and delete vehicle types from row actions; the vehicle types view updates
**Acceptance scenarios:** see ### US-4.4 under Acceptance Criteria

### US-4.5: Signed-in admin user access only

**As a** signed-in admin user
**I want to** have vehicle types visible only to signed-in admin users
**So that** Unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/vehicle-types` is redirected to `/login`; unauthorized API requests or requests without `admin` role receive errors; signed in user without `admin` role is redirected to `/home`
**Acceptance scenarios:** see ### US-4.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All vehicle type endpoints MUST require a valid session and `admin` role (`authorizeRoles('admin')` middleware).
- **FR-002**: `name` MUST be trimmed before save. An empty vehicle type name MUST be rejected.
- **FR-003**: A vehicle type MUST store `name` and `identifier`. `id` is assigned by the database.
- **FR-004**: `name` MUST be unique (not case-sensitive). Creating a vehicle type with a name identical to an existing name MUST be rejected. Updating a vehicle type to have a different name that is also identical to an existing name MUST be rejected.
- **FR-005**: `identifier` MUST be one of `VIN` or `Serial`. An empty identifier MUST be rejected.

---

## Assumptions

- Vehicle types use **dialog-based** workflows (no split sidebar / main panel).
- Delete removes the vehicle type row. No other table references `vehicleTypes` yet, so this feature does not block a delete.

## Edge Cases

- Empty or whitespace-only vehicle type name → client block and/or `400`.
- Vehicle type name longer than 255 characters → `400`.
- Vehicle type identifier other than `VIN` or `Serial` → `400`.
- Unauthenticated vehicle types screen → redirect. 
- Authenticated vehicle types screen without `admin` role → redirect. 
- Unauthenticated API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin user can create, view, edit, and delete vehicle types on one screen.
- **SC-003**: `npm test` passes for vehicle types API and vehicle types view behavior.

---

## Data Ownership & Isolation

Any signed in admin user may create, edit, delete, or read the list of vehicle types.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/vehicle-types` and `GET /api/vehicle-types/:vehicleTypeId` require a Bearer token and `admin` role. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token and `admin` role. |
| **Create scope** | `POST` requires a Bearer token and `admin` role. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/vehicle-types` | Yes - Admin | Fetch all vehicle types |
| `GET` | `/api/vehicle-types/:vehicleTypeId` | Yes - Admin | Fetch a single vehicle type |
| `POST` | `/api/vehicle-types` | Yes - Admin | Create a vehicle type |
| `PUT` | `/api/vehicle-types/:vehicleTypeId` | Yes - Admin | Edit a vehicle type |
| `DELETE` | `/api/vehicle-types/:vehicleTypeId` | Yes - Admin | Delete a vehicle type |

**Create vehicle type request body:**

```json
{
  "name": "Bus",
  "identifier": "VIN"
}
```

**Vehicle type success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Bus",
  "identifier": "VIN",
    "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404`.
**Forbidden** (lacking `admin` role): `403` with `{ message: "Admin role required." }`.

---

## Screen Requirements

### [View: Vehicle Types] — route name `vehicle-types`

**Single Vue view** (`VehicleTypes.vue`) — no sidebar / main-panel split.

- Heading: **Vehicle Type Management**
- Primary action: **+ New Vehicle Type** opens a `<v-dialog>` with **Name** and **Identifier**, plus **Create** / **Cancel**.
    - Identifier is a <v-select>.
- Display vehicle types as rows. Each row shows the **name**.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current name and identifier; **Save** / **Cancel**.
    - Identifier is a <v-select>.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit vehicle type**, **Delete vehicle type**).
- **Empty state:** **"No vehicle types yet. Create your first vehicle type."** when there are no vehicle types.
- **Loading state:** skeleton or progress indicator while vehicle types are fetching.
- **Error state:** `<v-alert type="error">` for API failures.
- **App chrome:** the route has `meta.nav: "Vehicle Types"` and `meta.roles: ["admin"]`, so the Vehicle Types link shows for admins and is hidden for everyone else

**Implementation note:** one route/view for vehicle types; delete dialog is a reusable component in `components/common` folder; create and edit dialogs should be components stored in a dedicated components/vehicleTypes folder and modeled after existing create and edit dialogs in `components/` folders.

---

## Key Entities

- **VehicleType**: a type of vehicle such as `Car`, `Bus`, or `Golf Cart`.

---

## Data Model Requirements

### `vehicleTypes` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING | Required; trimmed; unique; not case-sensitive; max 255 |
| `identifier` | ENUM | Required; `VIN` or `Serial` |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-4.1 — Create vehicle types

#### Scenario: Admin user creates a vehicle type

- **Given** I am signed in as admin on the vehicle types view
- **When** I click **+ New Vehicle Type**
- **Then** a dialog opens with a **Name** field and **Identifier** dropdown

#### Scenario: Admin user saves vehicle type

- **Given** I am signed in as admin on the vehicle types view
- **When** I submit the create dialog with name `Bus` and identifier `VIN`
- **Then** the API returns `201` with that vehicle type
- **And** `Bus` appears in the vehicle types list

#### Scenario: Admin user creates vehicle type with missing name

- **Given** I am signed in as admin on the vehicle types view
- **When** I submit the create dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle type with missing identifier

- **Given** I am signed in as admin on the vehicle types view
- **When** I submit the create dialog without an identifier
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to create a vehicle type with a missing name

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ name: "" }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user requests to create a vehicle type with a missing identifier

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ identifier: "" }`
- **Then** the API returns `400` with `{ message: "Missing identifier." }`

#### Scenario: Admin user creates vehicle type with a whitespace-only name

- **Given** I am signed in as admin on the vehicle types view
- **When** I submit the create dialog with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to create a vehicle type with a whitespace-only name

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ name: " " }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user requests to create a vehicle type with an identifier other than `VIN` or `Serial`

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ identifier: " asdflje" }`
- **Then** the API returns `400` with `{ message: "Unknown identifier." }`

#### Scenario: Admin user creates vehicle type with name longer than 255 characters

- **Given** I am signed in as admin on the vehicle types view
- **When** I submit the create dialog with a vehicle type name longer than 255 characters
- **Then** validation blocks the request and I see a `Name too long.` message

#### Scenario: Admin user requests to create a vehicle type with name longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with name longer than 255 characters
- **Then** the API returns `400` with `{ message: "Name too long." }`

#### Scenario: Admin user creates a vehicle type with a non-unique name

- **Given** I am signed in as admin on the vehicle types view
- **And** A vehicle type with name `Bus` exists
- **When** I submit the create dialog with name `Bus`
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user requests to create a vehicle type with a non-unique name

- **Given** I am signed in as admin
- **And** A vehicle type with name `Bus` exists with id `1`
- **When** I request `POST /api/vehicle-types` with `{ name: "Bus" }`
- **Then** the API returns `400` with `{ message: "Name already taken." }`

#### Scenario: Admin user creates a vehicle type with a non-unique name that is not case-sensitive

- **Given** I am signed in as admin on the vehicle types view
- **And** A vehicle type with name `Bus` exists
- **When** I submit the create dialog with name `bus`
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user requests to create a vehicle type with a non-unique name that is not case-sensitive

- **Given** I am signed in as admin
- **And** A vehicle type with name `Bus` exists with id `1`
- **When** I request `POST /api/vehicle-types` with `{ name: "bus" }`
- **Then** the API returns `400` with `{ message: "Name already taken." }`

---

### US-4.2 — View vehicle types

#### Scenario: Vehicle types view lists vehicle types

- **Given** I am signed in as admin and vehicle types exist 
- **When** I open the vehicle types view
- **Then** each row shows the vehicle type name 

#### Scenario: Vehicle types empty state

- **Given** I am signed in as admin and there are no vehicle types
- **When** I open the vehicle types view
- **Then** I see **"No vehicle types yet. Create your first vehicle type."**

---

### US-4.3 — Manage vehicle type rows

#### Scenario: Vehicle type rows have edit and delete actions 

- **Given** I am signed in as admin and at least one vehicle type exists
- **When** I view the vehicle type list
- **Then** each row shows **Edit vehicle type** and **Delete vehicle type** actions

---

### US-4.4 — Edit and delete vehicle types

#### Scenario: Admin user edits a vehicle type name

- **Given** I am signed in as admin and a vehicle type named `Bus` exists
- **When** I change the name to `Golf Cart` and submit
- **Then** the API returns `200` with the updated vehicle type
- **And** the list shows `Golf Cart`

#### Scenario: Admin user edits a vehicle type identifier

- **Given** I am signed in as admin and a vehicle type named `Bus` with identifier `VIN` exists
- **When** I change the identifier to `Serial` and submit
- **Then** the API returns `200` with the updated vehicle type
- **And** `Serial` is in the response

#### Scenario: Admin user edits a vehicle type to have a missing name

- **Given** I am signed in as admin on the vehicle types view
- **And** I am editing an existing vehicle type
- **When** I submit the edit dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle type to have a missing identifier

- **Given** I am signed in as admin on the vehicle types view
- **And** I am editing an existing vehicle type
- **When** I submit the edit dialog without an identifier
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to edit a vehicle type to have a missing name

- **Given** I am signed in as admin
- **And** A vehicle type with name `Bus` exists with id `1`
- **When** I request `PUT /api/vehicle-types/1` with `{ name: "" }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user requests to edit a vehicle type to have a missing identifier

- **Given** I am signed in as admin
- **And** A vehicle type with identifier `VIN` exists with id `1`
- **When** I request `PUT /api/vehicle-types/1` with `{ identifier: "" }`
- **Then** the API returns `400` with `{ message: "Missing identifier." }`

#### Scenario: Admin user edits a vehicle type to have a whitespace-only name

- **Given** I am signed in as admin on the vehicle types view
- **And** I am editing an existing vehicle type
- **When** I submit the edit dialog with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to edit a vehicle type to have a whitespace-only name

- **Given** I am signed in as admin on the vehicle types view
- **And** A vehicle type with name `Bus` exists with id `1`
- **When** I request `PUT /api/vehicle-types/1` with `{ name: " " }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user requests to edit a vehicle type to have an identifier other than `VIN` or `Serial`

- **Given** I am signed in as admin on the vehicle types view
- **And** A vehicle type with identifier `VIN` exists with id `1`
- **When** I request `PUT /api/vehicle-types/1` with `{ identifier: " adsf " }`
- **Then** the API returns `400` with `{ message: "Unknown identifier." }`

#### Scenario: Admin user edits a vehicle type to have a name longer than 255 characters

- **Given** I am signed in as admin on the vehicle types view
- **And** I am editing an existing vehicle type
- **When** I submit the edit dialog with a vehicle type name longer than 255 characters
- **Then** validation blocks the request and I see a `Name too long.` message

#### Scenario: Admin user requests to edit a vehicle type to have a name longer than 255 characters

- **Given** I am signed in as admin
- **And** A vehicle type with name `Bus` exists with id `1`
- **When** I request `PUT /api/vehicle-types/1` with name longer than 255 characters
- **Then** the API returns `400` with `{ message: "Name too long." }`

#### Scenario: Admin user updates a vehicle type to have a non-unique name

- **Given** I am signed in as admin on the vehicle types view
- **And** Vehicle types with names `Bus` and `Golf Cart` exist
- **And** I edit `Golf Cart` to have name `Bus`
- **When** I submit the edit dialog
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user requests to update a vehicle type to have a non-unique name 

- **Given** I am signed in as admin
- **And** A vehicle type with name `Bus` exists with id `1`
- **And** Another vehicle type exists with name `Golf Cart` and id `2`
- **When** I request `PUT /api/vehicle-types/2` with `{ name: "Bus" }`
- **Then** the API returns `400` with `{ message: "Name already taken." }`

#### Scenario: Admin user edits a vehicle type to have a non-unique name that is not case-sensitive

- **Given** I am signed in as admin on the vehicle types view
- **And** A vehicle type with name `Bus` exists
- **And** Another vehicle type exists with name `Golf Cart`
- **When** I submit the edit dialog for `Golf Cart` with name `bus`
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user requests to edit a vehicle type to have a non-unique name that is not case-sensitive

- **Given** I am signed in as admin
- **And** A vehicle type with name `Bus` exists with id `1`
- **And** Another vehicle type exists with name `Golf Cart` and id `2`
- **When** I request `PUT /api/vehicle-types/2` with `{ name: "bus" }`
- **Then** the API returns `400` with `{ message: "Name already taken." }`


#### Scenario: Admin user deletes a vehicle type

- **Given** I am signed in as admin and a vehicle type named `Bus` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that vehicle type is removed from the list

#### Scenario: Admin user updates a vehicle type that does not exist
-   **Given** I am signed in as admin
-   **And** A vehicle type with id `999` does not exist
-   **When** I request `PUT /api/vehicle-types/999` with a valid body
-   **Then** the API returns `404`

#### Scenario: Admin user updates a vehicle type with an invalid vehicleTypeId
-   **Given** I am signed in as admin
-   **When** I request `PUT /api/vehicle-types/abc` with a valid body
-   **Then** the API returns `400`

#### Scenario: Admin user deletes a vehicle type that does not exist
-   **Given** I am signed in as admin
-   **And** A vehicle type with id `999` does not exist
-   **When** I request `DELETE /api/vehicle-types/999`
-   **Then** the API returns `404`

#### Scenario: Admin user deletes a vehicle type with an invalid vehicleTypeId
-   **Given** I am signed in as admin
-   **When** I request `DELETE /api/vehicle-types/abc`
-   **Then** the API returns `400` 

---

### US-4.5: Signed-in admin user access only

#### Scenario: Signed-in admin user sees nav link
- **Given** I have admin role
- **When** I am logged in
- **Then** I see a nav link for vehicle types

#### Scenario: Signed-in admin user clicks on nav link
- **Given** I am signed in as admin
- **When** I click on the nav link for vehicle types
- **Then** I am redirected to `/vehicle-types`

#### Scenario: Signed-in user without admin role does not see nav link
- **Given** I do not have admin role
- **When** I am logged in
- **Then** I do not see a nav link for vehicle types

#### Scenario: Un-signed-in user accesses vehicle types page
- **Given** I am not signed in
- **When** I navigate to `/vehicle-types` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to vehicle types
- **Given** I have no valid session token
- **When** I request `GET /api/vehicle-types`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular vehicle type
- **Given** I have no valid session token
- **And** A vehicle type with id `1` exists
- **When** I request `GET /api/vehicle-types/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to create a vehicle type
- **Given** I have no valid session token
- **When** I request `POST /api/vehicle-types` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to update a vehicle type
- **Given** I have no valid session token
- **And** A vehicle type with id `1` exists
- **When** I request `PUT /api/vehicle-types/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to delete a vehicle type
- **Given** I have no valid session token
- **And** A vehicle type with id `1` exists
- **When** I request `DELETE /api/vehicle-types/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Signed-in user without admin role accesses vehicle types page
- **Given** I am signed in
- **And** I do not have role `admin`
- **When** I navigate to `/vehicle-types` by URL
- **Then** I am redirected to `/home`

#### Scenario: Signed-in user without admin role API request to vehicle types
- **Given** I am signed in
- **And** I do not have role `admin`
- **When** I request `GET /api/vehicle-types`
- **Then** the API returns `403` with `{ message: "Admin role required." }`

#### Scenario: Signed-in user without admin role API request to a particular vehicle type
- **Given** I am signed in
- **And** I do not have role `admin`
- **And** A vehicle type with id `1` exists
- **When** I request `GET /api/vehicle-types/1`
- **Then** the API returns `403` with `{ message: "Admin role required." }`

#### Scenario: Signed-in user without admin role API request to create a vehicle type
- **Given** I am signed in
- **And** I do not have role `admin`
- **When** I request `POST /api/vehicle-types` with a valid body
- **Then** the API returns `403` with `{ message: "Admin role required." }`

#### Scenario: Signed-in user without admin role API request to update a vehicle type
- **Given** I am signed in
- **And** I do not have role `admin`
- **And** A vehicle type with id `1` exists
- **When** I request `PUT /api/vehicle-types/1` with a valid body
- **Then** the API returns `403` with `{ message: "Admin role required." }`

#### Scenario: Signed-in user without admin role API request to delete a vehicle type
- **Given** I am signed in
- **And** I do not have role `admin`
- **And** A vehicle type with id `1` exists
- **When** I request `DELETE /api/vehicle-types/1`
- **Then** the API returns `403` with `{ message: "Admin role required." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-4.1 | Admin user creates a vehicle type | `frontend/tests/VehicleTypes.test.js` | `Admin user creates a vehicle type` |
| US-4.1 | Admin user saves vehicle type | `backend/tests/vehicleTypes.test.js` | `Admin user saves vehicle type` |
| US-4.1 | Admin user saves vehicle type | `frontend/tests/VehicleTypes.test.js` | `Admin user saves vehicle type` |
| US-4.1 | Admin user creates vehicle type with missing name | `frontend/tests/VehicleTypes.test.js` | `Admin user creates vehicle type with missing name` |
| US-4.1 | Admin user creates vehicle type with missing identifier | `frontend/tests/VehicleTypes.test.js` | `Admin user creates vehicle type with missing identifier` |
| US-4.1 | Admin user requests to create a vehicle type with a missing name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with a missing name` |
| US-4.1 | Admin user requests to create a vehicle type with a missing identifier | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with a missing identifier` |
| US-4.1 | Admin user creates vehicle type with a whitespace-only name | `frontend/tests/VehicleTypes.test.js` | `Admin user creates vehicle type with a whitespace-only name` |
| US-4.1 | Admin user requests to create a vehicle type with a whitespace-only name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with a whitespace-only name` |
| US-4.1 | Admin user requests to create a vehicle type with an identifier other than VIN or Serial | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with an identifier other than VIN or Serial` |
| US-4.1 | Admin user creates vehicle type with name longer than 255 characters | `frontend/tests/VehicleTypes.test.js` | `Admin user creates vehicle type with name longer than 255 characters` |
| US-4.1 | Admin user requests to create a vehicle type with name longer than 255 characters | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with name longer than 255 characters` |
| US-4.1 | Admin user creates a vehicle type with a non-unique name | `frontend/tests/VehicleTypes.test.js` | `Admin user creates a vehicle type with a non-unique name` |
| US-4.1 | Admin user requests to create a vehicle type with a non-unique name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with a non-unique name` |
| US-4.1 | Admin user creates a vehicle type with a non-unique name that is not case-sensitive | `frontend/tests/VehicleTypes.test.js` | `Admin user creates a vehicle type with a non-unique name that is not case-sensitive` |
| US-4.1 | Admin user requests to create a vehicle type with a non-unique name that is not case-sensitive | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with a non-unique name that is not case-sensitive` |
| US-4.2 | Vehicle types view lists vehicle types | `frontend/tests/VehicleTypes.test.js` | `Vehicle types view lists vehicle types` |
| US-4.2 | Vehicle types empty state | `frontend/tests/VehicleTypes.test.js` | `Vehicle types empty state` |
| US-4.3 | Vehicle type rows have edit and delete actions | `frontend/tests/VehicleTypes.test.js` | `Vehicle type rows have edit and delete actions` |
| US-4.4 | Admin user edits a vehicle type name | `backend/tests/vehicleTypes.test.js` | `Admin user edits a vehicle type name` |
| US-4.4 | Admin user edits a vehicle type name | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type name` |
| US-4.4 | Admin user edits a vehicle type identifier | `backend/tests/vehicleTypes.test.js` | `Admin user edits a vehicle type identifier` |
| US-4.4 | Admin user edits a vehicle type identifier | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type identifier` |
| US-4.4 | Admin user edits a vehicle type to have a missing name | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type to have a missing name` |
| US-4.4 | Admin user edits a vehicle type to have a missing identifier | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type to have a missing identifier` |
| US-4.4 | Admin user requests to edit a vehicle type to have a missing name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to edit a vehicle type to have a missing name` |
| US-4.4 | Admin user requests to edit a vehicle type to have a missing identifier | `backend/tests/vehicleTypes.test.js` | `Admin user requests to edit a vehicle type to have a missing identifier` |
| US-4.4 | Admin user edits a vehicle type to have a whitespace-only name | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type to have a whitespace-only name` |
| US-4.4 | Admin user requests to edit a vehicle type to have a whitespace-only name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to edit a vehicle type to have a whitespace-only name` |
| US-4.4 | Admin user requests to edit a vehicle type to have an identifier other than VIN or Serial | `backend/tests/vehicleTypes.test.js` | `Admin user requests to edit a vehicle type to have an identifier other than VIN or Serial` |
| US-4.4 | Admin user edits a vehicle type to have a name longer than 255 characters | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type to have a name longer than 255 characters` |
| US-4.4 | Admin user requests to edit a vehicle type to have a name longer than 255 characters | `backend/tests/vehicleTypes.test.js` | `Admin user requests to edit a vehicle type to have a name longer than 255 characters` |
| US-4.4 | Admin user updates a vehicle type to have a non-unique name | `frontend/tests/VehicleTypes.test.js` | `Admin user updates a vehicle type to have a non-unique name` |
| US-4.4 | Admin user requests to update a vehicle type to have a non-unique name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to update a vehicle type to have a non-unique name` |
| US-4.4 | Admin user edits a vehicle type to have a non-unique name that is not case-sensitive | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type to have a non-unique name that is not case-sensitive` |
| US-4.4 | Admin user requests to edit a vehicle type to have a non-unique name that is not case-sensitive | `backend/tests/vehicleTypes.test.js` | `Admin user requests to edit a vehicle type to have a non-unique name that is not case-sensitive` |
| US-4.4 | Admin user deletes a vehicle type | `backend/tests/vehicleTypes.test.js` | `Admin user deletes a vehicle type` |
| US-4.4 | Admin user deletes a vehicle type | `frontend/tests/VehicleTypes.test.js` | `Admin user deletes a vehicle type` |
| US-4.4 | Admin user updates a vehicle type that does not exist | `backend/tests/vehicleTypes.test.js` | `Admin user updates a vehicle type that does not exist` |
| US-4.4 | Admin user updates a vehicle type with an invalid vehicleTypeId | `backend/tests/vehicleTypes.test.js` | `Admin user updates a vehicle type with an invalid vehicleTypeId` |
| US-4.4 | Admin user deletes a vehicle type that does not exist | `backend/tests/vehicleTypes.test.js` | `Admin user deletes a vehicle type that does not exist` |
| US-4.4 | Admin user deletes a vehicle type with an invalid vehicleTypeId | `backend/tests/vehicleTypes.test.js` | `Admin user deletes a vehicle type with an invalid vehicleTypeId` |
| US-4.5 | Signed-in admin user sees nav link | `frontend/tests/VehicleTypes.test.js` | `Signed-in admin user sees nav link` |
| US-4.5 | Signed-in admin user clicks on nav link | `frontend/tests/VehicleTypes.test.js` | `Signed-in admin user clicks on nav link` |
| US-4.5 | Signed-in user without admin role does not see nav link | `frontend/tests/VehicleTypes.test.js` | `Signed-in user without admin role does not see nav link` |
| US-4.5 | Un-signed-in user accesses vehicle types page | `frontend/tests/VehicleTypes.test.js` | `Un-signed-in user accesses vehicle types page` |
| US-4.5 | Unauthenticated API request to vehicle types | `backend/tests/vehicleTypes.test.js` | `Unauthenticated API request to vehicle types` |
| US-4.5 | Unauthenticated API request to a particular vehicle type | `backend/tests/vehicleTypes.test.js` | `Unauthenticated API request to a particular vehicle type` |
| US-4.5 | Unauthenticated API request to create a vehicle type | `backend/tests/vehicleTypes.test.js` | `Unauthenticated API request to create a vehicle type` |
| US-4.5 | Unauthenticated API request to update a vehicle type | `backend/tests/vehicleTypes.test.js` | `Unauthenticated API request to update a vehicle type` |
| US-4.5 | Unauthenticated API request to delete a vehicle type | `backend/tests/vehicleTypes.test.js` | `Unauthenticated API request to delete a vehicle type` |
| US-4.5 | Signed-in user without admin role accesses vehicle types page | `frontend/tests/VehicleTypes.test.js` | `Signed-in user without admin role accesses vehicle types page` |
| US-4.5 | Signed-in user without admin role API request to vehicle types | `backend/tests/vehicleTypes.test.js` | `Signed-in user without admin role API request to vehicle types` |
| US-4.5 | Signed-in user without admin role API request to a particular vehicle type | `backend/tests/vehicleTypes.test.js` | `Signed-in user without admin role API request to a particular vehicle type` |
| US-4.5 | Signed-in user without admin role API request to create a vehicle type | `backend/tests/vehicleTypes.test.js` | `Signed-in user without admin role API request to create a vehicle type` |
| US-4.5 | Signed-in user without admin role API request to update a vehicle type | `backend/tests/vehicleTypes.test.js` | `Signed-in user without admin role API request to update a vehicle type` |
| US-4.5 | Signed-in user without admin role API request to delete a vehicle type | `backend/tests/vehicleTypes.test.js` | `Signed-in user without admin role API request to delete a vehicle type` |

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 4 from @features/feature-4-vehicle-types.md on branch `feature/4-vehicle-types`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-001**–**FR-005** satisfied)
- [x] **Success Criteria (SC-001**–**SC-003)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Getting vehicle types for assigning a vehicle to a vehicle type is out of scope. 

---

## Delivered to later features

- A vehicle type row with `id`, `name`, and `identifier`
- `GET /api/vehicle-types` returns every vehicle type for any valid session with `admin` role
- Delete removes an existing vehicle type unconditionally and returns `200`
 