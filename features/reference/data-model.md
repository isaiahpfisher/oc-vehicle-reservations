# Data Model Reference

**Status:** Feature 2 adds `areas`. Feature 6 adds `enrollments`. Sequelize creates `id`, `createdAt`, and `updatedAt`.

## `users`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `firstName` | STRING | Required. Replaced from the Google token on every login. Profile update does not change it. |
| `lastName` | STRING | Required. Replaced from the Google token on every login. Profile update does not change it. |
| `email` | STRING | Required, unique. Google login stores the lowercased token email. Profile update does not change it. |
| `role` | STRING | Existing course features. Not set by the Google login request. New Google users default to `student`. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

## `sessions`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `token` | STRING | Required. App JWT returned to the client. |
| `email` | STRING | Required |
| `expirationDate` | DATE | Required. Creation time plus 24 hours. |
| `userId` | INTEGER | Required. References `users.id`. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

A user has many sessions. A session belongs to one user.

## `areas`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `name` | STRING | Required, trimmed, unique, max 255 |
| `logo` | TEXT | Required. Trimmed. Empty string when no logo. A non-empty value is an `http` or `https` URL. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

An area has no associations in this feature.

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
