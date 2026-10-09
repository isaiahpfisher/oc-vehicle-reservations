# Behavior & Rules Reference

**Living snapshot** of product rules currently in force. Feature 6 enrollment rules are recorded here.

These files answer: *"What rules does the app enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, sort, validation, UI rules |

## Enrollment

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| `studentId` comes from the signed-in user | `POST` and `DELETE` ignore any client student id and use `req.user.id` | Feature 6, FR-001 |
| A student has one section per course per semester | Enrolling in another section with the same course and `semesterId` deletes the other enrollment for that pair. A different semester stays. | Feature 6, FR-006 |
| Students enroll from the course card | One `oc-cta` button per section: **Enroll** or **Unenroll**. The list reloads after success. A failed call shows `<v-alert type="error">`. | Feature 6, FR-002–FR-005 |
| Admins do not enroll | No enroll/unenroll button. `GET`, `POST`, and `DELETE /api/enrollments` return `404`. | Feature 6, FR-007, FR-008 |
| Deleting a section removes its enrollments | `Section` has many enrollments with `onDelete: CASCADE` | Feature 6, FR-009 |
