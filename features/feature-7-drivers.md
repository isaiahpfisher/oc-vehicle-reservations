# Feature: Driver Management

**Feature ID:** 7
**Branch pattern:** `feature/7-drivers`
**Status:** Draft
**Created:** 2026-10-29
**Input:** Signed-in admin or area admin users manage drivers. Drivers are added/edited with a dialog.
**Depends on:** Feature 2 [Areas], Feature 3 [Roles], Feature 4 [Vehicle Types]

---

## User Stories

### US-7.1: Create drivers

**As a** signed-in admin or area admin user
**I want to** create a driver with an optional user, first name, last name, phone number, license state, license expiration date, and status.
**So that** users requesting vehicles can select a particular driver

**Priority:** P1
**Independent test:** Open the create driver dialog, create a driver; it appears in the drivers view
**Acceptance scenarios:** see ### US-7.1 under Acceptance Criteria

### US-7.2: View drivers

**As a** signed-in admin or area admin user
**I want to** see all drivers
**So that** I can see which drivers exist.

**Priority:** P1
**Independent test:** Drivers view loads a single list of drivers
**Acceptance scenarios:** see ### US-7.2 under Acceptance Criteria

### US-7.3: Manage driver rows

**As a** signed-in admin or area admin user
**I want** each driver row to have **edit** and **delete** actions
**So that** I can manage drivers from the drivers view

**Priority:** P1
**Independent test:** Each driver row exposes edit and delete icon actions 
**Acceptance scenarios:** see ### US-7.3 under Acceptance Criteria

### US-7.4: Edit and delete drivers

**As a** signed-in admin or area admin user
**I want to** edit or delete a driver
**So that** I can keep drivers up to date

**Priority:** P2
**Independent test:** Edit and delete drivers from row actions; the drivers view updates
**Acceptance scenarios:** see ### US-7.4 under Acceptance Criteria

### US-7.5: Signed-in admin or area admin user access only

**As a** signed-in admin or area admin user
**I want to** have drivers visible only to signed-in admin or area admin users
**So that** Unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/drivers` is redirected to `/login`; unauthorized API requests or requests without `admin` or `area_admin` role receive errors; signed in user without `admin` or `area_admin` role is redirected to `/home`
**Acceptance scenarios:** see ### US-7.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All driver endpoints MUST require a valid session and `admin` or `area_admin` role (`authorizeRoles('admin', 'area_admin')` middleware).
- **FR-002**: `id` is assigned by the database.
- **FR-003**: `user_id` MUST correspond to an existing user or be null. 
- **FR-004**: `first_name` MUST be trimmed before save. An empty first name MUST be rejected. 
- **FR-005**: `first_name` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-006**: `last_name` MUST be trimmed before save. An empty last name MUST be rejected. 
- **FR-007**: `last_name` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-008**: `phone_number` MUST be trimmed before save. An empty phone number MUST be rejected. 
- **FR-009**: `phone_number` MUST be in format `(xxx)xxx-xxxx`. Other values MUST be rejected.
- **FR-010**: `license_state` MUST be one of an enum of state abbreviations. `OK` is selected by default.
- **FR-011**: `license_plate_expiration_date` MUST be a valid date in format `yyyy-mm-dd`. 
- **FR-012**: `approved_at` is assigned by the database or null.
- **FR-013**: `status` MUST be selected from existing enum of `pending`, `approved`, `denied`, and `revoked`. Empty status is saved as `pending`. 
- **FR-014**: `user_id` MUST be unique.

---

## Assumptions

- Drivers use **dialog-based** workflows (no split sidebar / main panel).

## Edge Cases

- User id that does not exist → client block and/or `400`.
- Non-unique user id → client block and/or `400`.
- Empty or whitespace-only first name → client block and/or `400`.
- First name longer than 255 characters → `400`.
- Empty or whitespace-only last name → client block and/or `400`.
- Last name longer than 255 characters → `400`.
- Empty phone number → client block and/or `400`.
- Empty license state → client block and/or `400`.
- License state not an existing state abbreviation → client block and/or `400`.
- Empty license plate expiration date → client block and/or `400`.
- Empty status → save status as `pending`.
- Status other than `pending`, `approved`, `denied`, or `revoked` → `400`.
- Unauthenticated drivers screen → redirect to `/login`. 
- Authenticated drivers screen without `admin` or `area_admin` role → redirect to `/home`. 
- Unauthenticated API request → `401`.
- API request without `admin` or `area_admin` role → `403`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin user can create, view, edit, and delete drivers on one screen.
- **SC-003**: Signed-in area admin user can create, view, edit, and delete drivers on one screen.
- **SC-004**: `npm test` passes for drivers API and drivers view behavior.

---

## Data Ownership & Isolation

Any signed in admin or area admin user may create, edit, delete, or read the list of drivers. 

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/drivers` and `GET /api/drivers/:driverId` require a Bearer token and `admin` or `area_admin` role. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token and `admin` or `area_admin` role. |
| **Create scope** | `POST` requires a Bearer token and `admin` or `area_admin` role. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/drivers` | Yes - Admin, Area Admin | Fetch all drivers |
| `GET` | `/api/drivers/:driverId` | Yes - Admin, Area Admin | Fetch a single driver |
| `POST` | `/api/drivers` | Yes - Admin, Area Admin | Create a driver |
| `PUT` | `/api/drivers/:driverId` | Yes - Admin, Area Admin | Edit a driver |
| `DELETE` | `/api/drivers/:driverId` | Yes - Admin, Area Admin | Delete a driver |

**Create driver request body:**

```json
{
  "user_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "(405)425-1234",
  "license_state": "OK",
  "license_expiration_date": "2027-09-01",
  "status": "pending",
  "approved_at": null
}
```

**Driver success response** (`200` / `201`):

```json
{
  "id": 1,
  "userId": 1,
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "(405)425-1234",
  "licenseState": "OK",
  "licenseExpiration_date": "2027-09-01",
  "status": "pending",
  "approvedAt": null,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404`.
**Unauthorized** (lacking `area_admin` or `admin` role): `403`.

---

## Screen Requirements

### [View: Vehicles] — route name `vehicles`

**Single Vue view** (`Vehicles.vue`) — no sidebar / main-panel split.

- Heading: **Vehicle Management**
- Primary action: **+ New Vehicle** opens a `<v-dialog>` with **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate** (optional), **License Plate Expiration Date** (optional), and **Status** plus **Create** / **Cancel**.
    - Area <v-select> shows the area names but submits the area id.
    - Area shows all areas for admins, only areas that the area admin is admin of for area admins.
    - Vehicle type <v-select> shows the vehicle type names but submits the vehicle type id.
    - **VIN**/**Serial** is a computed property for label corresponding to `identifier`. If the identifier is `VIN`, the label is **VIN**. If the identifier is `serial`, the label is **Serial**. When no vehicle type is selected yet, the label is **VIN**.
    - **Status** is a <v-select> with `active` and `retired`.
- Display vehicles as cards modeled in the same style as existing management views. Each row shows the make, model, and color with a chip that shows red, yellow, or green based on whether the status is `retired`, `active` with an existing license plate expiration date that is less than the current date, or `active` for other scenarios.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate** (optional), **License Plate Expiration Date** (optional), and **Status**; **Save** / **Cancel**.
    - Area <v-select> shows the area names but submits the area id.
    - Area shows all areas for admins, only areas that the area admin is admin of for area admins.
    - Vehicle type <v-select> shows the vehicle type names but submits the vehicle type id.
    - **VIN**/**Serial** is a computed property for label corresponding to `identifier`. If the identifier is `VIN`, the label is **VIN**. If the identifier is `serial`, the label is **Serial**. When no vehicle type is selected yet, the label is **VIN**.
    - **Status** is a <v-select> with `active` and `retired`.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit vehicle**, **Delete vehicle**).
- **Empty state:** **"No vehicles yet. Create your first vehicle."** when there are no vehicles.
- **Loading state:** skeleton or progress indicator while vehicles are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for vehicles; delete dialog is a reusable component in `components/common` folder; create and edit dialogs should be components stored in a dedicated components/vehicles folder and modeled after existing create and edit dialogs in `components/` folders.

---

## Key Entities

- **Vehicle**: a vehicle the university has that belongs to a particular area and is of a particular type.

---

## Data Model Requirements

### `vehicles` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `area_id` | INTEGER FK | Required |
| `vehicle_type_id` | INTEGER FK | Required |
| `university_id` | STRING | Required; trimmed; unique; max 255 |
| `make` | STRING | Required; trimmed; max 255 |
| `model` | STRING | Required; trimmed; max 255 |
| `year` | INTEGER | Required; max value current year + 1; min value 1950 |
| `identifier` | STRING | Required; trimmed; unique; max 255 |
| `purchased_at` | DATE | Required; min `1950-01-01`; max current date; must be in format `yyyy-mm-dd` |
| `color` | STRING | Required; trimmed; max 255 |
| `passenger_capacity` | INTEGER | Required; max value 300; min value 1 |
| `license_plate` | STRING | Trimmed; unique when not null; max 8 |
| `license_plate_expiration_date` | DATE | May be null; must be in format `yyyy-mm-dd` |
| `status` | ENUM | Required; `active`, `retired` |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- Each vehicle belongs to one area
- Each vehicle belongs to one vehicle type
- Areas have many vehicles
- Vehicle types have many vehicles

---

## Acceptance Criteria (Gherkin)

### US-5.1 — Create vehicles

#### Scenario: Admin user creates a vehicle

- **Given** I am signed in as admin on the vehicles view
- **When** I click **+ New Vehicle**
- **Then** a dialog opens with **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate**, **License Plate Expiration Date**, and **Status**

#### Scenario: Area admin user creates a vehicle

- **Given** I am signed in as area admin on the vehicles view
- **When** I click **+ New Vehicle**
- **Then** a dialog opens with **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate**, **License Plate Expiration Date**, and **Status**
- **And** The **Area** dropdown only lists the areas that the area admin user is the area admin of

#### Scenario: Admin user saves vehicle

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with all valid values
- **Then** the API returns `201` with that vehicle
- **And** The new vehicle appears in the vehicles list

#### Scenario: Admin user selects vehicle type to be one with a serial number on create

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle type exists with name `Golf Cart` and identifier `serial`
- **When** I select `Golf Cart` for vehicle type
- **Then** the label **VIN** changes to **Serial**
- **And** I can enter values in that field that are not exactly 17 characters

#### Scenario: Admin user creates vehicle with missing area

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without an area
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing vehicle type

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a vehicle type
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing university id

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a university id
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing identifier

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without an identifier
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing make

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a make
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing model

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a model
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing year

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a year
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing purchase date

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a purchase date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing color

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a color
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing passenger capacity

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a passenger capacity
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing status

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog without a status
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to create a vehicle with a missing area id

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ area_id: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing area id." }`

#### Scenario: Admin user requests to create a vehicle with a missing vehicle type id

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ vehicle_type_id: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing vehicle type id." }`

#### Scenario: Admin user requests to create a vehicle with a missing make

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ make: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing make." }`

#### Scenario: Admin user requests to create a vehicle with a missing model

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ model: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing model." }`

#### Scenario: Admin user requests to create a vehicle with a missing year

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ year: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing year." }`

#### Scenario: Admin user requests to create a vehicle with a missing identifier

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ identifier: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing identifier." }`

#### Scenario: Admin user requests to create a vehicle with a missing purchase date

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ purchased_at: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing purchase date." }`

#### Scenario: Admin user requests to create a vehicle with a missing color

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ color: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing color." }`

#### Scenario: Admin user requests to create a vehicle with a missing passenger capacity

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ passenger_capacity: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing passenger capacity." }`

#### Scenario: Admin user requests to create a vehicle with a missing status

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ status: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing status." }`

#### Scenario: Admin user creates vehicle with a whitespace only university id

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with university id ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only make

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with make ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only model

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with model ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only identifier

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with identifier ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only color

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with color ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only license plate

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with license plate ` `
- **Then** the vehicle is saved with license plate as null
- **And** { license_plate: null } appears in the response

#### Scenario: Admin user requests to create a vehicle with a whitespace-only university id

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ university_id: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing university id." }`

#### Scenario: Admin user requests to create a vehicle with a whitespace-only make

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ make: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing make." }`

#### Scenario: Admin user requests to create a vehicle with a whitespace-only model

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ model: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing model." }`

#### Scenario: Admin user requests to create a vehicle with a whitespace-only identifier

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ identifier: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing identifier." }`

#### Scenario: Admin user requests to create a vehicle with a whitespace-only color

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ color: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing color." }`

#### Scenario: Admin user requests to create a vehicle with a whitespace-only license plate

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ license_plate: " " }` and a valid rest of the body
- **Then** the vehicle is saved with license plate as null
- **And** { license_plate: null } appears in the response

#### Scenario: Admin user requests to create a vehicle with an area_id that does not correspond to an existing area_id

- **Given** I am signed in as admin
- **And** An area with id `45` does not exist
- **When** I request `POST /api/vehicles` with `{ area_id: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Area does not exist." }`

#### Scenario: Admin user requests to create a vehicle with a vehicle_type_id that does not correspond to an existing vehicle_type_id

- **Given** I am signed in as admin
- **And** A vehicle type with id `45` does not exist
- **When** I request `POST /api/vehicles` with `{ vehicle_type_id: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Vehicle type does not exist." }`

#### Scenario: Admin user requests to create a vehicle with a status other than active or retired

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ status: 'in use' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Invalid status." }`

#### Scenario: Admin user requests to create a vehicle with a non-integer value for year

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ year: 'two thousand thirteen' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Year must be an integer." }`

#### Scenario: Admin user requests to create a vehicle with a non-integer value for passenger capacity

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ passenger_capacity: 'eight' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Passenger capacity must be an integer." }`

#### Scenario: Admin user requests to create a vehicle with a non-date value for purchase date

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ purchased_at: 'September 13' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Purchase date must be a numerical date." }`

#### Scenario: Admin user requests to create a vehicle with a non-date value for license plate expiration date

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ license_plate_expiration_date: 'September 13' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "License plate expiration date must be a numerical date." }`

#### Scenario: Admin user requests to create a vehicle with a bad date format for purchase date

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ purchased_at: '2013/01/01' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Purchase date must be in format 'yyyy-mm-dd'." }`

#### Scenario: Admin user requests to create a vehicle with a bad date format for license plate expiration date

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ license_plate_expiration_date: '2013/01/01' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "License plate expiration date must be in format 'yyyy-mm-dd'." }`

#### Scenario: Admin user creates vehicle with university id longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with a vehicle university id longer than 255 characters
- **Then** validation blocks the request and I see a `University id too long.` message

#### Scenario: Admin user creates vehicle with make longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with a vehicle make longer than 255 characters
- **Then** validation blocks the request and I see a `Make too long.` message

#### Scenario: Admin user creates vehicle with model longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with a vehicle model longer than 255 characters
- **Then** validation blocks the request and I see a `Model too long.` message

#### Scenario: Admin user creates vehicle with serial identifier longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `serial`
- **When** I submit the create dialog with vehicle type id `1` and a vehicle identifier longer than 255 characters
- **Then** validation blocks the request and I see a `Serial number too long.` message

#### Scenario: Admin user creates vehicle with VIN identifier less than 17 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I submit the create dialog with vehicle type id `1` and a vehicle identifier less than 17 characters
- **Then** validation blocks the request and I see a `VIN must be 17 characters.` message

#### Scenario: Admin user creates vehicle with VIN identifier more than 17 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I submit the create dialog with vehicle type id `1` and a vehicle identifier more than 17 characters
- **Then** validation blocks the request and I see a `VIN must be 17 characters.` message

#### Scenario: Admin user creates vehicle with color longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with a vehicle color longer than 255 characters
- **Then** validation blocks the request and I see a `Color too long.` message

#### Scenario: Admin user creates vehicle with license plate longer than 8 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create dialog with a vehicle license plate longer than 8 characters
- **Then** validation blocks the request and I see a `License plate too long.` message

#### Scenario: Admin user requests to create a vehicle with university id longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with university id longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "University id too long." }`

#### Scenario: Admin user requests to create a vehicle with make longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with make longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Make too long." }`

#### Scenario: Admin user requests to create a vehicle with model longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with model longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Model too long." }`

#### Scenario: Admin user requests to create a vehicle with serial identifier longer than 255 characters

- **Given** I am signed in as admin
- **And** There exists a vehicle type with id `1` and identifier `serial`
- **When** I request `POST /api/vehicles` with `{ vehicle_type_id: 1 }` and identifier longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Serial number too long." }`

#### Scenario: Admin user requests to create a vehicle with VIN identifier less than 17 characters

- **Given** I am signed in as admin
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I request `POST /api/vehicles` with `{ vehicle_type_id: 1 }` and identifier less than 17 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "VIN must be 17 characters." }`

#### Scenario: Admin user requests to create a vehicle with VIN identifier more than 17 characters

- **Given** I am signed in as admin
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I request `POST /api/vehicles` with `{ vehicle_type_id: 1 }` and identifier longer than 17 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "VIN must be 17 characters." }`

#### Scenario: Admin user requests to create a vehicle with color longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with color longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Color too long." }`

#### Scenario: Admin user requests to create a vehicle with license plate longer than 8 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with license plate longer than 8 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "License plate too long." }`

#### Scenario: Admin user creates a vehicle with a non-unique university id

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with university id `123456` exists
- **When** I submit the create dialog with university id `123456`
- **Then** validation blocks the request and I see a `University id already taken.` message

#### Scenario: Admin user creates a vehicle with a non-unique identifier

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with identifier `123456` exists
- **When** I submit the create dialog with identifier `123456`
- **Then** validation blocks the request and I see a `Identifier already taken.` message

#### Scenario: Admin user creates a vehicle with a non-unique license plate

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with license plate `123456` exists
- **When** I submit the create dialog with license plate `123456`
- **Then** validation blocks the request and I see a `License plate already taken.` message

#### Scenario: Admin user requests to create a vehicle with a non-unique university id

- **Given** I am signed in as admin
- **And** A vehicle with university id `123456` exists with id `1`
- **When** I request `POST /api/vehicles` with `{ university_id: "123456" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "University id already taken." }`

#### Scenario: Admin user requests to create a vehicle with a non-unique identifier

- **Given** I am signed in as admin
- **And** A vehicle with identifier `123456` exists with id `1`
- **When** I request `POST /api/vehicles` with `{ identifier: "123456" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Identifier already taken." }`

#### Scenario: Admin user requests to create a vehicle with a non-unique license plate

- **Given** I am signed in as admin
- **And** A vehicle with license plate `123456` exists with id `1`
- **When** I request `POST /api/vehicles` with `{ license_plate: "123456" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "License plate already taken." }`


#### Scenario: Admin user requests to create a vehicle with a year before 1950

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ year: 1949 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Year must be between 1950 and the year after this year." }`

#### Scenario: Admin user requests to create a vehicle with a year after the current year + 1

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with the year two years after the current year and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Year must be between 1950 and the year after this year." }`

#### Scenario: Admin user requests to create a vehicle with a passenger capacity less than 1

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ passenger_capacity: 0 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Passenger capacity must be between 1 and 300." }`

#### Scenario: Admin user requests to create a vehicle with a passenger capacity greater than 300

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ passenger_capacity: 301 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Passenger capacity must be between 1 and 300." }`

#### Scenario: Admin user requests to create a vehicle with a purchase date before 1950

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with `{ purchased_at: '1949-12-31' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Purchase date must be between 1950 and the current date." }`

#### Scenario: Admin user requests to create a vehicle with a purchase date after the current date

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicles` with purchase date after the current date and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Purchase date must be between 1950 and the current date." }`

---

### US-5.2 — View vehicles

#### Scenario: Vehicles view lists vehicles for admin

- **Given** I am signed in as admin and vehicles exist 
- **When** I open the vehicles view
- **Then** each row shows the vehicle make, model, color, and status chip

#### Scenario: Vehicles view lists vehicles for area admin

- **Given** I am signed in as area admin 
- **And** vehicles exist for my area
- **When** I open the vehicles view
- **Then** each row shows the vehicle make, model, color, and status chip
- **And** no rows for vehicles that do not belong to my area are showing

#### Scenario: Vehicles empty state

- **Given** I am signed in as admin and there are no vehicles
- **When** I open the vehicles view
- **Then** I see **"No vehicles yet. Create your first vehicle."**

---

### US-5.3 — Manage vehicle rows

#### Scenario: Vehicle rows have edit and delete actions

- **Given** I am signed in as admin and at least one vehicle exists
- **When** I view the vehicle list
- **Then** each row shows **Edit vehicle** and **Delete vehicle** actions

#### Scenario: Vehicle rows with green chip

- **Given** I am signed in as admin and at least one vehicle exists
- **When** I view the vehicle list
- **Then** each row with status `active` that has a license plate expiration date today or after has a green chip

#### Scenario: Vehicle rows with yellow chip

- **Given** I am signed in as admin and at least one vehicle exists
- **When** I view the vehicle list
- **Then** each row with status `active` that has a no license plate expiration date or a license plate expiration date before today has a yellow chip

#### Scenario: Vehicle rows with red chip

- **Given** I am signed in as admin and at least one vehicle exists
- **When** I view the vehicle list
- **Then** each row with status `retired` has a red chip

---

### US-5.4 — Edit and delete vehicles

#### Scenario: Admin user opens vehicle edit dialog

- **Given** I am signed in as admin on the vehicles view
- **When** I open the edit dialog
- **Then** a dialog opens with **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate**, **License Plate Expiration Date**, and **Status**

#### Scenario: Area admin user opens vehicle edit dialog

- **Given** I am signed in as area admin on the vehicles view
- **When** I open the edit dialog
- **Then** a dialog opens with **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate**, **License Plate Expiration Date**, and **Status**
- **And** the **Area** select only shows the areas which I am the area admin of

#### Scenario: Admin user edits a vehicle area

- **Given** I am signed in as admin and a vehicle with area_id `1` exists
- **And** There exists an area `Maintenance` with id `2`
- **When** I change the area to `Maintenance` and submit
- **Then** the API returns `200` with the updated vehicle
- **And** `{ area_id: 2 }` is in the response

#### Scenario: Admin user edits a vehicle type with identifier of 17 characters

- **Given** I am signed in as admin and a vehicle with vehicle_type_id `1` and a 17-character identifier exists
- **And** There exists a vehicle type `Bus` with identifier `VIN` and id `2`
- **When** I change the vehicle type to `Bus` and submit
- **Then** the API returns `200` with the updated vehicle
- **And** `{ vehicle_type_id: 2 }` is in the response

#### Scenario: Admin user edits a vehicle type with identifier other than 17 characters while current vehicle type has identifier Serial

- **Given** I am signed in as admin and a vehicle with vehicle_type_id `1` and an identifier other than 17 characters exists
- **And** There exists a vehicle type `Bus` with identifier `VIN` and id `2`
- **When** I change the vehicle type to `Bus` and submit
- **Then** I see an error `VIN must be 17 characters.`
- **And** the vehicle is not updated

#### Scenario: Admin user selects vehicle type to be one with a VIN number

- **Given** I am signed in as admin on the vehicles view and a vehicle with vehicle_type_id `1` exists
- **And** A vehicle type exists with name `Golf Cart`, id `1`, and identifier `serial`
- **And** A vehicle type exists with name `Bus`, id `2`, and identifier `VIN`
- **When** I select `Bus` for vehicle type
- **Then** the label **Serial** changes to **VIN**

#### Scenario: Admin user selects vehicle type to be one with a serial number on edit

- **Given** I am signed in as admin on the vehicles view and a vehicle with vehicle_type_id `2` exists
- **And** A vehicle type exists with name `Golf Cart`, id `1`, and identifier `serial`
- **And** A vehicle type exists with name `Bus`, id `2`, and identifier `VIN`
- **When** I select `Golf Cart` for vehicle type
- **Then** the label **VIN** changes to **Serial**

#### Scenario: Admin user edits a vehicle university id

- **Given** I am signed in as admin and a vehicle with university_id `123456` exists
- **When** I change the university id to `987654` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ university_id: '987654' }` is in the response

#### Scenario: Admin user edits a vehicle make

- **Given** I am signed in as admin and a vehicle with make `Toyota` exists
- **When** I change the make to `Honda` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ make: 'Honda' }` is in the response

#### Scenario: Admin user edits a vehicle model

- **Given** I am signed in as admin and a vehicle with model `Sienna` exists
- **When** I change the model to `Accord` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ model: 'Accord' }` is in the response

#### Scenario: Admin user edits a vehicle year

- **Given** I am signed in as admin and a vehicle with year `2015` exists
- **When** I change the year to `2016` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ year: 2016 }` is in the response

#### Scenario: Admin user edits a vehicle identifier

- **Given** I am signed in as admin and a vehicle with identifier `1HGCM82633A004352` exists
- **When** I change the identifier to `1HGCM82633A004353` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ identifier: '1HGCM82633A004353' }` is in the response

#### Scenario: Admin user edits a vehicle purchase date

- **Given** I am signed in as admin and a vehicle with purchase date `2026-09-13` exists
- **When** I change the purchase date to `2026-09-14` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ purchased_at: '2026-09-14' }` is in the response

#### Scenario: Admin user edits a vehicle color

- **Given** I am signed in as admin and a vehicle with color `gray` exists
- **When** I change the color to `white` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ color: 'white' }` is in the response

#### Scenario: Admin user edits a vehicle passenger capacity

- **Given** I am signed in as admin and a vehicle with passenger capacity `7` exists
- **When** I change the passenger capacity to `8` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ passenger_capacity: '8' }` is in the response

#### Scenario: Admin user edits a vehicle license plate

- **Given** I am signed in as admin and a vehicle with license plate `ABC123` exists
- **When** I change the license plate to `DEF456` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ license_plate: 'DEF456' }` is in the response

#### Scenario: Admin user edits a vehicle license plate expiration date

- **Given** I am signed in as admin and a vehicle with license plate expiration date `2026-09-13` exists
- **When** I change the license plate expiration date to `2026-09-14` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ license_plate_expiration_date: '2026-09-14' }` is in the response

#### Scenario: Admin user edits a vehicle status

- **Given** I am signed in as admin and a vehicle with status `active` exists
- **When** I change the status to `retired` and submit
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ status: 'retired' }` is in the response

#### Scenario: Admin user edits a vehicle to have a missing area

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without an area
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing vehicle type

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a vehicle type
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing university id

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a university id
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing identifier

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without an identifier
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing make

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a make
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing model

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a model
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing year

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a year
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing purchase date

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a purchase date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing color

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a color
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing passenger capacity

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a passenger capacity
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing status

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog without a status
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to edit a vehicle to have a missing area id

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ area_id: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing area id." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing vehicle type id

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ vehicle_type_id: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing vehicle type id." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing make

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ make: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing make." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing model

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ model: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing model." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing year

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ year: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing year." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing identifier

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ identifier: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing identifier." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing purchase date

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ purchased_at: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing purchase date." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing color

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ color: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing color." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing passenger capacity

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ passenger_capacity: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing passenger capacity." }`

#### Scenario: Admin user requests to edit a vehicle to have a missing status

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ status: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing status." }`

#### Scenario: Admin user edits a vehicle to have a whitespace only university id

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with university id ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only make

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with make ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only model

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with model ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only identifier

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with identifier ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only color

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with color ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only license plate

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with license plate ` `
- **Then** the vehicle is saved with license plate as null
- **And** { license_plate: null } appears in the response

#### Scenario: Admin user requests to edit a vehicle to have a whitespace-only university id

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ university_id: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing university id." }`

#### Scenario: Admin user requests to edit a vehicle to have a whitespace-only make

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ make: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing make." }`

#### Scenario: Admin user requests to edit a vehicle to have a whitespace-only model

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ model: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing model." }`

#### Scenario: Admin user requests to edit a vehicle to have a whitespace-only identifier

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ identifier: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing identifier." }`

#### Scenario: Admin user requests to edit a vehicle to have a whitespace-only color

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ color: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing color." }`

#### Scenario: Admin user requests to edit a vehicle to have a whitespace-only license plate

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ license_plate: " " }` and a valid rest of the body
- **Then** the vehicle is saved with license plate as null
- **And** { license_plate: null } appears in the response

#### Scenario: Admin user requests to edit a vehicle to have an area_id that does not correspond to an existing area_id

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **And** An area with id `45` does not exist
- **When** I request `PUT /api/vehicles/1` with `{ area_id: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Area does not exist." }`

#### Scenario: Admin user requests to edit a vehicle to have a vehicle_type_id that does not correspond to an existing vehicle_type_id

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **And** A vehicle type with id `45` does not exist
- **When** I request `PUT /api/vehicles/1` with `{ vehicle_type_id: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Vehicle type does not exist." }`

#### Scenario: Admin user requests to edit a vehicle to have a status other than active or retired

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ status: 'in use' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Invalid status." }`

#### Scenario: Admin user requests to edit a vehicle to have a non-integer value for year

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ year: 'two thousand thirteen' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Year must be an integer." }`

#### Scenario: Admin user requests to edit a vehicle to have a non-integer value for passenger capacity

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ passenger_capacity: 'eight' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Passenger capacity must be an integer." }`

#### Scenario: Admin user requests to edit a vehicle to have a non-date value for purchase date

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ purchased_at: 'September 13' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Purchase date must be a numerical date." }`

#### Scenario: Admin user requests to edit a vehicle to have a non-date value for license plate expiration date

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ license_plate_expiration_date: 'September 13' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "License plate expiration date must be a numerical date." }`

#### Scenario: Admin user requests to edit a vehicle to have a bad date format for purchase date

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ purchased_at: '2013/01/01' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Purchase date must be in format 'yyyy-mm-dd'." }`

#### Scenario: Admin user requests to edit a vehicle to have a bad date format for license plate expiration date

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ license_plate_expiration_date: '2013/01/01' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "License plate expiration date must be in format 'yyyy-mm-dd'." }`

#### Scenario: Admin user edits a vehicle to have a university id longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with a vehicle university id longer than 255 characters
- **Then** validation blocks the request and I see a `University id too long.` message

#### Scenario: Admin user edits a vehicle to have a make longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with a vehicle make longer than 255 characters
- **Then** validation blocks the request and I see a `Make too long.` message

#### Scenario: Admin user edits a vehicle to have a model longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with a vehicle model longer than 255 characters
- **Then** validation blocks the request and I see a `Model too long.` message

#### Scenario: Admin user edits a vehicle to have a serial identifier longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `serial`
- **When** I submit the edit dialog with vehicle type id `1` and a vehicle identifier longer than 255 characters
- **Then** validation blocks the request and I see a `Serial number too long.` message

#### Scenario: Admin user edits a vehicle to have a VIN identifier less than 17 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I submit the edit dialog with vehicle type id `1` and a vehicle identifier less than 17 characters
- **Then** validation blocks the request and I see a `VIN must be 17 characters.` message

#### Scenario: Admin user edits a vehicle to have a VIN identifier more than 17 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I submit the edit dialog with vehicle type id `1` and a vehicle identifier more than 17 characters
- **Then** validation blocks the request and I see a `VIN must be 17 characters.` message

#### Scenario: Admin user edits a vehicle to have a color longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with a vehicle color longer than 255 characters
- **Then** validation blocks the request and I see a `Color too long.` message

#### Scenario: Admin user edits a vehicle to have a license plate longer than 8 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the edit dialog with a vehicle license plate longer than 8 characters
- **Then** validation blocks the request and I see a `License plate too long.` message

#### Scenario: Admin user requests to edit a vehicle to have a university id longer than 255 characters

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with university id longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "University id too long." }`

#### Scenario: Admin user requests to edit a vehicle to have a make longer than 255 characters

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with make longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Make too long." }`

#### Scenario: Admin user requests to edit a vehicle to have a model longer than 255 characters

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with model longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Model too long." }`

#### Scenario: Admin user requests to edit a vehicle to have a serial identifier longer than 255 characters

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **And** There exists a vehicle type with id `1` and identifier `serial`
- **When** I request `PUT /api/vehicles/1` with `{ vehicle_type_id: 1 }` and identifier longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Serial number too long." }`

#### Scenario: Admin user requests to edit a vehicle to have a VIN identifier less than 17 characters

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I request `PUT /api/vehicles/1` with `{ vehicle_type_id: 1 }` and identifier less than 17 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "VIN must be 17 characters." }`

#### Scenario: Admin user requests to edit a vehicle to have a VIN identifier more than 17 characters

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I request `PUT /api/vehicles/1` with `{ vehicle_type_id: 1 }` and identifier longer than 17 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "VIN must be 17 characters." }`

#### Scenario: Admin user requests to edit a vehicle to have a color longer than 255 characters

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with color longer than 255 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Color too long." }`

#### Scenario: Admin user requests to edit a vehicle to have a license plate longer than 8 characters

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with license plate longer than 8 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "License plate too long." }`

#### Scenario: Admin user edits a vehicle to have a non-unique university id

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with university id `123456` exists
- **When** I submit the edit dialog with university id `123456`
- **Then** validation blocks the request and I see a `University id already taken.` message

#### Scenario: Admin user edits a vehicle to have a non-unique identifier

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with identifier `123456` exists
- **When** I submit the edit dialog with identifier `123456`
- **Then** validation blocks the request and I see a `Identifier already taken.` message

#### Scenario: Admin user edits a vehicle to have a non-unique license plate

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with license plate `123456` exists
- **When** I submit the edit dialog with license plate `123456`
- **Then** validation blocks the request and I see a `License plate already taken.` message

#### Scenario: Admin user requests to edit a vehicle to have a non-unique university id

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **And** A vehicle with university id `123456` exists with id `1`
- **When** I request `PUT /api/vehicles/1` with `{ university_id: "123456" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "University id already taken." }`

#### Scenario: Admin user requests to edit a vehicle to have a non-unique identifier

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **And** A vehicle with identifier `123456` exists with id `1`
- **When** I request `PUT /api/vehicles/1` with `{ identifier: "123456" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Identifier already taken." }`

#### Scenario: Admin user requests to edit a vehicle to have a non-unique license plate

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **And** A vehicle with license plate `123456` exists with id `1`
- **When** I request `PUT /api/vehicles/1` with `{ license_plate: "123456" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "License plate already taken." }`


#### Scenario: Admin user requests to edit a vehicle to have a year before 1950

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ year: 1949 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Year must be between 1950 and the year after this year." }`

#### Scenario: Admin user requests to edit a vehicle to have a year after the current year + 1

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with the year two years after the current year and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Year must be between 1950 and the year after this year." }`

#### Scenario: Admin user requests to edit a vehicle to have a passenger capacity less than 1

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ passenger_capacity: 0 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Passenger capacity must be between 1 and 300." }`

#### Scenario: Admin user requests to edit a vehicle to have a passenger capacity greater than 300

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ passenger_capacity: 301 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Passenger capacity must be between 1 and 300." }`

#### Scenario: Admin user requests to edit a vehicle to have a purchase date before 1950

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ purchased_at: '1949-12-31' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Purchase date must be between 1950 and the current date." }`

#### Scenario: Admin user requests to edit a vehicle to have a purchase date after the current date

- **Given** I am signed in as admin
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with purchase date after the current date and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Purchase date must be between 1950 and the current date." }`

#### Scenario: Admin user deletes a vehicle

- **Given** I am signed in as admin and a vehicle with id `1` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that vehicle is removed from the list

#### Scenario: Admin user updates a vehicle that does not exist
-   **Given** I am signed in as admin
-   **And** A vehicle with id `999` does not exist
-   **When** I request `PUT /api/vehicles/999` with a valid body
-   **Then** the API returns `404`

#### Scenario: Admin user updates a vehicle with an invalid vehicleId
-   **Given** I am signed in as admin
-   **When** I request `PUT /api/vehicles/abc` with a valid body
-   **Then** the API returns `400`

#### Scenario: Admin user deletes a vehicle that does not exist
-   **Given** I am signed in as admin
-   **And** A vehicle with id `999` does not exist
-   **When** I request `DELETE /api/vehicles/999`
-   **Then** the API returns `404`

#### Scenario: Admin user deletes a vehicle with an invalid vehicleId
-   **Given** I am signed in as admin
-   **When** I request `DELETE /api/vehicles/abc`
-   **Then** the API returns `400` 

---

### US-5.5: Signed-in admin user access only

#### Scenario: Un-signed-in user accesses vehicles page
- **Given** I am not signed in
- **When** I navigate to `/vehicles` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to vehicles
- **Given** I have no valid session token
- **When** I request `GET /api/vehicles`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular vehicle
- **Given** I have no valid session token
- **And** A vehicle with id `1` exists
- **When** I request `GET /api/vehicles/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to create a vehicle
- **Given** I have no valid session token
- **When** I request `POST /api/vehicles` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to update a vehicle
- **Given** I have no valid session token
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to delete a vehicle
- **Given** I have no valid session token
- **And** A vehicle with id `1` exists
- **When** I request `DELETE /api/vehicles/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Signed-in user without admin or area admin role accesses vehicles page
- **Given** I am signed in
- **And** I do not have roles `admin` or `area admin`
- **When** I navigate to `/vehicles` by URL
- **Then** I am redirected to `/home`

#### Scenario: Signed-in user without admin or area admin role API request to vehicles
- **Given** I am signed in
- **And** I do not have roles `admin` or `area admin`
- **When** I request `GET /api/vehicles`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to a particular vehicle
- **Given** I am signed in
- **And** I do not have roles `admin` or `area admin`
- **And** A vehicle with id `1` exists
- **When** I request `GET /api/vehicles/1`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to create a vehicle
- **Given** I am signed in
- **And** I do not have roles `admin` or `area admin`
- **When** I request `POST /api/vehicles` with a valid body
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to update a vehicle
- **Given** I am signed in
- **And** I do not have roles `admin` or `area admin`
- **And** A vehicle with id `1` exists
- **When** I request `PUT /api/vehicles/1` with a valid body
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to delete a vehicle
- **Given** I am signed in
- **And** I do not have roles `admin` or `area admin`
- **And** A vehicle  with id `1` exists
- **When** I request `DELETE /api/vehicles/1`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user with area admin role API request to a particular vehicle of different area
- **Given** I am signed in as area admin
- **And** I have only area id `1`
- **And** A vehicle with id `1` exists with area id `2`
- **When** I request `GET /api/vehicles/1`
- **Then** the API returns `403` with `{ message: "Not authorized for the specified area." }`

#### Scenario: Signed-in user with area admin role API request to create a vehicle in a different area
- **Given** I am signed in as area admin
- **And** I have only area id `1`
- **When** I request `POST /api/vehicles` with `{ area_id: 2 }` and a valid body
- **Then** the API returns `403` with `{ message: "Not authorized for the specified area." }`

#### Scenario: Signed-in user with area admin role API request to update a vehicle to have a different area
- **Given** I am signed in as area admin
- **And** I have only area id `1`
- **And** A vehicle with id `1` and area id `1` exists
- **When** I request `PUT /api/vehicles/1` with `{ area_id: 2 }` and a valid body
- **Then** the API returns `403` with `{ message: "Not authorized for the specified area." }`

#### Scenario: Signed-in user with area admin role API request to update a vehicle with a different area
- **Given** I am signed in as area admin
- **And** I have only area id `1`
- **And** A vehicle with id `1` and area id `2` exists
- **When** I request `PUT /api/vehicles/1` with a valid body
- **Then** the API returns `403` with `{ message: "Not authorized for the specified area." }`

#### Scenario: Signed-in user with area admin role API request to delete a vehicle of a different area
- **Given** I am signed in as area admin
- **And** I have only area id `1`
- **And** A vehicle with id `1` and area id `2` exists
- **When** I request `DELETE /api/vehicles/1`
- **Then** the API returns `403` with `{ message: "Not authorized for the specified area." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|


## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 7 from @features/feature-7-drivers.md on branch `feature/7-drivers`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-013** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-004)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Additional checks for chip colors on vehicle rows for changing chip color for other maintenance needs

---

## Delivered to later features

- A vehicle row with an area_id, vehicle_type_id, university_id, make, model, year, identifier, purchased_at, color, passenger_capacity, license_plate, license_plate_expiration_date, and status
- `GET /api/vehicles` returns every vehicle for any valid session with `admin` role
- `GET /api/vehicles` returns every vehicle with a matching area_id for any valid session with `area admin` role
- Deletes on areas and vehicle types are now conditional
 