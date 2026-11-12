# Feature: Vehicle Type Instructions

**Feature ID:** 15
**Branch pattern:** `feature/15-vehicle-type-instructions`
**Status:** Draft
**Created:** 2026-11-09
**Input:** Signed-in admin and area admin users manage vehicle type instructions. An instruction stores the message for a vehicle type: designated parking, where to get the keys, what to do on return (fill with gas, clean up, where to put the keys), and who to contact if there is an issue. An admin supplies the default. An area can override that default. Instructions are added and edited with a dialog. A different spec sends this message in an email.
**Depends on:** Feature 2 [Areas], Feature 3 [Roles], Feature 4 [Vehicle Types]

---

## User Stories

### US-15.1: Create vehicle type instructions

**As a** signed-in admin or area admin user
**I want to** create an instruction with a vehicle type and the instruction message
**So that** users driving vehicles have all the information for returning and maintaining a vehicle

**Priority:** P1
**Independent test:** Open the create instruction dialog, create an instruction; it appears in the vehicle instructions view
**Acceptance scenarios:** see ### US-15.1 under Acceptance Criteria

### US-15.2: View vehicle type instructions

**As a** signed-in admin or area admin user
**I want to** see the vehicle type instructions I am allowed to manage
**So that** I can see the default instruction and each area's override

**Priority:** P1
**Independent test:** Vehicle instructions view loads the instructions that user is allowed to see
**Acceptance scenarios:** see ### US-15.2 under Acceptance Criteria

### US-15.3: Manage vehicle type instruction rows

**As a** signed-in admin or area admin user
**I want** each vehicle type instruction row to have **edit** and **delete** actions
**So that** I can manage vehicle type instructions from the vehicle instructions view

**Priority:** P1
**Independent test:** Each vehicle type instruction row exposes edit and delete icon actions
**Acceptance scenarios:** see ### US-15.3 under Acceptance Criteria

### US-15.4: Edit and delete vehicle type instructions

**As a** signed-in admin or area admin user
**I want to** edit or delete a vehicle type instruction
**So that** I can keep the instruction message up to date and remove ones that should not be kept

**Priority:** P2
**Independent test:** Edit and delete vehicle type instructions from row actions; the vehicle instructions view updates
**Acceptance scenarios:** see ### US-15.4 under Acceptance Criteria

### US-15.5: Signed-in admin or area admin access only

**As a** signed-in admin or area admin user
**I want** vehicle type instructions visible only to signed-in admin or area admin users
**So that** unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/vehicle-type-instructions` is redirected to `/login`; unauthorized API requests or requests without `admin` or `area_admin` role receive errors; a signed-in user without `admin` or `area_admin` role is redirected to `/home`; an area admin receives only instructions for areas they administer
**Acceptance scenarios:** see ### US-15.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All vehicle type instruction endpoints MUST require a valid session and `admin` or `area_admin` role (`authorizeRoles('admin', 'area_admin')` middleware).
- **FR-002**: A vehicle type instruction MUST store `vehicleTypeId`, `areaId`, and `content`. `id` is assigned by the database.
- **FR-003**: `vehicleTypeId` MUST be an existing vehicle type. A missing vehicle type MUST be rejected.
- **FR-004**: `areaId` empty means the default instruction for that vehicle type. An admin MAY save a default. An area admin MUST set `areaId` to an area they administer. An area admin MUST NOT save a default.
- **FR-005**: `content` is the instruction message. It MUST be trimmed before save. An empty or whitespace-only message MUST be rejected.
- **FR-006**: One instruction is allowed for a vehicle type and an area. One default is allowed for a vehicle type. A second row with the same `vehicleTypeId` and the same `areaId` (including a second default) MUST be rejected.
- **FR-007**: An admin MAY read and write every instruction. An area admin MAY read and write only instructions whose `areaId` is an area they administer.

---

## Assumptions

- Vehicle type instructions use **dialog-based** workflows (no split sidebar / main panel).
- Feature 1 sessions and Feature 3 roles are already available. This feature only checks `admin` and `area_admin`.
- This feature stores the template. A different spec reads these rows and sends the email. This feature does not send email and does not name the vehicle for a trip.
- The instruction message is one text field. It holds designated parking, where to get the keys, what to do on return (fill with gas, clean up, where to put the keys), and who to contact if there is an issue.
- An empty `areaId` is the default supplied by an admin. A set `areaId` is that area overriding the default for the same vehicle type.
- `id` is assigned by the database. The user does not type it.
- Delete removes the instruction row. No other table references it yet, so this feature does not block a delete.

## Edge Cases

- Empty or whitespace-only instruction message → client block and/or `400`.
- Missing vehicle type → client block and/or `400`.
- Vehicle type id that does not exist → `404`.
- Area id that does not exist → `404`.
- Area admin leaves area empty → client block and/or `400`.
- Area admin saves a default, or an area they do not administer → `403`.
- A second default for the same vehicle type, or a second override for the same vehicle type and area → `400`.
- Unauthenticated vehicle type instructions screen → redirect to `/login`.
- Authenticated vehicle type instructions screen without `admin` or `area_admin` role → redirect to `/home`.
- Unauthenticated API request → `401`.
- API request without `admin` or `area_admin` role → `403`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: A signed-in admin can create, view, edit, and delete default and area instructions on one screen.
- **SC-003**: A signed-in area admin can create, view, edit, and delete instructions for areas they administer on that same screen.
- **SC-004**: `npm test` passes for vehicle type instructions API and vehicle type instructions view behavior.

---

## Data Ownership & Isolation

An admin may create, edit, delete, or read every vehicle type instruction, including defaults. An area admin may create, edit, delete, or read only instructions for areas they administer.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/vehicle-type-instructions` returns every instruction for an admin. It returns only instructions in an area admin's areas. `GET /api/vehicle-type-instructions/:vehicleTypeInstructionId` follows the same rule. |
| **Write scope** | `PUT` and `DELETE` require an admin, or an area admin for an instruction in an area they administer. An area admin cannot change a row into a default. |
| **Create scope** | `POST` requires an admin, or an area admin. An admin may omit `areaId` to save the default. An area admin must send an `areaId` they administer. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/vehicle-type-instructions` | Yes — admin or area admin | Admin: fetch every instruction. Area admin: fetch instructions for areas they administer. |
| `GET` | `/api/vehicle-type-instructions/:vehicleTypeInstructionId` | Yes — admin, or area admin for that area | Fetch a single instruction |
| `POST` | `/api/vehicle-type-instructions` | Yes — admin or area admin | Create an instruction |
| `PUT` | `/api/vehicle-type-instructions/:vehicleTypeInstructionId` | Yes — admin, or area admin for that area | Edit an instruction |
| `DELETE` | `/api/vehicle-type-instructions/:vehicleTypeInstructionId` | Yes — admin, or area admin for that area | Delete an instruction |

**Create vehicle type instruction request body:**

```json
{
  "vehicleTypeId": 1,
  "areaId": null,
  "content": "Park in the designated lot. Keys are in the office. On return, fill with gas, clean up, and put the keys back. Contact the area office if there is an issue."
}
```

`areaId` may be omitted or `null` for a default. `PUT` uses the same body.

**Vehicle type instruction success response** (`200` / `201`):

```json
{
  "id": 1,
  "vehicleTypeId": 1,
  "areaId": null,
  "content": "Park in the designated lot. Keys are in the office. On return, fill with gas, clean up, and put the keys back. Contact the area office if there is an issue.",
  "vehicleType": { "id": 1, "name": "Van" },
  "area": null,
  "createdAt": "2026-11-09T12:00:00.000Z",
  "updatedAt": "2026-11-09T12:00:00.000Z"
}
```

When `areaId` is set, `area` is `{ "id", "name" }`.

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404` for a missing instruction, vehicle type, or area.
**Unauthenticated:** `401` `{ "message": "Unauthorized! No token provided." }`.
**Unauthorized** (lacking `admin` or `area_admin` role): `403` `{ "message": "Admin or area admin role required." }`.
**Forbidden** (area admin outside their areas, or saving a default): `403` `{ "message": "Forbidden." }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| Missing `vehicleTypeId` | `400` | `{ "message": "Missing vehicle type." }` |
| `vehicleTypeId` is not an integer | `400` | `{ "message": "Invalid vehicle type id." }` |
| Vehicle type id does not exist | `404` | `{ "message": "Vehicle type not found." }` |
| Area admin omits `areaId` | `400` | `{ "message": "Missing area." }` |
| `areaId` is not an integer | `400` | `{ "message": "Invalid area id." }` |
| Area id does not exist | `404` | `{ "message": "Area not found." }` |
| Missing or whitespace-only `content` | `400` | `{ "message": "Missing instruction message." }` |
| Same vehicle type and area already has an instruction | `400` | `{ "message": "An instruction for this vehicle type and area already exists." }` |
| `:vehicleTypeInstructionId` is not an integer | `400` | `{ "message": "Invalid vehicle type instruction id." }` |
| Instruction id does not exist | `404` | `{ "message": "Vehicle type instruction with id=… not found." }` |
| Delete succeeds | `200` | `{ "message": "Vehicle type instruction deleted successfully." }` |

---

## Screen Requirements

### [View: Vehicle Type Instructions] — route name `vehicle-type-instructions`

**Single Vue view** (`VehicleTypeInstructions.vue`) — no sidebar / main-panel split.

- Heading: **Vehicle Type Instructions**
- An admin sees every instruction. An area admin sees instructions for areas they administer.
- Primary action: **+ New Instruction** opens a `<v-dialog>` with **Vehicle type**, **Area**, and **Instruction message**, plus **Create** / **Cancel**.
  - **Vehicle type** is a `<v-select>` of existing vehicle types, labeled by name.
  - **Area** is an optional `<v-select>` for an admin. Empty saves the default. An area admin must choose an area they administer.
  - **Instruction message** is a `<v-textarea>`.
- Display instructions as rows. Each row shows the vehicle type name, **Default** when `areaId` is null or the area name when it is set, and the instruction message.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current vehicle type, area, and instruction message; **Save** / **Cancel**.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit vehicle type instruction**, **Delete vehicle type instruction**).
- **Empty state:** **"No vehicle type instructions yet. Create your first vehicle type instruction."** when there are no instructions.
- **Loading state:** skeleton or progress indicator while instructions are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for vehicle type instructions; delete dialog is a reusable component in `components/common` folder; create and edit dialogs should be components stored in a dedicated `components/vehicleTypeInstructions` folder and modeled after existing create and edit dialogs in `components/` folders.

---

## Key Entities

- **VehicleTypeInstruction**: The template message for a vehicle type. No area means the default. An area means that area's override of the default. The message tells a driver about parking, keys, returning the vehicle, and who to contact.

---

## Data Model Requirements

### `vehicle_type_instructions` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `vehicle_type_id` | INTEGER FK | Required. Existing vehicle type. Unique together with `area_id`. |
| `area_id` | INTEGER FK | Optional. Null is the default for that vehicle type. Set is that area's override. |
| `content` | TEXT | Required. Trimmed instruction message. |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

JSON keys are `vehicleTypeId`, `areaId`, and `content`.

### Associations (in `models/index.js`)

- A vehicle type has many vehicle type instructions. An instruction belongs to one vehicle type.
- An area has many vehicle type instructions. An instruction optionally belongs to one area.

---

## Acceptance Criteria (Gherkin)

### US-15.1 — Create vehicle type instructions

#### Scenario: Admin user creates a vehicle type instruction

- **Given** I am signed in as admin on the vehicle type instructions view
- **When** I click **+ New Instruction**
- **Then** a dialog opens with **Vehicle type**, **Area**, and **Instruction message**

#### Scenario: Area admin user creates a vehicle type instruction

- **Given** I am signed in as area admin on the vehicle type instructions view
- **When** I click **+ New Instruction**
- **Then** a dialog opens with **Vehicle type**, **Area**, and **Instruction message**

#### Scenario: Admin user saves a default vehicle type instruction

- **Given** I am signed in as admin on the vehicle type instructions view
- **And** a vehicle type with id `1` and name `Van` exists
- **When** I submit the create dialog with that vehicle type, no area, and instruction message `Keys are in the office. On return, fill with gas, clean up, and put the keys back.`
- **Then** the API returns `201` with `areaId` null
- **And** the list shows `Van`, `Default`, and that instruction message

#### Scenario: Area admin user saves an area vehicle type instruction

- **Given** I am signed in as area admin of Athletics on the vehicle type instructions view
- **And** a vehicle type with id `1` and name `Van` exists
- **And** Athletics has id `1`
- **When** I submit the create dialog with that vehicle type, Athletics, and instruction message `Park in the Athletics lot. Keys are in the Athletics office.`
- **Then** the API returns `201` with `areaId` `1`
- **And** the list shows `Van`, `Athletics`, and that instruction message

#### Scenario: Admin user saves an area vehicle type instruction

- **Given** I am signed in as admin on the vehicle type instructions view
- **And** a vehicle type with id `1` and name `Van` exists
- **And** Athletics has id `1`
- **When** I submit the create dialog with that vehicle type, Athletics, and instruction message `Park in the Athletics lot.`
- **Then** the API returns `201` with `areaId` `1`
- **And** the list shows `Van` and `Athletics`

#### Scenario: Admin user creates a vehicle type instruction with a missing vehicle type

- **Given** I am signed in as admin on the vehicle type instructions view
- **When** I submit the create dialog without a vehicle type
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a vehicle type instruction with a missing instruction message

- **Given** I am signed in as admin on the vehicle type instructions view
- **When** I submit the create dialog without an instruction message
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a vehicle type instruction with a whitespace-only instruction message

- **Given** I am signed in as admin on the vehicle type instructions view
- **When** I submit the create dialog with instruction message ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Area admin user creates a vehicle type instruction with a missing area

- **Given** I am signed in as area admin on the vehicle type instructions view
- **And** a vehicle type with id `1` exists
- **When** I submit the create dialog with that vehicle type, no area, and an instruction message
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to create a vehicle type instruction with a missing vehicle type

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-type-instructions` with no `vehicleTypeId` and an instruction message
- **Then** the API returns `400` with `{ message: "Missing vehicle type." }`

#### Scenario: Admin user requests to create a vehicle type instruction with a missing instruction message

- **Given** I am signed in as admin
- **And** a vehicle type with id `1` exists
- **When** I request `POST /api/vehicle-type-instructions` with that vehicle type and no `content`
- **Then** the API returns `400` with `{ message: "Missing instruction message." }`

#### Scenario: Admin user requests to create a vehicle type instruction with a whitespace-only instruction message

- **Given** I am signed in as admin
- **And** a vehicle type with id `1` exists
- **When** I request `POST /api/vehicle-type-instructions` with that vehicle type and `content` ` `
- **Then** the API returns `400` with `{ message: "Missing instruction message." }`

#### Scenario: Admin user requests to create a vehicle type instruction for a vehicle type that does not exist

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-type-instructions` with `vehicleTypeId` `999` and an instruction message
- **Then** the API returns `404` with `{ message: "Vehicle type not found." }`

#### Scenario: Admin user requests to create a vehicle type instruction for an area that does not exist

- **Given** I am signed in as admin
- **And** a vehicle type with id `1` exists
- **When** I request `POST /api/vehicle-type-instructions` with that vehicle type, `areaId` `999`, and an instruction message
- **Then** the API returns `404` with `{ message: "Area not found." }`

#### Scenario: Admin user requests to create a default vehicle type instruction that already exists

- **Given** I am signed in as admin
- **And** a default instruction for vehicle type `1` exists
- **When** I request `POST /api/vehicle-type-instructions` with `vehicleTypeId` `1`, no area, and an instruction message
- **Then** the API returns `400` with `{ message: "An instruction for this vehicle type and area already exists." }`

#### Scenario: Admin user requests to create an area vehicle type instruction that already exists

- **Given** I am signed in as admin
- **And** an instruction for vehicle type `1` and area `1` exists
- **When** I request `POST /api/vehicle-type-instructions` with `vehicleTypeId` `1`, `areaId` `1`, and an instruction message
- **Then** the API returns `400` with `{ message: "An instruction for this vehicle type and area already exists." }`

#### Scenario: Area admin user requests to create a default vehicle type instruction

- **Given** I am signed in as area admin of Athletics
- **And** a vehicle type with id `1` exists
- **When** I request `POST /api/vehicle-type-instructions` with that vehicle type, no area, and an instruction message
- **Then** the API returns `400` with `{ message: "Missing area." }`

#### Scenario: Area admin user requests to create a vehicle type instruction for an area they do not administer

- **Given** I am signed in as area admin of Athletics
- **And** a vehicle type with id `1` exists
- **And** Music has id `2`
- **When** I request `POST /api/vehicle-type-instructions` with that vehicle type, `areaId` `2`, and an instruction message
- **Then** the API returns `403` with `{ message: "Forbidden." }`

### US-15.2 — View vehicle type instructions

#### Scenario: Admin vehicle type instructions view lists every instruction

- **Given** I am signed in as admin on the vehicle type instructions view
- **And** a default instruction for `Van` exists with message `Keys are in the office.`
- **And** an Athletics instruction for `Van` exists with message `Park in the Athletics lot.`
- **When** the vehicle type instructions view loads
- **Then** the list shows `Van`, `Default`, and `Keys are in the office.`
- **And** the list shows `Van`, `Athletics`, and `Park in the Athletics lot.`

#### Scenario: Area admin vehicle type instructions view lists instructions for their areas

- **Given** I am signed in as area admin of Athletics on the vehicle type instructions view
- **And** a default instruction for `Van` exists
- **And** an Athletics instruction for `Van` exists with message `Park in the Athletics lot.`
- **And** a Music instruction for `Van` exists
- **When** the vehicle type instructions view loads
- **Then** the list shows `Van`, `Athletics`, and `Park in the Athletics lot.`
- **And** the list does not show `Default` or `Music`

#### Scenario: Admin vehicle type instructions empty state

- **Given** I am signed in as admin on the vehicle type instructions view
- **And** no vehicle type instructions exist
- **When** the vehicle type instructions view loads
- **Then** I see `No vehicle type instructions yet. Create your first vehicle type instruction.`

### US-15.3 — Manage vehicle type instruction rows

#### Scenario: Admin vehicle type instruction rows have edit and delete actions

- **Given** I am signed in as admin on the vehicle type instructions view
- **And** a vehicle type instruction exists
- **When** the vehicle type instructions view loads
- **Then** that row has an **Edit vehicle type instruction** action and a **Delete vehicle type instruction** action

#### Scenario: Area admin vehicle type instruction rows have edit and delete actions

- **Given** I am signed in as area admin of Athletics on the vehicle type instructions view
- **And** an Athletics vehicle type instruction exists
- **When** the vehicle type instructions view loads
- **Then** that row has an **Edit vehicle type instruction** action and a **Delete vehicle type instruction** action

### US-15.4 — Edit and delete vehicle type instructions

#### Scenario: Admin edits a vehicle type instruction message

- **Given** I am signed in as admin on the vehicle type instructions view
- **And** a default instruction for `Van` exists with message `Keys are in the office.`
- **When** I submit the edit dialog with instruction message `Keys are in the lockbox.`
- **Then** the API returns `200`
- **And** the list shows `Keys are in the lockbox.`

#### Scenario: Area admin edits a vehicle type instruction in their area

- **Given** I am signed in as area admin of Athletics on the vehicle type instructions view
- **And** an Athletics instruction for `Van` exists
- **When** I submit the edit dialog with instruction message `Park in the Athletics lot.`
- **Then** the API returns `200`
- **And** the list shows `Park in the Athletics lot.`

#### Scenario: Admin edits a vehicle type instruction to have a missing instruction message

- **Given** I am signed in as admin on the vehicle type instructions view
- **And** a vehicle type instruction exists
- **When** I submit the edit dialog without an instruction message
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin deletes a vehicle type instruction

- **Given** I am signed in as admin on the vehicle type instructions view
- **And** a vehicle type instruction with id `1` exists
- **When** I confirm delete for that instruction
- **Then** the API returns `200` with `{ message: "Vehicle type instruction deleted successfully." }`
- **And** I see `No vehicle type instructions yet. Create your first vehicle type instruction.`

#### Scenario: Admin updates a vehicle type instruction that does not exist

- **Given** I am signed in as admin
- **When** I request `PUT /api/vehicle-type-instructions/999` with a valid body
- **Then** the API returns `404` with `{ message: "Vehicle type instruction with id=999 not found." }`

#### Scenario: Admin updates a vehicle type instruction with an invalid id

- **Given** I am signed in as admin
- **When** I request `PUT /api/vehicle-type-instructions/abc` with a valid body
- **Then** the API returns `400` with `{ message: "Invalid vehicle type instruction id." }`

#### Scenario: Admin deletes a vehicle type instruction that does not exist

- **Given** I am signed in as admin
- **When** I request `DELETE /api/vehicle-type-instructions/999`
- **Then** the API returns `404` with `{ message: "Vehicle type instruction with id=999 not found." }`

#### Scenario: Admin deletes a vehicle type instruction with an invalid id

- **Given** I am signed in as admin
- **When** I request `DELETE /api/vehicle-type-instructions/abc`
- **Then** the API returns `400` with `{ message: "Invalid vehicle type instruction id." }`

#### Scenario: Area admin updates a vehicle type instruction outside their area

- **Given** I am signed in as area admin of Athletics
- **And** a Music vehicle type instruction with id `2` exists
- **When** I request `PUT /api/vehicle-type-instructions/2` with a valid body
- **Then** the API returns `403` with `{ message: "Forbidden." }`

#### Scenario: Area admin deletes a vehicle type instruction outside their area

- **Given** I am signed in as area admin of Athletics
- **And** a Music vehicle type instruction with id `2` exists
- **When** I request `DELETE /api/vehicle-type-instructions/2`
- **Then** the API returns `403` with `{ message: "Forbidden." }`

#### Scenario: Area admin updates a default vehicle type instruction

- **Given** I am signed in as area admin of Athletics
- **And** a default vehicle type instruction with id `1` exists
- **When** I request `PUT /api/vehicle-type-instructions/1` with a valid body
- **Then** the API returns `403` with `{ message: "Forbidden." }`

### US-15.5 — Signed-in admin or area admin access only

#### Scenario: Un-signed-in user accesses vehicle type instructions page

- **Given** I am not signed in
- **When** I navigate to `/vehicle-type-instructions` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to vehicle type instructions

- **Given** I have no valid session token
- **When** I request `GET /api/vehicle-type-instructions`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular vehicle type instruction

- **Given** I have no valid session token
- **And** a vehicle type instruction with id `1` exists
- **When** I request `GET /api/vehicle-type-instructions/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to create a vehicle type instruction

- **Given** I have no valid session token
- **When** I request `POST /api/vehicle-type-instructions` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to update a vehicle type instruction

- **Given** I have no valid session token
- **And** a vehicle type instruction with id `1` exists
- **When** I request `PUT /api/vehicle-type-instructions/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to delete a vehicle type instruction

- **Given** I have no valid session token
- **And** a vehicle type instruction with id `1` exists
- **When** I request `DELETE /api/vehicle-type-instructions/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Signed-in user without admin or area admin role accesses vehicle type instructions page

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **When** I navigate to `/vehicle-type-instructions` by URL
- **Then** I am redirected to `/home`

#### Scenario: Signed-in user without admin or area admin role API request to vehicle type instructions

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **When** I request `GET /api/vehicle-type-instructions`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to a particular vehicle type instruction

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **And** a vehicle type instruction with id `1` exists
- **When** I request `GET /api/vehicle-type-instructions/1`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to create a vehicle type instruction

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **When** I request `POST /api/vehicle-type-instructions` with a valid body
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to update a vehicle type instruction

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **And** a vehicle type instruction with id `1` exists
- **When** I request `PUT /api/vehicle-type-instructions/1` with a valid body
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to delete a vehicle type instruction

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **And** a vehicle type instruction with id `1` exists
- **When** I request `DELETE /api/vehicle-type-instructions/1`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-15.1 | Admin user creates a vehicle type instruction | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin user creates a vehicle type instruction` |
| US-15.1 | Area admin user creates a vehicle type instruction | `frontend/tests/VehicleTypeInstructions.test.js` | `Area admin user creates a vehicle type instruction` |
| US-15.1 | Admin user saves a default vehicle type instruction | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin user saves a default vehicle type instruction` |
| US-15.1 | Admin user saves a default vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Admin user saves a default vehicle type instruction` |
| US-15.1 | Area admin user saves an area vehicle type instruction | `frontend/tests/VehicleTypeInstructions.test.js` | `Area admin user saves an area vehicle type instruction` |
| US-15.1 | Area admin user saves an area vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Area admin user saves an area vehicle type instruction` |
| US-15.1 | Admin user saves an area vehicle type instruction | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin user saves an area vehicle type instruction` |
| US-15.1 | Admin user creates a vehicle type instruction with a missing vehicle type | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin user creates a vehicle type instruction with a missing vehicle type` |
| US-15.1 | Admin user creates a vehicle type instruction with a missing instruction message | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin user creates a vehicle type instruction with a missing instruction message` |
| US-15.1 | Admin user creates a vehicle type instruction with a whitespace-only instruction message | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin user creates a vehicle type instruction with a whitespace-only instruction message` |
| US-15.1 | Area admin user creates a vehicle type instruction with a missing area | `frontend/tests/VehicleTypeInstructions.test.js` | `Area admin user creates a vehicle type instruction with a missing area` |
| US-15.1 | Admin user requests to create a vehicle type instruction with a missing vehicle type | `backend/tests/vehicleTypeInstructions.test.js` | `Admin user requests to create a vehicle type instruction with a missing vehicle type` |
| US-15.1 | Admin user requests to create a vehicle type instruction with a missing instruction message | `backend/tests/vehicleTypeInstructions.test.js` | `Admin user requests to create a vehicle type instruction with a missing instruction message` |
| US-15.1 | Admin user requests to create a vehicle type instruction with a whitespace-only instruction message | `backend/tests/vehicleTypeInstructions.test.js` | `Admin user requests to create a vehicle type instruction with a whitespace-only instruction message` |
| US-15.1 | Admin user requests to create a vehicle type instruction for a vehicle type that does not exist | `backend/tests/vehicleTypeInstructions.test.js` | `Admin user requests to create a vehicle type instruction for a vehicle type that does not exist` |
| US-15.1 | Admin user requests to create a vehicle type instruction for an area that does not exist | `backend/tests/vehicleTypeInstructions.test.js` | `Admin user requests to create a vehicle type instruction for an area that does not exist` |
| US-15.1 | Admin user requests to create a default vehicle type instruction that already exists | `backend/tests/vehicleTypeInstructions.test.js` | `Admin user requests to create a default vehicle type instruction that already exists` |
| US-15.1 | Admin user requests to create an area vehicle type instruction that already exists | `backend/tests/vehicleTypeInstructions.test.js` | `Admin user requests to create an area vehicle type instruction that already exists` |
| US-15.1 | Area admin user requests to create a default vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Area admin user requests to create a default vehicle type instruction` |
| US-15.1 | Area admin user requests to create a vehicle type instruction for an area they do not administer | `backend/tests/vehicleTypeInstructions.test.js` | `Area admin user requests to create a vehicle type instruction for an area they do not administer` |
| US-15.2 | Admin vehicle type instructions view lists every instruction | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin vehicle type instructions view lists every instruction` |
| US-15.2 | Area admin vehicle type instructions view lists instructions for their areas | `frontend/tests/VehicleTypeInstructions.test.js` | `Area admin vehicle type instructions view lists instructions for their areas` |
| US-15.2 | Admin vehicle type instructions empty state | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin vehicle type instructions empty state` |
| US-15.3 | Admin vehicle type instruction rows have edit and delete actions | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin vehicle type instruction rows have edit and delete actions` |
| US-15.3 | Area admin vehicle type instruction rows have edit and delete actions | `frontend/tests/VehicleTypeInstructions.test.js` | `Area admin vehicle type instruction rows have edit and delete actions` |
| US-15.4 | Admin edits a vehicle type instruction message | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin edits a vehicle type instruction message` |
| US-15.4 | Admin edits a vehicle type instruction message | `backend/tests/vehicleTypeInstructions.test.js` | `Admin edits a vehicle type instruction message` |
| US-15.4 | Area admin edits a vehicle type instruction in their area | `frontend/tests/VehicleTypeInstructions.test.js` | `Area admin edits a vehicle type instruction in their area` |
| US-15.4 | Area admin edits a vehicle type instruction in their area | `backend/tests/vehicleTypeInstructions.test.js` | `Area admin edits a vehicle type instruction in their area` |
| US-15.4 | Admin edits a vehicle type instruction to have a missing instruction message | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin edits a vehicle type instruction to have a missing instruction message` |
| US-15.4 | Admin deletes a vehicle type instruction | `frontend/tests/VehicleTypeInstructions.test.js` | `Admin deletes a vehicle type instruction` |
| US-15.4 | Admin deletes a vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Admin deletes a vehicle type instruction` |
| US-15.4 | Admin updates a vehicle type instruction that does not exist | `backend/tests/vehicleTypeInstructions.test.js` | `Admin updates a vehicle type instruction that does not exist` |
| US-15.4 | Admin updates a vehicle type instruction with an invalid id | `backend/tests/vehicleTypeInstructions.test.js` | `Admin updates a vehicle type instruction with an invalid id` |
| US-15.4 | Admin deletes a vehicle type instruction that does not exist | `backend/tests/vehicleTypeInstructions.test.js` | `Admin deletes a vehicle type instruction that does not exist` |
| US-15.4 | Admin deletes a vehicle type instruction with an invalid id | `backend/tests/vehicleTypeInstructions.test.js` | `Admin deletes a vehicle type instruction with an invalid id` |
| US-15.4 | Area admin updates a vehicle type instruction outside their area | `backend/tests/vehicleTypeInstructions.test.js` | `Area admin updates a vehicle type instruction outside their area` |
| US-15.4 | Area admin deletes a vehicle type instruction outside their area | `backend/tests/vehicleTypeInstructions.test.js` | `Area admin deletes a vehicle type instruction outside their area` |
| US-15.4 | Area admin updates a default vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Area admin updates a default vehicle type instruction` |
| US-15.5 | Un-signed-in user accesses vehicle type instructions page | `frontend/tests/VehicleTypeInstructions.test.js` | `Un-signed-in user accesses vehicle type instructions page` |
| US-15.5 | Unauthenticated API request to vehicle type instructions | `backend/tests/vehicleTypeInstructions.test.js` | `Unauthenticated API request to vehicle type instructions` |
| US-15.5 | Unauthenticated API request to a particular vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Unauthenticated API request to a particular vehicle type instruction` |
| US-15.5 | Unauthenticated API request to create a vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Unauthenticated API request to create a vehicle type instruction` |
| US-15.5 | Unauthenticated API request to update a vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Unauthenticated API request to update a vehicle type instruction` |
| US-15.5 | Unauthenticated API request to delete a vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Unauthenticated API request to delete a vehicle type instruction` |
| US-15.5 | Signed-in user without admin or area admin role accesses vehicle type instructions page | `frontend/tests/VehicleTypeInstructions.test.js` | `Signed-in user without admin or area admin role accesses vehicle type instructions page` |
| US-15.5 | Signed-in user without admin or area admin role API request to vehicle type instructions | `backend/tests/vehicleTypeInstructions.test.js` | `Signed-in user without admin or area admin role API request to vehicle type instructions` |
| US-15.5 | Signed-in user without admin or area admin role API request to a particular vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Signed-in user without admin or area admin role API request to a particular vehicle type instruction` |
| US-15.5 | Signed-in user without admin or area admin role API request to create a vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Signed-in user without admin or area admin role API request to create a vehicle type instruction` |
| US-15.5 | Signed-in user without admin or area admin role API request to update a vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Signed-in user without admin or area admin role API request to update a vehicle type instruction` |
| US-15.5 | Signed-in user without admin or area admin role API request to delete a vehicle type instruction | `backend/tests/vehicleTypeInstructions.test.js` | `Signed-in user without admin or area admin role API request to delete a vehicle type instruction` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 15 from @features/feature-15-vehicle-type-instructions.md on branch `feature/15-vehicle-type-instructions`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-007** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-004)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Sending the email to the requestor
- Choosing the day before the trip
- Filling in what vehicle the trip uses
- Deciding whether the email uses the default instruction or the area override

---

## Delivered to later features

- A vehicle type instruction row with `id`, `vehicleTypeId`, `areaId`, and `content`
- `areaId` null is the default message for that vehicle type
- `areaId` set is that area's override of the default
- A later email spec can read these rows and send the message
