# Feature: Section Management

**Feature ID:** 5
**Branch pattern:** `feature/5-section-management`
**Status:** Done
**Created:** 2026-09-23
**Input:** Signed-in admin users manage sections. Sections are added/edited with a dialog
**Depends on:** Feature 4

---

## User Stories

### US-5.1: Create sections

**As a** signed-in admin user  
**I want to** create sections for a course
**So that** Students and Faculty know what sections are happening each semester.

**Priority:** P1  
**Independent test:** Open add-section dialog, create a section; it appears in the sections view  
**Acceptance scenarios:** see ### US-5.1 under Acceptance Criteria

### US-5.2: View sections

**As a** signed-in user  
**I want to** see all of the sections for a course  
**So that** I can see when a course is offered.

**Priority:** P1  
**Independent test:** Course details view loads a single list of sections  
**Acceptance scenarios:** see ### US-5.2 under Acceptance Criteria

### US-5.3: Manage section rows

**As a** signed-in admin user  
**I want** each section row field should be editable and have **delete** action
**So that** I can manage sections without leaving the course edit view

**Priority:** P1  
**Independent test:** Each section row exposes edit and delete icon actions  
**Acceptance scenarios:** see ### US-5.3 under Acceptance Criteria

### US-5.4: Edit and delete sections

**As a** signed-in admin user  
**I want to** edit or delete a section  
**So that** I can keep the sections up to date

**Priority:** P2  
**Independent test:** Edit and delete sections from row actions; sections view updates  
**Acceptance scenarios:** see ### US-5.4 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All section endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: All section fields MUST be trimmed before save; empty strings MUST be rejected.
- **FR-003**: `sectionNumber` MUST be in the format of XXXX-####-## (ex. COMP-2100-01)
- **FR-004**: `day` MUST be a string consisting of a comma separated list of `M`, `T`, `W`, `TH`, `F`
---

## Assumptions

- Sections use **dialog-based** workflows (no split sidebar / main panel).
- Section rows save on **focusout** (not via the course dialog **Save** button).

## Edge Cases

- Empty or whitespace-only section name → client block and/or `400`.
- Section name longer than 255 characters → `400`.
- Unauthenticated sections screen or `GET /sections` → redirect or `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin can create, view, edit, and delete sections for a course on one screen.
- **SC-003**: `npm test` passes for sections API and sections view behavior.

---

## Data Ownership & Isolation

Only signed-in admin users should be able to manage sections. Other signed-in users may browse sections.

---

## API Requirements

| Method   | Endpoint             | Auth        | Purpose             |
| -------- | -------------------- | ----------- | ------------------- |
| `GET`    | `/sections`           | Yes         | Fetch all sections   |
| `GET`    | `/sections/:sectionId` | Yes         | Fetch a single      |
| `POST`   | `/sections`           | Yes - Admin | Create a new section |
| `PUT`    | `/sections/:sectionId` | Yes - Admin | Edit a section       |
| `DELETE` | `/sections/:sectionId` | Yes - Admin | Delete section       |

**Create section request body:**

```json
{
  "sectionNumber": "COMP-2100-01",
  "semesterId": "1",
  "courseId": "2",
  "facultyFacultyId": "3",
  "daysOfWeek": "M,W,F",
  "startTime": "14:30:00",
  "endTime": "15:30:00",
}
```

**Section success response** (`200` / `201`):

```json
{
  "id": 1,
  "sectionNumber": "COMP-2100-01",
  "semesterId": "1",
  "courseId": "2",
  "facultyFacultyId": "3",
  "daysOfWeek": "M,W,F",
  "startTime": "14:30:00",
  "endTime": "15:30:00",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.  
**Not found:** `404` (do not use `403`).

---

## Screen Requirements

### [View: Courses] — route name `courses`

**Single Vue view** (`Courses.vue`) — no sidebar / main-panel split.

**Courses view (feature 3)**

- Heading: **Courses**
- Primary action: **+ New Course** opens a `<v-dialog>` with a name `<v-text-field>` and **Create** / **Cancel**. Use class `oc-cta` on **Create** and **+ New List** (per [ui-style-system.mdc](../../.cursor/rules/ui-style-system.mdc)).
- Secondary action: **Search** input field
- Display courses as rows (e.g. `<v-list>` or table): each row shows the **course name**, **course number**, **semester**, **frequency**, **hours**, **department** and icon actions:
  - **Edit** icon — opens rename `<v-dialog>` pre-filled with current data; **Save** / **Cancel**
    - **New**: add a list of sections attached to the course. Have a **+ New Section** button and allow the section fields to be edited inline with a **Delete** button on each row. A filled section row is saved when it loses focus (**focusout**).
  - **Delete** icon — opens confirmation `<v-dialog>`
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit course**, **Delete course**).
- **Empty state:** `<v-empty-state>` titled **"No courses yet"** when there are no courses. Admins see **"Create your first course to get started."** and a **+ New Course** button; non-admins see **"Check back later."**
- **Loading state:** skeleton or progress indicator while courses are fetching.
- **Error state:** `<v-alert type="error">` for API failures.
- **Pagination:** courses are paginated when there are more than 20 rows

**Implementation note:** one route/view for courses; courses CRUD dialogs are child components or inline `<v-dialog>` blocks in `Courses.vue`.

---

## Key Entities

- **Section**: one section the university offers, distinct from sections of the section

---

## Data Model Requirements

### `sections` table

| Field           | Type       | Rules                                            |
| -------------   | ---------- | ------------------------------------------------ |
| `id`            | INTEGER PK | Auto-increment                                   |
| `sectionNumber` | STRING     | Required; (XXXX-####-##)                            |
| `semesterId`    | INTEGER    | Required                                         |
| `facultyFacultyId` | INTEGER    | Required                                         |
| `daysOfWeek`    | STRING     |"M,T,W,TH,F"                                      |
| `startTime`     | STRING     | hh:mm:ss                                         |
| `endTime`       | STRING     | hh:mm:ss                                         |
| `createdAt`     | DATE       | Sequelize timestamps                             |
| `updatedAt`     | DATE       | Sequelize timestamps                             |

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-5.1 — Create sections

#### Scenario: Admin creates section

- **Given** I am signed in as an admin in the edit course dialogue
- **When** I click **+ New Section** 
- **Then** a new row appears in the course sections list.

#### Scenario: Admin saves section

- **Given** I am signed in as an admin in the edit course dialogue
- **When** I fill a new section with sectionNumber = `COMP-2100-01` and the section row loses focus
- **Then** the API returns `201` with a section object and `COMP-2100-01` appears in the sections list ordered alphabetically

#### Scenario: User creates section with missing fields

- **Given** I am signed in as an admin in the edit course dialogue
- **When** a section row without a semester ID loses focus
- **Then** inline validation blocks the request and I see a required field validation message

#### Scenario: User creates a section with invalid fields

- **Given** I am signed in as an admin in the edit course dialogue
- **When** a section row with section number `CS210432` (instead of `XXXX-####-##`) loses focus
- **Then** the API returns `400` with an invalid format message and an error is displayed

---

### US-5.2 — View sections

#### Scenario: Sections view lists sections

- **Given** I am signed in and sections exist for a course
- **When** I navigate to the courses view and click edit on a course with sections
- **Then** the sections appear in the course sections list

#### Scenario: Sections empty state

- **Given** I am signed in and there are no sections in the database
- **When** I navigate to the dialoge for a course
- **Then** I see **"No sections yet. Create your first section."** instead of the course sections list

---

### US-5.3 — Manage section rows

#### Scenario: Section rows are editable and have a delete action for admins

- **Given** I am signed in as an admin in the edit course dialogue
- **When** I view the sections list
- **Then** each section row shows is editable and shows a **Delete section** icon action

#### Scenario: Section rows do not show edit/delete actions for non-admins

- **Given** I am signed in as a non-admin user 
- **When** I view the courses view
- **Then** the **Edit course** and **Delete course** icons are not visible. Therefore I cannot reach the edit and delete actions for a section.

---

### US-5.4 — Edit and delete sections

#### Scenario: Admin edits a section

- **Given** I am signed in as an admin in the edit course dialogue and a section exists with section number `CSMC-3012-01`
- **When** I change the section number to `CSMC-3012-02` and the section row loses focus
- **Then** the API returns `200` with the updated section object and the sections list reflects the updated section number

#### Scenario: Admin deletes a section

- **Given** I am signed in as an admin in the edit course dialogue and a section exists with section number `CSMC-3012-01`
- **When** I click the delete icon on the section row and submit
- **Then** the API returns `200` or `204` and the section is removed from the sections list

#### Scenario: Non-admin attempts to edit or delete a section via API

- **Given** I am signed in as a standard user
- **When** I send `DELETE /sections/:sectionId` or `PUT /sections/:sectionId`
- **Then** the API returns `401` or `404`

#### Scenario: Unauthenticated API request to sections

- **Given** I have no valid session token
- **When** I request `GET /sections`
- **Then** the API returns `401` with an unauthorized message

---

## Test Coverage Map

| Story  | Scenario                                                              | Test file                                                           | Test name                                                             |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| US-5.1 | Admin creates section                                                 | `frontend/tests/Sections.test.js`                                   | `Admin creates section`                                               |
| US-5.1 | Admin saves section                                                   | `backend/tests/sections.test.js`, `frontend/tests/Sections.test.js` | `Admin saves section`                                                 |
| US-5.1 | User creates section with missing fields                              | `backend/tests/sections.test.js`, `frontend/tests/Sections.test.js` | `User creates section with missing fields`                            |
| US-5.1 | User creates a section with invalid fields                            | `backend/tests/sections.test.js`, `frontend/tests/Sections.test.js` | `User creates a section with invalid fields`                          |
| US-5.2 | Sections view lists sections                                          | `backend/tests/sections.test.js`, `frontend/tests/Sections.test.js` | `Sections view lists sections`                                        |
| US-5.2 | Sections empty state                                                  | `frontend/tests/Sections.test.js`                                   | `Sections empty state`                                                |
| US-5.3 | Section rows are editable and have a delete action for admins         | `frontend/tests/Sections.test.js`                                   | `Section rows are editable and have a delete action for admins`       |
| US-5.3 | Section rows do not show edit/delete actions for non-admins           | `frontend/tests/Sections.test.js`                                   | `Section rows do not show edit/delete actions for non-admins`         |
| US-5.4 | Admin edits a section                                                 | `backend/tests/sections.test.js`, `frontend/tests/Sections.test.js` | `Admin edits a section`                                               |
| US-5.4 | Admin deletes a section                                               | `backend/tests/sections.test.js`, `frontend/tests/Sections.test.js` | `Admin deletes a section`                                             |
| US-5.4 | Non-admin attempts to edit or delete a section via API                | `backend/tests/sections.test.js`                                    | `Non-admin attempts to edit or delete a section via API`              |
| US-5.4 | Unauthenticated API request to sections                               | `backend/tests/sections.test.js`                                    | `Unauthenticated API request to sections`                             |

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-00N** satisfied)
- [ ] **Success Criteria (SC-00N)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

N/A

---

## Delivered to Feature 5

N/A
