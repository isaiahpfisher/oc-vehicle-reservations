# Behavior & Rules Reference

**Living snapshot** of product rules currently in force. Feature 6 enrollment rules are recorded here.

These files answer: *"What rules does the app enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, sort, validation, UI rules |

## Authentication

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Sign-in uses a Google ID token | `POST /api/login` body is `{ googleCredentials }`. The server reads email and name from the verified token. | Feature 1, FR-001, FR-006 |
| Stored name follows Google | Every successful login writes `given_name` and `family_name` onto the user. Profile update does not change `firstName`, `lastName`, or `email`. | Feature 1, FR-006 |
| Only OC emails can sign in | The domain must be `oc.edu` or a subdomain such as `eagles.oc.edu`. Any other verified email returns `401` `{ "message": "Non OC email used." }` and creates nothing. | Feature 1, FR-006 |
| Session is an app JWT for 24 hours | Stored in `sessions` and `localStorage` key `user`. Later calls send `Authorization: Bearer`. An unexpired session for that user is reused. | Feature 1, FR-002, FR-003 |
| Opening `/` without a session redirects to login | Router guard. A stored session that opens `/login` redirects home. | Feature 1, FR-005 |
| Sign out deletes that session | `POST /api/logout` deletes the matching session row and the client removes `user`. | Feature 1, US-1.4 |
| `authenticate` sets `req.user.id` | Bearer token must match an unexpired session row. | Feature 1, FR-004 |

## Enrollment

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| `studentId` comes from the signed-in user | `POST` and `DELETE` ignore any client student id and use `req.user.id` | Feature 6, FR-001 |
| A student has one section per course per semester | Enrolling in another section with the same course and `semesterId` deletes the other enrollment for that pair. A different semester stays. | Feature 6, FR-006 |
| Students enroll from the course card | One `oc-cta` button per section: **Enroll** or **Unenroll**. The list reloads after success. A failed call shows `<v-alert type="error">`. | Feature 6, FR-002–FR-005 |
| Admins do not enroll | No enroll/unenroll button. `GET`, `POST`, and `DELETE /api/enrollments` return `404`. | Feature 6, FR-007, FR-008 |
| Deleting a section removes its enrollments | `Section` has many enrollments with `onDelete: CASCADE` | Feature 6, FR-009 |
