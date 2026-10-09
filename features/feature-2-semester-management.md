# Feature: Semester Management

**Feature ID:** 2
**Branch pattern:** `feature/2-semester-management`
**Status:** Draft
**Created:** 2026-09-24
**Input:** Signed-in admin users manage semesters. Semesters are added/edited with a dialog
**Depends on:** Feature 1

---

## User Stories

### US-2.1: Create semesters

**As a** signed-in admin user
**I want to** create a semester with a name, start date, and end date
**So that** students and faculty can tell which term a course belongs to.

**Priority:** P1
**Independent test:** Open the add-semester dialog, create a semester; it appears in the semesters view
**Acceptance scenarios:** see ### US-2.1 under Acceptance Criteria

### US-2.2: View semesters

**As a** signed-in user
**I want to** see all semesters
**So that** I can see each term's name and dates.

**Priority:** P1
**Independent test:** Semesters view loads a single list of semesters
**Acceptance scenarios:** see ### US-2.2 under Acceptance Criteria

### US-2.3: Manage semester rows

**As a** signed-in admin user
**I want** each semester row to have **edit** and **delete** actions
**So that** I can manage semesters from the semesters view

**Priority:** P1
**Independent test:** Each semester row exposes edit and delete icon actions for an admin
**Acceptance scenarios:** see ### US-2.3 under Acceptance Criteria

### US-2.4: Edit and delete semesters

**As a** signed-in admin user
**I want to** edit or delete a semester
**So that** I can keep semester names and dates up to date

**Priority:** P2
**Independent test:** Edit and delete semesters from row actions; the semesters view updates
**Acceptance scenarios:** see ### US-2.4 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All semester endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: `name` MUST be trimmed before save. An empty name MUST be rejected.
- **FR-003**: A semester MUST store `name`, `startDate`, and `endDate`. `id` is assigned by the database.
- **FR-004**: `endDate` MUST be on or after `startDate`.

---

## Assumptions

- Semesters use **dialog-based** workflows (no split sidebar / main panel).
- Signed-in students may list semesters. Only admins may create, edit, or delete them.
- Sections, courses, and the course-listing dropdown belong to later features.

## Edge Cases

- Empty or whitespace-only semester name → client block and/or `400`.
- Semester name longer than 255 characters → `400`.
- Missing `startDate` or `endDate` → `400`.
- `endDate` before `startDate` → `400`.
- Unauthenticated semesters screen or `GET /api/semesters` → redirect or `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin can create, view, edit, and delete semesters on one screen.
- **SC-003**: `npm test` passes for semesters API and semesters view behavior.

---

## Data Ownership & Isolation

Only signed-in admin users may create, edit, or delete semesters. Any signed-in user may read the semester list.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/semesters` and `GET /api/semesters/:semesterId` require a Bearer token and return semesters for that session. |
| **Write scope** | `PUT` and `DELETE` require `req.user.role` `admin`. |
| **Create scope** | `POST` requires `req.user.role` `admin`. |
| **Cross-user-role access** | A student who sends `POST`, `PUT`, or `DELETE` receives `401`. |
| **UI scope** | Edit and delete actions show only when the signed-in user's role is `admin`. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/semesters` | Yes | Fetch all semesters |
| `GET` | `/api/semesters/:semesterId` | Yes | Fetch a single semester |
| `POST` | `/api/semesters` | Yes - Admin | Create a semester |
| `PUT` | `/api/semesters/:semesterId` | Yes - Admin | Edit a semester |
| `DELETE` | `/api/semesters/:semesterId` | Yes - Admin | Delete a semester |

**Create semester request body:**

```json
{
  "name": "Fall 2026",
  "startDate": "2026-08-24",
  "endDate": "2026-12-18"
}
```

**Semester success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Fall 2026",
  "startDate": "2026-08-24",
  "endDate": "2026-12-18",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404` (do not use `403`).

---

## Screen Requirements

### [View: Semesters] — route name `semesters`

**Single Vue view** (`Semesters.vue`) — no sidebar / main-panel split.

- Heading: **Semesters**
- Admin primary action: **+ New Semester** opens a `<v-dialog>` with **Name**, **Start date**, and **End date**, plus **Create** / **Cancel**.
- Display semesters as rows. Each row shows **name**, **start date**, and **end date**.
- Admin **Edit** icon opens a `<v-dialog>` pre-filled with the current name, start date, and end date; **Save** / **Cancel**.
- Admin **Delete** icon opens a confirmation `<v-dialog>`.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit semester**, **Delete semester**).
- **Empty state:** **"No semesters yet. Create your first semester."** when there are no semesters.
- **Loading state:** skeleton or progress indicator while semesters are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for semesters; create, edit, and delete dialogs are inline `<v-dialog>` blocks in `Semesters.vue`.

---

## Key Entities

- **Semester**: one academic term, with a name, start date, and end date.

---

## Data Model Requirements

### `semesters` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING | Required; trimmed; max 255 |
| `startDate` | DATEONLY | Required |
| `endDate` | DATEONLY | Required; on or after `startDate` |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-2.1 — Create semesters

#### Scenario: Admin creates semester

- **Given** I am signed in as an admin on the semesters view
- **When** I click **+ New Semester**
- **Then** a dialog opens with **Name**, **Start date**, and **End date**

#### Scenario: Admin saves semester

- **Given** I am signed in as an admin on the semesters view
- **When** I submit the create dialog with name `Fall 2026`, start date `2026-08-24`, and end date `2026-12-18`
- **Then** the API returns `201` with that semester
- **And** `Fall 2026` appears in the semesters list

#### Scenario: User creates semester with missing fields

- **Given** I am signed in as an admin on the semesters view
- **When** I submit the create dialog without a name
- **Then** validation blocks the request and I see a required field message

#### Scenario: User creates a semester with an end date before the start date

- **Given** I am signed in as an admin on the semesters view
- **When** I submit a semester whose end date is before its start date
- **Then** the API returns `400` and an error is displayed

---

### US-2.2 — View semesters

#### Scenario: Semesters view lists semesters

- **Given** I am signed in and semesters exist
- **When** I open the semesters view
- **Then** each row shows the semester name, start date, and end date

#### Scenario: Semesters empty state

- **Given** I am signed in and there are no semesters
- **When** I open the semesters view
- **Then** I see **"No semesters yet. Create your first semester."**

---

### US-2.3 — Manage semester rows

#### Scenario: Semester rows have edit and delete actions for admins

- **Given** I am signed in as an admin and at least one semester exists
- **When** I view the semesters list
- **Then** each row shows **Edit semester** and **Delete semester**

#### Scenario: Semester rows do not show edit or delete actions for non-admins

- **Given** I am signed in as a student and at least one semester exists
- **When** I view the semesters list
- **Then** **Edit semester** and **Delete semester** are not visible

---

### US-2.4 — Edit and delete semesters

#### Scenario: Admin edits a semester

- **Given** I am signed in as an admin and a semester named `Fall 2026` exists
- **When** I change the name to `Fall 2026 Term` and submit
- **Then** the API returns `200` with the updated semester
- **And** the list shows `Fall 2026 Term`

#### Scenario: Admin deletes a semester

- **Given** I am signed in as an admin and a semester named `Fall 2026` exists
- **When** I confirm delete on that row
- **Then** the API returns `200` or `204`
- **And** that semester is removed from the list

#### Scenario: Non-admin attempts to edit or delete a semester via API

- **Given** I am signed in as a student
- **When** I send `DELETE /api/semesters/1` or `PUT /api/semesters/1`
- **Then** the API returns `401`

#### Scenario: Unauthenticated API request to semesters

- **Given** I have no valid session token
- **When** I request `GET /api/semesters`
- **Then** the API returns `401` with an unauthorized message

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-2.1 | Admin creates semester | `frontend/tests/Semesters.test.js` | `Admin creates semester` |
| US-2.1 | Admin saves semester | `backend/tests/semesters.test.js` | `Admin saves semester` |
| US-2.1 | Admin saves semester | `frontend/tests/Semesters.test.js` | `Admin saves semester` |
| US-2.1 | User creates semester with missing fields | `backend/tests/semesters.test.js` | `User creates semester with missing fields` |
| US-2.1 | User creates semester with missing fields | `frontend/tests/Semesters.test.js` | `User creates semester with missing fields` |
| US-2.1 | User creates a semester with an end date before the start date | `backend/tests/semesters.test.js` | `User creates a semester with an end date before the start date` |
| US-2.1 | User creates a semester with an end date before the start date | `frontend/tests/Semesters.test.js` | `User creates a semester with an end date before the start date` |
| US-2.2 | Semesters view lists semesters | `frontend/tests/Semesters.test.js` | `Semesters view lists semesters` |
| US-2.2 | Semesters empty state | `frontend/tests/Semesters.test.js` | `Semesters empty state` |
| US-2.3 | Semester rows have edit and delete actions for admins | `frontend/tests/Semesters.test.js` | `Semester rows have edit and delete actions for admins` |
| US-2.3 | Semester rows do not show edit or delete actions for non-admins | `frontend/tests/Semesters.test.js` | `Semester rows do not show edit or delete actions for non-admins` |
| US-2.4 | Admin edits a semester | `backend/tests/semesters.test.js` | `Admin edits a semester` |
| US-2.4 | Admin edits a semester | `frontend/tests/Semesters.test.js` | `Admin edits a semester` |
| US-2.4 | Admin deletes a semester | `backend/tests/semesters.test.js` | `Admin deletes a semester` |
| US-2.4 | Admin deletes a semester | `frontend/tests/Semesters.test.js` | `Admin deletes a semester` |
| US-2.4 | Non-admin attempts to edit or delete a semester via API | `backend/tests/semesters.test.js` | `Non-admin attempts to edit or delete a semester via API` |
| US-2.4 | Unauthenticated API request to semesters | `backend/tests/semesters.test.js` | `Unauthenticated API request to semesters` |

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

- Course, section, and faculty management
- Choosing a semester on the course listing page (Feature 7)

---

## Delivered to later features

- A semester row with `id`, `name`, `startDate`, and `endDate` for later features to reference.
