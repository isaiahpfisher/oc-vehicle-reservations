# Feature: Vehicle Management

**Feature ID:** 5
**Branch pattern:** `feature/5-vehicles`
**Status:** Draft
**Created:** 2026-10-20
**Input:** Signed-in admin or area admin users manage vehicles. The list is a table. Create and edit each have their own page.
**Depends on:** Feature 2 [Areas], Feature 3 [Roles], Feature 4 [Vehicle Types]

---

## User Stories

### US-5.1: Create vehicles

**As a** signed-in admin or area admin user
**I want to** create a vehicle with an area, vehicle type, university id, make, model, year, identifier (VIN or Serial), purchase date, color, passenger capacity, license plate, license plate expiration date, and status.
**So that** users managing vehicle requests can assign a particular vehicle

**Priority:** P1
**Independent test:** Open the create vehicle page, create a vehicle; it appears in the vehicles table
**Acceptance scenarios:** see ### US-5.1 under Acceptance Criteria

### US-5.2: View vehicles

**As a** signed-in admin or area admin user
**I want to** see all vehicles that I can manage
**So that** I can see which vehicles exist.

**Priority:** P1
**Independent test:** Vehicles view loads a single list of vehicles
**Acceptance scenarios:** see ### US-5.2 under Acceptance Criteria

### US-5.3: Manage vehicle rows

**As a** signed-in admin or area admin user
**I want** each vehicle row to have **view** and **delete** actions
**So that** I can manage vehicles from the vehicles view

**Priority:** P1
**Independent test:** Each vehicle row exposes view and delete icon actions 
**Acceptance scenarios:** see ### US-5.3 under Acceptance Criteria

### US-5.4: Edit and delete vehicles

**As a** signed-in admin or area admin user
**I want to** edit or delete a vehicle
**So that** I can keep vehicles up to date

**Priority:** P2
**Independent test:** Edit a vehicle from its page and delete it from the table; the vehicles table updates
**Acceptance scenarios:** see ### US-5.4 under Acceptance Criteria

### US-5.5: Signed-in admin or area admin user access only

**As a** signed-in admin user
**I want to** have vehicles visible only to signed-in admin or area admin users
**So that** Unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/vehicles`, `/vehicles/new`, and `vehicles/:id` are redirected to `/login`; unauthorized API requests or requests without `admin` or `area_admin` role receive errors; signed in user without `admin` or `area_admin` role is redirected to `/home`; `area_admin` role only receives data corresponding to the area admin's area
**Acceptance scenarios:** see ### US-5.5 under Acceptance Criteria

### US-5.6: Areas with vehicles cannot be deleted

**As a** signed-in admin user
**I want to** only be able to delete areas without vehicles
**So that** I don't inadvertently make vehicle data invalid

**Priority:** P2
**Independent test:** Deleting an area with a vehicle receives an error
**Acceptance scenarios:** see ### US-5.6 under Acceptance Criteria

### US-5.7: Vehicle types with vehicles cannot be deleted

**As a** signed-in admin user
**I want to** only be able to delete vehicle types without vehicles
**So that** I don't inadvertently make vehicle data invalid

**Priority:** P2
**Independent test:** Deleting a vehicle type with a vehicle receives an error
**Acceptance scenarios:** see ### US-5.7 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All vehicle endpoints MUST require a valid session and `admin` or `area_admin` role (`authorizeRoles('admin', 'area_admin')` middleware).
- **FR-002**: `id` is assigned by the database.
- **FR-003**: `area_id` MUST correspond to an existing area.
- **FR-004**: `vehicle_type_id` MUST correspond to an existing vehicle type.
- **FR-005**: `university_id` MUST be trimmed before save. An empty university id MUST be rejected. 
- **FR-006**: `university_id` MUST be unique. Creating a vehicle with a university id identical to an existing university id MUST be rejected. Updating a vehicle to have a different university id that is also identical to an existing university id MUST be rejected.
- **FR-007**: `university_id` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-008**: `make` MUST be trimmed before save. An empty make MUST be rejected. 
- **FR-009**: `make` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-010**: `model` MUST be trimmed before save. An empty model MUST be rejected. 
- **FR-011**: `model` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-012**: `year` MUST be an integer between 1950 and the current year + 1, inclusive. An empty year MUST be rejected.
- **FR-013**: `identifier` MUST be trimmed before save. An empty identifier MUST be rejected.
- **FR-014**: `identifier` MUST be unique. Creating a vehicle with an identifier identical to an existing identifier MUST be rejected. Updating a vehicle to have a different identifier that is also identical to an existing identifier MUST be rejected.
- **FR-015**: `identifier` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-016**: If the vehicle type corresponding to the `vehicle_type_id` has identifier `VIN`, then `identifier` MUST be 17 characters after trim. Any other length MUST be rejected. 
- **FR-017**: `purchased_at` MUST be a valid date between 1950-01-01 and the current date, inclusive, in format `yyyy-mm-dd`. Empty purchase date MUST be rejected.
- **FR-018**: `license_plate_expiration_date` MUST be either null or a valid date in format `yyyy-mm-dd`.
- **FR-019**: `color` MUST be trimmed before save. An empty color MUST be rejected. 
- **FR-020**: `color` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-021**: `passenger_capacity` MUST be an integer between 1 and 300, inclusive. Empty passenger capacity MUST be rejected.
- **FR-022**: `license_plate` MUST be trimmed before save. If empty, it is stored as null.
- **FR-023**: `license_plate` with more than 8 characters MUST be rejected.
- **FR-024**: If not null, `license_plate` MUST be unique. Creating a vehicle with a license plate identical to an existing license plate MUST be rejected. Updating a vehicle to have a different license plate that is also identical to an existing license plate MUST be rejected.
- **FR-025**: `status` MUST be selected from existing enum of `active`, `retired`. Empty status MUST be rejected. 
- **FR-026**: Deleting an area that has vehicles is not allowed.
- **FR-027**: Deleting a vehicle type that has vehicles is not allowed.

---

## Assumptions

- The vehicle list is a table. Create is the page `/vehicles/new`. Edit is the page `/vehicles/:id`. Delete uses a confirmation dialog. There is no split sidebar/main panel.
- Request and response JSON uses camelCase (`areaId`, `purchasedAt`), matching the rest of the API. The examples in this spec use the column names.
- Area admins can read vehicle types (`GET /api/vehicle-types`) so the vehicle form can list them. Creating, editing, and deleting vehicle types stays admin-only (Feature 4).

## Edge Cases

- Empty area id → client block and/or `400`.
- Area id that does not exist → client block and/or `400`.
- Empty vehicle type id → client block and/or `400`.
- Vehicle type id that does not exist → client block and/or `400`.
- Empty or whitespace-only university id → client block and/or `400`.
- University id longer than 255 characters → `400`.
- University id that matches the university id of a different vehicle → `400`.
- Empty or whitespace-only make → client block and/or `400`.
- Make longer than 255 characters → `400`.
- Empty or whitespace-only model → client block and/or `400`.
- Model longer than 255 characters → `400`.
- Empty year → client block and/or `400`.
- Year before 1950 → `400`.
- Year after the current year + 1 → `400`.
- Non-integer year → `400`.
- Empty or whitespace-only identifier → client block and/or `400`.
- Identifier longer than 255 characters → `400`.
- Identifier not equal to 17 characters when the vehicle types' identifier is `VIN` → `400`.
- Identifier that matches the identifier of a different vehicle → `400`.
- Empty purchase date → client block and/or `400`.
- Purchase date before `1950-01-01` → `400`.
- Purchase date after today → `400`.
- Empty or whitespace-only color → client block and/or `400`.
- Color longer than 255 characters → `400`.
- Empty passenger capacity → client block and/or `400`.
- Passenger capacity less than 1 → `400`.
- Passenger capacity greater than 300 → `400`.
- Non-integer passenger capacity → `400`.
- License plate longer than 8 characters → `400`.
- License plate that is not null that matches the license plate of a different vehicle → `400`.
- Empty status → `400`.
- Status other than `active` or `retired` → `400`.
- Unauthenticated vehicles screen → redirect to `/login`. 
- Authenticated vehicles screen without `admin` or `area_admin` role → redirect to `/home`. 
- Unauthenticated API request → `401`.
- API request without `admin` or `area_admin` role → `403`.
- API request that doesn't match an area admin's `area_id` → `403`.
- Deleting an area that has vehicles → `400`.
- Deleting a vehicle type that has vehicles → `400`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin user can view and delete vehicles from the table, create a vehicle on `/vehicles/new`, and edit a vehicle on `/vehicles/:id`.
- **SC-003**: Signed-in area admin user can view and delete vehicles for their areas from the table, create a vehicle for one of those areas on `/vehicles/new`, and edit one of those vehicles on `/vehicles/:id`.
- **SC-004**: `npm test` passes for vehicles API and vehicles view behavior.

---

## Data Ownership & Isolation

Any signed in admin or area admin user may create, edit, delete, or read the list of vehicles. For area admins that are not also an admin, this is limited to the areas the user is the area admin of.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/vehicles` and `GET /api/vehicles/:vehicleId` require a Bearer token and `admin` or `area_admin` role. `admin` role reads all vehicles; `area_admin` reads all vehicles of matching area_id. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token and `admin` or `area_admin` role. `area_admin` also requires matching area_id. |
| **Create scope** | `POST` requires a Bearer token and `admin` or `area_admin` role. `area_admin` may only create vehicles for their area. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/vehicles` | Yes - Admin, Area Admin | Fetch all vehicles for admin; fetch all vehicles belonging to the same area for area admin |
| `GET` | `/api/vehicles/:vehicleId` | Yes - Admin, Area Admin | Fetch a single vehicle for admin; fetch a single vehicle if it belongs to the same area for area admin |
| `POST` | `/api/vehicles` | Yes - Admin, Area Admin | Create a vehicle for admin; create a vehicle with the same `area_id` as the area admin's `area_id` for area admin |
| `PUT` | `/api/vehicles/:vehicleId` | Yes - Admin, Area Admin | Edit a vehicle for admin; edit a vehicle if it belongs to the same area for area admin |
| `DELETE` | `/api/vehicles/:vehicleId` | Yes - Admin, Area Admin | Delete a vehicle for admin; delete a vehicle if it belongs to the same area for area admin |

**Create vehicle request body:**

```json
{
  "area_id": 1,
  "vehicle_type_id": 1,
  "university_id": "ABCD12345EFG",
  "make": "Toyota",
  "model": "Sienna",
  "year": 2015,
  "identifier": "1HGCM82633A004352",
  "purchased_at": "2018-01-01",
  "color": "gray",
  "passenger_capacity": 8,
  "license_plate": "ABC123",
  "license_plate_expiration_date": "2027-09-01",
  "status": "active"
}
```

**Vehicle success response** (`200` / `201`):

```json
{
  "id": 1,
  "area_id": 1,
  "vehicle_type_id": 1,
  "university_id": "ABCD12345EFG",
  "make": "Toyota",
  "model": "Sienna",
  "year": 2015,
  "identifier": "1HGCM82633A004352",
  "purchased_at": "2018-01-01",
  "color": "gray",
  "passenger_capacity": 8,
  "license_plate": "ABC123",
  "license_plate_expiration_date": "2027-09-01",
  "status": "active",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404`.
**Unauthorized** (lacking `area_admin` for that vehicle's area or `admin` role): `403`.

---

## Screen Requirements

### [View: Vehicles] — route name `vehicles`

**Vehicles.vue** (`/vehicles`) — no sidebar / main-panel split.

- Heading: **Vehicle Management**
- Primary action: **+ New Vehicle** opens `/vehicles/new`.
- Display vehicles in a `<v-data-table>` (10 per page), matching the users table. Columns are **Make**, **Model**, **Color**, and **Status**.
- The status cell is a chip: red when `retired`; yellow when `active` and the license plate expiration date is before today; green when `active` and there is no expiration date or the date is today or later.
- The make and the **View vehicle** icon open `/vehicles/:id`.
- **Delete vehicle** opens a confirmation `<ConfirmModal>` from `components/common`.
- Icon-only row actions use `size="small"`, `variant="text"`, and `aria-label`s **View vehicle** and **Delete vehicle**.
- **Empty state:** **"No vehicles yet. Create your first vehicle."**
- **Loading state:** skeleton or progress indicator while vehicles are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

### [View: New vehicle] — route name `vehicleCreate` (`/vehicles/new`)

**VehicleForm.vue**. Register this route before `/vehicles/:id`.

- Heading: **New vehicle**
- Empty fields: **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate** (optional), **License Plate Expiration Date** (optional), and **Status**, plus **Create** / **Cancel**.
- **Cancel** returns to `/vehicles` without saving.
- Area `<v-select>` shows area names and submits the area id. Admins see every area. Area admins see only their areas.
- Vehicle type `<v-select>` shows vehicle type names and submits the vehicle type id.
- **VIN**/**Serial** labels the identifier field. `VIN` shows **VIN**. `Serial` shows **Serial**. With no vehicle type selected, the label is **VIN**.
- **Status** is a `<v-select>` with `active` and `retired`.
- **Create** submits `POST /api/vehicles`. On `201`, go to `/vehicles`.
- Same loading and error states as the list.

### [View: Edit vehicle] — route name `vehicleDetails` (`/vehicles/:id`)

**VehicleForm.vue**, same fields as the create page, pre-filled from `GET /api/vehicles/:vehicleId`.

- Heading: the vehicle's make and model.
- **Save** submits `PUT /api/vehicles/:vehicleId` and stays on the page.
- **Cancel** restores the saved values and stays on the page.
- Area, vehicle type, VIN/Serial label, and status behave the same as on the create page.
- An area admin opening a vehicle outside their areas is redirected to `/home`.
- Same loading and error states as the list.

**Implementation note:** three routes. The table is `Vehicles.vue`. Create and edit share `VehicleForm.vue`. Delete uses the shared confirm dialog.

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
- **Then** I am on `/vehicles/new` and I see **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate**, **License Plate Expiration Date**, and **Status**

#### Scenario: Area admin user creates a vehicle

- **Given** I am signed in as area admin on the vehicles view
- **When** I click **+ New Vehicle**
- **Then** I am on `/vehicles/new` and I see **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate**, **License Plate Expiration Date**, and **Status**
- **And** The **Area** dropdown only lists the areas that the area admin user is the area admin of

#### Scenario: Admin user saves vehicle

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with all valid values
- **Then** the API returns `201` with that vehicle
- **And** The new vehicle appears in the vehicles list

#### Scenario: Admin user selects vehicle type to be one with a serial number on create

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle type exists with name `Golf Cart` and identifier `Serial`
- **When** I select `Golf Cart` for vehicle type
- **Then** the label **VIN** changes to **Serial**
- **And** I can enter values in that field that are not exactly 17 characters

#### Scenario: Admin user creates vehicle with missing area

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without an area
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing vehicle type

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a vehicle type
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing university id

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a university id
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing identifier

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without an identifier
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing make

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a make
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing model

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a model
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing year

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a year
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing purchase date

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a purchase date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing color

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a color
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing passenger capacity

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a passenger capacity
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with missing status

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page without a status
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
- **When** I submit the create page with university id ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only make

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with make ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only model

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with model ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only identifier

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with identifier ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only color

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with color ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates vehicle with a whitespace only license plate

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with license plate ` `
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
- **When** I submit the create page with a vehicle university id longer than 255 characters
- **Then** validation blocks the request and I see a `University id too long.` message

#### Scenario: Admin user creates vehicle with make longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with a vehicle make longer than 255 characters
- **Then** validation blocks the request and I see a `Make too long.` message

#### Scenario: Admin user creates vehicle with model longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with a vehicle model longer than 255 characters
- **Then** validation blocks the request and I see a `Model too long.` message

#### Scenario: Admin user creates vehicle with serial identifier longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `Serial`
- **When** I submit the create page with vehicle type id `1` and a vehicle identifier longer than 255 characters
- **Then** validation blocks the request and I see a `Serial number too long.` message

#### Scenario: Admin user creates vehicle with VIN identifier less than 17 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I submit the create page with vehicle type id `1` and a vehicle identifier less than 17 characters
- **Then** validation blocks the request and I see a `VIN must be 17 characters.` message

#### Scenario: Admin user creates vehicle with VIN identifier more than 17 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I submit the create page with vehicle type id `1` and a vehicle identifier more than 17 characters
- **Then** validation blocks the request and I see a `VIN must be 17 characters.` message

#### Scenario: Admin user creates vehicle with color longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with a vehicle color longer than 255 characters
- **Then** validation blocks the request and I see a `Color too long.` message

#### Scenario: Admin user creates vehicle with license plate longer than 8 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the create page with a vehicle license plate longer than 8 characters
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
- **And** There exists a vehicle type with id `1` and identifier `Serial`
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
- **When** I submit the create page with university id `123456`
- **Then** validation blocks the request and I see a `University id already taken.` message

#### Scenario: Admin user creates a vehicle with a non-unique identifier

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with identifier `123456` exists
- **When** I submit the create page with identifier `123456`
- **Then** validation blocks the request and I see a `Identifier already taken.` message

#### Scenario: Admin user creates a vehicle with a non-unique license plate

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with license plate `123456` exists
- **When** I submit the create page with license plate `123456`
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

#### Scenario: Vehicle rows have view and delete actions

- **Given** I am signed in as admin and at least one vehicle exists
- **When** I view the vehicle list
- **Then** each row shows **View vehicle** and **Delete vehicle** actions

#### Scenario: Vehicle rows with green chip

- **Given** I am signed in as admin and at least one vehicle exists
- **When** I view the vehicle list
- **Then** each row with status `active` that has no license plate expiration date, or a license plate expiration date today or after, has a green chip

#### Scenario: Vehicle rows with yellow chip

- **Given** I am signed in as admin and at least one vehicle exists
- **When** I view the vehicle list
- **Then** each row with status `active` and a license plate expiration date before today has a yellow chip

#### Scenario: Vehicle rows with red chip

- **Given** I am signed in as admin and at least one vehicle exists
- **When** I view the vehicle list
- **Then** each row with status `retired` has a red chip

---

### US-5.4 — Edit and delete vehicles

#### Scenario: Admin user opens the vehicle page

- **Given** I am signed in as admin on the vehicles view
- **When** I open that vehicle
- **Then** I am on `/vehicles/:id` and I see **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate**, **License Plate Expiration Date**, and **Status**

#### Scenario: Area admin user opens the vehicle page

- **Given** I am signed in as area admin on the vehicles view
- **When** I open that vehicle
- **Then** I am on `/vehicles/:id` and I see **Area**, **Vehicle Type**, **University Id**, **VIN**/**Serial**, **Make**, **Model**, **Year**, **Color**, **Passenger Capacity**, **Purchase Date**, **License Plate**, **License Plate Expiration Date**, and **Status**
- **And** the **Area** select only shows the areas which I am the area admin of

#### Scenario: Admin user edits a vehicle area

- **Given** I am signed in as admin and a vehicle with area_id `1` exists
- **And** There exists an area `Maintenance` with id `2`
- **When** I change the area to `Maintenance` and click **Save**
- **Then** the API returns `200` with the updated vehicle
- **And** `{ area_id: 2 }` is in the response

#### Scenario: Admin user edits a vehicle type with identifier of 17 characters

- **Given** I am signed in as admin and a vehicle with vehicle_type_id `1` and a 17-character identifier exists
- **And** There exists a vehicle type `Bus` with identifier `VIN` and id `2`
- **When** I change the vehicle type to `Bus` and click **Save**
- **Then** the API returns `200` with the updated vehicle
- **And** `{ vehicle_type_id: 2 }` is in the response

#### Scenario: Admin user edits a vehicle type with identifier other than 17 characters while current vehicle type has identifier Serial

- **Given** I am signed in as admin and a vehicle with vehicle_type_id `1` and an identifier other than 17 characters exists
- **And** There exists a vehicle type `Bus` with identifier `VIN` and id `2`
- **When** I change the vehicle type to `Bus` and click **Save**
- **Then** I see an error `VIN must be 17 characters.`
- **And** the vehicle is not updated

#### Scenario: Admin user selects vehicle type to be one with a VIN number

- **Given** I am signed in as admin on the vehicles view and a vehicle with vehicle_type_id `1` exists
- **And** A vehicle type exists with name `Golf Cart`, id `1`, and identifier `Serial`
- **And** A vehicle type exists with name `Bus`, id `2`, and identifier `VIN`
- **When** I select `Bus` for vehicle type
- **Then** the label **Serial** changes to **VIN**

#### Scenario: Admin user selects vehicle type to be one with a serial number on edit

- **Given** I am signed in as admin on the vehicles view and a vehicle with vehicle_type_id `2` exists
- **And** A vehicle type exists with name `Golf Cart`, id `1`, and identifier `Serial`
- **And** A vehicle type exists with name `Bus`, id `2`, and identifier `VIN`
- **When** I select `Golf Cart` for vehicle type
- **Then** the label **VIN** changes to **Serial**

#### Scenario: Admin user edits a vehicle university id

- **Given** I am signed in as admin and a vehicle with university_id `123456` exists
- **When** I change the university id to `987654` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ university_id: '987654' }` is in the response

#### Scenario: Admin user edits a vehicle make

- **Given** I am signed in as admin and a vehicle with make `Toyota` exists
- **When** I change the make to `Honda` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ make: 'Honda' }` is in the response

#### Scenario: Admin user edits a vehicle model

- **Given** I am signed in as admin and a vehicle with model `Sienna` exists
- **When** I change the model to `Accord` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ model: 'Accord' }` is in the response

#### Scenario: Admin user edits a vehicle year

- **Given** I am signed in as admin and a vehicle with year `2015` exists
- **When** I change the year to `2016` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ year: 2016 }` is in the response

#### Scenario: Admin user edits a vehicle identifier

- **Given** I am signed in as admin and a vehicle with identifier `1HGCM82633A004352` exists
- **When** I change the identifier to `1HGCM82633A004353` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ identifier: '1HGCM82633A004353' }` is in the response

#### Scenario: Admin user edits a vehicle purchase date

- **Given** I am signed in as admin and a vehicle with purchase date `2026-09-13` exists
- **When** I change the purchase date to `2026-09-14` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ purchased_at: '2026-09-14' }` is in the response

#### Scenario: Admin user edits a vehicle color

- **Given** I am signed in as admin and a vehicle with color `gray` exists
- **When** I change the color to `white` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ color: 'white' }` is in the response

#### Scenario: Admin user edits a vehicle passenger capacity

- **Given** I am signed in as admin and a vehicle with passenger capacity `7` exists
- **When** I change the passenger capacity to `8` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ passenger_capacity: '8' }` is in the response

#### Scenario: Admin user edits a vehicle license plate

- **Given** I am signed in as admin and a vehicle with license plate `ABC123` exists
- **When** I change the license plate to `DEF456` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ license_plate: 'DEF456' }` is in the response

#### Scenario: Admin user edits a vehicle license plate expiration date

- **Given** I am signed in as admin and a vehicle with license plate expiration date `2026-09-13` exists
- **When** I change the license plate expiration date to `2026-09-14` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ license_plate_expiration_date: '2026-09-14' }` is in the response

#### Scenario: Admin user edits a vehicle status

- **Given** I am signed in as admin and a vehicle with status `active` exists
- **When** I change the status to `retired` and click **Save**
- **Then** the API returns `200` with the updated vehicle 
- **And** `{ status: 'retired' }` is in the response

#### Scenario: Admin user edits a vehicle to have a missing area

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without an area
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing vehicle type

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a vehicle type
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing university id

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a university id
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing identifier

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without an identifier
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing make

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a make
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing model

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a model
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing year

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a year
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing purchase date

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a purchase date
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing color

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a color
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing passenger capacity

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a passenger capacity
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a missing status

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page without a status
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
- **When** I submit the vehicle page with university id ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only make

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with make ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only model

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with model ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only identifier

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with identifier ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only color

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with color ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a vehicle to have a whitespace only license plate

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with license plate ` `
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
- **When** I submit the vehicle page with a vehicle university id longer than 255 characters
- **Then** validation blocks the request and I see a `University id too long.` message

#### Scenario: Admin user edits a vehicle to have a make longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with a vehicle make longer than 255 characters
- **Then** validation blocks the request and I see a `Make too long.` message

#### Scenario: Admin user edits a vehicle to have a model longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with a vehicle model longer than 255 characters
- **Then** validation blocks the request and I see a `Model too long.` message

#### Scenario: Admin user edits a vehicle to have a serial identifier longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `Serial`
- **When** I submit the vehicle page with vehicle type id `1` and a vehicle identifier longer than 255 characters
- **Then** validation blocks the request and I see a `Serial number too long.` message

#### Scenario: Admin user edits a vehicle to have a VIN identifier less than 17 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I submit the vehicle page with vehicle type id `1` and a vehicle identifier less than 17 characters
- **Then** validation blocks the request and I see a `VIN must be 17 characters.` message

#### Scenario: Admin user edits a vehicle to have a VIN identifier more than 17 characters

- **Given** I am signed in as admin on the vehicles view
- **And** There exists a vehicle type with id `1` and identifier `VIN`
- **When** I submit the vehicle page with vehicle type id `1` and a vehicle identifier more than 17 characters
- **Then** validation blocks the request and I see a `VIN must be 17 characters.` message

#### Scenario: Admin user edits a vehicle to have a color longer than 255 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with a vehicle color longer than 255 characters
- **Then** validation blocks the request and I see a `Color too long.` message

#### Scenario: Admin user edits a vehicle to have a license plate longer than 8 characters

- **Given** I am signed in as admin on the vehicles view
- **When** I submit the vehicle page with a vehicle license plate longer than 8 characters
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
- **And** There exists a vehicle type with id `1` and identifier `Serial`
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
- **When** I submit the vehicle page with university id `123456`
- **Then** validation blocks the request and I see a `University id already taken.` message

#### Scenario: Admin user edits a vehicle to have a non-unique identifier

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with identifier `123456` exists
- **When** I submit the vehicle page with identifier `123456`
- **Then** validation blocks the request and I see a `Identifier already taken.` message

#### Scenario: Admin user edits a vehicle to have a non-unique license plate

- **Given** I am signed in as admin on the vehicles view
- **And** A vehicle with license plate `123456` exists
- **When** I submit the vehicle page with license plate `123456`
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

#### Scenario: Un-signed-in user accesses the new vehicle page
- **Given** I am not signed in
- **When** I navigate to `/vehicles/new` by URL
- **Then** I am redirected to `/login`

#### Scenario: Un-signed-in user accesses a vehicle page
- **Given** I am not signed in
- **When** I navigate to `/vehicles/1` by URL
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

#### Scenario: Signed-in user without admin or area admin role accesses the new vehicle page
- **Given** I am signed in
- **And** I do not have roles `admin` or `area admin`
- **When** I navigate to `/vehicles/new` by URL
- **Then** I am redirected to `/home`

#### Scenario: Signed-in user without admin or area admin role accesses a vehicle page
- **Given** I am signed in
- **And** I do not have roles `admin` or `area admin`
- **When** I navigate to `/vehicles/1` by URL
- **Then** I am redirected to `/home`

#### Scenario: Area admin user accesses a vehicle outside their areas
- **Given** I am signed in as area admin for area id `1`
- **And** A vehicle with id `2` belongs to area id `2`
- **When** I navigate to `/vehicles/2` by URL
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

### US-5.6: Areas with vehicles cannot be deleted

#### Scenario: Admin user tries to delete an area with a vehicle

- **Given** I am signed in as admin on the areas view
- **And** An area with id `1` exists
- **And** A vehicle with area id `1` exists
- **When** I submit the delete dialog for area with id `1`
- **Then** validation blocks the request and I see a `Area has vehicles. Delete vehicles or reassign them to a different area first.` message

#### Scenario: Signed-in user API request to delete an area that has a vehicle
- **Given** I am signed in as admin
- **And** An area with id `1` exists
- **And** A vehicle with area id `1` exists
- **When** I request `DELETE /api/areas/1`
- **Then** the API returns `400` with `{ message: "Area has vehicles. Delete vehicles or reassign them to a different area first." }`

---

### US-5.7: Vehicle types with vehicles cannot be deleted

#### Scenario: Admin user tries to delete a vehicle type with a vehicle

- **Given** I am signed in as admin on the vehicle types view
- **And** A vehicle type with id `1` exists
- **And** A vehicle with vehicle type id `1` exists
- **When** I submit the delete dialog for vehicle type with id `1`
- **Then** validation blocks the request and I see a `Vehicle type has vehicles. Delete vehicles or reassign them to a different vehicle type first.` message

#### Scenario: Signed-in user API request to delete a vehicle type that has a vehicle
- **Given** I am signed in as admin
- **And** A vehicle type with id `1` exists
- **And** A vehicle with vehicle type id `1` exists
- **When** I request `DELETE /api/vehicle-types/1`
- **Then** the API returns `400` with `{ message: "Vehicle type has vehicles. Delete vehicles or reassign them to a different vehicle type first." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-5.1 | Admin user creates a vehicle | `frontend/tests/Vehicles.test.js` | `Admin user creates a vehicle` |
| US-5.1 | Area admin user creates a vehicle | `frontend/tests/Vehicles.test.js` | `Area admin user creates a vehicle` |
| US-5.1 | Admin user saves vehicle | `backend/tests/vehicles.test.js` | `Admin user saves vehicle` |
| US-5.1 | Admin user saves vehicle | `frontend/tests/VehicleForm.test.js` | `Admin user saves vehicle` |
| US-5.1 | Admin user selects vehicle type to be one with a serial number on create | `frontend/tests/VehicleForm.test.js` | `Admin user selects vehicle type to be one with a serial number on create` |
| US-5.1 | Admin user creates vehicle with missing area | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing area` |
| US-5.1 | Admin user creates vehicle with missing vehicle type | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing vehicle type` |
| US-5.1 | Admin user creates vehicle with missing university id | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing university id` |
| US-5.1 | Admin user creates vehicle with missing identifier | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing identifier` |
| US-5.1 | Admin user creates vehicle with missing make | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing make` |
| US-5.1 | Admin user creates vehicle with missing model | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing model` |
| US-5.1 | Admin user creates vehicle with missing year | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing year` |
| US-5.1 | Admin user creates vehicle with missing purchase date | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing purchase date` |
| US-5.1 | Admin user creates vehicle with missing color | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing color` |
| US-5.1 | Admin user creates vehicle with missing passenger capacity | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing passenger capacity` |
| US-5.1 | Admin user creates vehicle with missing status | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with missing status` |
| US-5.1 | Admin user requests to create a vehicle with a missing area id | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing area id` |
| US-5.1 | Admin user requests to create a vehicle with a missing vehicle type id | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing vehicle type id` |
| US-5.1 | Admin user requests to create a vehicle with a missing make | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing make` |
| US-5.1 | Admin user requests to create a vehicle with a missing model | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing model` |
| US-5.1 | Admin user requests to create a vehicle with a missing year | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing year` |
| US-5.1 | Admin user requests to create a vehicle with a missing identifier | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing identifier` |
| US-5.1 | Admin user requests to create a vehicle with a missing purchase date | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing purchase date` |
| US-5.1 | Admin user requests to create a vehicle with a missing color | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing color` |
| US-5.1 | Admin user requests to create a vehicle with a missing passenger capacity | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing passenger capacity` |
| US-5.1 | Admin user requests to create a vehicle with a missing status | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a missing status` |
| US-5.1 | Admin user creates vehicle with a whitespace only university id | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with a whitespace only university id` |
| US-5.1 | Admin user creates vehicle with a whitespace only make | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with a whitespace only make` |
| US-5.1 | Admin user creates vehicle with a whitespace only model | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with a whitespace only model` |
| US-5.1 | Admin user creates vehicle with a whitespace only identifier | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with a whitespace only identifier` |
| US-5.1 | Admin user creates vehicle with a whitespace only color | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with a whitespace only color` |
| US-5.1 | Admin user creates vehicle with a whitespace only license plate | `backend/tests/vehicles.test.js` | `Admin user creates vehicle with a whitespace only license plate` |
| US-5.1 | Admin user creates vehicle with a whitespace only license plate | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with a whitespace only license plate` |
| US-5.1 | Admin user requests to create a vehicle with a whitespace-only university id | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a whitespace-only university id` |
| US-5.1 | Admin user requests to create a vehicle with a whitespace-only make | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a whitespace-only make` |
| US-5.1 | Admin user requests to create a vehicle with a whitespace-only model | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a whitespace-only model` |
| US-5.1 | Admin user requests to create a vehicle with a whitespace-only identifier | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a whitespace-only identifier` |
| US-5.1 | Admin user requests to create a vehicle with a whitespace-only color | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a whitespace-only color` |
| US-5.1 | Admin user requests to create a vehicle with a whitespace-only license plate | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a whitespace-only license plate` |
| US-5.1 | Admin user requests to create a vehicle with an area_id that does not correspond to an existing area_id | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with an area_id that does not correspond to an existing area_id` |
| US-5.1 | Admin user requests to create a vehicle with a vehicle_type_id that does not correspond to an existing vehicle_type_id | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a vehicle_type_id that does not correspond to an existing vehicle_type_id` |
| US-5.1 | Admin user requests to create a vehicle with a status other than active or retired | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a status other than active or retired` |
| US-5.1 | Admin user requests to create a vehicle with a non-integer value for year | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a non-integer value for year` |
| US-5.1 | Admin user requests to create a vehicle with a non-integer value for passenger capacity | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a non-integer value for passenger capacity` |
| US-5.1 | Admin user requests to create a vehicle with a non-date value for purchase date | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a non-date value for purchase date` |
| US-5.1 | Admin user requests to create a vehicle with a non-date value for license plate expiration date | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a non-date value for license plate expiration date` |
| US-5.1 | Admin user requests to create a vehicle with a bad date format for purchase date | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a bad date format for purchase date` |
| US-5.1 | Admin user requests to create a vehicle with a bad date format for license plate expiration date | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a bad date format for license plate expiration date` |
| US-5.1 | Admin user creates vehicle with university id longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with university id longer than 255 characters` |
| US-5.1 | Admin user creates vehicle with make longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with make longer than 255 characters` |
| US-5.1 | Admin user creates vehicle with model longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with model longer than 255 characters` |
| US-5.1 | Admin user creates vehicle with serial identifier longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with serial identifier longer than 255 characters` |
| US-5.1 | Admin user creates vehicle with VIN identifier less than 17 characters | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with VIN identifier less than 17 characters` |
| US-5.1 | Admin user creates vehicle with VIN identifier more than 17 characters | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with VIN identifier more than 17 characters` |
| US-5.1 | Admin user creates vehicle with color longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with color longer than 255 characters` |
| US-5.1 | Admin user creates vehicle with license plate longer than 8 characters | `frontend/tests/VehicleForm.test.js` | `Admin user creates vehicle with license plate longer than 8 characters` |
| US-5.1 | Admin user requests to create a vehicle with university id longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with university id longer than 255 characters` |
| US-5.1 | Admin user requests to create a vehicle with make longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with make longer than 255 characters` |
| US-5.1 | Admin user requests to create a vehicle with model longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with model longer than 255 characters` |
| US-5.1 | Admin user requests to create a vehicle with serial identifier longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with serial identifier longer than 255 characters` |
| US-5.1 | Admin user requests to create a vehicle with VIN identifier less than 17 characters | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with VIN identifier less than 17 characters` |
| US-5.1 | Admin user requests to create a vehicle with VIN identifier more than 17 characters | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with VIN identifier more than 17 characters` |
| US-5.1 | Admin user requests to create a vehicle with color longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with color longer than 255 characters` |
| US-5.1 | Admin user requests to create a vehicle with license plate longer than 8 characters | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with license plate longer than 8 characters` |
| US-5.1 | Admin user creates a vehicle with a non-unique university id | `frontend/tests/VehicleForm.test.js` | `Admin user creates a vehicle with a non-unique university id` |
| US-5.1 | Admin user creates a vehicle with a non-unique identifier | `frontend/tests/VehicleForm.test.js` | `Admin user creates a vehicle with a non-unique identifier` |
| US-5.1 | Admin user creates a vehicle with a non-unique license plate | `frontend/tests/VehicleForm.test.js` | `Admin user creates a vehicle with a non-unique license plate` |
| US-5.1 | Admin user requests to create a vehicle with a non-unique university id | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a non-unique university id` |
| US-5.1 | Admin user requests to create a vehicle with a non-unique identifier | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a non-unique identifier` |
| US-5.1 | Admin user requests to create a vehicle with a non-unique license plate | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a non-unique license plate` |
| US-5.1 | Admin user requests to create a vehicle with a year before 1950 | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a year before 1950` |
| US-5.1 | Admin user requests to create a vehicle with a year after the current year + 1 | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a year after the current year + 1` |
| US-5.1 | Admin user requests to create a vehicle with a passenger capacity less than 1 | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a passenger capacity less than 1` |
| US-5.1 | Admin user requests to create a vehicle with a passenger capacity greater than 300 | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a passenger capacity greater than 300` |
| US-5.1 | Admin user requests to create a vehicle with a purchase date before 1950 | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a purchase date before 1950` |
| US-5.1 | Admin user requests to create a vehicle with a purchase date after the current date | `backend/tests/vehicles.test.js` | `Admin user requests to create a vehicle with a purchase date after the current date` |
| US-5.2 | Vehicles view lists vehicles for admin | `frontend/tests/Vehicles.test.js` | `Vehicles view lists vehicles for admin` |
| US-5.2 | Vehicles view lists vehicles for area admin | `frontend/tests/Vehicles.test.js` | `Vehicles view lists vehicles for area admin` |
| US-5.2 | Vehicles empty state | `frontend/tests/Vehicles.test.js` | `Vehicles empty state` |
| US-5.3 | Vehicle rows have view and delete actions | `frontend/tests/Vehicles.test.js` | `Vehicle rows have view and delete actions` |
| US-5.3 | Vehicle rows with green chip | `frontend/tests/Vehicles.test.js` | `Vehicle rows with green chip` |
| US-5.3 | Vehicle rows with yellow chip | `frontend/tests/Vehicles.test.js` | `Vehicle rows with yellow chip` |
| US-5.3 | Vehicle rows with red chip | `frontend/tests/Vehicles.test.js` | `Vehicle rows with red chip` |
| US-5.4 | Admin user opens the vehicle page | `frontend/tests/Vehicles.test.js` | `Admin user opens the vehicle page` |
| US-5.4 | Area admin user opens the vehicle page | `frontend/tests/Vehicles.test.js` | `Area admin user opens the vehicle page` |
| US-5.4 | Admin user edits a vehicle area | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle area` |
| US-5.4 | Admin user edits a vehicle area | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle area` |
| US-5.4 | Admin user edits a vehicle type with identifier of 17 characters | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle type with identifier of 17 characters` |
| US-5.4 | Admin user edits a vehicle type with identifier of 17 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle type with identifier of 17 characters` |
| US-5.4 | Admin user edits a vehicle type with identifier other than 17 characters while current vehicle type has identifier Serial | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle type with identifier other than 17 characters while current vehicle type has identifier Serial` |
| US-5.4 | Admin user selects vehicle type to be one with a VIN number | `frontend/tests/VehicleForm.test.js` | `Admin user selects vehicle type to be one with a VIN number` |
| US-5.4 | Admin user selects vehicle type to be one with a serial number on edit | `frontend/tests/VehicleForm.test.js` | `Admin user selects vehicle type to be one with a serial number on edit` |
| US-5.4 | Admin user edits a vehicle university id | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle university id` |
| US-5.4 | Admin user edits a vehicle university id | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle university id` |
| US-5.4 | Admin user edits a vehicle make | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle make` |
| US-5.4 | Admin user edits a vehicle make | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle make` |
| US-5.4 | Admin user edits a vehicle model | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle model` |
| US-5.4 | Admin user edits a vehicle model | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle model` |
| US-5.4 | Admin user edits a vehicle year | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle year` |
| US-5.4 | Admin user edits a vehicle year | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle year` |
| US-5.4 | Admin user edits a vehicle identifier | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle identifier` |
| US-5.4 | Admin user edits a vehicle identifier | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle identifier` |
| US-5.4 | Admin user edits a vehicle purchase date | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle purchase date` |
| US-5.4 | Admin user edits a vehicle purchase date | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle purchase date` |
| US-5.4 | Admin user edits a vehicle color | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle color` |
| US-5.4 | Admin user edits a vehicle color | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle color` |
| US-5.4 | Admin user edits a vehicle passenger capacity | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle passenger capacity` |
| US-5.4 | Admin user edits a vehicle passenger capacity | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle passenger capacity` |
| US-5.4 | Admin user edits a vehicle license plate | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle license plate` |
| US-5.4 | Admin user edits a vehicle license plate | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle license plate` |
| US-5.4 | Admin user edits a vehicle license plate expiration date | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle license plate expiration date` |
| US-5.4 | Admin user edits a vehicle license plate expiration date | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle license plate expiration date` |
| US-5.4 | Admin user edits a vehicle status | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle status` |
| US-5.4 | Admin user edits a vehicle status | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle status` |
| US-5.4 | Admin user edits a vehicle to have a missing area | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing area` |
| US-5.4 | Admin user edits a vehicle to have a missing vehicle type | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing vehicle type` |
| US-5.4 | Admin user edits a vehicle to have a missing university id | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing university id` |
| US-5.4 | Admin user edits a vehicle to have a missing identifier | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing identifier` |
| US-5.4 | Admin user edits a vehicle to have a missing make | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing make` |
| US-5.4 | Admin user edits a vehicle to have a missing model | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing model` |
| US-5.4 | Admin user edits a vehicle to have a missing year | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing year` |
| US-5.4 | Admin user edits a vehicle to have a missing purchase date | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing purchase date` |
| US-5.4 | Admin user edits a vehicle to have a missing color | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing color` |
| US-5.4 | Admin user edits a vehicle to have a missing passenger capacity | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing passenger capacity` |
| US-5.4 | Admin user edits a vehicle to have a missing status | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a missing status` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing area id | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing area id` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing vehicle type id | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing vehicle type id` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing make | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing make` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing model | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing model` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing year | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing year` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing identifier | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing identifier` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing purchase date | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing purchase date` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing color | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing color` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing passenger capacity | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing passenger capacity` |
| US-5.4 | Admin user requests to edit a vehicle to have a missing status | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a missing status` |
| US-5.4 | Admin user edits a vehicle to have a whitespace only university id | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a whitespace only university id` |
| US-5.4 | Admin user edits a vehicle to have a whitespace only make | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a whitespace only make` |
| US-5.4 | Admin user edits a vehicle to have a whitespace only model | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a whitespace only model` |
| US-5.4 | Admin user edits a vehicle to have a whitespace only identifier | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a whitespace only identifier` |
| US-5.4 | Admin user edits a vehicle to have a whitespace only color | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a whitespace only color` |
| US-5.4 | Admin user edits a vehicle to have a whitespace only license plate | `backend/tests/vehicles.test.js` | `Admin user edits a vehicle to have a whitespace only license plate` |
| US-5.4 | Admin user edits a vehicle to have a whitespace only license plate | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a whitespace only license plate` |
| US-5.4 | Admin user requests to edit a vehicle to have a whitespace-only university id | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a whitespace-only university id` |
| US-5.4 | Admin user requests to edit a vehicle to have a whitespace-only make | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a whitespace-only make` |
| US-5.4 | Admin user requests to edit a vehicle to have a whitespace-only model | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a whitespace-only model` |
| US-5.4 | Admin user requests to edit a vehicle to have a whitespace-only identifier | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a whitespace-only identifier` |
| US-5.4 | Admin user requests to edit a vehicle to have a whitespace-only color | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a whitespace-only color` |
| US-5.4 | Admin user requests to edit a vehicle to have a whitespace-only license plate | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a whitespace-only license plate` |
| US-5.4 | Admin user requests to edit a vehicle to have an area_id that does not correspond to an existing area_id | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have an area_id that does not correspond to an existing area_id` |
| US-5.4 | Admin user requests to edit a vehicle to have a vehicle_type_id that does not correspond to an existing vehicle_type_id | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a vehicle_type_id that does not correspond to an existing vehicle_type_id` |
| US-5.4 | Admin user requests to edit a vehicle to have a status other than active or retired | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a status other than active or retired` |
| US-5.4 | Admin user requests to edit a vehicle to have a non-integer value for year | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a non-integer value for year` |
| US-5.4 | Admin user requests to edit a vehicle to have a non-integer value for passenger capacity | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a non-integer value for passenger capacity` |
| US-5.4 | Admin user requests to edit a vehicle to have a non-date value for purchase date | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a non-date value for purchase date` |
| US-5.4 | Admin user requests to edit a vehicle to have a non-date value for license plate expiration date | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a non-date value for license plate expiration date` |
| US-5.4 | Admin user requests to edit a vehicle to have a bad date format for purchase date | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a bad date format for purchase date` |
| US-5.4 | Admin user requests to edit a vehicle to have a bad date format for license plate expiration date | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a bad date format for license plate expiration date` |
| US-5.4 | Admin user edits a vehicle to have a university id longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a university id longer than 255 characters` |
| US-5.4 | Admin user edits a vehicle to have a make longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a make longer than 255 characters` |
| US-5.4 | Admin user edits a vehicle to have a model longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a model longer than 255 characters` |
| US-5.4 | Admin user edits a vehicle to have a serial identifier longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a serial identifier longer than 255 characters` |
| US-5.4 | Admin user edits a vehicle to have a VIN identifier less than 17 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a VIN identifier less than 17 characters` |
| US-5.4 | Admin user edits a vehicle to have a VIN identifier more than 17 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a VIN identifier more than 17 characters` |
| US-5.4 | Admin user edits a vehicle to have a color longer than 255 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a color longer than 255 characters` |
| US-5.4 | Admin user edits a vehicle to have a license plate longer than 8 characters | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a license plate longer than 8 characters` |
| US-5.4 | Admin user requests to edit a vehicle to have a university id longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a university id longer than 255 characters` |
| US-5.4 | Admin user requests to edit a vehicle to have a make longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a make longer than 255 characters` |
| US-5.4 | Admin user requests to edit a vehicle to have a model longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a model longer than 255 characters` |
| US-5.4 | Admin user requests to edit a vehicle to have a serial identifier longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a serial identifier longer than 255 characters` |
| US-5.4 | Admin user requests to edit a vehicle to have a VIN identifier less than 17 characters | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a VIN identifier less than 17 characters` |
| US-5.4 | Admin user requests to edit a vehicle to have a VIN identifier more than 17 characters | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a VIN identifier more than 17 characters` |
| US-5.4 | Admin user requests to edit a vehicle to have a color longer than 255 characters | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a color longer than 255 characters` |
| US-5.4 | Admin user requests to edit a vehicle to have a license plate longer than 8 characters | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a license plate longer than 8 characters` |
| US-5.4 | Admin user edits a vehicle to have a non-unique university id | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a non-unique university id` |
| US-5.4 | Admin user edits a vehicle to have a non-unique identifier | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a non-unique identifier` |
| US-5.4 | Admin user edits a vehicle to have a non-unique license plate | `frontend/tests/VehicleForm.test.js` | `Admin user edits a vehicle to have a non-unique license plate` |
| US-5.4 | Admin user requests to edit a vehicle to have a non-unique university id | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a non-unique university id` |
| US-5.4 | Admin user requests to edit a vehicle to have a non-unique identifier | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a non-unique identifier` |
| US-5.4 | Admin user requests to edit a vehicle to have a non-unique license plate | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a non-unique license plate` |
| US-5.4 | Admin user requests to edit a vehicle to have a year before 1950 | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a year before 1950` |
| US-5.4 | Admin user requests to edit a vehicle to have a year after the current year + 1 | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a year after the current year + 1` |
| US-5.4 | Admin user requests to edit a vehicle to have a passenger capacity less than 1 | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a passenger capacity less than 1` |
| US-5.4 | Admin user requests to edit a vehicle to have a passenger capacity greater than 300 | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a passenger capacity greater than 300` |
| US-5.4 | Admin user requests to edit a vehicle to have a purchase date before 1950 | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a purchase date before 1950` |
| US-5.4 | Admin user requests to edit a vehicle to have a purchase date after the current date | `backend/tests/vehicles.test.js` | `Admin user requests to edit a vehicle to have a purchase date after the current date` |
| US-5.4 | Admin user deletes a vehicle | `backend/tests/vehicles.test.js` | `Admin user deletes a vehicle` |
| US-5.4 | Admin user deletes a vehicle | `frontend/tests/Vehicles.test.js` | `Admin user deletes a vehicle` |
| US-5.4 | Admin user updates a vehicle that does not exist | `backend/tests/vehicles.test.js` | `Admin user updates a vehicle that does not exist` |
| US-5.4 | Admin user updates a vehicle with an invalid vehicleId | `backend/tests/vehicles.test.js` | `Admin user updates a vehicle with an invalid vehicleId` |
| US-5.4 | Admin user deletes a vehicle that does not exist | `backend/tests/vehicles.test.js` | `Admin user deletes a vehicle that does not exist` |
| US-5.4 | Admin user deletes a vehicle with an invalid vehicleId | `backend/tests/vehicles.test.js` | `Admin user deletes a vehicle with an invalid vehicleId` |
| US-5.5 | Un-signed-in user accesses vehicles page | `frontend/tests/Vehicles.test.js` | `Un-signed-in user accesses vehicles page` |
| US-5.5 | Un-signed-in user accesses the new vehicle page | `frontend/tests/Vehicles.test.js` | `Un-signed-in user accesses the new vehicle page` |
| US-5.5 | Un-signed-in user accesses a vehicle page | `frontend/tests/Vehicles.test.js` | `Un-signed-in user accesses a vehicle page` |
| US-5.5 | Unauthenticated API request to vehicles | `backend/tests/vehicles.test.js` | `Unauthenticated API request to vehicles` |
| US-5.5 | Unauthenticated API request to a particular vehicle | `backend/tests/vehicles.test.js` | `Unauthenticated API request to a particular vehicle` |
| US-5.5 | Unauthenticated API request to create a vehicle | `backend/tests/vehicles.test.js` | `Unauthenticated API request to create a vehicle` |
| US-5.5 | Unauthenticated API request to update a vehicle | `backend/tests/vehicles.test.js` | `Unauthenticated API request to update a vehicle` |
| US-5.5 | Unauthenticated API request to delete a vehicle | `backend/tests/vehicles.test.js` | `Unauthenticated API request to delete a vehicle` |
| US-5.5 | Signed-in user without admin or area admin role accesses vehicles page | `frontend/tests/Vehicles.test.js` | `Signed-in user without admin or area admin role accesses vehicles page` |
| US-5.5 | Signed-in user without admin or area admin role accesses the new vehicle page | `frontend/tests/Vehicles.test.js` | `Signed-in user without admin or area admin role accesses the new vehicle page` |
| US-5.5 | Signed-in user without admin or area admin role accesses a vehicle page | `frontend/tests/Vehicles.test.js` | `Signed-in user without admin or area admin role accesses a vehicle page` |
| US-5.5 | Area admin user accesses a vehicle outside their areas | `frontend/tests/Vehicles.test.js` | `Area admin user accesses a vehicle outside their areas` |
| US-5.5 | Signed-in user without admin or area admin role API request to vehicles | `backend/tests/vehicles.test.js` | `Signed-in user without admin or area admin role API request to vehicles` |
| US-5.5 | Signed-in user without admin or area admin role API request to a particular vehicle | `backend/tests/vehicles.test.js` | `Signed-in user without admin or area admin role API request to a particular vehicle` |
| US-5.5 | Signed-in user without admin or area admin role API request to create a vehicle | `backend/tests/vehicles.test.js` | `Signed-in user without admin or area admin role API request to create a vehicle` |
| US-5.5 | Signed-in user without admin or area admin role API request to update a vehicle | `backend/tests/vehicles.test.js` | `Signed-in user without admin or area admin role API request to update a vehicle` |
| US-5.5 | Signed-in user without admin or area admin role API request to delete a vehicle | `backend/tests/vehicles.test.js` | `Signed-in user without admin or area admin role API request to delete a vehicle` |
| US-5.5 | Signed-in user with area admin role API request to a particular vehicle of different area | `backend/tests/vehicles.test.js` | `Signed-in user with area admin role API request to a particular vehicle of different area` |
| US-5.5 | Signed-in user with area admin role API request to create a vehicle in a different area | `backend/tests/vehicles.test.js` | `Signed-in user with area admin role API request to create a vehicle in a different area` |
| US-5.5 | Signed-in user with area admin role API request to update a vehicle to have a different area | `backend/tests/vehicles.test.js` | `Signed-in user with area admin role API request to update a vehicle to have a different area` |
| US-5.5 | Signed-in user with area admin role API request to update a vehicle with a different area | `backend/tests/vehicles.test.js` | `Signed-in user with area admin role API request to update a vehicle with a different area` |
| US-5.5 | Signed-in user with area admin role API request to delete a vehicle of a different area | `backend/tests/vehicles.test.js` | `Signed-in user with area admin role API request to delete a vehicle of a different area` |
| US-5.6 | Admin user tries to delete an area with a vehicle | `frontend/tests/Areas.test.js` | `Admin user tries to delete an area with a vehicle` |
| US-5.6 | Signed-in user API request to delete an area that has a vehicle | `backend/tests/areas.test.js` | `Signed-in user API request to delete an area that has a vehicle` |
| US-5.7 | Admin user tries to delete a vehicle type with a vehicle | `frontend/tests/VehicleTypes.test.js` | `Admin user tries to delete a vehicle type with a vehicle` |
| US-5.7 | Signed-in user API request to delete a vehicle type that has a vehicle | `backend/tests/vehicleTypes.test.js` | `Signed-in user API request to delete a vehicle type that has a vehicle` |

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 5 from @features/feature-5-vehicles.md on branch `feature/5-vehicles`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-001**–**FR-027** satisfied)
- [x] **Success Criteria (SC-001**–**SC-004)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Additional checks for chip colors on vehicle rows for changing chip color for other maintenance needs

---

## Delivered to later features

- A vehicle row with an area_id, vehicle_type_id, university_id, make, model, year, identifier, purchased_at, color, passenger_capacity, license_plate, license_plate_expiration_date, and status
- `GET /api/vehicles` returns every vehicle for any valid session with `admin` role
- `GET /api/vehicles` returns every vehicle with a matching area_id for any valid session with `area admin` role
- Deletes on areas and vehicle types are now conditional
 