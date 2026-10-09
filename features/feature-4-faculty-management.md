# Feature: Faculty Management

**Feature ID:** 4
**Branch pattern:** `feature/4-faculty-management`
**Status:** Ready
**Created:** 2026-09-22
**Input:** Signed-in admin users manage faculty via dialogs opened from faculty rows (add, edit, delete); new faculty are added via a dialog
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md)

---

## User Stories

### US-4.1: Create faculty
**As a** signed-in admin user  
**I want to** create a faculty (e.g. "David North")  
**So that** I can later assign this faculty to a section

**Priority:** P1  
**Independent test:** Open add-faculty dialog, create a faculty; it appears in the faculty view  
**Acceptance scenarios:** see ### US-4.1 under Acceptance Criteria

### US-4.2: View faculty
**As a** signed-in admin user  
**I want to** see all the faculty on one screen  
**So that** I can see what faculty have been created

**Priority:** P1  
**Independent test:** Faculty view loads a single list of faculty (no sidebar split)  
**Acceptance scenarios:** see ### US-4.2 under Acceptance Criteria

### US-4.3: Manage faculty rows
**As a** signed-in admin user  
**I want** each faculty row to show **edit** and **delete** actions  
**So that** I can manage faculty without leaving the faculty view

**Priority:** P1  
**Independent test:** Each faculty row exposes edit and delete icon actions  
**Acceptance scenarios:** see ### US-4.3 under Acceptance Criteria

### US-4.4: Update and delete faculty
**As a** signed-in admin user  
**I want to** update or delete faculty 
**So that** I can keep the faculty up-to-date

**Priority:** P1 
**Independent test:** Update and delete a faculty from row actions; faculty view updates  
**Acceptance scenarios:** see ### US-4.4 under Acceptance Criteria

### US-4.5: Admin-only faculty
**As the** application
**I want to** reject student and unauthenticated access to faculty
**So that** only admin users can read or change faculty

**Priority:** P1
**Independent test:** Student `GET /api/faculty` returns `403`; guest UI goes to login
**Acceptance scenarios:** see ### US-4.5 under Acceptance Criteria

### US-4.6: Search/paginate faculty

**As a** signed-in admin user  
**I want to** search the list of faculty and page through results
**So that** I can find the faculty I am looking for

**Priority:** P2  
**Independent test:** Faculty view can be searched for first name, last name, or department and only matching cards show. With 21 faculty, page 2 shows the leftover row.
**Acceptance scenarios:** see ### US-4.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All faculty endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: All faculty endpoints MUST only be accessible by admin users.
- **FR-003**: Faculty first names MUST be trimmed before save; empty strings MUST be rejected.
- **FR-004**: Faculty last names MUST be trimmed before save; empty strings MUST be rejected.
- **FR-005**: Faculty departments MUST be trimmed before save; empty strings MUST be rejected.
- **FR-006**: Faculty first names MUST have a max length of 255; longer strings MUST be rejected.
- **FR-007**: Faculty last names MUST have a max length of 255; longer strings MUST be rejected.
- **FR-008**: Faculty departments MUST have a max length of 255; longer strings MUST be rejected.
- **FR-009**: Faculty MUST be ordered alphabetically by first name in API responses.
- **FR-010**: This feature MUST deliver faculty CRUD and a **single-view** faculty UI (dialog-based add/edit/delete). No sidebar/main split.
- **FR-011**: Faculty first name, last name, and department MUST NOT be
  required to be unique.

---

## Assumptions

- Feature 1 auth and session handling MUST be merged to `dev` before implementing this feature.
- Faculty add and edit use **dialog-based** workflows (no split sidebar / main panel).

## Edge Cases

- Empty or whitespace-only first name, last name, or department
  → UI blocks submit (no request).
- Invalid `facultyId` → `400`.
- Unauthenticated faculty view or `GET /api/faculty` → redirect or `401`.
- Faculty with identical first name, last name, and department are accepted.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin user can create, view, update, and delete faculty on one screen.
- **SC-003**: `npm test` passes for faculty API and faculty view behavior.

---

## Data Ownership & Isolation

Admin users have exclusive access to faculty. An authenticated student user must not be able to view, update, or delete them.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/faculty` returns only faculty after checking that `req.user.role` is `admin`. |
| **Write scope** | `PUT` and `DELETE` apply only after checking that `req.user.role` is `admin`. |
| **Create scope** | New faculty are only created after checking that `req.user.role` is `admin`. |
| **Cross-user-role access** | If a faculty is accessed by a user with student role, respond with `403`. |
| **UI scope** | The faculty view shows only faculty returned by `GET /api/faculty` to the signed-in admin user. |
| **Implementation** | Protect all faculty routes with `authenticate` then `requireAdmin`.
  Load a faculty by primary key for `PUT`/`DELETE`. If missing, return `404`.
  Do not scope faculty by `userId`. |

---

## Key Entities

- **Faculty**: entity accessible by admin users; will be assigned to sections (Feature 5).
- **User**: edits the faculty (from Feature 1).

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/faculty` | Yes | Fetch all faculty for the authenticated admin user |
| `POST` | `/api/faculty` | Yes | Create a new faculty |
| `PUT` | `/api/faculty/:facultyId` | Yes | Update a faculty |
| `DELETE` | `/api/faculty/:facultyId` | Yes | Delete a faculty |

All endpoints return data **only to the authenticated admin user**. Student-user-role access attempts return `403`.

**Create faculty request body:**
```json
{ 
    "firstName": "David",
    "lastName": "North",
    "department": "Computer Science"
}
```

**Update faculty request body:**
```json
{ 
    "firstName": "David",
    "lastName": "North",
    "department": "Computer Science"
}
```

**Faculty success response** (`200` / `201`):
```json
{
  "id": 1,
  "firstName": "David",
  "lastName": "North",
  "department": "Computer Science",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**List success response** (`200` on `GET /api/faculty`):
```json
[ {
  "id": 1,
  "firstName": "David",
  "lastName": "North",
  "department": "Computer Science",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}, 
{
  "id": 2,
  "firstName": "Glen",
  "lastName": "Davis",
  "department": "Computer Science",
  "createdAt": "2026-08-02T12:00:00.000Z",
  "updatedAt": "2026-08-02T12:00:00.000Z"
} ]
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.  
**Forbidden (student role):** `403` with `{ "message": "Not Authorized." }`
**Not found (admin, unknown id):** `404` with `{ "message": "Faculty with id=${facultyId} not found." }`

---

## Screen Requirements


### [View: Faculty] — route name `faculty`
**Single Vue view** (`Faculty.vue`) — no sidebar / main-panel split.

**Faculty view (this feature)**
*   Heading: **Faculty**
*   Primary action: **+ New Faculty** opens a `<v-dialog>` with a first-name `<v-text-field>`, last-name `<v-text-field>`, department `<v-text-field>`, and **Create** / **Cancel**. Use class `oc-cta` on **Create** and **+ New Faculty** (per [ui-style-system.mdc](../../.cursor/rules/ui-style-system.mdc)).
*   Display faculty in a table (`v-data-table` or equivalent) with columns
    **Faculty Name**, **Department**, and **Actions**.
    *   Faculty Name is `firstName` + ` ` + `lastName` (e.g. `David North`).
    *   Actions are:
        *   **Edit** icon — opens edit `<v-dialog>` pre-filled with current first name, last name, and department; **Save** (with oc-cta) / **Cancel**
        *   **Delete** icon — opens confirmation `<v-dialog>`; **"Delete faculty?"** with **Delete** (with oc-cta) / **Cancel**.
    *   Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit faculty**, **Delete faculty**).
*   **Empty state:** **"No faculty yet. Create the first faculty."** when there exist zero faculty.
*   **Loading state:** skeleton or progress indicator while faculty are fetching.
*   **Error state:** `<v-alert type="error">` for API failures.

**App chrome**
*   `MenuBar` shows a **Faculty** nav link only when signed in as admin.
*   Guests attempting to navigate to `/faculty` by URL are redirected to a login screen.
*   Authenticated students who open `/faculty` by URL are redirected to home and do not see the Faculty heading or any faculty rows.
*   The Faculty nav link is hidden for students.
*   The Faculty nav link is hidden for guest users.
*   `MenuBar` is shown app-wide via `App.vue`.

**Implementation note:** one route/view for faculty; faculty CRUD dialogs are child components or inline `<v-dialog>` blocks in `Faculty.vue` unless the team splits presentational dialogs later.

---

## Data Model Requirements

### `faculty` table
| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `firstName` | STRING | Required; max 255 chars |
| `lastName` | STRING | Required; max 255 chars |
| `department` | STRING | Required; max 255 chars |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

---

## Acceptance Criteria (Gherkin)

### US-4.1 — Create faculty

#### Scenario: Admin user creates a new faculty
*   **Given** I am signed in as an admin on the faculty page
*   **When** I click **+ New Faculty**
*   **And** I enter faculty first name `David`, faculty last name `North`, and department `Computer Science`
*   **And** I confirm the dialog
*   **Then** the API returns `201` with a faculty object containing `id`, `firstName`, `lastName`, and `department`
*   **And** `David North` appears in the faculty view
*   **And** the add-faculty dialog closes

#### Scenario: Admin user creates a faculty with an empty first name
*   **Given** I am signed in as admin on the faculty page
*   **When** I open the new faculty dialog
*   **And** I leave the first name field empty or whitespace only
*   **And** I attempt to confirm
*   **Then** inline validation blocks the request
*   **And** I see the message **"Faculty first name is required."**
*   **And** no API request is sent

#### Scenario: Admin user creates a faculty with an empty last name
*   **Given** I am signed in as admin on the faculty page
*   **When** I open the new faculty dialog
*   **And** I leave the last name field empty or whitespace only
*   **And** I attempt to confirm
*   **Then** inline validation blocks the request
*   **And** I see the message **"Faculty last name is required."**
*   **And** no API request is sent

#### Scenario: Admin user creates a faculty with an empty department
*   **Given** I am signed in as admin on the faculty page
*   **When** I open the new faculty dialog
*   **And** I leave the department field empty or whitespace only
*   **And** I attempt to confirm
*   **Then** inline validation blocks the request
*   **And** I see the message **"Faculty department is required."**
*   **And** no API request is sent

#### Scenario: Faculty first name is trimmed before save
*   **Given** I am signed in as admin
*   **When** I create a faculty with first name `  David  `, last name `North`, and department `Computer Science`
*   **Then** the saved faculty has `firstName` `David`

#### Scenario: Faculty last name is trimmed before save
*   **Given** I am signed in as admin
*   **When** I create a faculty with first name `David`, last name `  North  `, and department `Computer Science`
*   **Then** the saved faculty has `lastName` `North`

#### Scenario: Faculty department is trimmed before save
*   **Given** I am signed in as admin
*   **When** I create a faculty with first name `David`, last name `North`, and department `  Computer Science  `
*   **Then** the saved faculty has `department` `Computer Science`

#### Scenario: Admin user creates a faculty with a first name that is too long
*   **Given** I am signed in as admin on the faculty page
*   **When** I open the new faculty dialog
*   **And** I submit a faculty first name longer than 255 characters
*   **Then** the API returns `400` with `{ "message": "Faculty first name must be 255 characters or fewer." }`
*   **And** the error is displayed in a `<v-alert type="error">`

#### Scenario: Admin user creates a faculty with a last name that is too long
*   **Given** I am signed in as admin on the faculty page
*   **When** I open the new faculty dialog
*   **And** I submit a faculty last name longer than 255 characters
*   **Then** the API returns `400` with `{ "message": "Faculty last name must be 255 characters or fewer." }`
*   **And** the error is displayed in a `<v-alert type="error">`

#### Scenario: Admin user creates a faculty with a department that is too long
*   **Given** I am signed in as admin on the faculty page
*   **When** I open the new faculty dialog
*   **And** I submit a faculty department longer than 255 characters
*   **Then** the API returns `400` with `{ "message": "Faculty department must be 255 characters or fewer." }`
*   **And** the error is displayed in a `<v-alert type="error">`

#### Scenario: Admin user creates a faculty identical to an existing faculty
*   **Given** I am signed in as an admin on the faculty page
*   **And** There exists a faculty `David North` with department `Computer Science`
*   **When** I click **+ New Faculty**
*   **And** I enter faculty first name `David`, faculty last name `North`, and department `Computer Science`
*   **And** I confirm the dialog
*   **Then** the API returns `201` with a faculty object containing `id`, `firstName`, `lastName`, and `department`
*   **And** `David North` appears twice in the faculty view
*   **And** the add-faculty dialog closes

---

### US-4.2 — View faculty

#### Scenario: Faculty view loads with existing faculty
*   **Given** I am signed in as an admin user
*   **And** There exist faculty `David North` and `Glen Davis`
*   **When** I navigate to the faculty page
*   **Then** both faculty appear in the faculty view
*   **And** `David North` is before `Glen Davis`
*   **And** each row shows the faculty full name and department with edit and delete icon actions

#### Scenario: Faculty API returns faculty ordered by first name
*   **Given** I am signed in as admin
*   **And** There exist faculty `Glen Davis` and `David North`
*   **When** I request `GET /api/faculty`
*   **Then** the response lists `David North` before `Glen Davis`

#### Scenario: There exist no faculty
*   **Given** I am signed in as an admin user
*   **And** There exist no faculty
*   **When** I navigate to the faculty page
*   **Then** I see **"No faculty yet. Create the first faculty."**

---

### US-4.3 — Manage faculty rows

#### Scenario: Faculty rows show edit and delete actions
*   **Given** I am signed in as admin
*   **And** There exists faculty `David North`
*   **When** I view the faculty view
*   **Then** the `David North` row shows an **Edit faculty** icon action
*   **And** the `David North` row shows a **Delete faculty** icon action

---

### US-4.4 — Update and delete faculty

#### Scenario: Admin user edits faculty first name
*   **Given** I am signed in as admin
*   **And** There exists a faculty named `David North`
*   **When** I click the edit icon on the `David North` row
*   **And** I change the faculty first name to `Bob` in the update dialog
*   **And** I confirm
*   **Then** the API returns `200` with the updated faculty object
*   **And** the faculty view shows `Bob North` instead of `David North`

#### Scenario: Admin user edits faculty last name
*   **Given** I am signed in as admin
*   **And** There exists a faculty named `David North`
*   **When** I click the edit icon on the `David North` row
*   **And** I change the faculty last name to `South` in the update dialog
*   **And** I confirm
*   **Then** the API returns `200` with the updated faculty object
*   **And** the faculty view shows `David South` instead of `David North`

#### Scenario: Admin user edits faculty department
*   **Given** I am signed in as admin
*   **And** There exists a faculty named `David North` with department `Computer Science`
*   **When** I click the edit icon on the `David North` row
*   **And** I change the faculty department to `Chemistry` in the update dialog
*   **And** I confirm
*   **Then** the API returns `200` with the updated faculty object
*   **And** the faculty view shows `David North` with department `Chemistry` instead of `David North` with department `Computer Science`

#### Scenario: Admin user updates a faculty to have an empty first name
*   **Given** I am signed in as admin on the faculty page
*   **And** There exists a faculty named `David North` with department `Computer Science`
*   **When** I click the edit icon on the `David North` row
*   **And** I leave the first name field empty or whitespace only
*   **And** I attempt to confirm
*   **Then** inline validation blocks the request
*   **And** I see the message **"Faculty first name is required."**
*   **And** no API request is sent

#### Scenario: Admin user updates a faculty to have an empty last name
*   **Given** I am signed in as admin on the faculty page
*   **And** There exists a faculty named `David North` with department `Computer Science`
*   **When** I click the edit icon on the `David North` row
*   **And** I leave the last name field empty or whitespace only
*   **And** I attempt to confirm
*   **Then** inline validation blocks the request
*   **And** I see the message **"Faculty last name is required."**
*   **And** no API request is sent

#### Scenario: Admin user updates a faculty to have an empty department
*   **Given** I am signed in as admin on the faculty page
*   **And** There exists a faculty named `David North` with department `Computer Science`
*   **When** I click the edit icon on the `David North` row
*   **And** I leave the department field empty or whitespace only
*   **And** I attempt to confirm
*   **Then** inline validation blocks the request
*   **And** I see the message **"Faculty department is required."**
*   **And** no API request is sent

#### Scenario: Admin user updates a faculty to have a first name that is too long
*   **Given** I am signed in as admin on the faculty page
*   **And** There exists a faculty named `David North` with department `Computer Science`
*   **When** I click the edit icon on the `David North` row
*   **And** I submit a faculty first name longer than 255 characters
*   **Then** the API returns `400` with `{ "message": "Faculty first name must be 255 characters or fewer." }`
*   **And** the error is displayed in a `<v-alert type="error">`

#### Scenario: Admin user updates a faculty to have a last name that is too long
*   **Given** I am signed in as admin on the faculty page
*   **And** There exists a faculty named `David North` with department `Computer Science`
*   **When** I click the edit icon on the `David North` row
*   **And** I submit a faculty last name longer than 255 characters
*   **Then** the API returns `400` with `{ "message": "Faculty last name must be 255 characters or fewer." }`
*   **And** the error is displayed in a `<v-alert type="error">`

#### Scenario: Admin user updates a faculty to have a department that is too long
*   **Given** I am signed in as admin on the faculty page
*   **And** There exists a faculty named `David North` with department `Computer Science`
*   **When** I click the edit icon on the `David North` row
*   **And** I submit a faculty department longer than 255 characters
*   **Then** the API returns `400` with `{ "message": "Faculty department must be 255 characters or fewer." }`
*   **And** the error is displayed in a `<v-alert type="error">`

#### Scenario: Admin user deletes a faculty
*   **Given** I am signed in as admin
*   **And** There exists a faculty named `David North`
*   **When** I click the delete icon on the `David North` row
*   **And** I confirm the delete dialog
*   **Then** the API returns `200` or `204`
*   **And** the faculty `David North` is removed from the faculty view

#### Scenario: Admin user updates a faculty that does not exist
*   **Given** I am signed in as admin
*   **And** A faculty with id `999` does not exist
*   **When** I request `PUT /api/faculty/999` with a valid body
*   **Then** the API returns `404` with `{ "message": "Faculty with id=999 not found." }`

#### Scenario: Admin user updates faculty with an invalid facultyId
*   **Given** I am signed in as admin
*   **When** I request `PUT /api/faculty/abc` with a valid body
*   **Then** the API returns `400` with `{ "message": "Faculty id is invalid." }`

#### Scenario: Admin user deletes a faculty that does not exist
*   **Given** I am signed in as admin
*   **And** A faculty with id `999` does not exist
*   **When** I request `DELETE /api/faculty/999`
*   **Then** the API returns `404` with `{ "message": "Faculty with id=999 not found." }`

#### Scenario: Admin user deletes faculty with an invalid facultyId
*   **Given** I am signed in as admin
*   **When** I request `DELETE /api/faculty/abc`
*   **Then** the API returns `400` with `{ "message": "Faculty id is invalid." }`

---

### US-4.5 — Admin-only faculty

#### Scenario: User with student role cannot see faculty
*   **Given** There exists a faculty `David North`
*   **And** I am signed in as user with student role
*   **When** I request `GET /api/faculty`
*   **Then** the API returns `403` with `{ "message": "Not Authorized." }`
*   **And** `David North` is not in the response

#### Scenario: User with student role cannot create faculty
*   **Given** I am signed in as user with student role
*   **When** I request `POST /api/faculty`
*   **Then** the API returns `403` with `{ "message": "Not Authorized." }`
*   **And** No faculty is created

#### Scenario: User with student role cannot update faculty
*   **Given** There exists a faculty `David North` with id `1`
*   **And** I am signed in as user with student role
*   **When** I request `PUT /api/faculty/1`
*   **Then** the API returns `403` with `{ "message": "Not Authorized." }`
*   **And** `David North` is not updated

#### Scenario: User with student role cannot delete faculty
*   **Given** There exists a faculty `David North` with id `1`
*   **And** I am signed in as user with student role
*   **When** I request `DELETE /api/faculty/1`
*   **Then** the API returns `403` with `{ "message": "Not Authorized." }`
*   **And** `David North` is not deleted

#### Scenario: Unauthenticated user tries to access the faculty view
*   **Given** I have no session in `localStorage`
*   **When** I navigate to `/faculty`
*   **Then** I am redirected to the login page

#### Scenario: Unauthenticated API request to faculty
*   **Given** I have no valid session token
*   **When** I request `GET /api/faculty`
*   **Then** the API returns `401` with an `{ "message": "Not Authorized." }`

#### Scenario: User with student role cannot open the faculty view
*   **Given** I am signed in as a user with student role
*   **And** There exists faculty `David North`
*   **When** I navigate to `/faculty` by URL
*   **Then** I do not see the Faculty heading
*   **And** I do not see faculty `David North`
*   **And** I am redirected to the home page

---

### US-4.6 — Search/paginate faculty

#### Scenario: Users can search faculty by last name

- **Given** I am viewing the faculty list
- **And** Faculty `David North` and a faculty `Glen Davis` exist
- **When** I type `North` into the search field
- **Then** the view updates to show `David North`
- **And** `Glen Davis` is not in the view

#### Scenario: Users can search faculty by first name

- **Given** I am viewing the faculty list
- **And** Faculty `David North` and a faculty `Glen Davis` exist
- **When** I type `Glen` into the search field
- **Then** the view updates to show `Glen Davis`
- **And** `David North` is not in the view

#### Scenario: Users can search faculty by department

- **Given** I am viewing the faculty list
- **And** Faculty `David North` and `Glen Davis` with department `Computer Science` exist 
- **And** Faculty `Travis Montgomery` with department `English` exists
- **When** I type `Computer Science` into the search field
- **Then** the view updates to show `David North` and `Glen Davis`
- **And** `Travis Montgomery` is not in the view

#### Scenario: No matches for search

- **Given** I am viewing the faculty list
- **And** There are no faculty with first name, last name, or department with `zzzz`
- **When** I type `zzzz` into the search field
- **Then** the view updates to show "No results."
- **And** No faculty appear in the view

#### Scenario: Faculty list paginates

- **Given** there are 21 faculty
- **When** I click the next page button
- **Then** the view updates to show the 21st faculty

---

## Test Coverage Map

Each scenario above must map to at least one automated test. Paths below are **intended** files; tests are not written yet.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-4.1 | Admin user creates a new faculty | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user creates a new faculty")` |
| US-4.1 | Admin user creates a faculty with an empty first name | `frontend/tests/Faculty.test.js` | `it("Admin user creates a faculty with an empty first name")` |
| US-4.1 | Admin user creates a faculty with an empty last name | `frontend/tests/Faculty.test.js` | `it("Admin user creates a faculty with an empty last name")` |
| US-4.1 | Admin user creates a faculty with an empty department | `frontend/tests/Faculty.test.js` | `it("Admin user creates a faculty with an empty department")` |
| US-4.1 | Faculty first name is trimmed before save | `backend/tests/faculty.test.js` | `it("Faculty first name is trimmed before save")` |
| US-4.1 | Faculty last name is trimmed before save | `backend/tests/faculty.test.js` | `it("Faculty last name is trimmed before save")` |
| US-4.1 | Faculty department is trimmed before save | `backend/tests/faculty.test.js` | `it("Faculty department is trimmed before save")` |
| US-4.1 | Admin user creates a faculty with a first name that is too long | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user creates a faculty with a first name that is too long")` |
| US-4.1 | Admin user creates a faculty with a last name that is too long | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user creates a faculty with a last name that is too long")` |
| US-4.1 | Admin user creates a faculty with a department that is too long | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user creates a faculty with a department that is too long")` |
| US-4.1 | Admin user creates a faculty identical to an existing faculty | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user creates a faculty identical to an existing faculty")` |
| US-4.2 | Faculty view loads with existing faculty | `frontend/tests/Faculty.test.js` | `it("Faculty view loads with existing faculty")` |
| US-4.2 | Faculty API returns faculty ordered by first name | `backend/tests/faculty.test.js` | `it("Faculty API returns faculty ordered by first name")` |
| US-4.2 | There exist no faculty | `frontend/tests/Faculty.test.js` | `it("There exist no faculty")` |
| US-4.3 | Faculty rows show edit and delete actions | `frontend/tests/Faculty.test.js` | `it("Faculty rows show edit and delete actions")` |
| US-4.4 | Admin user edits faculty first name | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user edits faculty first name")` |
| US-4.4 | Admin user edits faculty last name | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user edits faculty last name")` |
| US-4.4 | Admin user edits faculty department | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user edits faculty department")` |
| US-4.4 | Admin user updates a faculty to have an empty first name | `frontend/tests/Faculty.test.js` | `it("Admin user updates a faculty to have an empty first name")` |
| US-4.4 | Admin user updates a faculty to have an empty last name | `frontend/tests/Faculty.test.js` | `it("Admin user updates a faculty to have an empty last name")` |
| US-4.4 | Admin user updates a faculty to have an empty department | `frontend/tests/Faculty.test.js` | `it("Admin user updates a faculty to have an empty department")` |
| US-4.4 | Admin user updates a faculty to have a first name that is too long | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user updates a faculty to have a first name that is too long")` |
| US-4.4 | Admin user updates a faculty to have a last name that is too long | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user updates a faculty to have a last name that is too long")` |
| US-4.4 | Admin user updates a faculty to have a department that is too long | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user updates a faculty to have a department that is too long")` |
| US-4.4 | Admin user deletes a faculty | `backend/tests/faculty.test.js`, `frontend/tests/Faculty.test.js` | `it("Admin user deletes a faculty")` |
| US-4.4 | Admin user updates a faculty that does not exist | `backend/tests/faculty.test.js` | `it("Admin user updates a faculty that does not exist")` |
| US-4.4 | Admin user updates faculty with an invalid facultyId | `backend/tests/faculty.test.js` | `it("Admin user updates faculty with an invalid facultyId")` |
| US-4.4 | Admin user deletes a faculty that does not exist | `backend/tests/faculty.test.js` | `it("Admin user deletes a faculty that does not exist")` |
| US-4.4 | Admin user deletes faculty with an invalid facultyId | `backend/tests/faculty.test.js` | `it("Admin user deletes faculty with an invalid facultyId")` |
| US-4.5 | User with student role cannot see faculty | `backend/tests/faculty.test.js` | `it("User with student role cannot see faculty")` |
| US-4.5 | User with student role cannot create faculty | `backend/tests/faculty.test.js` | `it("User with student role cannot create faculty")` |
| US-4.5 | User with student role cannot update faculty | `backend/tests/faculty.test.js` | `it("User with student role cannot update faculty")` |
| US-4.5 | User with student role cannot delete faculty | `backend/tests/faculty.test.js` | `it("User with student role cannot delete faculty")` |
| US-4.5 | Unauthenticated user tries to access the faculty view | `frontend/tests/Faculty.test.js` | `it("Unauthenticated user tries to access the faculty view")` |
| US-4.5 | Unauthenticated API request to faculty | `backend/tests/faculty.test.js` | `it("Unauthenticated API request to faculty")` |
| US-4.5 | User with student role cannot open the faculty view | `frontend/tests/Faculty.test.js` | `it("User with student role cannot open the faculty view")` |
| US-4.6 | Users can search faculty by last name | `frontend/tests/Faculty.test.js` | `it("Users can search faculty by last name")` |
| US-4.6 | Users can search faculty by first name | `frontend/tests/Faculty.test.js` | `it("Users can search faculty by first name")` |
| US-4.6 | Users can search faculty by department | `frontend/tests/Faculty.test.js` | `it("Users can search faculty by department")` |
| US-4.6 | No matches for search | `frontend/tests/Faculty.test.js` | `it("No matches for search")` |
| US-4.6 | Faculty list paginates | `frontend/tests/Faculty.test.js` | `it("Faculty list paginates")` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 4 from @features/feature-4-faculty-management.md on branch `feature/4-faculty-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [ ] Backend and frontend implemented per this spec (**FR-00N** satisfied)
*   [ ] **Success Criteria (SC-00N)** met
*   [ ] All mapped tests pass (`npm test`)
*   [ ] Test Coverage Map complete
*   [ ] `features/reference/data-model.md` updated (if schema changed)
*   [ ] `features/reference/api.md` updated (if API changed)
*   [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

*   Faculty ↔ section linking / `Section` workflows (Feature 5)
*   Drag-and-drop faculty reordering
*   No restrict-on-delete (Feature 5)
*   No `Section` model, table, or `facultyId` foreign key (Feature 5)
*   No faculty email, title, office, or other fields beyond firstName, lastName, department

