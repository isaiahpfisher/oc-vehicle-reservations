# Feature: Driver Management

**Feature ID:** 7
**Branch pattern:** `feature/7-drivers`
**Status:** Draft
**Created:** 2026-10-29
**Input:** Signed-in admin or area admin users manage drivers. Drivers are added/edited on a form page.
**Depends on:** Feature 1 [Users], Feature 3 [Roles]

---

## User Stories

### US-7.1: Create drivers

**As a** signed-in admin or area admin user
**I want to** create a driver with an optional user, first name, last name, phone number, license state, license expiration date, and status.
**So that** users requesting vehicles can select a particular driver

**Priority:** P1
**Independent test:** Open the new driver page, create a driver; it appears in the drivers view
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

- **FR-001**: All driver endpoints except `GET /api/drivers/selectable` (FR-015) MUST require a valid session and `admin` or `area_admin` role (`authorizeRoles('admin', 'area_admin')` middleware).
- **FR-002**: `id` is assigned by the database.
- **FR-003**: `user_id` MUST correspond to an existing user or be null.
- **FR-004**: `first_name` MUST be trimmed before save. An empty first name MUST be rejected.
- **FR-005**: `first_name` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-006**: `last_name` MUST be trimmed before save. An empty last name MUST be rejected.
- **FR-007**: `last_name` MUST have max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-008**: `phone_number` MUST be trimmed before save. An empty phone number MUST be rejected.
- **FR-009**: `phone_number` MUST be in format `(xxx)xxx-xxxx`. Other values MUST be rejected.
- **FR-010**: `license_state` MUST be one of an enum of state abbreviations. The form preselects `OK`. The API MUST reject an empty value.
- **FR-011**: `license_expiration_date` MUST be a valid date in format `yyyy-mm-dd`.
- **FR-012**: `approved_at` is set by the server and client-supplied values MUST be ignored. It MUST be set to the current time whenever `status` changes to `approved` from any other status (or a driver is created as `approved`)
- **FR-013**: `status` MUST be selected from existing enum of `pending`, `approved`, `denied`, `revoked`, and `former`. Empty status is saved as `pending`.
- **FR-014**: `user_id` MUST be unique.
- **FR-015**: `GET /api/drivers/selectable` MUST require a valid session with no role requirement. It MUST return only `id`, `firstName`, and `lastName`, for drivers with status `approved` and a license expiration date of today or later.
- **FR-016**: `GET /api/drivers/available-users` MUST return `id`, `firstName`, `lastName`, and `email` for users not linked to a driver. With `?driverId=`, it MUST also include that driver's linked user.
- **FR-017**: Deleting a user MUST keep any linked driver and set its `user_id` to null.
- **FR-018**: Request bodies use camelCase and MUST also accept snake_case aliases, matching the vehicles API.
- **FR-019**: A past `license_expiration_date` MUST be accepted, so that existing drivers with expired licenses can be recorded.
- **FR-020**: `GET /api/users/:id` MUST include `driver`, with the linked driver's `status`, `licenseState`, `licenseExpirationDate`, and `phoneNumber`, or `null` if there is no linked driver.

---

## Assumptions

- Drivers use **page-based** create and edit forms (no split sidebar / main panel). Delete uses a confirmation dialog.

## Edge Cases

- User id that does not exist → client block and/or `400`.
- Non-unique user id → client block and/or `400`.
- Empty or whitespace-only first name → client block and/or `400`.
- First name longer than 255 characters → `400`.
- Empty or whitespace-only last name → client block and/or `400`.
- Last name longer than 255 characters → `400`.
- Empty phone number → client block and/or `400`.
- Phone number not in format `(xxx)xxx-xxxx` → client block and/or `400`.
- Empty license state → client block and/or `400`.
- License state not an existing state abbreviation → client block and/or `400`.
- Empty or invalid license expiration date → client block and/or `400`.
- Past license expiration date → accepted; the drivers view highlights it.
- Empty status → save status as `pending`.
- Status other than `pending`, `approved`, `denied`, `revoked`, or `former` → `400`.
- Deleting a user linked to a driver → driver is kept with `user_id` set to null.
- Unauthenticated drivers screen → redirect to `/login`.
- Authenticated drivers screen without `admin` or `area_admin` role → redirect to `/home`.
- Unauthenticated API request → `401`.
- API request without `admin` or `area_admin` role → `403`, except `GET /api/drivers/selectable`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin user can create, view, edit, and delete drivers.
- **SC-003**: Signed-in area admin user can create, view, edit, and delete drivers.
- **SC-004**: `npm test` passes for drivers API and drivers view behavior.

---

## Data Ownership & Isolation

Any signed in admin or area admin user may create, edit, delete, or read the list of drivers. Any signed-in user may read the limited list of selectable drivers.

| Rule             | Requirement                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read scope**   | `GET /api/drivers`, `GET /api/drivers/available-users`, and `GET /api/drivers/:driverId` require a Bearer token and `admin` or `area_admin` role. `GET /api/drivers/selectable` requires only a Bearer token. |
| **Write scope**  | `PUT` and `DELETE` require a Bearer token and `admin` or `area_admin` role.                                                                                                                                   |
| **Create scope** | `POST` requires a Bearer token and `admin` or `area_admin` role.                                                                                                                                              |

---

## API Requirements

| Method   | Endpoint                       | Auth                     | Purpose                                                   |
| -------- | ------------------------------ | ------------------------ | --------------------------------------------------------- |
| `GET`    | `/api/drivers`                 | Yes - Admin, Area Admin  | Fetch all drivers                                         |
| `GET`    | `/api/drivers/selectable`      | Yes - Any signed-in user | Fetch drivers that can be selected for a request (FR-015) |
| `GET`    | `/api/drivers/available-users` | Yes - Admin, Area Admin  | Fetch users for the driver form's user field (FR-016)     |
| `GET`    | `/api/drivers/:driverId`       | Yes - Admin, Area Admin  | Fetch a single driver                                     |
| `POST`   | `/api/drivers`                 | Yes - Admin, Area Admin  | Create a driver                                           |
| `PUT`    | `/api/drivers/:driverId`       | Yes - Admin, Area Admin  | Edit a driver                                             |
| `DELETE` | `/api/drivers/:driverId`       | Yes - Admin, Area Admin  | Delete a driver                                           |

**Create driver request body:**

```json
{
  "userId": 1,
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "(405)425-1234",
  "licenseState": "OK",
  "licenseExpirationDate": "2027-09-01",
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

### [View: Drivers] — route name `drivers`, path `/drivers` (`Drivers.vue`)

- Heading: **Driver Management**
- Primary action: **+ New Driver** opens a new page (`DriverForm.vue`)
- Main Content: searchable and filterable data table (follow example in `ListUsers.vue`).
  - Columns should be first name, last name, status, phone number, and license expiration
  - Search matches first name, last name, and phone number
  - Filter by status
  - Expired license dates are highlighted
- Delete uses a confirmation dialog

### [View: Driver Form] — route names `driverCreate` (`/drivers/new`) and `driverDetails` (`/drivers/:id`) (`DriverForm.vue`)

- Register `/drivers/new` before `/drivers/:id`
- Heading: **New Driver** or first name and last name of driver if editing
- Primary action: **Save** (and cancel) return to `Drivers.vue`
- Main Content: form with fields for the columns on the drivers table (excluding `approved_at` and timestamps)
- Follow UI patterns from elsewhere

### [Card: Driver] — on `UserDetails.vue` (`/users/:id`)

- Replaces the Feature 3 **"Coming soon"** placeholder
- Shows the linked driver's status, license state and expiration, and phone number
- Shows **"No linked driver."** when the user has no driver

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
| `license_state`           | STRING     | Required; one of the state abbreviations                                              |
| `license_expiration_date` | DATEONLY   | Required; must be in format `yyyy-mm-dd`                                              |
| `approved_at`             | DATE       | May be null; set by the server (FR-012)                                               |
| `status`                  | ENUM       | Required; `pending`, `approved`, `denied`, `revoked`, `former`; defaults to `pending` |
| `createdAt`               | DATE       | Sequelize timestamps                                                                  |
| `updatedAt`               | DATE       | Sequelize timestamps                                                                  |

### Associations (in `models/index.js`)

- Each driver belongs to zero or one user (`onDelete: SET NULL`)
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
- **Then** the user field populates all users who aren't already attached to a driver, plus the driver's own linked user when editing

#### Scenario: Linked users are saved for drivers

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I have filled out the driver form with an attached user and clicked `Save`
- **Then** the linked user is attached to the driver

#### Scenario: Cannot submit without required fields

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I have filled out the driver form with any required field missing and submitted
- **Then** the request returns 400 with helpful error messages

#### Scenario: Approved timestamp on create

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I have filled out the driver form with approved status and submitted
- **Then** the approved_at timestamp is set accordingly

#### Scenario: Invalid phone number is rejected

- **Given** I am signed in as admin or an area_admin
- **When** I submit a driver with a phone number not in format `(xxx)xxx-xxxx`
- **Then** the request returns 400 with a helpful error message

#### Scenario: Duplicate linked user is rejected

- **Given** a user is already linked to a driver
- **When** I submit another driver with that user
- **Then** the request returns 400 with a helpful error message

#### Scenario: Past license expiration date is accepted

- **Given** I am signed in as admin or an area_admin
- **When** I submit a driver with a past license expiration date
- **Then** the driver is saved

### US-7.2 — View drivers

#### Scenario: Empty State

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** there are no drivers
- **Then** I see empty state explaining that there are no drivers and prompting me to create one

#### Scenario: Normal State

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** there are drivers
- **Then** each driver is listed with its first/last name, status, phone number, and license expiration, as well as pagination

#### Scenario: License Expiration

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** there are drivers with expired licenses
- **Then** those driver rows highlight the expiration

#### Scenario: Search drivers

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I search by first name, last name, or phone number
- **Then** only matching drivers are listed

#### Scenario: Filter drivers by status

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I filter by a status
- **Then** only drivers with that status are listed

#### Scenario: Linked driver shown on user details

- **Given** I am on the user details page of a user with a linked driver
- **When** the page loads
- **Then** the **Driver** card shows the driver's status, license state and expiration, and phone number

#### Scenario: No linked driver on user details

- **Given** I am on the user details page of a user with no linked driver
- **When** the page loads
- **Then** the **Driver** card shows **"No linked driver."**

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

#### Scenario: Driver is deleted

- **Given** I am signed in as admin or an area_admin with the delete confirmation dialog open
- **When** I confirm
- **Then** the driver is deleted and removed from the drivers view

#### Scenario: Approved timestamp on edit

- **Given** I am signed in as admin or an area_admin on the drivers view
- **When** I edit a driver's status to approved and it wasn't approved before
- **Then** the approved_at timestamp is set accordingly

#### Scenario: Approved timestamp is removed when status leaves approved

- **Given** a driver is approved
- **When** I change the status to `revoked`
- **Then** the approved_at timestamp is set to null

#### Scenario: Re-approval resets approved timestamp

- **Given** a driver with an approved_at timestamp is `revoked`
- **When** I change the status to `approved`
- **Then** the approved_at timestamp is set to the current time

#### Scenario: Client-supplied approved timestamp is ignored

- **Given** I am signed in as admin or an area_admin
- **When** I send a driver request body with `approvedAt`
- **Then** the supplied value is not saved

#### Scenario: Deleting a linked user keeps the driver

- **Given** a user is linked to a driver
- **When** the user is deleted
- **Then** the driver still exists with no linked user

### US-7.5: Signed-in admin or area admin user access only

#### Scenario: Admin or area_admin can access

- **Given** I am signed in as admin or an area_admin
- **When** I open the app
- **Then** I can see and manage drivers

#### Scenario: Non (area) admins cannot access

- **Given** I am not signed in as admin or an area_admin
- **When** I open the app
- **Then** I cannot see or manage drivers

#### Scenario: Signed-in user fetches selectable drivers

- **Given** I am signed in without an `admin` or `area_admin` role
- **When** I send `GET /api/drivers/selectable`
- **Then** I receive only `id`, `firstName`, and `lastName` for approved drivers with unexpired licenses

#### Scenario: Area admin fetches available users

- **Given** I am signed in as an area_admin
- **When** I send `GET /api/drivers/available-users`
- **Then** I receive the users who aren't attached to a driver

---

## Test Coverage Map

| Story  | Scenario                                               | Test file                            | Test name                                                |
| ------ | ------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------- |
| US-7.1 | Admin or area admin clicks to creates driver           | `frontend/tests/Drivers.test.js`     | `Admin or area admin clicks to creates driver`           |
| US-7.1 | Driver is created                                      | `frontend/tests/DriverForm.test.js`  | `Driver is created`                                      |
| US-7.1 | User field on driver form shows available users        | `frontend/tests/DriverForm.test.js`  | `User field on driver form shows available users`        |
| US-7.1 | Linked users are saved for drivers                     | `backend/tests/drivers.test.js`      | `Linked users are saved for drivers`                     |
| US-7.1 | Cannot submit without required fields                  | `backend/tests/drivers.test.js`      | `Cannot submit without required fields`                  |
| US-7.1 | Approved timestamp on create                           | `backend/tests/drivers.test.js`      | `Approved timestamp on create`                           |
| US-7.1 | Invalid phone number is rejected                       | `backend/tests/drivers.test.js`      | `Invalid phone number is rejected`                       |
| US-7.1 | Duplicate linked user is rejected                      | `backend/tests/drivers.test.js`      | `Duplicate linked user is rejected`                      |
| US-7.1 | Past license expiration date is accepted               | `backend/tests/drivers.test.js`      | `Past license expiration date is accepted`               |
| US-7.2 | Empty State                                            | `frontend/tests/Drivers.test.js`     | `Empty State`                                            |
| US-7.2 | Normal State                                           | `frontend/tests/Drivers.test.js`     | `Normal State`                                           |
| US-7.2 | License Expiration                                     | `frontend/tests/Drivers.test.js`     | `License Expiration`                                     |
| US-7.2 | Search drivers                                         | `frontend/tests/Drivers.test.js`     | `Search drivers`                                         |
| US-7.2 | Filter drivers by status                               | `frontend/tests/Drivers.test.js`     | `Filter drivers by status`                               |
| US-7.2 | Linked driver shown on user details                    | `frontend/tests/UserDetails.test.js` | `Linked driver shown on user details`                    |
| US-7.2 | No linked driver on user details                       | `frontend/tests/UserDetails.test.js` | `No linked driver on user details`                       |
| US-7.3 | Edit driver row                                        | `frontend/tests/Drivers.test.js`     | `Edit driver row`                                        |
| US-7.3 | Delete driver row                                      | `frontend/tests/Drivers.test.js`     | `Delete driver row`                                      |
| US-7.4 | Driver is deleted                                      | `backend/tests/drivers.test.js`      | `Driver is deleted`                                      |
| US-7.4 | Former status can be saved                             | `backend/tests/drivers.test.js`      | `Former status can be saved`                             |
| US-7.4 | Approved timestamp on edit                             | `backend/tests/drivers.test.js`      | `Approved timestamp on edit`                             |
| US-7.4 | Approved timestamp is kept when status leaves approved | `backend/tests/drivers.test.js`      | `Approved timestamp is kept when status leaves approved` |
| US-7.4 | Re-approval resets approved timestamp                  | `backend/tests/drivers.test.js`      | `Re-approval resets approved timestamp`                  |
| US-7.4 | Client-supplied approved timestamp is ignored          | `backend/tests/drivers.test.js`      | `Client-supplied approved timestamp is ignored`          |
| US-7.4 | Deleting a linked user keeps the driver                | `backend/tests/users.test.js`        | `Deleting a linked user keeps the driver`                |
| US-7.5 | Admin or area_admin can access                         | `backend/tests/drivers.test.js`      | `Admin or area_admin can access`                         |
| US-7.5 | Non (area) admins cannot access                        | `backend/tests/drivers.test.js`      | `Non (area) admins cannot access`                        |
| US-7.5 | Signed-in user fetches selectable drivers              | `backend/tests/drivers.test.js`      | `Signed-in user fetches selectable drivers`              |
| US-7.5 | Area admin fetches available users                     | `backend/tests/drivers.test.js`      | `Area admin fetches available users`                     |

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
- Blocking deletion of drivers attached to vehicle requests (added by Feature 8, which creates `vehicle_request_drivers`)

---

## Delivered to later features

- Drivers are available for vehicle requests through `GET /api/drivers/selectable`
