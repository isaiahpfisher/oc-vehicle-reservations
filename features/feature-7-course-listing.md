# Feature: Student Course Listing

**Feature ID:** 7
**Branch pattern:** `feature/7-course-listing`
**Status:** Ready
**Created:** 2026-09-23
**Input:** Signed-in student users select a semester from a dropdown of semesters to view the courses the student is enrolled in for that semester. The course listing view has a heading with a dropdown for the student to select the semester. 
**Depends on:** Feature 1 — User Authentication, Feature 2 — Semester Management, Feature 3 — Course Management, Feature 5 — Section Management, Feature 6 — Enrollment Management

---

## User Stories

### US-7.1: Open the course listing

**As a** signed-in student user  
**I want** to open a course listing page with a semester dropdown 
**So that** I can choose which semester to view courses for

**Priority:** P1  
**Independent test:** Open the course listing page without selecting a semester; there exists a dropdown with no enrolled section rows visible
**Acceptance scenarios:** see ### US-7.1 under Acceptance Criteria

### US-7.2: View courses for selected semester

**As a** signed-in student user  
**I want** to see the courses I am enrolled in for the semester I selected
**So that** I can know what courses I have in that particular semester

**Priority:** P1  
**Independent test:** Select a semester; rows of enrolled sections for that semester appear
**Acceptance scenarios:** see ### US-7.2 under Acceptance Criteria

### US-7.3: Change selected semester

**As a** signed-in student user  
**I want** to change the semester
**So that** I can switch terms without leaving the page

**Priority:** P1  
**Independent test:** After selecting a semester, select a different semester; rows of enrolled sections for that semester appear
**Acceptance scenarios:** see ### US-7.3 under Acceptance Criteria

### US-7.4: Private courses only

**As a** signed-in student user  
**I want** my courses visible only to me  
**So that** other users cannot read what courses I am enrolled in

**Priority:** P1  
**Independent test:** Admin user course listing access redirects to home; `GET /api/course-listings/:semesterId` never returns another user's enrolled sections  
**Acceptance scenarios:** see ### US-7.4 under Acceptance Criteria

## Requirements

### Functional Requirements

- **FR-001**: This feature MUST add a **course listing view** in `CourseListing.vue` at route name `course-listing`, path `/course-listing`.
- **FR-002**: The course listing view MUST have a **heading area** with dropdown selection: **Semester:** and options from Feature 2.
- **FR-003**: The course listing page MUST list **only the signed-in student's enrollments whose associated section's `semesterId` matches the selected semester**. Columns: **Section #**, **Course**, **Credit Hours**, **Days**, **Time**.
- **FR-004**: Empty semester list copy on selected semester MUST be **"No enrolled courses."** 
- **FR-005**: Unknown `semesterId` MUST show **"Semester with id=<id> not found."**
- **FR-006**: Unselected semester shows **"Select a semester to view courses."**. No rows and no listing fetch until a semester is selected.
- **FR-007**: Unauthenticated navigation to `/course-listing` MUST redirect to `login`. Guests MUST NOT see **Course Listing** in `MenuBar` (Feature 1).
- **FR-008**: On semester change the existing list is replaced by a new list corresponding to the new selected semester. 

---

## Assumptions

- Features 1–6 MUST be merged to `dev` before implementing this feature.

## Edge Cases

- Semester with zero enrollments → **"No enrolled courses."**
- Unknown `semesterId` → **"Semester with id=<id> not found."**
- Unauthenticated `/course-listing` → redirect to `login`.
- Admin user `/course-listing` → redirect to `home`.
- First load of page/ no semesters exist → "Select a semester to view courses."
- Enrolled sections for another semester MUST NOT appear.
- Another student's enrolled sections MUST NOT appear.
- Row time is the section's startTime-endTime.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: A signed-in student can select a semester from the list and see their enrollments for that semester.
- **SC-003**: `npm test` passes for the course listing view and behavior.
- **SC-004**: Opening the listing with no semester selected shows the prompt and no enrolled-section rows.
- **SC-005**: Changing the semester replaces the list with that term’s enrollments.

---

## Data Ownership & Isolation

No new table. Only role `student` sees the course listing and semester selection.

| Rule               | Requirement                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Read scope** | `GET /api/course-listings/:semesterId=` returns only enrolled sections where `studentId = req.user.id` and the section's `semesterId` is the selected semester. |
| **Write scope** | None. This feature does not create, update, or delete enrollments, sections, or courses. |
| **Create scope** | None. |
| **UI scope**       | `/course-listing` is student-only. Guests redirect to login. Admin redirects to home. |
| **Implementation** | `authenticate`, then require `student`. Filter on `enrollments.studentId = req.user.id` in the listing/enrollment query. Do not load all sections and filter in the Vue view. |

---

## API Requirements

| Method | Endpoint          | Auth       | Purpose in this feature                                      |
| ------ | ----------------- | ---------- | ------------------------------------------------------------ |
| `GET`  | `/api/semesters` | Yes        | Dropdown options |
| `GET`  | `/api/course-listings/:semesterId=` | Yes - student       | Load enrolled sections for this student that match the selected semester                  |

The client MUST NOT request `/api/course-listing` until `semesterId` is selected.

**Course listing success response** (`200`):
```json
[{
  "courseId": "CMSC-1200",
  "sectionId": "01",
  "name": "Programming I",
  "hours": "3.00",
  "days": "MWF",
  "startTime": "10:00",
  "endTime": "10:50"
},
{
  "courseId": "CMSC-1234",
  "sectionId": "01",
  "name": "Software Engineering I",
  "hours": "3.00",
  "days": "TTH",
  "startTime": "01:10",
  "endTime": "02:30"
}]
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.  
**Forbidden role (admin):** `401`
**Unknown semester:** `404` `{ "message": "Semester with id=${semesterId} not found." }`
**Invalid semesterId:** `400` `{ "message": "Semester id is invalid." }`
**Empty enrollments:** `200` with `[]`
**Unauthenticated:** `401` `{ "message": "Not Authorized." }`

---

## Screen Requirements

### [View: Course Listing] — route name `course-listing`
**Single Vue view** (`CourseListing.vue`)

**Course Listing view (this feature)**
*   Heading: **Course Listing**
*   Primary action: **Semester** with dropdown with a list of semesters to choose from. 
*   Display enrollments in a table (`v-data-table` or equivalent) with columns
    **Section #**, **Course**, **Credit Hours**, **Days**, **Time**.
    *   Section # is `courseId` + `-` + `sectionId` (e.g. `CMSC-1200-01`).
    *   Course is course name.
    *   Time is `startTime` + `—` + `endTime` for section.
*   **Empty state:** **"No enrolled courses."** on there exist no enrollments for the selected semester. 
*   **First load of page:** **"Select a semester to view courses."**
*   **Loading state:** skeleton or progress indicator while enrollments are fetching.
*   **Error state:** `<v-alert type="error">` for API failures.

**App chrome**
*   `MenuBar` shows a **Course Listing** nav link only when signed in as student.
*   Guests attempting to navigate to `/course-listing` by URL are redirected to a login screen.
*   Authenticated admins who open `/course-listing` by URL are redirected to home and do not see the Course Listing heading or any semesters or enrollments.
*   `MenuBar` is shown app-wide via `App.vue`.

**Implementation note:** one route/view for course listing.

---

## Key Entities

- **User** (Feature 1): The signed in student; enrollments and listing rows belong to this user.
- **Semester** (Feature 2): The term the student selects from the dropdown menu; has many sections. Shared catalog, not owned by the student.
- **Course** (Feature 3): An entity connected to a section that has more detailed information for display in the course listing row. Not owned by the student but a shared catalog.
- **Section** (Feature 5): A particular instance of a course that a student is enrolled in. Belongs to a semester and a course.
- **Enrollment** (Feature 6): A connection between a student + section.
- **Course listing row**: Not a stored entity; pulls information from `enrollment`, `section`, and `course`.

---

## Data Model Requirements

No schema change. Existing Feature 2 `semesters`, 3 `courses`, 5 `sections`, and 6 `enrollments` are sufficient.

This feature reads (does not write):
- `semesters` — dropdown
- `enrollments` — `studentId` = signed-in user, `sectionId`
- `sections` — `semesterId`, `courseId`, section number, days, **startTime**, **endTime**
- `courses` — course number, name, hours

---

## Acceptance Criteria (Gherkin)

### US-7.1 — Open the course listing

#### Scenario: Signed-in student user opens the course listing
*   **Given** I am signed in with student role
*   **When** I navigate to `/course-listing`
*   **Then** I see a page with a dropdown labeled **"Semester"** and an empty page with the message **"Select a semester to view courses."**
*   **And** The dropdown box for **Semester** is not prefilled with any semester
*   **And** no request is sent to `GET /api/course-listing`

#### Scenario: Signed-in student user clicks on the **Semester** dropdown
*   **Given** I am signed in with student role
*   **And** I am on the course listing page
*   **And** I have not yet selected a semester
*   **And** There exist semesters `Fall 2026` and `Spring 2027`
*   **When** I click on the dropdown labeled **Semester**
*   **Then** The dropdown menu expands and shows semesters `Fall 2026` and `Spring 2027`

#### Scenario: No semesters exist
*   **Given** I am signed in with student role
*   **And** I am on the course listing page
*   **And** I have not yet selected a semester
*   **And** There exist no semesters
*   **When** I click on the dropdown labeled **Semester**
*   **Then** The dropdown menu has nothing in it

### US-7.2 — View courses for selected semester

#### Scenario: Signed-in student user selects a semester
*   **Given** I am signed in with student role
*   **And** I am on the course listing page
*   **And** I have not yet selected a semester
*   **And** There exists a semester `Fall 2026`
*   **And** I have enrollments for course `CMSC-1200` and `CMSC-1234` in semester `Fall 2026`
*   **When** I click on the dropdown labeled **Semester**
*   **And** I select the semester `Fall 2026`
*   **Then** I see rows `CMSC-1200` and `CMSC-1234`

#### Scenario: Enrollments are filtered by semester
*   **Given** I am signed in with student role
*   **And** I am on the course listing page
*   **And** There exists semesters `Fall 2026` and `Spring 2027`
*   **And** I have an enrollment for course `CMSC-1200` in semester `Fall 2026`
*   **And** I have an enrollment for course `CMSC-1234` in semester `Spring 2027`
*   **When** I select the semester `Fall 2026`
*   **Then** I see a row `CMSC-1200` 
*   **And** `CMSC-1234` does not appear

#### Scenario: Signed-in student user has no enrollments in selected semester
*   **Given** I am signed in with student role
*   **And** I am on the course listing page
*   **And** There exists a semester `Fall 2026`
*   **And** I have no enrollments in semester `Fall 2026`
*   **When** I select the semester `Fall 2026`
*   **Then** I see the message **"No enrolled courses."**
*   **And** No enrollments appear

### US-7.3 — Change selected semester

#### Scenario: Signed-in student changes selected semester
*   **Given** I am signed in with student role
*   **And** I have selected semester `Fall 2026`
*   **And** There also exists a semester `Spring 2027`
*   **And** I have an enrollment for course `CMSC-1200` in semester `Fall 2026`
*   **And** I have an enrollment for course `CMSC-1234` in semester `Spring 2027`
*   **When** I select the semester `Spring 2027`
*   **Then** I see a row `CMSC-1234` 
*   **And** `CMSC-1200` does not appear

### US-7.4 — Private courses only

#### Scenario: Enrollments are filtered by student
*   **Given** I am signed in with student role
*   **And** I am on the course listing page
*   **And** There exists a semester `Fall 2026`
*   **And** I have an enrollment for course `CMSC-1200` in semester `Fall 2026`
*   **And** Another student has an enrollment for course `CMSC-1234` in semester `Fall 2026`
*   **When** I select the semester `Fall 2026`
*   **Then** I see a row `CMSC-1200` 
*   **And** `CMSC-1234` does not appear

#### Scenario: Course listing API only lists one student's enrollments
*   **Given** I am signed in with student role
*   **And** There exists a semester `Fall 2026`
*   **And** I have an enrollment for course `CMSC-1200` in semester `Fall 2026` 
*   **And** Semester `Fall 2026` has id `1`
*   **And** Another student has an enrollment for course `CMSC-1234` in semester `Fall 2026`
*   **When** I request `GET /api/course-listings/:semesterId=1`
*   **Then** The API returns `200`
*   **And** `CMSC-1200` is in the response
*   **And** `CMSC-1234` is not in the response

#### Scenario: Unauthenticated user tries to access the course listing view
*   **Given** I have no session in `localStorage`
*   **When** I navigate to `/course-listing`
*   **Then** I am redirected to the login page

#### Scenario: Unauthenticated API request to course listing
*   **Given** I have no valid session token
*   **When** I request `GET /api/course-listings/:semesterId=1`
*   **Then** the API returns `401` with an `{ "message": "Not Authorized." }`

#### Scenario: User with admin role cannot open the course listing view
*   **Given** I am signed in as a user with admin role
*   **When** I navigate to `/course-listing` by URL
*   **Then** I do not see the `Course Listing` heading
*   **And** I do not see the dropdown with semesters
*   **And** I do not see a table of enrollments
*   **And** I am redirected to the home page

#### Scenario: User with admin role cannot fetch courses
*   **Given** I am signed in as a user with admin role
*   **When** I request `GET /api/course-listings/:semesterId=1`
*   **Then** I receive `401`

#### Scenario: Unknown semesterId
*   **Given** I am signed in as a user with student role
*   **And** A semester with id `999` does not exist
*   **When** I request `GET /api/course-listings/:semesterId=999`
*   **Then** I receive `404` with { "message": "Semester with id=999 not found." }

#### Scenario: Bad semesterId
*   **Given** I am signed in as a user with student role
*   **When** I request `GET /api/course-listings/:semesterId=abc`
*   **Then** I receive `400` with { "message": "Semester id is invalid." }

---

## Test Coverage Map

Each scenario above must map to at least one automated test. Paths below are **intended** files; tests are not written yet.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-7.1 | Signed-in student user opens the course listing | `frontend/tests/CourseListing.test.js` | `it("Signed-in student user opens the course listing")` |
| US-7.1 | Signed-in student user clicks on the **Semester:** dropdown | `frontend/tests/CourseListing.test.js` | `it("Signed-in student user clicks on the **Semester:** dropdown")` |
| US-7.1 | No semesters exist | `frontend/tests/CourseListing.test.js` | `it("No semesters exist")` |
| US-7.2 | Signed-in student user selects a semester | `frontend/tests/CourseListing.test.js` | `it("Signed-in student user selects a semester")` |
| US-7.2 | Enrollments are filtered by semester | `frontend/tests/CourseListing.test.js` | `it("Enrollments are filtered by semester")` |
| US-7.2 | Signed-in student user has no enrollments in selected semester | `frontend/tests/CourseListing.test.js` | `it("Signed-in student user has no enrollments in selected semester")` |
| US-7.3 | Signed-in student changes selected semester | `frontend/tests/CourseListing.test.js` | `it("Signed-in student changes selected semester")` |
| US-7.4 | Enrollments are filtered by student | `frontend/tests/CourseListing.test.js` | `it("Enrollments are filtered by student")` |
| US-7.4 | Course listing API only lists one student's enrollments | `backend/tests/courseListing.test.js` | `it("Course listing API only lists one student's enrollments")` |
| US-7.4 | Unauthenticated user tries to access the course listing view | `frontend/tests/CourseListing.test.js` | `it("Unauthenticated user tries to access the course listing view")` |
| US-7.4 | Unauthenticated API request to course listing | `backend/tests/courseListing.test.js` | `it("Unauthenticated API request to course listing")` |
| US-7.4 | User with admin role cannot open the course listing view | `frontend/tests/CourseListing.test.js` | `it("User with admin role cannot open the course listing view")` |
| US-7.4 | User with admin role cannot fetch courses | `backend/tests/courseListing.test.js` | `it("User with admin role cannot fetch courses")` |
| US-7.4 | Unknown semesterId | `backend/tests/courseListing.test.js` | `it("Unknown semesterId")` |
| US-7.4 | Bad semesterId | `backend/tests/courseListing.test.js` | `it("Bad semesterId")` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 7 from @features/feature-7-course-listing.md on branch `feature/7-course-listing`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

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

- Admin-facing course-listing UI
- New enrollment, section, course, or semester fields or UI
- Further enrollment management from the course listing page

---
