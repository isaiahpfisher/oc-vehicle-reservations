# Feature: Service Type Management

**Feature ID:** 12
**Branch pattern:** `feature/12-service-types`
**Status:** Draft
**Created:** 2026-10-19
**Input:** Signed-in admin users manage service types. Service types are added/edited with a dialog.
**Depends on:** Feature 3 (Roles)

---

## User Stories

### US-12.1: Create service types

**As a** signed-in admin, area admin, or maintenance user
**I want to** create a service type with a name, service_frequency_days, and service_frequency_miles
**So that** users managing vehicles can track specific services performed on vehicles.

**Priority:** P1
**Independent test:** Open the create service dialog, create a service type; it appears in the service types view
**Acceptance scenarios:** see ### US-12.1 under Acceptance Criteria

### US-12.2: View service types

**As a** signed-in admin, area admin, or maintenance user
**I want to** see all service types
**So that** I can see which service types exist.

**Priority:** P1
**Independent test:** Service types view loads a single list of service types
**Acceptance scenarios:** see ### US-12.2 under Acceptance Criteria

### US-12.3: Manage service type rows

**As a** signed-in admin, area admin, or maintenance user
**I want** each service type row to have **edit** and **delete** actions
**So that** I can manage service types from the service types view

**Priority:** P1
**Independent test:** Each service type row exposes edit and delete icon actions 
**Acceptance scenarios:** see ### US-12.3 under Acceptance Criteria

### US-12.4: Edit and delete service types

**As a** signed-in admin, area admin, or maintenance user
**I want to** edit or delete a service type
**So that** I can keep service types up to date

**Priority:** P2
**Independent test:** Edit and delete service types from row actions; the service types view updates
**Acceptance scenarios:** see ### US-12.4 under Acceptance Criteria

### US-12.5: Signed-in admin, area admin, or maintenance user access only

**As a** signed-in admin, area admin, or maintenance user
**I want to** have service types visible only to signed-in admin, area admin, or maintenance users
**So that** Unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/service-types` is redirected to `/login`; unauthorized API requests or requests without `admin`, `area_admin`, or `maintenance` role receive errors; signed in user without `admin`, `area_admin`, or `maintenance` role is redirected to `/home`
**Acceptance scenarios:** see ### US-12.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All service type endpoints MUST require a valid session and `admin`, `area_admin`, or `maintenance` role (`authorizeRoles('admin', 'area_admin', 'maintenance')` middleware).
- **FR-002**: `name` MUST be trimmed before save. An empty service type name MUST be rejected.
- **FR-003**: A service type MUST store `name`, `service_frequency_days`, and `service_frequency_miles`. At least one frequency is required. A frequency that is provided MUST be a positive whole number. The frequency that is left empty is stored as `null`. Both frequencies MAY be provided. `id` is assigned by the database.
- **FR-004**: `name` MUST be unique (not case-sensitive). Creating a service type with a name identical to an existing name MUST be rejected. Updating a service type to have a different name that is also identical to an existing name MUST be rejected.

---

## Assumptions

- Creating a service type uses a dialog. Editing a service type is inline in the table row. There is no split sidebar / main panel.
- Delete removes the service type row. No other table references `serviceTypes` yet, so this feature does not block a delete.

## Edge Cases

- Empty or whitespace-only service type name → client block and/or `400`.
- Neither frequency provided → client block and/or `400`. A provided frequency that is not a positive whole number → `400`.
- Service type name longer than 255 characters → `400`.
- Unauthenticated service types screen → redirect. 
- Authenticated service types screen without `admin`, `area_admin`, or `maintenance` role → redirect. 
- Unauthenticated API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin, area admin, and maintenance user can create, view, edit, and delete service types on one screen.
- **SC-003**: `npm test` passes for service types API and service types view behavior.

---

## Data Ownership & Isolation

Any signed in admin, area admin, or maintenance user may create, edit, delete, or read the list of service types.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/service-types` and `GET /api/service-types/:serviceTypeId` require a Bearer token and `admin`, `area_admin`, or `maintenance` role. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token and `admin`, `area_admin`, or `maintenance` role. |
| **Create scope** | `POST` requires a Bearer token and `admin`, `area_admin`, or `maintenance` role. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/service-types` | Yes - Admin, area admin, or maintenance | Fetch all service types |
| `GET` | `/api/service-types/:serviceTypeId` | Yes - Admin, area admin, or maintenance | Fetch a single service type |
| `POST` | `/api/service-types` | Yes - Admin, area admin, or maintenance | Create a service type |
| `PUT` | `/api/service-types/:serviceTypeId` | Yes - Admin, area admin, or maintenance | Edit a service type |
| `DELETE` | `/api/service-types/:serviceTypeId` | Yes - Admin, area admin, or maintenance | Delete a service type |

**Create service type request body:**

```json
{
  "name": "Oil Change",
  "service_frequency_days": 500,
  "service_frequency_miles": 5000
}
```

**Service type success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Oil Change",
  "service_frequency_days": 500,
  "service_frequency_miles": 5000,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404`.
**Unauthorized** (lacking `admin`, `area_admin`, `maintenance` role): `403`.

---

## Screen Requirements

### [View: Service Types] — route name `service-types`

**Single Vue view** (`ServiceTypes.vue`) — no sidebar / main-panel split.

- Heading: **Service Type Management**
- Primary action: **+ New Service Type** opens a `<v-dialog>` with **Name**, **Frequency Days**, and **Frequency Miles**. **Cancel** and **Create** sit in the dialog footer.
- Display service types in a `<v-data-table>` (10 per page). Columns are **Name**, **Frequency Days**, **Frequency Miles**, and **Actions**. Row icon buttons use `size="small"` and `variant="text"`, matching the users table.
- **Edit** icon turns that row into inline fields pre-filled with the current name, frequency days, and frequency miles; **Save** / **Cancel**. Cancel restores the row without saving.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit service type**, **Delete service type**).
- **Empty state:** **"No service types yet. Create your first service type."** when there are no service types.
- **Loading state:** skeleton or progress indicator while service types are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for service types; delete dialog is a reusable component in `components/common` folder; the create dialog is a component in `components/serviceTypes`, modeled after existing create dialogs. Edit stays in the table row.

---

## Key Entities

- **ServiceType**: a type of service such as `Oil Change`, `Tire Rotation`, or `Spark Plug Replacement`.

---

## Data Model Requirements

### `serviceTypes` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING | Required; trimmed; unique; not case-sensitive; max 255 |
| `service_frequency_days` | INT | Optional; positive when present. At least one of the two frequencies is required. |
| `service_frequency_miles` | INT | Optional; positive when present. At least one of the two frequencies is required. |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-12.1 — Create service types

#### Scenario: Admin user creates a service type

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I click **+ New Service Type**
- **Then** a dialog opens with a **Name** , **Frequency Days** and **Frequency Miles** fields.

#### Scenario: Admin user saves service type

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with name `Oil Change`, frequency days `500`, frequence miles `5000`
- **Then** the API returns `201` with that service type
- **And** `Oil Change` appears in the service types list

#### Scenario: Admin user creates service type with missing name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates service type with missing field

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with a name and neither frequency
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a service type with only one frequency

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with name `Oil Change` and frequency days `500`, and leave frequency miles empty
- **Then** the API returns `201` with that service type and `service_frequency_miles` is `null`
- **And** `Oil Change` appears in the service types list

#### Scenario: Admin user requests to create a service type with a missing name

- **Given** I am signed in as admin, area admin, or maintenance 
- **When** I request `POST /api/service-types` with a missing filed
- **Then** the API returns `400` with the missing field specified

#### Scenario: Admin user creates service type with a whitespace-only name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates service type with name longer than 255 characters

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **When** I submit the create dialog with a service type name longer than 255 characters
- **Then** validation blocks the request and I see a `Name too long.` message

#### Scenario: Admin user creates a service type with a non-unique name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** A service type with name `Oil Change` exists
- **When** I submit the create dialog with name `Oil Change`
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user creates a service type with a non-unique name that is not case-sensitive

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** A service type with name `Oil Change` exists
- **When** I submit the create dialog with name `oil change`
- **Then** validation blocks the request and I see a `Name already taken.` message

---

### US-12.2 — View service types

#### Scenario: Service types view lists service types

- **Given** I am signed in as admin , area admin, or maintenance and service types exist 
- **When** I open the service types view
- **Then** each row shows the service type name, Frequency Days, Frequency Miles 

#### Scenario: Service types empty state

- **Given** I am signed in as admin , area admin, or maintenance and there are no service types
- **When** I open the service types view
- **Then** I see **"No service types yet. Create your first service type."**

---

### US-12.3 — Manage service type rows

#### Scenario: Service type rows have edit and delete actions 

- **Given** I am signed in as admin , area admin, or maintenance and at least one service type exists
- **When** I view the service type list
- **Then** each row shows **Edit** and **Delete** actions

---

### US-12.4 — Edit and delete service types

#### Scenario: Admin user edits a service type name

- **Given** I am signed in as admin , area admin, or maintenance and a service type named `Oil Change` exists
- **When** I change the name to `Tire Rotation` and submit
- **Then** the API returns `200` with the updated service type
- **And** the list shows `Tire Rotation`

#### Scenario: Admin user edits a service type to have a missing name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** I am editing an existing service type
- **When** I save the row without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a service type to have a whitespace-only name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** I am editing an existing service type
- **When** I save the row with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user updates a service type to have a non-unique name

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** Service types with names `Oil Change` and `Tire Rotation` exist
- **And** I edit `Tire Rotation` to have name `Oil Change`
- **When** I save the row
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user edits a service type to have a non-unique name that is not case-sensitive

- **Given** I am signed in as admin , area admin, or maintenance on the service types view
- **And** A service type with name `Oil Change` exists
- **And** Another service type exists with name `Tire Rotation`
- **When** I save the `Tire Rotation` row with name `oil change`
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: Admin user deletes a service type

- **Given** I am signed in as admin , area admin, or maintenance and a service type named `Oil Change` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that service type is removed from the list

#### Scenario: Admin user updates a service type that does not exist
-   **Given** I am signed in as admin, area admin, or maintenance
-   **And** A service type with id `999` does not exist
-   **When** I request `PUT /api/service-types/999` with a valid body
-   **Then** the API returns `404`

#### Scenario: Admin user updates a service type with an invalid serviceTypeId
-   **Given** I am signed in as admin, area admin, or maintenance 
-   **When** I request `PUT /api/service-types/abc` with a valid body
-   **Then** the API returns `400`

#### Scenario: Admin user deletes a service type that does not exist
-   **Given** I am signed in as admin, area admin, or maintenance 
-   **And** A service type with id `999` does not exist
-   **When** I request `DELETE /api/service-types/999`
-   **Then** the API returns `404`

#### Scenario: Admin user deletes a service type with an invalid serviceTypeId
-   **Given** I am signed in as admin, area admin, or maintenance 
-   **When** I request `DELETE /api/service-types/abc`
-   **Then** the API returns `400` 

---

### US-12.5: Signed-in admin , area admin, or maintenance user access only

#### Scenario: Un-signed-in user accesses service types page
- **Given** I am not signed in
- **When** I navigate to `/service-types` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to service types
- **Given** I have no valid session token
- **When** I request `GET /api/service-types`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular service type
- **Given** I have no valid session token
- **And** A service type with id `1` exists
- **When** I request `GET /api/service-types/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to create a service type
- **Given** I have no valid session token
- **When** I request `POST /api/service-types` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to update a service type
- **Given** I have no valid session token
- **And** A service type with id `1` exists
- **When** I request `PUT /api/service-types/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to delete a service type
- **Given** I have no valid session token
- **And** A service type with id `1` exists
- **When** I request `DELETE /api/service-types/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role accesses service types page
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **When** I navigate to `/service-types` by URL
- **Then** I am redirected to `/home`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to service types
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **When** I request `GET /api/service-types`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to a particular service type
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **And** A service type with id `1` exists
- **When** I request `GET /api/service-types/1`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to create a service type
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **When** I request `POST /api/service-types` with a valid body
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to update a service type
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **And** A service type with id `1` exists
- **When** I request `PUT /api/service-types/1` with a valid body
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin , area admin, or maintenance role API request to delete a service type
- **Given** I am signed in
- **And** I do not have role `admin`, area admin, or maintenance 
- **And** A service type with id `1` exists
- **When** I request `DELETE /api/service-types/1`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-12.1 | Admin user creates a service type | `frontend/tests/ServiceTypes.test.js` | `Admin user creates a service type` |
| US-12.1 | Admin user saves service type | `backend/tests/serviceTypes.test.js` | `Admin user saves service type` |
| US-12.1 | Admin user saves service type | `frontend/tests/ServiceTypes.test.js` | `Admin user saves service type` |
| US-12.1 | Admin user creates service type with missing name | `frontend/tests/ServiceTypes.test.js` | `Admin user creates service type with missing name` |
| US-12.1 | Admin user creates service type with missing field | `frontend/tests/ServiceTypes.test.js` | `Admin user creates service type with missing field` |
| US-12.1 | Admin user creates a service type with only one frequency | `backend/tests/serviceTypes.test.js` | `Admin user creates a service type with only one frequency` |
| US-12.1 | Admin user creates a service type with only one frequency | `frontend/tests/ServiceTypes.test.js` | `Admin user creates a service type with only one frequency` |
| US-12.1 | Admin user requests to create a service type with a missing name | `backend/tests/serviceTypes.test.js` | `Admin user requests to create a service type with a missing name` |
| US-12.1 | Admin user creates service type with a whitespace-only name | `frontend/tests/ServiceTypes.test.js` | `Admin user creates service type with a whitespace-only name` |
| US-12.1 | Admin user creates service type with a whitespace-only name | `backend/tests/serviceTypes.test.js` | `Admin user creates service type with a whitespace-only name` |
| US-12.1 | Admin user creates service type with name longer than 255 characters | `frontend/tests/ServiceTypes.test.js` | `Admin user creates service type with name longer than 255 characters` |
| US-12.1 | Admin user creates service type with name longer than 255 characters | `backend/tests/serviceTypes.test.js` | `Admin user creates service type with name longer than 255 characters` |
| US-12.1 | Admin user creates a service type with a non-unique name | `frontend/tests/ServiceTypes.test.js` | `Admin user creates a service type with a non-unique name` |
| US-12.1 | Admin user creates a service type with a non-unique name | `backend/tests/serviceTypes.test.js` | `Admin user creates a service type with a non-unique name` |
| US-12.1 | Admin user creates a service type with a non-unique name that is not case-sensitive | `frontend/tests/ServiceTypes.test.js` | `Admin user creates a service type with a non-unique name that is not case-sensitive` |
| US-12.1 | Admin user creates a service type with a non-unique name that is not case-sensitive | `backend/tests/serviceTypes.test.js` | `Admin user creates a service type with a non-unique name that is not case-sensitive` |
| US-12.2 | Service types view lists service types | `frontend/tests/ServiceTypes.test.js` | `Service types view lists service types` |
| US-12.2 | Service types empty state | `frontend/tests/ServiceTypes.test.js` | `Service types empty state` |
| US-12.3 | Service type rows have edit and delete actions | `frontend/tests/ServiceTypes.test.js` | `Service type rows have edit and delete actions` |
| US-12.4 | Admin user edits a service type name | `backend/tests/serviceTypes.test.js` | `Admin user edits a service type name` |
| US-12.4 | Admin user edits a service type name | `frontend/tests/ServiceTypes.test.js` | `Admin user edits a service type name` |
| US-12.4 | Admin user edits a service type to have a missing name | `frontend/tests/ServiceTypes.test.js` | `Admin user edits a service type to have a missing name` |
| US-12.4 | Admin user edits a service type to have a missing name | `backend/tests/serviceTypes.test.js` | `Admin user edits a service type to have a missing name` |
| US-12.4 | Admin user edits a service type to have a whitespace-only name | `frontend/tests/ServiceTypes.test.js` | `Admin user edits a service type to have a whitespace-only name` |
| US-12.4 | Admin user edits a service type to have a whitespace-only name | `backend/tests/serviceTypes.test.js` | `Admin user edits a service type to have a whitespace-only name` |
| US-12.4 | Admin user updates a service type to have a non-unique name | `frontend/tests/ServiceTypes.test.js` | `Admin user updates a service type to have a non-unique name` |
| US-12.4 | Admin user updates a service type to have a non-unique name | `backend/tests/serviceTypes.test.js` | `Admin user updates a service type to have a non-unique name` |
| US-12.4 | Admin user edits a service type to have a non-unique name that is not case-sensitive | `frontend/tests/ServiceTypes.test.js` | `Admin user edits a service type to have a non-unique name that is not case-sensitive` |
| US-12.4 | Admin user edits a service type to have a non-unique name that is not case-sensitive | `backend/tests/serviceTypes.test.js` | `Admin user edits a service type to have a non-unique name that is not case-sensitive` |
| US-12.4 | Admin user deletes a service type | `backend/tests/serviceTypes.test.js` | `Admin user deletes a service type` |
| US-12.4 | Admin user deletes a service type | `frontend/tests/ServiceTypes.test.js` | `Admin user deletes a service type` |
| US-12.4 | Admin user updates a service type that does not exist | `backend/tests/serviceTypes.test.js` | `Admin user updates a service type that does not exist` |
| US-12.4 | Admin user updates a service type with an invalid serviceTypeId | `backend/tests/serviceTypes.test.js` | `Admin user updates a service type with an invalid serviceTypeId` |
| US-12.4 | Admin user deletes a service type that does not exist | `backend/tests/serviceTypes.test.js` | `Admin user deletes a service type that does not exist` |
| US-12.4 | Admin user deletes a service type with an invalid serviceTypeId | `backend/tests/serviceTypes.test.js` | `Admin user deletes a service type with an invalid serviceTypeId` |
| US-12.5 | Un-signed-in user accesses service types page | `frontend/tests/ServiceTypes.test.js` | `Un-signed-in user accesses service types page` |
| US-12.5 | Unauthenticated API request to service types | `backend/tests/serviceTypes.test.js` | `Unauthenticated API request to service types` |
| US-12.5 | Unauthenticated API request to a particular service type | `backend/tests/serviceTypes.test.js` | `Unauthenticated API request to a particular service type` |
| US-12.5 | Unauthenticated API request to create a service type | `backend/tests/serviceTypes.test.js` | `Unauthenticated API request to create a service type` |
| US-12.5 | Unauthenticated API request to update a service type | `backend/tests/serviceTypes.test.js` | `Unauthenticated API request to update a service type` |
| US-12.5 | Unauthenticated API request to delete a service type | `backend/tests/serviceTypes.test.js` | `Unauthenticated API request to delete a service type` |
| US-12.5 | Signed-in user without admin , area admin, or maintenance role accesses service types page | `frontend/tests/ServiceTypes.test.js` | `Signed-in user without admin , area admin, or maintenance role accesses service types page` |
| US-12.5 | Signed-in user without admin , area admin, or maintenance role API request to service types | `backend/tests/serviceTypes.test.js` | `Signed-in user without admin , area admin, or maintenance role API request to service types` |
| US-12.5 | Signed-in user without admin , area admin, or maintenance role API request to a particular service type | `backend/tests/serviceTypes.test.js` | `Signed-in user without admin , area admin, or maintenance role API request to a particular service type` |
| US-12.5 | Signed-in user without admin , area admin, or maintenance role API request to create a service type | `backend/tests/serviceTypes.test.js` | `Signed-in user without admin , area admin, or maintenance role API request to create a service type` |
| US-12.5 | Signed-in user without admin , area admin, or maintenance role API request to update a service type | `backend/tests/serviceTypes.test.js` | `Signed-in user without admin , area admin, or maintenance role API request to update a service type` |
| US-12.5 | Signed-in user without admin , area admin, or maintenance role API request to delete a service type | `backend/tests/serviceTypes.test.js` | `Signed-in user without admin , area admin, or maintenance role API request to delete a service type` |

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-001**–**FR-004** satisfied)
- [x] **Success Criteria (SC-001**–**SC-003)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Ensuring used service type is not deleted since service log does not exist yet. 

---

## Delivered to later features

- A service type row with `id`, `name`, `service_frequency_days`, and `service_frequency_miles`
- `GET /api/service-types` returns every service type for any valid session with `admin`, `area_admin`, or `maintenance` role
- Delete removes an existing service type unconditionally and returns `200`
 