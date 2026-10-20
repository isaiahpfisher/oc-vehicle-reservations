# Feature: Vehicle Management

**Feature ID:** 5
**Branch pattern:** `feature/5-vehicles`
**Status:** Draft
**Created:** 2026-10-20
**Input:** Signed-in admin users manage vehicles. Vehicle types are added/edited with a dialog.
**Depends on:** Feature 2 [Areas], Feature 3 [Roles], Feature 4 [Vehicle Types]

---

## User Stories

### US-5.1: Create vehicles

**As a** signed-in admin user
**I want to** create a vehicle with an area, vehicle type, university id, make, model, year, purchase date, color, passenger capacity, license plate, license plate expiration date, and status.
**So that** users managing vehicle requests can assign a particular vehicle

**Priority:** P1
**Independent test:** Open the create vehicle dialog, create a vehicle; it appears in the vehicles view
**Acceptance scenarios:** see ### US-5.1 under Acceptance Criteria

### US-5.2: View vehicles

**As a** signed-in admin user
**I want to** see all vehicles
**So that** I can see which vehicles exist.

**Priority:** P1
**Independent test:** Vehicles view loads a single list of vehicles
**Acceptance scenarios:** see ### US-5.2 under Acceptance Criteria

### US-5.3: Manage vehicle rows

**As a** signed-in admin user
**I want** each vehicle row to have **edit** and **delete** actions
**So that** I can manage vehicles from the vehicles view

**Priority:** P1
**Independent test:** Each vehicle row exposes edit and delete icon actions 
**Acceptance scenarios:** see ### US-5.3 under Acceptance Criteria

### US-5.4: Edit and delete vehicles

**As a** signed-in admin user
**I want to** edit or delete a vehicle
**So that** I can keep vehicles up to date

**Priority:** P2
**Independent test:** Edit and delete vehicles from row actions; the vehicles view updates
**Acceptance scenarios:** see ### US-5.4 under Acceptance Criteria

### US-5.5: Signed-in admin user access only

**As a** signed-in admin user
**I want to** have vehicles visible only to signed-in admin users
**So that** Unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/vehicles` is redirected to `/login`; unauthorized API requests or requests without `admin` role receive errors; signed in user without `admin` role is redirected to `/home`
**Acceptance scenarios:** see ### US-5.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

-----------------------
First Change Feature 4 Spec.
Add enum of whether the identifier for that type is a serial number or a VIN.
-----------------------

- **FR-001**: All vehicle endpoints MUST require a valid session and `admin` role (`authorizeRoles('admin')` middleware).
- **FR-002**: `area_id` MUST correspond to an existing area.
- **FR-003**: `vehicle_type_id` MUST correspond to an existing vehicle type.
- **FR-004**: `university_id`, `make`, `model` and `license_plate` MUST be trimmed before save. An empty university id, make, model, or license plate MUST be rejected. 
- **FR-004**: `vin` and `serial` MUST be trimmed before save. Each vehicle MUST have one and only one of either `vin` or `serial`. If both or neither are empty they MUST be rejected.
- **FR-004**: `serial` corresponds to vehicle type `Golf Cart`. Any vehicle with 
- **FR-005**: `purchased_at` and `license_plate_expiration_date` MUST be valid dates. Empty purchase date or license plate expiration date MUST be rejected.
- **FR-006**: `color` and `status` MUST be selected from existing enum values. --Note: There are too many colors to be practical to list. Use an API to get colors by VIN?
- **FR-007**: `year` MUST be an integer between 1950 and 2100. Empty year MUST be rejected.
- **FR-008**: `passenger_capacity` MUST be an integer between 1 and 300, inclusive. Empty passenger capacity MUST be rejected.
- **FR-008**: `university_id` MUST be unique. Creating a vehicle with a university id identical to an existing university id MUST be rejected. Updating a vehicle to have a different university id that is also identical to an existing university id MUST be rejected.
- **FR-009**: `vin` MUST be unique (not case-sensitive). Creating a vehicle with a VIN identical to an existing VIN MUST be rejected. Updating a vehicle to have a different VIN that is also identical to an existing VIN MUST be rejected.
- **FR-009**: `serial` MUST be unique (not case-sensitive). Creating a vehicle with a serial number identical to an existing serial number MUST be rejected. Updating a vehicle to have a different serial number that is also identical to an existing serial number MUST be rejected.
- **FR-010**: `id` is assigned by the database.
- **FR-011**: `status` must be one of `active`, `retired`

---

## Assumptions

- Vehicle types use **dialog-based** workflows (no split sidebar / main panel).
- Delete removes the vehicle type row. No other table references `vehicleTypes` yet, so this feature does not block a delete.

## Edge Cases

- Empty or whitespace-only vehicle type name → client block and/or `400`.
- Vehicle type name longer than 255 characters → `400`.
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
  "name": "Bus"
}
```

**Vehicle type success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Bus",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404`.
**Unauthorized** (lacking `admin` role): `401`.

---

## Screen Requirements

### [View: Vehicle Types] — route name `vehicle-types`

**Single Vue view** (`VehicleTypes.vue`) — no sidebar / main-panel split.

- Heading: **Vehicle Type Management**
- Primary action: **+ New Vehicle Type** opens a `<v-dialog>` with **Name**, plus **Create** / **Cancel**.
- Display vehicle types as rows. Each row shows the **name**.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current name; **Save** / **Cancel**.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit vehicle type**, **Delete vehicle type**).
- **Empty state:** **"No vehicle types yet. Create your first vehicle type."** when there are no vehicle types.
- **Loading state:** skeleton or progress indicator while vehicle types are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

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
- **Then** a dialog opens with a **Name** field 

#### Scenario: Admin user saves vehicle type

- **Given** I am signed in as admin on the vehicle types view
- **When** I submit the create dialog with name `Bus`
- **Then** the API returns `201` with that vehicle type
- **And** `Bus` appears in the vehicle types list

#### Scenario: Admin user creates vehicle type with missing name

- **Given** I am signed in as admin on the vehicle types view
- **When** I submit the create dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to create a vehicle type with a missing name

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ name: "" }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user creates vehicle type with a whitespace-only name

- **Given** I am signed in as admin on the vehicle types view
- **When** I submit the create dialog with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to create a vehicle type with a whitespace-only name

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ name: " " }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

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

#### Scenario: Admin user edits a vehicle type to have a missing name

- **Given** I am signed in as admin on the vehicle types view
- **And** I am editing an existing vehicle type
- **When** I submit the edit dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to edit a vehicle type to have a missing name

- **Given** I am signed in as admin
- **And** A vehicle type with name `Bus` exists with id `1`
- **When** I request `PUT /api/vehicle-types/1` with `{ name: "" }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

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
- **Then** the API returns `401` with `{ message: "Admin role required." }`

#### Scenario: Signed-in user without admin role API request to a particular vehicle type
- **Given** I am signed in
- **And** I do not have role `admin`
- **And** A vehicle type with id `1` exists
- **When** I request `GET /api/vehicle-types/1`
- **Then** the API returns `401` with `{ message: "Admin role required." }`

#### Scenario: Signed-in user without admin role API request to create a vehicle type
- **Given** I am signed in
- **And** I do not have role `admin`
- **When** I request `POST /api/vehicle-types` with a valid body
- **Then** the API returns `401` with `{ message: "Admin role required." }`

#### Scenario: Signed-in user without admin role API request to update a vehicle type
- **Given** I am signed in
- **And** I do not have role `admin`
- **And** A vehicle type with id `1` exists
- **When** I request `PUT /api/vehicle-types/1` with a valid body
- **Then** the API returns `401` with `{ message: "Admin role required." }`

#### Scenario: Signed-in user without admin role API request to delete a vehicle type
- **Given** I am signed in
- **And** I do not have role `admin`
- **And** A vehicle type with id `1` exists
- **When** I request `DELETE /api/vehicle-types/1`
- **Then** the API returns `401` with `{ message: "Admin role required." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-4.1 | Admin user creates a vehicle type | `frontend/tests/VehicleTypes.test.js` | `Admin user creates a vehicle type` |
| US-4.1 | Admin user saves vehicle type | `backend/tests/vehicleTypes.test.js` | `Admin user saves vehicle type` |
| US-4.1 | Admin user saves vehicle type | `frontend/tests/VehicleTypes.test.js` | `Admin user saves vehicle type` |
| US-4.1 | Admin user creates vehicle type with missing name | `frontend/tests/VehicleTypes.test.js` | `Admin user creates vehicle type with missing name` |
| US-4.1 | Admin user requests to create a vehicle type with a missing name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with a missing name` |
| US-4.1 | Admin user creates vehicle type with a whitespace-only name | `frontend/tests/VehicleTypes.test.js` | `Admin user creates vehicle type with a whitespace-only name` |
| US-4.1 | Admin user requests to create a vehicle type with a whitespace-only name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to create a vehicle type with a whitespace-only name` |
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
| US-4.4 | Admin user edits a vehicle type to have a missing name | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type to have a missing name` |
| US-4.4 | Admin user requests to edit a vehicle type to have a missing name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to edit a vehicle type to have a missing name` |
| US-4.4 | Admin user edits a vehicle type to have a whitespace-only name | `frontend/tests/VehicleTypes.test.js` | `Admin user edits a vehicle type to have a whitespace-only name` |
| US-4.4 | Admin user requests to edit a vehicle type to have a whitespace-only name | `backend/tests/vehicleTypes.test.js` | `Admin user requests to edit a vehicle type to have a whitespace-only name` |
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

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-004** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Getting vehicle types for assigning a vehicle to a vehicle type is out of scope. 

---

## Delivered to later features

- A vehicle type row with `id` and `name`
- `GET /api/vehicle-types` returns every vehicle type for any valid session with `admin` role
- Delete removes an existing vehicle type unconditionally and returns `200`
 