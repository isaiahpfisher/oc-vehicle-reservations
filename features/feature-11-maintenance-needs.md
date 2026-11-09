# Feature: Maintenance Needs

**Feature ID:** 11
**Branch pattern:** `feature/11-maintenance-needs`
**Status:** Draft
**Created:** 2026-11-02
**Input:** Signed-in admin, area admin, or maintenance users manage maintenance needs. An admin sees every maintenance need. An area admin sees and manages maintenance needs for areas they administer. An admin or area admin can create a maintenance need from an issue report. The list is a table. Create and edit each have their own page. 
**Depends on:** Feature 10 [Issue Reports]

---

## User Stories

### US-11.1: Create maintenance need from maintenance needs page

**As a** signed-in admin, area admin, or maintenance user
**I want to** create a maintenance need from the maintenance needs page
**So that** maintenance users know what maintenance needs to be done

**Priority:** P1
**Independent test:** Open the create maintenance page, create a maintenance need; it appears in the maintenance needs table
**Acceptance scenarios:** see ### US-11.1 under Acceptance Criteria

### US-11.2: Create maintenance need from issue report

**As a** signed-in admin or area admin
**I want to** create a maintenance need from an issue report
**So that** I don't have to re-enter data and maintenance users know what maintenance needs to be done

**Priority:** P1
**Independent test:** Create a maintenance need from the issue reports list; it appears in the maintenance needs table
**Acceptance scenarios:** see ### US-11.2 under Acceptance Criteria

### US-11.3: View maintenance need list

**As a** signed-in admin, area admin, or maintenance user
**I want to** see all maintenance needs that I can manage
**So that** I can see which maintenance needs exist

**Priority:** P1
**Independent test:** Maintenance needs view loads a single list of open maintenance needs (default for admin and area admin); another tab loads a single list of resolved maintenance needs; another tab loads a single list of all maintenance needs; maintenance users have an additional tab which is maintenance needs assigned to them (default for maintenance)
**Acceptance scenarios:** see ### US-11.3 under Acceptance Criteria

### US-11.4: Maintenance need actions

**As a** signed-in admin, area admin, or maintenance user
**I want** each maintenance need row to have **edit** and **delete** actions
**So that** I can manage maintenance needs from the maintenance needs view

**Priority:** P1
**Independent test:** Each maintenance need row exposes edit and delete icon actions 
**Acceptance scenarios:** see ### US-11.4 under Acceptance Criteria

### US-11.5: Edit and delete maintenance needs

**As a** signed-in admin, area admin, or maintenance user
**I want to** edit or delete a maintenance need
**So that** I can keep maintenance needs up to date

**Priority:** P2
**Independent test:** Edit a maintenance need from its page and delete it from the table; the maintenance needs table updates
**Acceptance scenarios:** see ### US-11.5 under Acceptance Criteria

### US-11.6: Signed-in admin, area admin, or maintenance user access only

**As a** signed-in admin user
**I want to** have maintenance needs visible only to signed-in admin, area admin, or maintenance users
**So that** Unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/maintenance-needs`, `/maintenance-needs/new`, and `/maintenance-needs/:id` are redirected to `/login`; unauthorized API requests or requests without `admin`, `area_admin`, or `maintenance` role receive errors; signed in user without `admin`, `area_admin`, or `maintenance` role is redirected to `/`; `area_admin` role only receives data corresponding to the area admin's area
**Acceptance scenarios:** see ### US-11.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All maintenance need endpoints MUST require a valid session and `admin`, `area_admin`, or `maintenance` role (`authorizeRoles('admin', 'area_admin', 'maintenance')` middleware).
- **FR-002**: `id` is assigned by the database.
- **FR-003**: `issue_report_id` MUST correspond to an existing issue report and be unique or be null.
- **FR-004**: `issue_report_id` MUST be null when the author does not have `admin` or `area_admin` role.
- **FR-005**: `author_id` MUST correspond to the user creating the maintenance need.
- **FR-006**: `assignee_id` MUST correspond to an existing user with maintenance role or be null.
- **FR-007**: `title` MUST be trimmed before save. An empty title MUST be rejected. 
- **FR-008**: `title` MUST be at most 50 characters after trim. Longer strings MUST be rejected. 
- **FR-009**: An empty `out_of_service` MUST be rejected.
- **FR-010**: `priority` MUST be selected from existing enum of `High`, `Medium`, `Low`, or `None`. Empty priority MUST be rejected. 
- **FR-011**: `status` MUST be selected from existing enum of `Open`, `In Progress`, `Completed`, or `Canceled`. Empty status MUST be rejected. 
- **FR-012**: `resolved_at` MUST be either null or a valid date between 1950-01-01 and the current date, inclusive, in format `yyyy-mm-dd`.
- **FR-013**: `resolved_at` MUST be null if `status` is `Open` or `In Progress`.
- **FR-014**: `resolved_at` MUST NOT be null if `status` is `Completed` or `Canceled`.

---

## Assumptions

- The maintenance needs list is a table. Create is the page `/maintenance-needs/new`. Edit is the page `/maintenance-needs/:id`. Delete uses a confirmation dialog. There is no split sidebar/main panel.
- Request and response JSON uses camelCase (`issueReportId`, `resolvedAt`), matching the rest of the API. 
- If assignee for an issue report is not null, and a maintenance need is created from the issue report, then it is assumed that the assignee has role `maintenance`.
- `npm run seed` also inserts issue reports, maintenance needs, and mileage logs, and replaces those rows on the next seed.

## Edge Cases

- Issue report id that is not null and does not exist → client block and/or `400`.
- Issue report id that is not unique → client block and/or `400`.
- Empty author id → saved as current user id.
- Author id that does not exist → saved as current user id.
- Empty vehicle id → client block and/or `400`.
- Vehicle id that does not exist → client block and/or `400`.
- Assignee id that is not null and does not exist → client block and/or `400`.
- Empty or whitespace-only title → client block and/or `400`.
- Title longer than 50 characters → `400`.
- Title for maintenance need created from issue report → `Maintenance Needed`.
- Empty out of service designation → client block and/or `400`.
- Non-boolean out of service designation → `400`.
- Empty priority → `400`.
- Priority other than `High`, `Medium`, `Low`, or `None` → `400`.
- Empty status → `400`.
- Status other than `Open`, `In Progress`, `Completed`, or `Canceled` → `400`.
- Resolved at date before `1950-01-01` → `400`.
- Resolved at date after today → `400`.
- Resolved at date not null when status is `Open` or `In Progress` → saved as null.
- Resolved at date null when status is `Completed` or `Canceled` → saved as today.
- Unauthenticated maintenance needs screen → redirect to `/login`. 
- Authenticated maintenance needs screen without `admin`, `area_admin`, or `maintenance` role → redirect to `/`. 
- Unauthenticated API request → `401`.
- API request without `admin`, `area_admin`, or `maintenance` role → `403`.
- API request that doesn't match an area admin's `area_id` for the vehicle → `403`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin user can edit and delete maintenance needs from the table, create a maintenance need on `/maintenance-needs/new`, create a maintenance need from an issue report, and edit a maintenance need on `/maintenance-needs/:id`.
- **SC-003**: Signed-in area admin user can edit and delete maintenance needs for their areas from the table, create a maintenance need on `/maintenance-needs/new`, create a maintenance need from an issue report, and edit a maintenance need on `/maintenance-needs/:id`.
- **SC-004**: Signed-in maintenance user can edit and delete maintenance needs from the table, create a maintenance need on `/maintenance-needs/new`, and edit a maintenance need on `/maintenance-needs/:id`.
- **SC-005**: `npm test` passes for maintenance needs API and maintenance needs view behavior.

---

## Data Ownership & Isolation

Any signed in admin, area admin, or maintenance user may create, edit, delete, or read the list of maintenance needs. For area admins that are not also an admin, this is limited to the areas the user is the area admin of. Admins and area admins can also create a maintenance need for an issue report.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/maintenance-needs` and `GET /api/maintenance-needs/:maintenanceNeedId` require a Bearer token and `admin`, `area_admin`, or `maintenance` role. `admin` and `maintenance` roles read all maintenance needs; `area_admin` reads all maintenance needs of matching area_id of the vehicle. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token and `admin`, `area_admin`, or `maintenance` role. `area_admin` also requires matching area_id. |
| **Create scope** | `POST` requires a Bearer token and `admin`, `area_admin`, or `maintenance` role. `area_admin` may only create maintenance needs for vehicles in their area. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/maintenance-needs` | Yes - Admin, Area Admin, Maintenance | Fetch all maintenance needs for admin or maintenance; fetch all maintenance needs belonging to vehicles of the same area for area admin |
| `GET` | `/api/maintenance-needs/:maintenanceNeedId` | Yes - Admin, Area Admin, Maintenance | Fetch a single maintenance need for admin or maintenance; fetch a single maintenance need if its vehicle belongs to the same area for area admin |
| `POST` | `/api/maintenance-needs` | Yes - Admin, Area Admin, Maintenance | Create a maintenance need for admin or maintenance; create a maintenance need for a vehicle with the same `area_id` as the area admin's `area_id` for area admin |
| `PUT` | `/api/maintenance-needs/:maintenanceNeedId` | Yes - Admin, Area Admin, Maintenance | Edit a maintenance need for admin or maintenance; edit a maintenance need if its vehicle belongs to the same area for area admin |
| `DELETE` | `/api/maintenance-needs/:maintenanceNeedId` | Yes - Admin, Area Admin, Maintenance | Delete a maintenance need for admin or maintenance; delete a maintenance need if its vehicle belongs to the same area for area admin |

**Create maintenance need request body:**

```json
{
  "issueReportId": 1,
  "authorId": 1,
  "vehicleId": 1,
  "assigneeId": 3,
  "description": "Change the oil",
  "title": "Oil Change",
  "outOfService": false,
  "priority": "Medium",
  "status": "Open",
  "resolvedAt": null
}
```

**Create maintenance need request body for the following issue report:**

```json
{
  "id": 1,
  "vehicleId": 3,
  "vehicleRequestId": 12,
  "authorId": 2,
  "assigneeId": 5,
  "type": "maintenance",
  "description": "Oil change needed.",
  "status": "pending",
  "resolvedAt": null,
  "author": {
    "id": 2,
    "firstName": "Jane",
    "lastName": "Doe"
  },
  "assignee": {
    "id": 5,
    "firstName": "Alex",
    "lastName": "Kim"
  },
  "vehicle": {
    "id": 3,
    "universityId": "V-100"
  },
  "vehicleRequest": {
    "id": 12,
    "purpose": "Campus visit"
  },
  "createdAt": "2026-10-23T12:00:00.000Z",
  "updatedAt": "2026-10-23T12:00:00.000Z"
}
```

```json
{
  "issueReportId": 1,
  "authorId": 1,
  "vehicleId": 3,
  "assigneeId": 5,
  "description": "Oil change needed.",
  "title": "Maintenance Needed",
  "outOfService": true,
  "priority": "None",
  "status": "Open",
  "resolvedAt": null
}
```

**Maintenance need success response** (`200` / `201`):

```json
{
  "id": 1,
  "issueReportId": 1,
  "authorId": 1,
  "vehicleId": 1,
  "assigneeId": 3,
  "description": "Change the oil",
  "title": "Oil Change",
  "outOfService": false,
  "priority": "Medium",
  "status": "Open",
  "resolvedAt": null,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404`.
**Unauthorized** (lacking `area_admin`, `admin`, or `maintenance` role, or `area_admin` with an area other than the specified vehicle's area): `403`.

---

## Screen Requirements

### [View: Maintenance Needs] — route name `maintenance-needs`

**MaintenanceNeeds.vue** (`/maintenance-needs`) — no sidebar / main-panel split.

- Heading: **Maintenance Needs**
- Primary action: **+ New Maintenance Need** opens `/maintenance-needs/new`.
- There are four tabs: **Assigned to Me** (maintenance), **Open** (admin, area admin, maintenance), **Resolved** (admin, area admin, maintenance), and **All** (admin, area admin, maintenance). The default tab is `Assigned to Me` for maintenance and `Open` for admin and area admin. 
- **Assigned to Me** lists the maintenance needs assigned to that particular user and status `Open`. Empty state: `Nothing to do. Enjoy your day!`
- **Open** lists all maintenance needs with status `Open` or `In Progress`.
- **Resolved** lists all maintenance needs with status `Completed` or `Canceled`.
- **All** lists all maintenance needs.
- All of the above tabs are ordered from most recent to oldest.
- Display maintenance needs in a `<v-data-table>` (10 per page), matching the users table. Columns are **Title**, **Priority**, **Assignee**, **Status**, and **Actions**. 
- The **Edit maintenance need** icon (`mdi-pencil`) opens `/maintenance-needs/:id`.
- **Delete maintenance need** opens a confirmation `<ConfirmModal>` from `components/common`.
- Icon-only row actions use `size="small"`, `variant="text"`, and `aria-label`s **Edit maintenance need** and **Delete maintenance need**.
- **Empty state:** **"No maintenance needs yet. Create a maintenance need."**
- **Loading state:** skeleton or progress indicator while maintenance needs are fetching.
- **Error state:** `<v-alert type="error">` for API failures.
- **App chrome:** the list route has `meta.nav: "Maintenance Needs"`, `meta.navGroup: "Fleet"`, and `meta.roles: ["admin", "area_admin", "maintenance"]`, so the **Maintenance Needs** link shows in the Sidebar **Fleet** section for admins, maintenance, and area admins and is hidden for everyone else. Create and edit do not add a nav link.

### [View: New maintenance need] — route name `maintenanceNeedCreate` (`/maintenance-needs/new`)

**MaintenanceNeedsForm.vue**. Register this route before `/maintenance-needs/:id`.

- Heading: **New maintenance need**
- Empty fields: **Title**, **Assignee** (optional), **Out of Service**, **Priority**, **Status**, **Resolve Date**, **Vehicle**, and **Description**.
- **Vehicle** is a `<v-select>` that shows vehicle information in format `Color Make Model (License Plate)` (e.g., `Black Toyota Sienna (ABC-123)`) and submits the vehicle id. Admins see every vehicle. Area admins see only their vehicles.
- **Title** is a text field that limits input to 50 characters.
- **Assignee** is a `<v-select>` that shows the names of maintenance workers in format `First Last` (e.g., `John Doe`) and submits the user id. If the current user is a maintenance worker, then they are also on the list and their name is the default value.
- **Description** is a text box.
- **Out of Service** is a `<v-select>` with `Yes` and `No`, corresponding to `true` and `false`, respectively. The default value is `Yes`.
- **Priority** is a `<v-select>` with default value `None`.
- **Status** is a `<v-select>` with default value `Open`.
- **Resolve Date** only shows when **Status** is **Completed** or **Canceled** and is a date picker with default value of the current day. 
- **Create** submits `POST /api/maintenance-needs`. On `201`, go to `/maintenance-needs`.
- **Cancel** returns to `/maintenance-needs` without saving.
- Same loading and error states as the list.

### [View: Edit maintenance need] — route name `maintenanceNeedEdit` (`/maintenance-needs/:id`)

**MaintenanceNeedsForm.vue**, same fields as the create page, pre-filled from `GET /api/maintenance-needs/:maintenanceNeedId`.

- Heading: the maintenance need heading.
- **View issue report** is at the top of this page. It is grayed out and not clickable if `issue_report_id` is null. Else, it redirects to `/issue-reports/:id`.
- Beside it, a button reads **Mark in progress** when **Status** is `Open` and **Mark completed** when **Status** is `In Progress`. For any other status it reads **Mark completed** and is grayed out. The label and grayed-out state follow **Status** as it changes on this page, before **Save**. Clicking the active button sets **Status** to `In Progress` or `Completed` and saves the same way **Save** does. The grayed-out button does not save.
- **Save** and **Cancel** are buttons on this page. **Save** submits `PUT /api/maintenance-needs/:id`. On success, go to `/maintenance-needs`. **Save** shows **Saving…** while that request is in progress.
- **Cancel** returns to `/maintenance-needs` without saving. It does not call the API.
- If **Save** fails, the message is shown directly above **Save** and **Cancel**.
- The fields behave the same as on the create page.
- An area admin opening a maintenance need outside their areas is redirected to `/`.
- Same loading and error states as the list.

### [View: Issue Reports] — route name `issue-reports`

- Same view as in Feature 10 [feature-10-issue-report.md] with the following changes
- On the list page, in Actions, there is an icon visible to admin and area admin. Hovering shows **Create maintenance need**. This icon is grayed out if the type of issue is not `maintenance` or a maintenance need for that issue report has already been created.
- This icon submits `POST /api/maintenance-needs` with title `Maintenance Needed`; issue report id, vehicle id, assignee id, and description from the issue report; resolved at as null; and all other fields their default values.

**Implementation note:** three routes. The table is `MaintenanceNeeds.vue`. Create and edit share `MaintenanceNeedsForm.vue`. Delete uses the shared confirm dialog. The **Maintenance Needs** nav link is only on the list route, in the Sidebar **Fleet** section.
**Routing note:** Page `/issue-reports/:id` does not exist and is redirected to `/issue-reports` with an alert `There is no page for /issue-reports/:id. This is a placeholder for when such a page comes into existence.`

---

## Key Entities

- **Maintenance Need**: a maintenance need for a particular vehicle authored by a particular author and optionally connected to a particular issue report.

---

## Data Model Requirements

### `maintenance_needs` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `issue_report_id` | INTEGER FK | Optional; unique |
| `author_id` | INTEGER FK | Required |
| `vehicle_id` | INTEGER FK | Required |
| `assignee_id` | INTEGER FK | Optional |
| `title` | STRING | Required; trimmed; max 50 |
| `description` | TEXT | Optional |
| `out_of_service` | BOOLEAN | Required |
| `priority` | ENUM | Required; `High`, `Medium`, `Low`, `None` |
| `status` | ENUM | Required; `Open`, `In Progress`, `Completed`, `Canceled` |
| `resolved_at` | DATE | Optional; min `1950-01-01`; max current date; must be in format `yyyy-mm-dd` |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- Each maintenance need has zero or one issue report
- Issue reports can have at most one maintenance need
- Each maintenance need belongs to one author
- Each maintenance need has one vehicle
- Each maintenance need has zero or one assignees
- A user can author many maintenance needs
- A maintenance user can be assigned to many maintenance needs

---

## Acceptance Criteria (Gherkin)

### US-11.1 — Create maintenance need from maintenance needs page

#### Scenario: Admin user creates a maintenance need

- **Given** I am signed in as admin on the maintenance needs view
- **When** I click **+ New Maintenance Need**
- **Then** I am on `/maintenance-needs/new` and I see **Title**, **Assignee**, **Out of Service**, **Priority**, **Status**, **Resolve Date**, **Vehicle**, and **Description**.
- **And** The **Vehicle** dropdown lists all vehicles
- **And** **Resolve Date** is only showing when **Status** gets selected as `Completed` or `Canceled`

#### Scenario: Area admin user creates a maintenance need

- **Given** I am signed in as area admin on the maintenance needs view
- **When** I click **+ New Maintenance Need**
- **Then** I am on `/maintenance-needs/new` and I see **Title**, **Assignee**, **Out of Service**, **Priority**, **Status**, **Resolve Date**, **Vehicle**, and **Description**.
- **And** The **Vehicle** dropdown lists only vehicles that belong to areas that the user is an area admin of
- **And** **Resolve Date** is only showing when **Status** gets selected as `Completed` or `Canceled`

#### Scenario: Maintenance user creates a maintenance need

- **Given** I am signed in as maintenance on the maintenance needs view
- **When** I click **+ New Maintenance Need**
- **Then** I am on `/maintenance-needs/new` and I see **Title**, **Assignee**, **Out of Service**, **Priority**, **Status**, **Resolve Date**, **Vehicle**, and **Description**.
- **And** The **Vehicle** dropdown lists all vehicles
- **And** The default assignee is that user
- **And** **Resolve Date** is only showing when **Status** gets selected as `Completed` or `Canceled`

#### Scenario: Admin user saves maintenance need

- **Given** I am signed in as admin on the maintenance needs view
- **When** I submit the create page with all valid values
- **Then** the API returns `201` with that maintenance need
- **And** The new maintenance need appears in the maintenance needs list

#### Scenario: Area admin user saves maintenance need

- **Given** I am signed in as area admin on the maintenance needs view
- **When** I submit the create page with all valid values
- **Then** the API returns `201` with that maintenance need
- **And** The new maintenance need appears in the maintenance needs list

#### Scenario: Maintenance user saves maintenance need

- **Given** I am signed in as maintenance on the maintenance needs view
- **When** I submit the create page with all valid values
- **Then** the API returns `201` with that maintenance need
- **And** The new maintenance need appears in the maintenance needs list

#### Scenario: Admin user cancels creating maintenance need

- **Given** I am signed in as admin on the maintenance needs view
- **When** I am in the create maintenance need page
- **And** I click **Cancel**
- **Then** I am returned to `/maintenance-needs`
- **And** No API request is sent

#### Scenario: Admin user requests to create a maintenance need

- **Given** I am signed in as admin on the maintenance needs view
- **When** I submit `POST /api/maintenance-needs` with a valid body 
- **Then** the API returns `201` with that maintenance need
- **And** The new maintenance need appears in the maintenance needs list

#### Scenario: Admin user creates a maintenance need with a missing title

- **Given** I am signed in as admin on the maintenance needs view
- **When** I submit the create page with no title 
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a maintenance need with a whitespace-only title

- **Given** I am signed in as admin on the maintenance needs view
- **When** I submit the create page with title ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Title input accepts at most 50 characters

- **Given** I am signed in as admin on the maintenance needs view
- **When** I try to enter 51 characters in the title input field
- **Then** I can only enter 50 characters


#### Scenario: Resolve date is hidden unless status is Completed or Canceled

- **Given** I am signed in as admin on the maintenance needs view
- **When** I change the status to `Completed` or `Canceled`
- **Then** I see a date picker for resolve date
- **And** The default value is today

#### Scenario: New maintenance need defaults are Out of Service Yes, Priority None, and Status Open

- **Given** I am signed in as admin on the maintenance needs view
- **When** I am on the create page
- **Then** the default values are Out of Service `Yes`, Priority `None`, and Status `Open`.

#### Scenario: Admin user requests to create a maintenance need with a missing title

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ title: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing title." }`

#### Scenario: Admin user requests to create a maintenance need with a whitespace-only title

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ title: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing title." }`

#### Scenario: Admin user requests to create a maintenance need with a title longer than 50 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with a title longer than 50 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Title cannot be longer than 50 characters." }`

#### Scenario: Admin user requests to create a maintenance need with a missing vehicle id

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ vehicleId: null }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing vehicle id." }`

#### Scenario: Admin user requests to create a maintenance need with a vehicle id that does not exist

- **Given** I am signed in as admin
- **And** A vehicle with id `45` does not exist
- **When** I request `POST /api/maintenance-needs` with `{ vehicleId: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Vehicle does not exist." }`

#### Scenario: Admin user requests to create a maintenance need with a missing author id

- **Given** I am signed in as admin
- **And** My user_id is `2`
- **When** I request `POST /api/maintenance-needs` with `{ authorId: null }` and a valid rest of the body
- **Then** the API creates the maintenance need with `{ authorId: 2 }`

#### Scenario: Admin user requests to create a maintenance need with an author id that is not their own

- **Given** I am signed in as admin
- **And** My user_id is `2`
- **When** I request `POST /api/maintenance-needs` with `{ authorId: 45 }` and a valid rest of the body
- **Then** the API creates the maintenance need with `{ authorId: 2 }`
- **And** The maintenance need appears in the list

#### Scenario: Admin user requests to create a maintenance need with an assignee id that does not exist

- **Given** I am signed in as admin
- **And** A user with id `45` does not exist
- **When** I request `POST /api/maintenance-needs` with `{ assigneeId: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "User does not exist." }`

#### Scenario: Admin user requests to create a maintenance need with an assignee who is not a maintenance user

- **Given** I am signed in as admin
- **And** A user with id `45` exists but does not have role `maintenance`
- **When** I request `POST /api/maintenance-needs` with `{ assigneeId: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "User does not have maintenance role." }`

#### Scenario: Admin user requests to create a maintenance need with a missing out-of-service value

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ outOfService: null }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Out of service boolean is required." }`

#### Scenario: Admin user requests to create a maintenance need with a non-boolean out-of-service value

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ outOfService: 'Yes' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Out of service boolean must be a boolean." }`

#### Scenario: Admin user requests to create a maintenance need with a missing priority

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ priority: null }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Priority is required." }`

#### Scenario: Admin user requests to create a maintenance need with an invalid priority

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ priority: 'Urgent' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Priority must be Low, Medium, High, or None." }`

#### Scenario: Admin user requests to create a maintenance need with a missing status

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ status: null }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Status is required." }`

#### Scenario: Admin user requests to create a maintenance need with an invalid status

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ status: 'Postponed' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Status must be Open, In Progress, Completed, or Canceled." }`

#### Scenario: Admin user requests to create a maintenance need with a resolved date before 1950

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ resolvedAt: '1949-01-01' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Resolved at date must be between 1950 and today." }`

#### Scenario: Admin user requests to create a maintenance need with a resolved date after today

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with resolved at date after today and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Resolved at date must be between 1950 and today." }`

#### Scenario: Admin user requests to create a maintenance need with a resolved date that is not yyyy-mm-dd

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ resolvedAt: '2026/01/01' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Resolved at date must be in format yyyy-mm-dd." }`

#### Scenario: Admin user requests to create a maintenance need with a resolved date while status is Open

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ status: 'Open' }` and `{ resolvedAt: '2026-11-03' }` and a valid rest of the body
- **Then** `resolvedAt` is saved as null
- **And** The maintenance need is created

#### Scenario: Admin user requests to create a maintenance need with a resolved date while status is In Progress

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ status: 'In Progress' }` and `{ resolvedAt: '2026-11-03' }` and a valid rest of the body
- **Then** `resolvedAt` is saved as null
- **And** The maintenance need is created

#### Scenario: Admin user requests to create a maintenance need with status Completed and no resolved date

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ status: 'Completed' }` and `{ resolvedAt: null }` and a valid rest of the body
- **Then** `resolvedAt` is saved as the current date
- **And** The maintenance need is created

#### Scenario: Admin user requests to create a maintenance need with status Canceled and no resolved date

- **Given** I am signed in as admin
- **When** I request `POST /api/maintenance-needs` with `{ status: 'Canceled' }` and `{ resolvedAt: null }` and a valid rest of the body
- **Then** `resolvedAt` is saved as the current date
- **And** The maintenance need is created

#### Scenario: Admin user requests to create a maintenance need with an issue report id that does not exist

- **Given** I am signed in as admin
- **And** An issue report with id `45` does not exist
- **When** I request `POST /api/maintenance-needs` with `{ issueReportId: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Issue report id does not exist." }`

#### Scenario: Admin user requests to create a maintenance need with an issue report id that is already used

- **Given** I am signed in as admin
- **And** A maintenance need with issue report id `45` exists
- **When** I request `POST /api/maintenance-needs` with `{ issueReportId: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Issue report already belongs to a maintenance need." }`

#### Scenario: Area admin user requests to create a maintenance need for a vehicle outside their area

- **Given** I am signed in as area admin
- **And** I belong to area with id `1`
- **And** A vehicle with id `1` and area id `2` exists
- **When** I request `POST /api/maintenance-needs` with `{ vehicleId: 1 }` and a valid rest of the body
- **Then** the API returns `403` with `{ message: "Unauthorized for this area." }`

---

### US-11.2 — Create maintenance need from issue report

#### Scenario: Admin user sees Create Maintenance Need on a maintenance issue report

- **Given** I am signed in as admin
- **And** Issue reports exist
- **When** I navigate to the issue reports view
- **Then** I see an icon on every row. Hovering shows **Create maintenance need**

#### Scenario: Create Maintenance Need is unavailable when the issue type is not maintenance

- **Given** I am signed in as admin
- **And** Issue reports exist that have type other than `maintenance`
- **When** I navigate to the issue reports view
- **Then** The icon is grayed out on each such row

#### Scenario: Create Maintenance Need is unavailable when that issue report already has a maintenance need

- **Given** I am signed in as admin
- **And** Issue reports exist that have a matching maintenance need
- **When** I navigate to the issue reports view
- **Then** The icon is grayed out on each such row

#### Scenario: Admin user creates a maintenance need from an issue report

- **Given** I am signed in as admin and on the issue reports view
- **And** An issue report with type `maintenance` and without a maintenance need exists
- **When** I click the **Create maintenance need** icon on that row
- **Then** A maintenance need with title `Maintenance Needed`; vehicle id, assignee id, description from the issue report; and other fields as default values is created
- **And** The maintenance need appears in the maintenance needs view
- **And** The **Create maintenance need** icon is grayed out

#### Scenario: Admin user requests to create a maintenance need from an issue report

- **Given** I am signed in as admin
- **And** An issue report with id `1` exists
- **When** I request `POST /api/maintenance-needs` with `{ issueReportId: 1 }` and a valid rest of the body
- **Then** the API returns `201` with that maintenance need which contains title `Maintenance Needed`; vehicle id, assignee id, description from the issue report; and other fields as default values 
- **And** The new maintenance need appears in the maintenance needs list

### US-11.3: View maintenance need list

#### Scenario: Maintenance needs view lists maintenance needs for admin

- **Given** I am signed in as admin and maintenance needs exist 
- **When** I open the maintenance needs view
- **Then** each row shows **Title**, **Priority**, **Assignee**, **Status**, and **Actions**. 

#### Scenario: Maintenance needs view lists maintenance needs for area admin

- **Given** I am signed in as area admin and maintenance needs exist 
- **When** I open the maintenance needs view
- **Then** each row shows **Title**, **Priority**, **Assignee**, **Status**, and **Actions**. 
- **And** No rows are for vehicles outside of my area(s).

#### Scenario: Maintenance needs view lists maintenance needs for a maintenance user

- **Given** I am signed in as maintenance and maintenance needs exist 
- **When** I open the maintenance needs view
- **Then** each row shows **Title**, **Priority**, **Assignee**, **Status**, and **Actions**. 

#### Scenario: Maintenance needs empty state

- **Given** I am signed in as admin and there are no maintenance needs
- **When** I open the maintenance needs view
- **Then** I see **"No maintenance needs yet. Create a maintenance need."**

#### Scenario: Maintenance needs admin tabs

- **Given** I am signed in as admin 
- **When** I open the maintenance needs view
- **Then** I see tabs **Open**, **Resolved**, and **All**.
- **And** I am on the **Open** tab.

#### Scenario: Maintenance needs area admin tabs

- **Given** I am signed in as area admin 
- **When** I open the maintenance needs view
- **Then** I see tabs **Open**, **Resolved**, and **All**.
- **And** I am on the **Open** tab.
- **And** Maintenance needs for areas I am not an area admin of appear in no lists.

#### Scenario: Maintenance needs maintenance tabs

- **Given** I am signed in as maintenance 
- **When** I open the maintenance needs view
- **Then** I see tabs **Assigned to Me**, **Open**, **Resolved**, and **All**.
- **And** I am on the **Assigned to Me** tab.

#### Scenario: Maintenance needs table Open tab

- **Given** I am signed in as admin and maintenance needs exist
- **When** I open the maintenance needs view
- **Then** The default tab is **Open**
- **And** The list shows all open or in progress maintenance needs
- **And** Maintenance needs without status `Open` are not in the list
- **And** The list is ordered from most recent to oldest

#### Scenario: Maintenance needs table Assigned to Me tab

- **Given** I am signed in as maintenance and maintenance needs exist
- **When** I open the maintenance needs view
- **Then** The default tab is **Assigned to Me**
- **And** The list shows all open maintenance needs assigned to me and status `Open`
- **And** Maintenance needs without status `Open` are not in the list
- **And** Maintenance needs not assigned to me are not in the list
- **And** The list is ordered from most recent to oldest

#### Scenario: Maintenance needs table Assigned to Me empty state

- **Given** I am signed in as maintenance and no maintenance needs exist
- **When** I navigate to the **Assigned to Me** tab
- **Then** I see **Nothing to do. Enjoy your day!**

#### Scenario: Maintenance needs table All tab

- **Given** I am signed in as admin and maintenance needs exist
- **When** I open the maintenance needs view and click on the tab **All**
- **Then** The list shows all maintenance needs
- **And** The list is ordered from most recent to oldest

#### Scenario: Maintenance needs table Resolved tab

- **Given** I am signed in as admin and maintenance needs exist
- **When** I open the maintenance needs view and click on the tab **Resolved**
- **Then** The list shows the resolved maintenance needs
- **And** The list is ordered from most recent to oldest
- **And** Unresolved maintenance needs are not in the list

#### Scenario: Maintenance needs table shows 10 rows per page

- **Given** I am signed in as admin and more than 10 maintenance needs with status `Open` or `In Progress` exist
- **When** I open the maintenance needs view 
- **Then** The list shows only the first 10 maintenance needs with status `Open` or `In Progress`
- **And** The list is ordered from most recent to oldest
- **And** I can go to the next page to see the next 10 maintenance needs

---

### US-11.4: Maintenance need actions

#### Scenario: Maintenance need rows have edit and delete actions

- **Given** I am signed in as admin and at least one maintenance need exists
- **When** I view the maintenance need list
- **Then** each row shows **Edit maintenance need** and **Delete maintenance need** actions

---

### US-11.5: Edit and delete maintenance needs

#### Scenario: Admin user opens the maintenance needs page

- **Given** I am signed in as admin on the maintenance needs view
- **When** I open that maintenance need
- **Then** I am on `/maintenance-needs/:id` and I see **Title**, **Assignee**, **Out of Service**, **Priority**, **Status**, **Resolve Date**, **Vehicle**, and **Description**.
- **And** The fields are pre-filled with information for that maintenance need
- **And** The **Vehicle** dropdown lists all vehicles
- **And** **Resolve Date** is only showing when **Status** gets selected as `Completed` or `Canceled`

#### Scenario: Area admin user opens the maintenance needs page

- **Given** I am signed in as area admin on the maintenance needs view
- **When** I open that maintenance need
- **Then** I am on `/maintenance-needs/:id` and I see **Title**, **Assignee**, **Out of Service**, **Priority**, **Status**, **Resolve Date**, **Vehicle**, and **Description**.
- **And** The fields are pre-filled with information for that maintenance need
- **And** The **Vehicle** dropdown lists only vehicles for my area(s)
- **And** **Resolve Date** is only showing when **Status** gets selected as `Completed` or `Canceled`

#### Scenario: Maintenance user opens the maintenance needs page

- **Given** I am signed in as maintenance on the maintenance needs view
- **When** I open that maintenance need
- **Then** I am on `/maintenance-needs/:id` and I see **Title**, **Assignee**, **Out of Service**, **Priority**, **Status**, **Resolve Date**, **Vehicle**, and **Description**.
- **And** The fields are pre-filled with information for that maintenance need
- **And** The **Vehicle** dropdown lists all vehicles
- **And** **Resolve Date** is only showing when **Status** gets selected as `Completed` or `Canceled`

#### Scenario: View issue report is not clickable when there is no issue report

- **Given** I am signed in as admin
- **And** a maintenance need with id `1` and no issue report exists
- **When** I am on the edit page for that maintenance need
- **Then** The **View issue report** button is grayed out

#### Scenario: Mark in progress shows when status is Open

- **Given** I am signed in as admin and am on the edit page for a maintenance need with status `Open`
- **Then** I see **Mark in progress** beside **View issue report**

#### Scenario: Mark in progress sets status to In Progress

- **Given** I am signed in as admin and am on the edit page for a maintenance need with status `Open`
- **When** I click **Mark in progress**
- **Then** The maintenance need is updated with status `In Progress`
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list

#### Scenario: Mark completed shows when status is In Progress

- **Given** I am signed in as admin and am on the edit page for a maintenance need with status `In Progress`
- **Then** I see **Mark completed** beside **View issue report**

#### Scenario: Mark completed sets status to Completed

- **Given** I am signed in as admin and am on the edit page for a maintenance need with status `In Progress`
- **When** I click **Mark completed**
- **Then** The maintenance need is updated with status `Completed`
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list

#### Scenario: The button updates when status changes before saving

- **Given** I am signed in as admin and am on the edit page for a maintenance need with status `Open`
- **When** I change **Status** to `In Progress` before saving
- **Then** the button reads **Mark completed**
- **When** I change **Status** to `Completed` or `Canceled` before saving
- **Then** the button is grayed out
- **When** I change **Status** to `Open` before saving
- **Then** the button reads **Mark in progress**

#### Scenario: Mark completed is grayed out when status is Completed or Canceled

- **Given** I am signed in as admin and am on the edit page for a maintenance need with status `Completed` or `Canceled`
- **Then** **Mark completed** is grayed out

#### Scenario: View issue report opens the issue report when issueReportId is set

- **Given** I am signed in as admin and am on the edit page for maintenance need with id `1`
- **When** I click the **View issue report** button
- **Then** I am redirected to `/issue-reports/:id`.
- **And** I am again redirected to `/issue-reports` and see an alert that contains `placeholder`.

#### Scenario: Admin user edits a maintenance need title

- **Given** I am signed in as admin on the edit maintenance needs page for a maintenance need with title `Oil Change`
- **When** I submit the edit page with title `Oil Filter Change`
- **Then** The maintenance need is updated
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list with the updated information

#### Scenario: Admin user edits a maintenance need vehicle

- **Given** I am signed in as admin on the edit maintenance needs page for a maintenance need with vehicle `Black Toyota Sienna (ABC-123)`
- **When** I submit the edit page with vehicle `Black Toyota Sienna (ABC-124)`
- **Then** The maintenance need is updated
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list with the updated information

#### Scenario: Admin user edits a maintenance need assignee

- **Given** I am signed in as admin on the edit maintenance needs page for a maintenance need with assignee `John Doe`
- **When** I submit the edit page with assignee `Jane Jello`
- **Then** The maintenance need is updated
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list with the updated information

#### Scenario: Admin user edits a maintenance need description

- **Given** I am signed in as admin on the edit maintenance needs page for a maintenance need with description `The car is making weird rattling noises as it travels at high speeds`
- **When** I submit the edit page with description `Tires need balancing`
- **Then** The maintenance need is updated
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list with the updated information

#### Scenario: Admin user edits a maintenance need out of service

- **Given** I am signed in as admin on the edit maintenance needs page for a maintenance need with out of service `No`
- **When** I submit the edit page with out of service `Yes`
- **Then** The maintenance need is updated
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list with the updated information

#### Scenario: Admin user edits a maintenance need priority

- **Given** I am signed in as admin on the edit maintenance needs page for a maintenance need with priority `None`
- **When** I submit the edit page with priority `Medium`
- **Then** The maintenance need is updated
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list with the updated information

#### Scenario: Admin user edits a maintenance need status

- **Given** I am signed in as admin on the edit maintenance needs page for a maintenance need with status `Open`
- **When** I submit the edit page with status `In Progress`
- **Then** The maintenance need is updated
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list with the updated information

#### Scenario: Admin user edits a maintenance need resolve date

- **Given** I am signed in as admin on the edit maintenance needs page for a maintenance need with status `Completed` and resolve date `2026-11-01`
- **When** I submit the edit page with the same status and resolve date `2026-11-03`
- **Then** The maintenance need is updated
- **And** I am on `/maintenance-needs`
- **And** The updated maintenance need appears in the list with the updated information

#### Scenario: Admin user cancels editing a maintenance need

- **Given** I am signed in as admin on an edit maintenance need page
- **When** I click **Cancel**
- **Then** I am on `/maintenance-needs`
- **And** the API is not called

#### Scenario: Area admin user edits a maintenance need in their area

- **Given** I am signed in as area admin on an edit maintenance need page
- **When** I edit the maintenance need and click **Save**
- **Then** I am on `/maintenance-needs`
- **And** the maintenance need is updated

#### Scenario: Maintenance user edits a maintenance need

- **Given** I am signed in as maintenance on an edit maintenance need page
- **When** I edit the maintenance need and click **Save**
- **Then** I am on `/maintenance-needs`
- **And** the maintenance need is updated

#### Scenario: Admin user edits a maintenance need with a missing title

- **Given** I am signed in as admin on the maintenance needs edit page
- **When** I submit the edit page with no title 
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a maintenance need with a whitespace-only title

- **Given** I am signed in as admin on the maintenance needs edit page
- **When** I submit the edit page with title ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user deletes a maintenance need

- **Given** I am signed in as admin and a maintenance need with id `1` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that maintenance need is removed from the list

#### Scenario: Admin user requests to edit a maintenance need with a missing title

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ title: "" }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing title." }`

#### Scenario: Admin user requests to edit a maintenance need with a whitespace-only title

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ title: " " }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing title." }`

#### Scenario: Admin user requests to edit a maintenance need with a title longer than 50 characters

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with title longer than 50 characters and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Title cannot be longer than 50 characters." }`

#### Scenario: Admin user requests to edit a maintenance need with a missing vehicle id

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ vehicleId: null }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Missing vehicle id." }`

#### Scenario: Admin user requests to edit a maintenance need with a vehicle id that does not exist

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **And** A vehicle with id `45` does not exist
- **When** I request `PUT /api/maintenance-needs/1` with `{ vehicleId: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Vehicle does not exist." }`

#### Scenario: Admin user requests to edit a maintenance need with an assignee id that does not exist

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **And** A user with id `45` does not exist
- **When** I request `PUT /api/maintenance-needs/1` with `{ assigneeId: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "User does not exist." }`

#### Scenario: Admin user requests to edit a maintenance need with an assignee who is not a maintenance user

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **And** A user with id `45` exists but does not have role `maintenance`
- **When** I request `PUT /api/maintenance-needs/1` with `{ assigneeId: 45 }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "User does not have maintenance role." }`

#### Scenario: Admin user requests to edit a maintenance need with a missing out-of-service value

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ outOfService: null }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Out of service boolean is required." }`

#### Scenario: Admin user requests to edit a maintenance need with a non-boolean out-of-service value

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ outOfService: 'Yes' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Out of service boolean must be a boolean." }`

#### Scenario: Admin user requests to edit a maintenance need with a missing priority

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ priority: null }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Priority is required." }`

#### Scenario: Admin user requests to edit a maintenance need with an invalid priority

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ priority: 'Urgent' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Priority must be Low, Medium, High, or None." }`

#### Scenario: Admin user requests to edit a maintenance need with a missing status

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ status: null }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Status is required." }`

#### Scenario: Admin user requests to edit a maintenance need with an invalid status

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ status: 'Postponed' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Status must be Open, In Progress, Completed, or Canceled." }`

#### Scenario: Admin user requests to edit a maintenance need with a resolved date before 1950

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ resolvedAt: '1949-01-01' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Resolved at date must be between 1950 and today." }`

#### Scenario: Admin user requests to edit a maintenance need with a resolved date after today

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with resolved at date after today and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Resolved at date must be between 1950 and today." }`

#### Scenario: Admin user requests to edit a maintenance need with a resolved date that is not yyyy-mm-dd

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ resolvedAt: '2026/01/01' }` and a valid rest of the body
- **Then** the API returns `400` with `{ message: "Resolved at date must be in format yyyy-mm-dd." }`

#### Scenario: Admin user requests to edit a maintenance need with a resolved date while status is Open

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ status: 'Open' }` and `{ resolvedAt: '2026-11-03' }` and a valid rest of the body
- **Then** `resolvedAt` is saved as null
- **And** The maintenance need is updated

#### Scenario: Admin user requests to edit a maintenance need with a resolved date while status is In Progress

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ status: 'In Progress' }` and `{ resolvedAt: '2026-11-03' }` and a valid rest of the body
- **Then** `resolvedAt` is saved as null
- **And** The maintenance need is updated

#### Scenario: Admin user requests to edit a maintenance need with status Completed and no resolved date

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ status: 'Completed' }` and `{ resolvedAt: null }` and a valid rest of the body
- **Then** `resolvedAt` is saved as the current date
- **And** The maintenance need is updated

#### Scenario: Admin user requests to edit a maintenance need with status Canceled and no resolved date

- **Given** I am signed in as admin
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with `{ status: 'Canceled' }` and `{ resolvedAt: null }` and a valid rest of the body
- **Then** `resolvedAt` is saved as the current date
- **And** The maintenance need is updated

#### Scenario: Area admin user requests to edit a maintenance need outside their area

- **Given** I am signed in as area admin for area `1`
- **And** A maintenance need with id `1` and vehicle id `1` exists
- **And** A vehicle with id `1` and area id `2` exists
- **When** I request `PUT /api/maintenance-needs/1` with a valid body
- **Then** I receive `403` with `{ message: "Unauthorized for this area." }`

#### Scenario: Area admin user requests to delete a maintenance need outside their area

- **Given** I am signed in as area admin for area `1`
- **And** A maintenance need with id `1` and vehicle id `1` exists
- **And** A vehicle with id `1` and area id `2` exists
- **When** I request `DELETE /api/maintenance-needs/1` 
- **Then** I receive `403` with `{ message: "Unauthorized for this area." }`

#### Scenario: Admin user requests to edit a maintenance need that does not exist

- **Given** I am signed in as admin 
- **And** A maintenance need with id `45` does not exist
- **When** I request `PUT /api/maintenance-needs/45` with a valid body
- **Then** I receive `404` with `{ message: "Maintenance need does not exist." }`

#### Scenario: Admin user requests to delete a maintenance need that does not exist

- **Given** I am signed in as admin 
- **And** A maintenance need with id `45` does not exist
- **When** I request `DELETE /api/maintenance-needs/45` 
- **Then** I receive `404` with `{ message: "Maintenance need does not exist." }`

#### Scenario: Admin user requests to delete a maintenance need

- **Given** I am signed in as admin 
- **And** A maintenance need with id `1` exists
- **When** I request `DELETE /api/maintenance-needs/1` 
- **Then** I receive `200`

---

### US-11.6: Signed-in admin, area admin, or maintenance user access only

#### Scenario: Signed-out user opens /maintenance-needs and is sent to /login

- **Given** I am not signed in
- **When** I navigate to `/maintenance-needs` by URL
- **Then** I am redirected to `/login`

#### Scenario: Signed-out user opens /maintenance-needs/new and is sent to /login

- **Given** I am not signed in
- **When** I navigate to `/maintenance-needs/new` by URL
- **Then** I am redirected to `/login`

#### Scenario: Signed-out user opens /maintenance-needs/:id and is sent to /login

- **Given** I am not signed in
- **When** I navigate to `/maintenance-needs/:id` by URL
- **Then** I am redirected to `/login`

#### Scenario: Signed-in user without admin, area admin, or maintenance role opens /maintenance-needs and is sent to /

- **Given** I am signed in
- **And** I do not have roles `admin`, `area admin`, or `maintenance`
- **When** I navigate to `/maintenance-needs` by URL
- **Then** I am redirected to `/`

#### Scenario: Signed-in user without those roles opens /maintenance-needs/new and is sent to /

- **Given** I am signed in
- **And** I do not have roles `admin`, `area admin`, or `maintenance`
- **When** I navigate to `/maintenance-needs/new` by URL
- **Then** I am redirected to `/`

#### Scenario: Signed-in user without those roles opens /maintenance-needs/:id and is sent to /

- **Given** I am signed in
- **And** I do not have roles `admin`, `area admin`, or `maintenance`
- **When** I navigate to `/maintenance-needs/:id` by URL
- **Then** I am redirected to `/`

#### Scenario: Signed-in admin user sees the Maintenance Needs nav link

- **Given** I have admin role
- **When** I am logged in
- **Then** I see a **Maintenance Needs** nav link in the **Fleet** section

#### Scenario: Signed-in area admin user sees the Maintenance Needs nav link

- **Given** I have area admin role
- **When** I am logged in
- **Then** I see a **Maintenance Needs** nav link in the **Fleet** section

#### Scenario: Signed-in maintenance user sees the Maintenance Needs nav link

- **Given** I have maintenance role
- **When** I am logged in
- **Then** I see a **Maintenance Needs** nav link in the **Fleet** section

#### Scenario: Signed-in user without those roles does not see the Maintenance Needs nav link

- **Given** I do not have admin, area admin, or maintenance roles
- **When** I am logged in
- **Then** I do not see a nav link for maintenance needs

#### Scenario: Unauthenticated API request to maintenance needs

- **Given** I have no valid session token
- **When** I request `GET /api/maintenance-needs`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular maintenance need

- **Given** I have no valid session token
- **And** A maintenance need with id `1` exists
- **When** I request `GET /api/maintenance-needs/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to create a maintenance need

- **Given** I have no valid session token
- **When** I request `POST /api/maintenance-needs` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to update a maintenance need

- **Given** I have no valid session token
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to delete a maintenance need

- **Given** I have no valid session token
- **And** A maintenance need with id `1` exists
- **When** I request `DELETE /api/maintenance-needs/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Signed-in user without admin, area admin, or maintenance role API request to maintenance needs

- **Given** I am signed in
- **And** I do not have roles `admin`, `area admin`, or `maintenance`
- **When** I request `GET /api/maintenance-needs`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin, area admin, or maintenance role API request to a particular maintenance need

- **Given** I am signed in
- **And** I do not have roles `admin`, `area admin`, or `maintenance`
- **And** A maintenance need with id `1` exists
- **When** I request `GET /api/maintenance-needs/1`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin, area admin, or maintenance role API request to create a maintenance need

- **Given** I am signed in
- **And** I do not have roles `admin`, `area admin`, or `maintenance`
- **When** I request `POST /api/maintenance-needs` with a valid body
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin, area admin, or maintenance role API request to update a maintenance need

- **Given** I am signed in
- **And** I do not have roles `admin`, `area admin`, or `maintenance`
- **And** A maintenance need with id `1` exists
- **When** I request `PUT /api/maintenance-needs/1` with a valid body
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

#### Scenario: Signed-in user without admin, area admin, or maintenance role API request to delete a maintenance need

- **Given** I am signed in
- **And** I do not have roles `admin`, `area admin`, or `maintenance`
- **And** A maintenance need with id `1` exists
- **When** I request `DELETE /api/maintenance-needs/1`
- **Then** the API returns `403` with `{ message: "One of these roles is required: admin, area_admin, maintenance." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-11.1 | Admin user creates a maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Admin user creates a maintenance need |
| US-11.1 | Area admin user creates a maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Area admin user creates a maintenance need |
| US-11.1 | Maintenance user creates a maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance user creates a maintenance need |
| US-11.1 | Admin user saves maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Admin user saves maintenance need |
| US-11.1 | Area admin user saves maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Area admin user saves maintenance need |
| US-11.1 | Maintenance user saves maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance user saves maintenance need |
| US-11.1 | Admin user cancels creating maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Admin user cancels creating maintenance need |
| US-11.1 | Admin user requests to create a maintenance need | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need |
| US-11.1 | Admin user creates a maintenance need with a missing title | `frontend/tests/MaintenanceNeeds.test.js` | Admin user creates a maintenance need with a missing title |
| US-11.1 | Admin user creates a maintenance need with a whitespace-only title | `frontend/tests/MaintenanceNeeds.test.js` | Admin user creates a maintenance need with a whitespace-only title |
| US-11.1 | Title input accepts at most 50 characters | `frontend/tests/MaintenanceNeeds.test.js` | Title input accepts at most 50 characters |
| US-11.1 | Resolve date is hidden unless status is Completed or Canceled | `frontend/tests/MaintenanceNeeds.test.js` | Resolve date is hidden unless status is Completed or Canceled |
| US-11.1 | New maintenance need defaults are Out of Service Yes, Priority None, and Status Open | `frontend/tests/MaintenanceNeeds.test.js` | New maintenance need defaults are Out of Service Yes, Priority None, and Status Open |
| US-11.1 | Admin user requests to create a maintenance need with a missing title | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a missing title |
| US-11.1 | Admin user requests to create a maintenance need with a whitespace-only title | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a whitespace-only title |
| US-11.1 | Admin user requests to create a maintenance need with a title longer than 50 characters | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a title longer than 50 characters |
| US-11.1 | Admin user requests to create a maintenance need with a missing vehicle id | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a missing vehicle id |
| US-11.1 | Admin user requests to create a maintenance need with a vehicle id that does not exist | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a vehicle id that does not exist |
| US-11.1 | Admin user requests to create a maintenance need with a missing author id | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a missing author id |
| US-11.1 | Admin user requests to create a maintenance need with an author id that is not their own | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with an author id that is not their own |
| US-11.1 | Admin user requests to create a maintenance need with an assignee id that does not exist | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with an assignee id that does not exist |
| US-11.1 | Admin user requests to create a maintenance need with an assignee who is not a maintenance user | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with an assignee who is not a maintenance user |
| US-11.1 | Admin user requests to create a maintenance need with a missing out-of-service value | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a missing out-of-service value |
| US-11.1 | Admin user requests to create a maintenance need with a non-boolean out-of-service value | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a non-boolean out-of-service value |
| US-11.1 | Admin user requests to create a maintenance need with a missing priority | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a missing priority |
| US-11.1 | Admin user requests to create a maintenance need with an invalid priority | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with an invalid priority |
| US-11.1 | Admin user requests to create a maintenance need with a missing status | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a missing status |
| US-11.1 | Admin user requests to create a maintenance need with an invalid status | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with an invalid status |
| US-11.1 | Admin user requests to create a maintenance need with a resolved date before 1950 | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a resolved date before 1950 |
| US-11.1 | Admin user requests to create a maintenance need with a resolved date after today | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a resolved date after today |
| US-11.1 | Admin user requests to create a maintenance need with a resolved date that is not yyyy-mm-dd | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a resolved date that is not yyyy-mm-dd |
| US-11.1 | Admin user requests to create a maintenance need with a resolved date while status is Open | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a resolved date while status is Open |
| US-11.1 | Admin user requests to create a maintenance need with a resolved date while status is In Progress | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with a resolved date while status is In Progress |
| US-11.1 | Admin user requests to create a maintenance need with status Completed and no resolved date | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with status Completed and no resolved date |
| US-11.1 | Admin user requests to create a maintenance need with status Canceled and no resolved date | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with status Canceled and no resolved date |
| US-11.1 | Admin user requests to create a maintenance need with an issue report id that does not exist | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with an issue report id that does not exist |
| US-11.1 | Admin user requests to create a maintenance need with an issue report id that is already used | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need with an issue report id that is already used |
| US-11.1 | Area admin user requests to create a maintenance need for a vehicle outside their area | `backend/tests/maintenanceNeeds.test.js` | Area admin user requests to create a maintenance need for a vehicle outside their area |
| US-11.2 | Admin user sees Create Maintenance Need on a maintenance issue report | `frontend/tests/IssueReports.test.js` | Admin user sees Create Maintenance Need on a maintenance issue report |
| US-11.2 | Create Maintenance Need is unavailable when the issue type is not maintenance | `frontend/tests/IssueReports.test.js` | Create Maintenance Need is unavailable when the issue type is not maintenance |
| US-11.2 | Create Maintenance Need is unavailable when that issue report already has a maintenance need | `frontend/tests/IssueReports.test.js` | Create Maintenance Need is unavailable when that issue report already has a maintenance need |
| US-11.2 | Admin user creates a maintenance need from an issue report | `frontend/tests/IssueReports.test.js` | Admin user creates a maintenance need from an issue report |
| US-11.2 | Admin user requests to create a maintenance need from an issue report | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to create a maintenance need from an issue report |
| US-11.3 | Maintenance needs view lists maintenance needs for admin | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs view lists maintenance needs for admin |
| US-11.3 | Maintenance needs view lists maintenance needs for area admin | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs view lists maintenance needs for area admin |
| US-11.3 | Maintenance needs view lists maintenance needs for a maintenance user | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs view lists maintenance needs for a maintenance user |
| US-11.3 | Maintenance needs empty state | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs empty state |
| US-11.3 | Maintenance needs admin tabs | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs admin tabs |
| US-11.3 | Maintenance needs area admin tabs | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs area admin tabs |
| US-11.3 | Maintenance needs maintenance tabs | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs maintenance tabs |
| US-11.3 | Maintenance needs table Open tab | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs table Open tab |
| US-11.3 | Maintenance needs table Assigned to Me tab | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs table Assigned to Me tab |
| US-11.3 | Maintenance needs table Assigned to Me empty state | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs table Assigned to Me empty state |
| US-11.3 | Maintenance needs table All tab | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs table All tab |
| US-11.3 | Maintenance needs table Resolved tab | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs table Resolved tab |
| US-11.3 | Maintenance needs table shows 10 rows per page | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs table shows 10 rows per page |
| US-11.4 | Maintenance need rows have edit and delete actions | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance need rows have edit and delete actions |
| US-11.5 | Admin user opens the maintenance needs page | `frontend/tests/MaintenanceNeeds.test.js` | Admin user opens the maintenance needs page |
| US-11.5 | Area admin user opens the maintenance needs page | `frontend/tests/MaintenanceNeeds.test.js` | Area admin user opens the maintenance needs page |
| US-11.5 | Maintenance user opens the maintenance needs page | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance user opens the maintenance needs page |
| US-11.5 | View issue report is not clickable when there is no issue report | `frontend/tests/MaintenanceNeeds.test.js` | View issue report is not clickable when there is no issue report |
| US-11.5 | View issue report opens the issue report when issueReportId is set | `frontend/tests/MaintenanceNeeds.test.js` | View issue report opens the issue report when issueReportId is set |
| US-11.5 | Mark in progress shows when status is Open | `frontend/tests/MaintenanceNeeds.test.js` | Mark in progress shows when status is Open |
| US-11.5 | Mark in progress sets status to In Progress | `frontend/tests/MaintenanceNeeds.test.js` | Mark in progress sets status to In Progress |
| US-11.5 | Mark completed shows when status is In Progress | `frontend/tests/MaintenanceNeeds.test.js` | Mark completed shows when status is In Progress |
| US-11.5 | Mark completed sets status to Completed | `frontend/tests/MaintenanceNeeds.test.js` | Mark completed sets status to Completed |
| US-11.5 | The button updates when status changes before saving | `frontend/tests/MaintenanceNeeds.test.js` | The button updates when status changes before saving |
| US-11.5 | Mark completed is grayed out when status is Completed or Canceled | `frontend/tests/MaintenanceNeeds.test.js` | Mark completed is grayed out when status is Completed or Canceled |
| US-11.5 | Admin user edits a maintenance need title | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need title |
| US-11.5 | Admin user edits a maintenance need vehicle | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need vehicle |
| US-11.5 | Admin user edits a maintenance need assignee | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need assignee |
| US-11.5 | Admin user edits a maintenance need description | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need description |
| US-11.5 | Admin user edits a maintenance need out of service | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need out of service |
| US-11.5 | Admin user edits a maintenance need priority | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need priority |
| US-11.5 | Admin user edits a maintenance need status | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need status |
| US-11.5 | Admin user edits a maintenance need resolve date | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need resolve date |
| US-11.5 | Admin user cancels editing a maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Admin user cancels editing a maintenance need |
| US-11.5 | Area admin user edits a maintenance need in their area | `frontend/tests/MaintenanceNeeds.test.js` | Area admin user edits a maintenance need in their area |
| US-11.5 | Maintenance user edits a maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance user edits a maintenance need |
| US-11.5 | Admin user edits a maintenance need with a missing title | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need with a missing title |
| US-11.5 | Admin user edits a maintenance need with a whitespace-only title | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need with a whitespace-only title |
| US-11.5 | Admin user deletes a maintenance need | `frontend/tests/MaintenanceNeeds.test.js` | Admin user deletes a maintenance need |
| US-11.5 | Admin user requests to edit a maintenance need with a missing title | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a missing title |
| US-11.5 | Admin user requests to edit a maintenance need with a whitespace-only title | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a whitespace-only title |
| US-11.5 | Admin user requests to edit a maintenance need with a title longer than 50 characters | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a title longer than 50 characters |
| US-11.5 | Admin user requests to edit a maintenance need with a missing vehicle id | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a missing vehicle id |
| US-11.5 | Admin user requests to edit a maintenance need with a vehicle id that does not exist | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a vehicle id that does not exist |
| US-11.5 | Admin user requests to edit a maintenance need with an assignee id that does not exist | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with an assignee id that does not exist |
| US-11.5 | Admin user requests to edit a maintenance need with an assignee who is not a maintenance user | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with an assignee who is not a maintenance user |
| US-11.5 | Admin user requests to edit a maintenance need with a missing out-of-service value | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a missing out-of-service value |
| US-11.5 | Admin user requests to edit a maintenance need with a non-boolean out-of-service value | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a non-boolean out-of-service value |
| US-11.5 | Admin user requests to edit a maintenance need with a missing priority | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a missing priority |
| US-11.5 | Admin user requests to edit a maintenance need with an invalid priority | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with an invalid priority |
| US-11.5 | Admin user requests to edit a maintenance need with a missing status | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a missing status |
| US-11.5 | Admin user requests to edit a maintenance need with an invalid status | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with an invalid status |
| US-11.5 | Admin user requests to edit a maintenance need with a resolved date before 1950 | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a resolved date before 1950 |
| US-11.5 | Admin user requests to edit a maintenance need with a resolved date after today | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a resolved date after today |
| US-11.5 | Admin user requests to edit a maintenance need with a resolved date that is not yyyy-mm-dd | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a resolved date that is not yyyy-mm-dd |
| US-11.5 | Admin user requests to edit a maintenance need with a resolved date while status is Open | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a resolved date while status is Open |
| US-11.5 | Admin user requests to edit a maintenance need with a resolved date while status is In Progress | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with a resolved date while status is In Progress |
| US-11.5 | Admin user requests to edit a maintenance need with status Completed and no resolved date | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with status Completed and no resolved date |
| US-11.5 | Admin user requests to edit a maintenance need with status Canceled and no resolved date | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with status Canceled and no resolved date |
| US-11.5 | Area admin user requests to edit a maintenance need outside their area | `backend/tests/maintenanceNeeds.test.js` | Area admin user requests to edit a maintenance need outside their area |
| US-11.5 | Area admin user requests to delete a maintenance need outside their area | `backend/tests/maintenanceNeeds.test.js` | Area admin user requests to delete a maintenance need outside their area |
| US-11.5 | Admin user requests to edit a maintenance need that does not exist | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need that does not exist |
| US-11.5 | Admin user requests to delete a maintenance need that does not exist | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to delete a maintenance need that does not exist |
| US-11.5 | Admin user requests to delete a maintenance need | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to delete a maintenance need |
| US-11.6 | Signed-out user opens /maintenance-needs and is sent to /login | `frontend/tests/MaintenanceNeeds.test.js` | Signed-out user opens /maintenance-needs and is sent to /login |
| US-11.6 | Signed-out user opens /maintenance-needs/new and is sent to /login | `frontend/tests/MaintenanceNeeds.test.js` | Signed-out user opens /maintenance-needs/new and is sent to /login |
| US-11.6 | Signed-out user opens /maintenance-needs/:id and is sent to /login | `frontend/tests/MaintenanceNeeds.test.js` | Signed-out user opens /maintenance-needs/:id and is sent to /login |
| US-11.6 | Signed-in user without admin, area admin, or maintenance role opens /maintenance-needs and is sent to / | `frontend/tests/MaintenanceNeeds.test.js` | Signed-in user without admin, area admin, or maintenance role opens /maintenance-needs and is sent to / |
| US-11.6 | Signed-in user without those roles opens /maintenance-needs/new and is sent to / | `frontend/tests/MaintenanceNeeds.test.js` | Signed-in user without those roles opens /maintenance-needs/new and is sent to / |
| US-11.6 | Signed-in user without those roles opens /maintenance-needs/:id and is sent to / | `frontend/tests/MaintenanceNeeds.test.js` | Signed-in user without those roles opens /maintenance-needs/:id and is sent to / |
| US-11.6 | Signed-in admin user sees the Maintenance Needs nav link | `frontend/tests/MaintenanceNeeds.test.js` | Signed-in admin user sees the Maintenance Needs nav link |
| US-11.6 | Signed-in area admin user sees the Maintenance Needs nav link | `frontend/tests/MaintenanceNeeds.test.js` | Signed-in area admin user sees the Maintenance Needs nav link |
| US-11.6 | Signed-in maintenance user sees the Maintenance Needs nav link | `frontend/tests/MaintenanceNeeds.test.js` | Signed-in maintenance user sees the Maintenance Needs nav link |
| US-11.6 | Signed-in user without those roles does not see the Maintenance Needs nav link | `frontend/tests/MaintenanceNeeds.test.js` | Signed-in user without those roles does not see the Maintenance Needs nav link |
| US-11.6 | Unauthenticated API request to maintenance needs | `backend/tests/maintenanceNeeds.test.js` | Unauthenticated API request to maintenance needs |
| US-11.6 | Unauthenticated API request to a particular maintenance need | `backend/tests/maintenanceNeeds.test.js` | Unauthenticated API request to a particular maintenance need |
| US-11.6 | Unauthenticated API request to create a maintenance need | `backend/tests/maintenanceNeeds.test.js` | Unauthenticated API request to create a maintenance need |
| US-11.6 | Unauthenticated API request to update a maintenance need | `backend/tests/maintenanceNeeds.test.js` | Unauthenticated API request to update a maintenance need |
| US-11.6 | Unauthenticated API request to delete a maintenance need | `backend/tests/maintenanceNeeds.test.js` | Unauthenticated API request to delete a maintenance need |
| US-11.6 | Signed-in user without admin, area admin, or maintenance role API request to maintenance needs | `backend/tests/maintenanceNeeds.test.js` | Signed-in user without admin, area admin, or maintenance role API request to maintenance needs |
| US-11.6 | Signed-in user without admin, area admin, or maintenance role API request to a particular maintenance need | `backend/tests/maintenanceNeeds.test.js` | Signed-in user without admin, area admin, or maintenance role API request to a particular maintenance need |
| US-11.6 | Signed-in user without admin, area admin, or maintenance role API request to create a maintenance need | `backend/tests/maintenanceNeeds.test.js` | Signed-in user without admin, area admin, or maintenance role API request to create a maintenance need |
| US-11.6 | Signed-in user without admin, area admin, or maintenance role API request to update a maintenance need | `backend/tests/maintenanceNeeds.test.js` | Signed-in user without admin, area admin, or maintenance role API request to update a maintenance need |
| US-11.6 | Signed-in user without admin, area admin, or maintenance role API request to delete a maintenance need | `backend/tests/maintenanceNeeds.test.js` | Signed-in user without admin, area admin, or maintenance role API request to delete a maintenance need |


## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 11 from @features/feature-11-maintenance-needs.md on branch `feature/11-maintenance-needs`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-001**–**FR-014** satisfied)
- [x] **Success Criteria (SC-001**–**SC-005)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- The service log
- Issue report page to view a particular issue report

---

## Delivered to later features

- A maintenance need row with an id, issue_report_id (optional), author_id, vehicle_id, assignee_id (optional), title, description (optional), out_of_service boolean, priority, status, and resolved_at date.
- `GET /api/maintenance-needs` returns every maintenance need for any valid session with `admin` role
- `GET /api/maintenance-needs` returns every maintenance need with a vehicle with a matching area_id for any valid session with `area admin` role
- `GET /api/maintenance-needs` returns every maintenance need for any valid session with `maintenance` role
 