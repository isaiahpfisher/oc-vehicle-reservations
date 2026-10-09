# Feature: Course Management

**Feature ID:** 3
**Branch pattern:** `feature/3-course-management`
**Status:** Draft
**Created:** 2026-09-21
**Input:** Signed-in admin users manage courses. Courses are added/edited with a dialog
**Depends on:** Features 1 and 2

---

## User Stories

### US-3.1: Create courses

**As a** signed-in admin user  
**I want to** create named courses  
**So that** students can see what courses are offered.

**Priority:** P1  
**Independent test:** Open add-course dialog, create a course; it appears in the courses view  
**Acceptance scenarios:** see ### US-3.1 under Acceptance Criteria

### US-3.2: View courses

**As a** signed-in user  
**I want to** see all of the courses on one screen  
**So that** I can see what courses I have created

**Priority:** P1  
**Independent test:** Courses view loads a single list of courses  
**Acceptance scenarios:** see ### US-3.2 under Acceptance Criteria

### US-3.3: Search/filter/paginate courses

**As a** signed-in user  
**I want to** search/filter/paginate the list of courses
**So that** I can find the courses I am looking for

**Priority:** P2  
**Independent test:** Courses view has search/filter/pagination functionality  
**Acceptance scenarios:** see ### US-3.3 under Acceptance Criteria

### US-3.4: Manage course cards

**As a** signed-in admin user  
**I want** each course card to offer **edit** and **delete** actions  
**So that** I can manage courses without leaving the courses view

**Priority:** P1  
**Independent test:** Each course card has a **Course actions** menu with **Edit** and **Delete**  
**Acceptance scenarios:** see ### US-3.4 under Acceptance Criteria

### US-3.5: Edit and delete courses

**As a** signed-in admin user  
**I want to** edit or delete a course  
**So that** I can keep the course catalogue organized

**Priority:** P2  
**Independent test:** Edit and delete courses from the card actions menu; courses view updates  
**Acceptance scenarios:** see ### US-3.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All course endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: All course fields MUST be trimmed before save; empty strings MUST be rejected.
- **FR-003**: Courses MUST be ordered alphabetically by `number` in API responses.
- **FR-004**: This feature MUST deliver course CRUD and a **single-view** courses UI in `Courses.vue` (dialog-based add/edit/delete). No sidebar/main split.
- **FR-005**: `number` MUST be in the format of XXXX-#### (ex. COMP-2100)
- **FR-006**: `name` MUST be no longer than 255 characters
- **FR-007**: `frequency` MUST be one of `Yearly`, `Odd Years`, `Even Years`
- **FR-008**: `semesters` MUST be one or more of ["Fall", "Winter", "Spring", "Summer"]
- **FR-009**: `hours` MUST be an integer

---

## Assumptions

- Courses use **dialog-based** workflows (no split sidebar / main panel).

## Edge Cases

- Empty or whitespace-only course name → client block and/or `400`.
- Course name longer than 255 characters → `400`.
- Unauthenticated courses screen or `GET /courses` → redirect or `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin can create, view, edit, and delete courses on one screen.
- **SC-003**: `npm test` passes for courses API and courses view behavior.

---

## Data Ownership & Isolation

Only signed-in admin users should be able to manage courses. Other signed-in users may browse courses.

---

## API Requirements

| Method   | Endpoint       | Auth        | Purpose             |
| -------- | -------------- | ----------- | ------------------- |
| `GET`    | `/courses`     | Yes         | Fetch all courses   |
| `GET`    | `/courses/:id` | Yes         | Fetch a single      |
| `POST`   | `/courses`     | Yes - Admin | Create a new course |
| `PUT`    | `/courses/:id` | Yes - Admin | Edit a course       |
| `DELETE` | `/courses/:id` | Yes - Admin | Delete course       |

**Create course request body:**

```json
{
  "number": "COMP-2100",
  "name": "Programming II",
  "description": "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem. Ipsum est pariatur ut officia excepteur non laboris.",
  "semesters": ["Fall"],
  "frequency": "Yearly",
  "hours": 3,
  "department": "Computer Science"
}
```

**Course success response** (`200` / `201`):

```json
{
  "id": 1,
  "number": "COMP-2100",
  "name": "Programming II",
  "description": "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem. Ipsum est pariatur ut officia excepteur non laboris.",
  "semesters": ["Fall"],
  "frequency": "Yearly",
  "hours": 3,
  "department": "Computer Science",
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

**Courses view (this feature)**

- Heading: **Courses**
- Primary action: **+ New Course** opens a `<v-dialog>` with a name `<v-text-field>` and **Create** / **Cancel**. Use class `oc-cta` on **Create** and **+ New List** (per [ui-style-system.mdc](../../.cursor/rules/ui-style-system.mdc)).
- Secondary action: **Search** input field
- Display courses as a vertical stack of `<v-card>`s, one per course (no table). Each card shows the **course name** (title), **department** and **course number** (subtitle), **description**, and chips for **hours**, **frequency**, and each **semester**.
- For admins, each card header has an icon-only overflow button (`mdi-dots-vertical`, `aria-label="Course actions"`) that opens a `<v-menu>` with:
  - **Edit** — opens the course `<v-dialog>` pre-filled with current data; **Save** / **Cancel**
  - **Delete** — opens confirmation `<v-dialog>`
- Non-admins do not see the **Course actions** button.
- **Empty state:** `<v-empty-state>` titled **"No courses yet"** when there are no courses. Admins see **"Create your first course to get started."** and a **+ New Course** button; non-admins see **"Check back later."**
- **Loading state:** skeleton or progress indicator while courses are fetching.
- **Error state:** `<v-alert type="error">` for API failures.
- **Pagination:** courses are paginated when there are more than 20 courses (20 cards per page)

**Implementation note:** one route/view for courses; courses CRUD dialogs are child components or inline `<v-dialog>` blocks in `Courses.vue`.

---

## Key Entities

- **Course**: one course the university offers, distinct from sections of the course

---

## Data Model Requirements

### `courses` table

| Field         | Type       | Rules                                           |
| ------------- | ---------- | ----------------------------------------------- |
| `id`          | INTEGER PK | Auto-increment                                  |
| `name`        | STRING     | Required; max 255 chars                         |
| `number`      | STRING     | Required; (XXXX-####)                           |
| `description` | STRING     | Required                                        |
| `semesters`   | STRING     | Required;                                       |
| `frequency`   | STRING     | Required; ["Yearly", "Even Years", "Odd Years"] |
| `hours`       | INTEGER    | Required; integer                               |
| `department`  | STRING     | Required                                        |
| `createdAt`   | DATE       | Sequelize timestamps                            |
| `updatedAt`   | DATE       | Sequelize timestamps                            |

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-3.1 — Create courses

#### Scenario: Admin creates course

- **Given** I am signed in as an admin
- **When** I click **+ New Course** and fill out the form for `Programming II` (`COMP-2100`) and submit
- **Then** the API returns `201` with a course object `COMP-2100` appears in the courses view ordered alphabetically

#### Scenario: User creates course with missing fields

- **Given** I am signed in as an admin
- **When** I open the new course dialog and I leave the `name` field empty and submit
- **Then** inline validation blocks the request I see a required field validation message

#### Scenario: User creates a course with invalid fields

- **Given** I am signed in as an admin
- **When** I enter a course number formatted as `CS210` instead of `XXXX-####`
- **Then** the API returns `400` with an invalid format message and an error is displayed

---

### US-3.2 — View courses

#### Scenario: Courses view lists courses

- **Given** I am signed in courses exist in the system
- **When** I navigate to the courses view
- **Then** the courses appear in the view they are sorted alphabetically by `number`

#### Scenario: Courses empty state

- **Given** I am signed in as an admin and there are no courses in the database
- **When** I navigate to the courses view
- **Then** I see **"No courses yet"** and **"Create your first course to get started."**

#### Scenario: Non-admin does not see admin buttons

- **Given** I am signed in as a non-admin user
- **When** I navigate to the courses view
- **Then** I see the list of courses I do not see the **+ New Course** button or the **Course actions** menu

---

### US-3.3 — Search/filter/paginate courses

#### Scenario: Users can search courses

- **Given** I am viewing the courses list
- **When** I type `COMP-` into the search field
- **Then** the view updates to show only courses containing `COMP-` in the name or number

#### Scenario: Courses list paginates

- **Given** there are more than one page of courses
- **When** I click the next page button
- **Then** the view updates to show the next set of results

---

### US-3.4 — Manage course cards

#### Scenario: Course cards show edit and delete actions for admins

- **Given** I am signed in as an admin
- **When** I view the courses view
- **Then** each course card shows a **Course actions** button and opening it shows **Edit** and **Delete**

#### Scenario: Course cards do not show edit/delete actions for non-admins

- **Given** I am signed in as a non-admin user
- **When** I view the courses view
- **Then** no **Course actions** button is visible on any card

---

### US-3.5 — Edit and delete courses

#### Scenario: Admin edits a course

- **Given** I am signed in as an admin a course named `Programming I` exists
- **When** I choose **Edit** from the **Course actions** menu on the `Programming I` card I change the semester to `Winter` in the edit dialog and submit
- **Then** the API returns `200` with the updated course object the courses view reflects the updated semester

#### Scenario: Admin deletes a course

- **Given** I am signed in as an admin a course exists
- **When** I choose **Delete** from the **Course actions** menu on the course card and confirm
- **Then** the API returns `200` or `204` and the course is removed from the courses view

#### Scenario: Non-admin attempts to edit or delete a course via API

- **Given** I am signed in as a standard user
- **When** I send `DELETE /courses/:courseId` or `PUT /courses/:courseId`
- **Then** the API returns `401` or `404`

#### Scenario: Unauthenticated API request to courses

- **Given** I have no valid session token
- **When** I request `GET /courses`
- **Then** the API returns `401` with an unauthorized message

---

## Test Coverage Map

| Story  | Scenario                                                    | Test file                                                         | Test name                                                     |
| ------ | ----------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| US-3.1 | Admin user creates a new course                             | `backend/tests/courses.test.js`, `frontend/tests/Courses.test.js` | `Admin user creates a new course`                             |
| US-3.1 | User creates a course with an empty required field          | `backend/tests/courses.test.js`, `frontend/tests/Courses.test.js` | `User creates a course with an empty required field`          |
| US-3.1 | User creates a course with invalid formatted fields         | `backend/tests/courses.test.js`, `frontend/tests/Courses.test.js` | `User creates a course with invalid formatted fields`         |
| US-3.2 | Courses view loads with existing courses                    | `backend/tests/courses.test.js`, `frontend/tests/Courses.test.js` | `Courses view loads with existing courses`                    |
| US-3.2 | User has no courses available                               | `frontend/tests/Courses.test.js`                                  | `User has no courses available`                               |
| US-3.2 | Non-admin user views courses                                | `backend/tests/courses.test.js`, `frontend/tests/Courses.test.js` | `Non-admin user views courses`                                |
| US-3.3 | Admin searches for a specific course                        | `frontend/tests/Courses.test.js`                                  | `Admin searches for a specific course`                        |
| US-3.3 | Admin paginates through courses                             | `frontend/tests/Courses.test.js`                                  | `Admin paginates through courses`                             |
| US-3.4 | Course cards show edit and delete actions for admins        | `frontend/tests/Courses.test.js`                                  | `Course cards show edit and delete actions for admins`        |
| US-3.4 | Course cards do not show edit/delete actions for non-admins | `frontend/tests/Courses.test.js`                                  | `Course cards do not show edit/delete actions for non-admins` |
| US-3.5 | Admin edits a course                                        | `backend/tests/courses.test.js`, `frontend/tests/Courses.test.js` | `Admin edits a course`                                        |
| US-3.5 | Admin deletes a course                                      | `backend/tests/courses.test.js`, `frontend/tests/Courses.test.js` | `Admin deletes a course`                                      |
| US-3.5 | Non-admin attempts to edit or delete a course via API       | `backend/tests/courses.test.js`                                   | `Non-admin attempts to edit or delete a course via API`       |
| US-3.5 | Unauthenticated API request to courses                      | `backend/tests/courses.test.js`                                   | `Unauthenticated API request to courses`                      |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 3 from @features/3-course-management.md on branch `feature/3-course-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

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

## Delivered to Feature 3

N/A
