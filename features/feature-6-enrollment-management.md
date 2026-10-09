# Feature: Enrollment Management

**Feature ID:** 6
**Branch pattern:** `feature/6-enrollment-management`
**Status:** Draft
**Created:** 2026-09-27
**Input:** Signed-in student can enroll and unenroll in sections
**Depends on:** Feature 1, Feature 3, Feature 5

---

## User Stories

### US-6.1: Create Enrollment

**As a** signed-in student user
**I want to** Enroll in a class section
**So that** I will be registered for a section for the semester

**Priority:** P1  
**Independent test:** Open course view, open selected course sections, click enroll button; it is added to user's enrolled sections
**Acceptance scenarios:** see ### US-6.1 under Acceptance Criteria

### US-6.2: Delete Enrollment

**As a** signed-in student user  
**I want to** Unenroll from a section
**So that** I can unenroll from classes I don't want to be in anymore

**Priority:** P2  
**Independent test:** Open course view, open selected course sections, click unenroll button; it is removed from user's enrolled sections
**Acceptance scenarios:** see ### US-6.2 under Acceptance Criteria

### US-6.3: One Enrollment per course per semester

**As a** signed-in student user  
**I want to** be enrolled in only one section of a course in a semester
**So that** I don't take two sections of the same course in the same semester

**Priority:** P2  
**Independent test:** Enroll in a second section of a course in the same semester; that new enrollment is created and the other enrollment for that course in that semester is deleted. An enrollment for that course in a different semester stays.
**Acceptance scenarios:** see ### US-6.3 under Acceptance Criteria

### US-6.4: Admin users

**As a** signed-in admin user  
**I want to** Not enroll or unenroll students in sections
**So that** the student has full control over their enrollments

**Priority:** P2  
**Independent test:** navigate to sections under courses view as an admin; buttons are not displayed
**Acceptance scenarios:** see ### US-6.4 under Acceptance Criteria

### US-6.5: Section is removed

**As a** signed-in student user  
**I want to** not enroll in deleted sections
**So that** my enrollment data is consistent with section data

**Priority:** P2  
**Independent test:** delete a section as an admin; enrollments for that section are deleted and reflect in student's view
**Acceptance scenarios:** see ### US-6.5 under Acceptance Criteria

## Functional Requirements

- **FR-001**: All enrollment endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: In course view, under the sections dropdown, each section in the student's enrollments MUST have an unenroll button displayed
- **FR-003**: In course view, under the sections dropdown, each section that is not in the student's enrollments MUST have an enroll button displayed
- **FR-004**: In course view, under the sections dropdown, if the enroll button is clicked, a new enrollment object for the selected section MUST be created
- **FR-005**: In course view, under the sections dropdown, if the unenroll button is clicked, the enrollment object for the selected section MUST be deleted
- **FR-006**: If the user enrolls in a section of a course they are already enrolled in for that section's semester, every other enrollment for this student whose section has the same course and the same `semesterId` MUST be deleted, and the new enrollment MUST be created. Enrollments for that course in a different semester MUST stay.
- **FR-007**: If user is an Admin, the enroll or unenroll buttons MUST NOT be displayed
- **FR-008**: If user is an Admin, enroll/unenroll requests MUST be rejected
- **FR-009**: If a section is deleted, every enrollment containing the section's `sectionId` MUST be deleted

## Assumptions

- Courses view exists from Feature 3
- Sections view exists within Course view under each course from Feature 5
- Students can open course view and view all available sections per course

## Edge Cases

- User is enrolled in a section and clicks enroll on a different section of the same course in the same semester → the first enrollment is deleted, the new one is created, and the buttons change to reflect the new state of enrollments
- User is enrolled in a section and enrolls in a section of the same course in a different semester → the first enrollment stays
- A section is deleted → all enrollments associated with that section are deleted
- A different user has enrollments → the current user's enroll/unenroll buttons reflect only the current user's enrollments
- There is no session on an enroll or unenroll request → 401
- An admin views sections → the enroll/unenroll buttons are not displayed, and all enroll/unenroll requests are rejected
- A user is enrolled in a section and enrolls in a section for a different course → the first enrollment stays

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: A signed-in student can enroll or unenroll from a section with that section’s button.
- **SC-003**: Enrolling in a second section of the same course and semester deletes the previous enrollment for that course in that semester. An enrollment for that course in another semester remains.
- **SC-004**: An admin does not see enroll or unenroll buttons, and an admin enroll or unenroll request is rejected.
- **SC-005**: Deleting a section deletes enrollments for that section.
- **SC-006**: `npm test` passes for enrollment behavior.

---

## Data Ownership & Isolation

- Signed-in student users only manage their own enrollments.
- Admins can delete a section, which deletes all enrollments for the section

---

## API Requirements

`studentId` is always the signed-in user (`req.user.id`). The client does not send it. Role `admin` is rejected with `404`.

| Method   | Endpoint                      | Auth          | Purpose |
| -------- | ----------------------------- | ------------- | ------- |
| `GET`    | `/api/enrollments`            | Yes - Student | List enrollments for the signed-in student |
| `POST`   | `/api/enrollments`            | Yes - Student | Enroll the signed-in student in a section. If that student already has another section of the same course with the same `semesterId`, delete those enrollments first. |
| `DELETE` | `/api/enrollments/:sectionId` | Yes - Student | Unenroll the signed-in student from that section |

**Create enrollment request body** (`POST /api/enrollments`):

```json
{
  "sectionId": 1
}
```

**Create enrollment success response** (`201`):

```json
{
  "id": 1,
  "studentId": 42,
  "sectionId": 1,
  "createdAt": "2026-09-30T00:00:00.000Z",
  "updatedAt": "2026-09-30T00:00:00.000Z"
}
```

**List enrollments success response** (`200`): an array of the same enrollment objects. Empty list is `200` with `[]`.

**Delete enrollment:** no request body. Success is `204` with no body.

**Error response:** `{ "message": "Human-readable explanation." }` with the HTTP status.

- No session → `401`
- Missing `sectionId` → `400`
- Unknown `sectionId`, another student's enrollment, or role `admin` → `404` (do not use `403`)

---

## Screen Requirements

### [View: Courses] — route name `courses`

**Signed-in student**

- Each section shows one labeled button.
  - **Enroll** when that section is not in this student's enrollments. Use class `oc-cta`.
  - **Unenroll** when that section is in this student's enrollments. Use class `oc-cta`.
- The other label is not shown on that section.
- **Enroll** sends `POST /api/enrollments` with that section's `sectionId`.
- **Unenroll** sends `DELETE /api/enrollments/:sectionId`.
- After a successful enroll or unenroll, the button label updates to match this student's enrollments.
- If the student enrolls in a second section of the same course in the same semester, those other same-semester sections' buttons change to **Enroll** and the selected section's button changes to **Unenroll**. A section of that course in another semester stays **Unenroll**.
- Buttons reflect only the signed-in student's enrollments.
- Each section has its enroll/unenroll button next to it in the `Courses.vue`
- There is no enrollment dialog
- The clicked button shows a loading state while the request is in flight.
- **Error state:** `<v-alert type="error">` when enroll or unenroll fails.

**Signed-in admin**

- **Enroll** and **Unenroll** are not displayed.
---

## Key Entities

- **Enrollment**: For each student, the sections they are taking
- **User**: the signed-in students
- **Section**: a section being enrolled/unenrolled
- **Course**: compared with the section's course when a student enrolls in a second section
- **Semester**: compared with the section's semester when a student enrolls in a second section

---

## Data Model Requirements

### `enrollments` table

| Field           | Type       | Rules                                            |
| -------------   | ---------- | ------------------------------------------------ |
| `id`            | INTEGER PK | Auto-increment                                   |
| `studentId`     | INTEGER FK | Required; references users.id; set from session  |
| `sectionId`     | INTEGER FK | Required; references sections.id                 |
| `createdAt`     | DATE       | Sequelize timestamps                             |
| `updatedAt`     | DATE       | Sequelize timestamps                             |

### Associations (in `models/index.js`)

- User has zero to many Enrollments
- Enrollment has one User
- Section has zero to many Enrollments
- Enrollment has one Section
- Enrollment belongs to User
- Enrollment belongs to Section

---

## Acceptance Criteria (Gherkin)

### US-6.1: Create Enrollment

#### Scenario: Student enrolls in section

- **Given** I am signed in as a student in the sections view 
- **When** I click the enroll button on a section
- **Then** I am enrolled in that section
- **And** The enroll button changes to unenroll

#### Scenario: Student views correct enrollment buttons

- **Given** I am signed in as a student in the sections view
- **And** another student has enrolled in a section
- **When** I view that section
- **Then** The button reflects my status of enrollment in that section

#### Scenario: user with no session tries to enroll

- **Given** I am in the sections view with no session
- **When** I make an enroll API call
- **Then** Error returns 401

### US-6.2: Delete Enrollment

#### Scenario: Student unenrolls in a section

- **Given** I am signed in as a student in the sections view 
- **When** I click the unenroll button on a section
- **Then** I am unenrolled in that section
- **And** The unenroll button changes to enroll

#### Scenario: user with no session tries to unenroll

- **Given** I am in the sections view with no session
- **When** I make an unenroll API call
- **Then** Error returns 401

### US-6.3: One Enrollment per course per semester

#### Scenario: Student enrolls in a second section of the same course and semester

- **Given** I am signed in as a student in the sections view
- **And** I am enrolled in a section of a course for a semester
- **When** I enroll in a different section of that course in that same semester
- **Then** I am enrolled in the selected section
- **And** I am unenrolled from the other section of that course in that semester
- **And** The buttons reflect my current state of enrollment

#### Scenario: Student enrolls in the same course in a different semester

- **Given** I am signed in as a student in the sections view
- **And** I am enrolled in a section of a course for a semester
- **When** I enroll in a section of that course in a different semester
- **Then** I am enrolled in the selected section
- **And** I stay enrolled in the section from the other semester

### US-6.4: Admin users

#### Scenario: Admin views sections view

- **Given** I am signed in as an Admin in the sections view
- **When** I view sections
- **Then** The enroll/unenroll buttons are not displayed

#### Scenario: Admin tries to call API for enrollment

- **Given** I am signed in as an Admin in the sections view
- **When** I make an API request to enroll/unenroll
- **Then** Error returns 404

### US-6.5: Section is removed

#### Scenario: Admin deletes a section

- **Given** I am signed in as an Admin in the sections view
- **When** I delete a section
- **Then** All enrollments for that section are deleted
- **And** Student view reflects change

---

## Test Coverage Map

Each scenario above must map to at least one automated test.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-6.1 | Student enrolls in section | `backend/tests/enrollment.test.js`, `frontend/tests/Courses.test.js` | `Student enrolls in section` |
| US-6.1 | Student views correct enrollment buttons | `frontend/tests/Courses.test.js` | `Student views correct enrollment buttons` |
| US-6.1 | user with no session tries to enroll | `backend/tests/enrollment.test.js` | `user with no session tries to enroll` |
| US-6.2 | Student unenrolls in a section | `backend/tests/enrollment.test.js`, `frontend/tests/Courses.test.js` | `Student unenrolls in a section` |
| US-6.2 | user with no session tries to unenroll | `backend/tests/enrollment.test.js` | `user with no session tries to unenroll` |
| US-6.3 | Student enrolls in a second section of the same course and semester | `backend/tests/enrollment.test.js`, `frontend/tests/Courses.test.js` | `Student enrolls in a second section of the same course and semester` |
| US-6.3 | Student enrolls in the same course in a different semester | `backend/tests/enrollment.test.js`, `frontend/tests/Courses.test.js` | `Student enrolls in the same course in a different semester` |
| US-6.4 | Admin views sections view | `frontend/tests/Courses.test.js` | `Admin views sections view` |
| US-6.4 | Admin tries to call API for enrollment | `backend/tests/enrollment.test.js` | `Admin tries to call API for enrollment` |
| US-6.5 | Admin deletes a section | `backend/tests/enrollment.test.js`, `frontend/tests/Courses.test.js` | `Admin deletes a section` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 6 from @features/feature-6-enrollment-management.md on branch `feature/6-enrollment-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-00N** satisfied)
- [x] **Success Criteria (SC-00N)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Enrollment dialogs
- Creating or editing sections ([Feature 5](./feature-5-section-management.md))
- Viewing enrollments by semester ([Feature 7](./feature-7-course-listing.md))
- Admin roster of students in a section ([Feature 8](./feature-8-section-student-listing.md))

---
