# Feature: CDLs

**Feature ID:** 22
**Branch pattern:** `feature/22-cdls`
**Status:** Draft
**Created:** 2026-11-16
**Input:** Drivers have CDLs and vehicle types can require a CDL. Vehicle requests recommend drivers with CDL for large trips and only allow vehicles that don't require a CDL if no drivers have a CDL.
**Depends on:** Feature 4 [Vehicle Types], Feature 7 [Drivers], Feature 8 [Vehicle Requests]

---

## User Stories

### US-22.1: Drivers have CDL

**As a** signed-in admin or area admin user
**I want to** specify whether a driver has a CDL or not
**So that** I can know what vehicles I can assign to a request with that driver

**Priority:** P1
**Independent test:** Specify whether a driver has a CDL in the create/edit dialogs; CDL column with CDL status shows in the list view
**Acceptance scenarios:** see ### US-22.1 under Acceptance Criteria

### US-22.2: Vehicle types have CDL

**As a** signed-in admin user
**I want to** specify whether a vehicle requires a CDL
**So that** I can know what drivers can drive that vehicle type

**Priority:** P1
**Independent test:** Specify whether a vehicle type requires a CDL in the create/edit dialogs; CDL column with CDL status shows in the list view
**Acceptance scenarios:** see ### US-22.2 under Acceptance Criteria

### US-22.3: Vehicle requests show what drivers have a CDL

**As a** signed-in user making a request
**I want** the dropdown of drivers to show whether a driver has a CDL
**So that** I can select a driver with a CDL when I want one

**Priority:** P1
**Independent test:** Driver dropdown specifies whether a driver has a CDL
**Acceptance scenarios:** see ### US-22.3 under Acceptance Criteria

### US-22.4: Show a warning for many passengers and no driver has a CDL

**As a** signed-in user making a request
**I want to** see a warning if I indicate there are many passengers and no driver has a CDL
**So that** I can choose a driver with a CDL to have a bus for that trip

**Priority:** P2
**Independent test:** Warning appears if I specify 20 or more people and no selected driver has a CDL
**Acceptance scenarios:** see ### US-22.4 under Acceptance Criteria

### US-22.5: List vehicles that the selected drivers are permitted to drive on vehicle request

**As a** signed-in admin or area admin user
**I want to** only list available vehicles that the selected drivers are allowed to drive
**So that** I don't assign a vehicle that the driver cannot drive

**Priority:** P1
**Independent test:** On vehicle request, if no driver has a CDL, only list vehicles which type does not require a CDL
**Acceptance scenarios:** see ### US-22.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: `requiresCDL` for vehicle type MUST be true or false.
- **FR-002**: `hasCDL` for drivers MUST be true or false.
- **FR-003**: Assigning a vehicle that requires a CDL to a request with no driver that has a CDL is not allowed.

---

## Assumptions

- `hasCDL` for drivers is a checkbox.
- `requiresCDL` for vehicle types is a checkbox.

## Edge Cases

- Empty or invalid `requiresCDL` for vehicle types → save as `false`
- Empty or invalid `hasCDL` for drivers → save as `false`
- Assigning a vehicle with a CDL to a request with no drivers with a CDL → `400`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin or area admin user can select and modify if a driver has a CDL.
- **SC-003**: Signed-in admin user can select and modify if a vehicle type requires a CDL.
- **SC-004**: Signed-in requester can view if a driver has a CDL.
- **SC-005**: Signed-in admin or area admin user can only assign vehicles that require a CDL if a driver has a CDL.
- **SC-006**: `npm test` passes for CDLs API and CDLs view behavior.

---

## Data Ownership & Isolation

Vehicle types and drivers API the same as specified in other specs.

---

## API Requirements

### New example requests for vehicle type:

**Create vehicle type request body:**

```json
{
  "name": "Bus",
  "identifier": "VIN",
  "requiresCDL": true
}
```

**Vehicle type success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Bus",
  "identifier": "VIN",
  "requiresCDL": true,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

### New example requests for driver:

**Create driver request body:**

```json
{
  "userId": 1,
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "405-425-1234",
  "licenseState": "OK",
  "licenseExpirationDate": "2027-09-01",
  "status": "pending",
  "hasCDL": false
}
```

**Driver success response** (`200` / `201`):

```json
{
  "id": 1,
  "userId": 1,
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "405-425-1234",
  "licenseState": "OK",
  "licenseExpirationDate": "2027-09-01",
  "status": "pending",
  "hasCDL": false,
  "approvedAt": null,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

`GET /api/drivers/selectable` also returns `hasCDL`.

---

## Screen Requirements

### [View: Vehicle Types] — route name `vehicle-types`

- The same as existing.
- A new column between `Identifier` and `Actions` with title `Requires CDL`
- This column is a checkbox that is checked or unchecked. This is not changeable unless the row is in edit state.
- On create, the dialog has a checkbox with label `Requires CDL?`

### [View: Drivers] — route name `drivers`

- The same as existing.
- A new column between `License Expiration` and `Actions` with title `CDL`
- This column is a checkbox that is checked or unchecked. This is not changeable from the list view.
- On create/edit, the page has a checkbox in the section for `License` in the same style as the rest of the page.

### [View: Vehicle Requests ] - requester view

- The same as existing.
- The drivers dropdown has `(CDL)` after names of drivers that have CDLs
- There is a warning if the number of passengers is at least 20 and there is at least one driver selected and no selected driver has a CDL.

### [View: Vehicle Requests ] - vehicle assignment view

- The same as existing.
- The vehicles dropdown shows no vehicles that require a CDL if no selected driver has a CDL.

---

## Key Entities

- The same as specified in other specs.

---

## Data Model Requirements

### `vehicleTypes` added column

| Field | Type | Rules |
|-------|------|-------|
| `requires_CDL` | BOOLEAN | Required; default `false` |


### `drivers` added column

| Field | Type | Rules |
|-------|------|-------|
| `has_CDL` | BOOLEAN | Required; default `false` |

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-22.1: Drivers have CDL

#### Scenario: Admin or area admin user sees CDL field on driver create

- **Given** I am signed in as admin or area admin on the drivers view
- **When** I click **+ New Driver**
- **Then** The create page has a checkbox for CDL in the License section
- **And** The default value is unchecked

#### Scenario: Admin or area admin user creates driver with CDL

- **Given** I am signed in as admin or area admin on the drivers view
- **When** I create a driver with CDL `true` and all valid values
- **Then** The driver is saved with CDL `true`

#### Scenario: Admin or area admin user requests to create a driver with a CDL

- **Given** I am signed in as admin or area admin
- **When** I request `POST /api/drivers` with `{ hasCDL: true }` and a valid rest of the body
- **Then** the driver is saved

#### Scenario: Admin or area admin user requests to create a driver with no CDL

- **Given** I am signed in as admin or area admin
- **When** I request `POST /api/drivers` with `{ hasCDL: null }` and a valid rest of the body
- **Then** the driver is saved with hasCDL `false`

#### Scenario: Admin or area admin user requests to create a driver with non-boolean CDL

- **Given** I am signed in as admin or area admin
- **When** I request `POST /api/drivers` with `{ hasCDL: 3 }` and a valid rest of the body
- **Then** the driver is saved with hasCDL `false`

#### Scenario: Admin or area admin user sees CDL field on driver edit

- **Given** I am signed in as admin or area admin on the drivers view
- **And** A driver with id `1` exists and CDL `true`
- **When** I click edit for that row
- **Then** The edit page has a checkbox for CDL in the License section
- **And** The checkbox is prechecked, matching the existing CDL value

#### Scenario: Admin or area admin user edits driver to have CDL

- **Given** I am signed in as admin or area admin on the drivers view
- **When** I edit a driver to have CDL `true` and all valid values
- **Then** The driver is saved with CDL `true`

#### Scenario: Admin or area admin user requests to edit a driver with a CDL

- **Given** I am signed in as admin or area admin
- **And** A driver with id `1` exists
- **When** I request `PUT /api/drivers/1` with `{ hasCDL: true }` and a valid rest of the body
- **Then** the driver is saved

#### Scenario: Admin or area admin user requests to edit a driver to have no CDL

- **Given** I am signed in as admin or area admin
- **And** A driver with id `1` exists
- **When** I request `PUT /api/drivers/1` with `{ hasCDL: null }` and a valid rest of the body
- **Then** the driver is saved with hasCDL `false`

#### Scenario: Admin or area admin user requests to edit a driver to have a non-boolean CDL

- **Given** I am signed in as admin or area admin
- **And** A driver with id `1` exists
- **When** I request `PUT /api/drivers/1` with `{ hasCDL: 3 }` and a valid rest of the body
- **Then** the driver is saved with hasCDL `false`

#### Scenario: Admin or area admin user sees CDL column for drivers

- **Given** I am signed in as admin or area admin
- **And** Drivers exist
- **When** I navigate to the drivers view
- **Then** I see a column heading for CDL
- **And** Each row has a checkbox in this column
- **And** The checkbox is checked on rows that have CDL `true`

---

### US-22.2: Vehicle types have CDL

#### Scenario: Admin user sees CDL field on vehicle types create

- **Given** I am signed in as admin on the vehicle types view
- **When** I click **+ New Vehicle Type**
- **Then** The create page has a checkbox for CDL
- **And** The default value is unchecked

#### Scenario: Admin user creates vehicle type with CDL

- **Given** I am signed in as admin on the vehicle types view
- **When** I create a vehicle type with CDL `true` and all valid values
- **Then** The vehicle type is saved with CDL `true`

#### Scenario: Admin user requests to create a vehicle type with a CDL

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ requiresCDL: true }` and a valid rest of the body
- **Then** the vehicle type is saved with requiresCDL `true`

#### Scenario: Admin user requests to create a vehicle type with no CDL

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ requiresCDL: null }` and a valid rest of the body
- **Then** the vehicle type is saved with requiresCDL `false`

#### Scenario: Admin user requests to create a vehicle type with non-boolean CDL

- **Given** I am signed in as admin
- **When** I request `POST /api/vehicle-types` with `{ requiresCDL: 3 }` and a valid rest of the body
- **Then** the vehicle type is saved with requiresCDL `false`

#### Scenario: Admin user sees CDL field on vehicle types edit

- **Given** I am signed in as admin on the vehicle types view
- **And** A vehicle type with id `1` exists and CDL `true`
- **When** I click edit for that row
- **Then** The row has a checkbox for CDL
- **And** The checkbox is prechecked, matching the existing CDL value

#### Scenario: Admin user edits vehicle type to have CDL

- **Given** I am signed in as admin on the vehicle types view
- **When** I edit a vehicle type to have CDL `true` and all valid values
- **Then** The vehicle type is saved with CDL `true`

#### Scenario: Admin user requests to edit a vehicle type with a CDL

- **Given** I am signed in as admin
- **And** A vehicle type with id `1` exists
- **When** I request `PUT /api/vehicle-types/1` with `{ requiresCDL: true }` and a valid rest of the body
- **Then** the vehicle type is saved with requiresCDL `true`

#### Scenario: Admin user requests to edit a vehicle type to have no CDL

- **Given** I am signed in as admin
- **And** A vehicle type with id `1` exists
- **When** I request `PUT /api/vehicle-types/1` with `{ requiresCDL: null }` and a valid rest of the body
- **Then** the vehicle type is saved with requiresCDL `false`

#### Scenario: Admin user requests to edit a vehicle type to have a non-boolean CDL

- **Given** I am signed in as admin
- **And** A vehicle type with id `1` exists
- **When** I request `PUT /api/vehicle-types/1` with `{ requiresCDL: 3 }` and a valid rest of the body
- **Then** the vehicle type is saved with requiresCDL `false`

#### Scenario: Admin user sees CDL column for vehicle types

- **Given** I am signed in as admin
- **And** Vehicle types exist
- **When** I navigate to the vehicle types view
- **Then** I see a column heading `Requires CDL`
- **And** Each row has a checkbox in this column
- **And** The checkbox is checked on rows that have CDL `true`

---

### US-22.3: Vehicle requests show what drivers have a CDL

#### Scenario: Vehicle requests show what drivers have a CDL

- **Given** I am signed in as a requester and making a request
- **And** Drivers with and without CDLs exist
- **When** I create a new request and view the drivers dropdown
- **Then** The options for drivers with a CDL have `(CDL)` after the person's name

---

### US-22.4: Show a warning for many passengers and no driver has a CDL

#### Scenario: Show a warning for many passengers and no driver has a CDL

- **Given** I am signed in as a requester
- **And** I am creating a request
- **When** I enter 20 for number of passengers and have only selected drivers without CDLs
- **Then** I see a warning saying that if I want a bus, I need to select a driver with a CDL
- **And** I can save the request in this state

---

### US-22.5: List vehicles that the selected drivers are permitted to drive on vehicle request

#### Scenario: List vehicles without CDLs for drivers without CDLs

- **Given** I am signed in as an admin or area admin
- **And** I am assigning vehicles to a request that has no drivers with CDLs
- **And** Both vehicles that require a CDL and vehicles that don't require a CDL are available
- **When** I click the vehicles dropdown
- **Then** Only vehicles with vehicle type that have requiresCDL `false` are shown

#### Scenario: List vehicles with CDLs for drivers with CDLs

- **Given** I am signed in as an admin or area admin
- **And** I am assigning vehicles to a request that has at least one driver with a CDL
- **And** Both vehicles that require a CDL and vehicles that don't require a CDL are available
- **When** I click the vehicles dropdown
- **Then** I see both vehicles that require a CDL and vehicles that don't require a CDL

#### Scenario: Admin or area admin user requests to update a request to have a vehicle with type that requires a CDL when no driver has a CDL

- **Given** I am signed in as admin or area admin
- **And** A vehicle type with id `1` and requiresCDL `true` exists
- **And** A vehicle with id `1` and vehicle type `1` exists
- **And** A driver with id `1` and hasCDL `false` exists
- **And** A vehicle request with id `1` exists
- **When** I request `PUT /api/requests/1` with only a driver with id `1` and vehicle with id `1`
- **Then** I receive `400` with `{ message: "Only vehicles that don't require a CDL can be assigned to a request with no drivers with CDLs." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|


## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 22 from @features/feature-22-cdls.md on branch `feature/22-cdls`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-003** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-006)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Additional licensing requirements

---

## Delivered to later features

- Vehicle types have `requiresCDL`
- Drivers have `hasCDL`
- These columns are enforced to match on vehicle requests
 