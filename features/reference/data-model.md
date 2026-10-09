# Data Model Reference

**Status:** Feature 6 adds `enrollments`. Sequelize creates `id`, `createdAt`, and `updatedAt`.

## `enrollments`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `studentId` | INTEGER | Required. References `users.id`. Set from the session. |
| `sectionId` | INTEGER | Required. References `sections.id`. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

## Associations

- A user has many enrollments (`studentId`). Deleting the user deletes those enrollments.
- An enrollment belongs to one user and one section.
- A section has many enrollments (`sectionId`). Deleting the section deletes those enrollments.
