# Feature: Section Student Listing

**Feature ID:** 8
**Branch pattern:** `feature/8-section-student-listing`
**Status:** Draft
**Created:** 2026-09-23
**Input:** Signed-in admin users can view which students are enrolled in a course
**Depends on:** Feature 6

---

## User Stories

### US-8.1: See Students in Sections

**As a** signed-in admin user  
**I want to** see which students have enrolled in a each section  
**So that** I can plan and schedule accordingly

**Priority:** P1  
**Independent test:** view the list of students enrolled in a section
**Acceptance scenarios:** see ### US-8.1 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All section endpoints MUST require a valid session (`authenticate` middleware).

---

## Assumptions

## Edge Cases

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin can view all students enrolled in a section.

---

## Data Ownership & Isolation

Only signed-in admin users should be able to manage sections. Other signed-in users may browse sections.

---

## API Requirements

Already fulfilled by earlier features.

---

## Screen Requirements

### [View: SectionStudentModal]

Single modal that renders within CourseCard.vue

**Section Students view (this feature)**

- Heading: {information about section}
- Display students as rows (e.g. `<v-list>` or table): each row shows the **first name**, **last name**, **email**
- **Empty state:** **"No students have enrolled in this section yet."** when there are no students enrolled in the section.
- **Loading state:** skeleton or progress indicator while data is loading.
- **Error state:** `<v-alert type="error">` for API failures.
- **Pagination:** student rows are paginated when there are more than 20 rows

---

## Key Entities

- **Section**: one section the university offers, distinct from sections of the section
- **User**: one student or admin who can log into the application.
- **Enrollment**: a bridge connecting users to sections to represent enrolling in a specific course section.

---

## Data Model Requirements

No new tables for this feature

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-8.1 — See Students in Sections

#### Scenario: Admin Student Sections list loads

- **Given** I am signed in as an admin
- **When** I navigate to the Section Students view
- **Then** I see a list of all the students enrolled in that section

#### Scenario: Admin Student Sections list empty

- **Given** I am signed in as an admin
- **When** I navigate to the Section Students view of a section with no students enrolled
- **Then** I see "No students have enrolled in this course yet."

---

## Test Coverage Map

Each scenario above must map to at least one automated test.

| Story  | Scenario                          | Test file                                                                  | Test name                          |
| ------ | --------------------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| US-8.1 | Admin Student Sections list loads | `backend/tests/sectionStudents.test.js`, `frontend/tests/Courses.test.js` | `Admin Student Sections list loads` |
| US-8.1 | Admin Student Sections list empty | `backend/tests/sectionStudents.test.js`, `frontend/tests/Courses.test.js` | `Admin Student Sections list empty` |

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-00N** satisfied)
- [ ] **Success Criteria (SC-00N)** met
- [ ] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

N/A

---

## Delivered to Feature 5

N/A
