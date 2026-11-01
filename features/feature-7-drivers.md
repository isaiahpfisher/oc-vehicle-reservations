# Feature: Driver Management

**Feature ID:** 7
**Branch pattern:** `feature/7-drivers`
**Status:** Draft
**Created:** 2026-10-29
**Input:** Signed-in admin or area admin users manage drivers. Drivers are added/edited with a dialog.
**Depends on:** Feature 1 [Users], Feature 3 [Roles]

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
- **FR-011**: `license_expiration_date` MUST be a valid date in format `yyyy-mm-dd`.
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
- Empty license expiration date → client block and/or `400`.
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

| Rule             | Requirement                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **Read scope**   | `GET /api/drivers` and `GET /api/drivers/:driverId` require a Bearer token and `admin` or `area_admin` role. |
| **Write scope**  | `PUT` and `DELETE` require a Bearer token and `admin` or `area_admin` role.                                  |
| **Create scope** | `POST` requires a Bearer token and `admin` or `area_admin` role.                                             |

---

## API Requirements

| Method   | Endpoint                 | Auth                    | Purpose               |
| -------- | ------------------------ | ----------------------- | --------------------- |
| `GET`    | `/api/drivers`           | Yes - Admin, Area Admin | Fetch all drivers     |
| `GET`    | `/api/drivers/:driverId` | Yes - Admin, Area Admin | Fetch a single driver |
| `POST`   | `/api/drivers`           | Yes - Admin, Area Admin | Create a driver       |
| `PUT`    | `/api/drivers/:driverId` | Yes - Admin, Area Admin | Edit a driver         |
| `DELETE` | `/api/drivers/:driverId` | Yes - Admin, Area Admin | Delete a driver       |

**Create driver request body:**

```json
{
  "user_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "(405)425-1234",
  "license_state": "OK",
  "license_expiration_date": "2027-09-01",
  "status": "pending"
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
  "licenseExpirationDate": "2027-09-01",
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

### [View: Drivers] — route name `drivers` (`Drivers.Vue`)

- Heading: **Driver Management**
- Primary action: **+ New Driver** opens a new page (`DriverForm.vue`)
- Main Content: searchable and filterable data table (follow example in `ListUsers.vue`).
  - Columns should be first name, last name, status, and phone number

### [View: Driver Form] — route name `drivers/create and drivers/:id` (`DriverForm.Vue`)

- Heading: **New Driver** or first name and last name of driver if editing
- Primary action: **Save** (and cancel) return to `Drivers.vue`
- Main Content: form with fields for the columns on the drivers table (excluding timestamps)
- Follow UI patterns from elsewhere

---

## Key Entities

- **Driver**: a person who can be selected to drive for a vehicle request, with license details and an approval status. May be linked to a user.

---

## Data Model Requirements

### `drivers` table

| Field                     | Type       | Rules                                                                                 |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| `id`                      | INTEGER PK | Auto-increment                                                                        |
| `user_id`                 | INTEGER FK | Optional; must reference `users.id`; unique when not null                             |
| `first_name`              | STRING     | Required; trimmed; max 255                                                            |
| `last_name`               | STRING     | Required; trimmed; max 255                                                            |
| `phone_number`            | STRING     | Required; trimmed; must be in format `(xxx)xxx-xxxx`                                  |
| `license_state`           | STRING     | Required; one of the state abbreviations; defaults to `OK`                            |
| `license_expiration_date` | DATE       | Required; must be in format `yyyy-mm-dd`                                              |
| `has_cdl`                 | BOOLEAN    | Required; defaults to `false`                                                         |
| `approved_at`             | DATE       | May be null; assigned by the database                                                 |
| `status`                  | ENUM       | Required; `pending`, `approved`, `denied`, `revoked`, `former`; defaults to `pending` |
| `createdAt`               | DATE       | Sequelize timestamps                                                                  |
| `updatedAt`               | DATE       | Sequelize timestamps                                                                  |

### Associations (in `models/index.js`)

- Each driver belongs to zero or one user
- Users have zero or one driver

---

## Acceptance Criteria (Gherkin)

### US-7.1 — Create drivers

#### Scenario: Admin or area admin clicks to creates driver

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I click **+ New Driver**
- **Then** the `DriverForm` page opens with all the appropriate fields

#### Scenario: Driver is created

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I have filled out the driver form to create a new driver with valid fields and click `Save`
- **Then** the data is saved and I return to the `Drivers` page

#### Scenario: User field on driver form shows available users

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I have the Driver Form open
- **Then** the user field populates all users who aren't already attached to a driver

#### Scenario: Linked users are saved for drivers

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I have filled out the driver form with an attached user and clicked `Save`
- **Then** the linked user is attached to the driver

#### Scenario: Cannot submit without required fields

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I have filled out the driver form with any required field missing and submitted
- **Then** the request returns 400 with helpful error messages

#### Scenario: Approved Timestamp

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I have filled out the driver form with approved status and submitted
- **Then** the approved_at timestamp is set accordingly

### US-7.2 — View drivers

#### Scenario: Empty State

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** there are no drivers
- **Then** I see empty state explaining that there are no drivers and prompting me to create one

#### Scenario: Normal State

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** there are drivers
- **Then** each driver is listed with its first/last name, status, and phone number, as well as pagination

#### Scenario: License Expiration

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** there are drivers with expired licenses
- **Then** those driver rows highlight the expiration

### US-7.3 — Manage driver rows

#### Scenario: Edit driver row

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I click to edit a driver
- **Then** the driver form opens with that driver's info populated

#### Scenario: Delete driver row

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I click to delete a driver
- **Then** a delete confirmation dialog opens

### US-7.4 — Edit and delete drivers

#### Scenario: Cannot delete driver with requests

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I try to delete a driver that is attached to any vehicle requests
- **Then** a helpful message explains why I can't delete them (and suggests changing their status to 'former')

#### Scenario: Approved Timestamp

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I edit a driver's status to approved and it wasn't approved before
- **Then** the approved_at timestamp is set accordingly

### US-7.5: Signed-in admin or area admin user access only

#### Scenario: Admin or area_admin can access

- **Given** I am signed in as admin or an area_admin
- **When** I open the app
- **Then** I can see and manage drivers

#### Scenario: Non (area) admins cannot access

- **Given** I am not signed in as admin or an area_admin
- **When** I open the app
- **Then** I cannot see or manage drivers

---

## Test Coverage Map

| Story  | Scenario                     | Test file                         | Test name                      |
| ------ | ---------------------------- | --------------------------------- | ------------------------------ |
| US-5.1 | Admin user creates a vehicle | `frontend/tests/Vehicles.test.js` | `Admin user creates a vehicle` |

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

- [ ] Backend and frontend implemented per this spec (**FR-###**)
- [ ] **Success Criteria (SC-001**–**SC-004)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Letting users request to make themselves drivers

---

## Delivered to later features

- Drivers are available for vehicle requests
