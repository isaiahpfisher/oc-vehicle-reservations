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

## `vehicle_requests` (Feature 8)

Attribute names are snake_case so API payloads match the Feature 8 spec.

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `user_id` | INTEGER | Required. References `users.id`. Set from the session. |
| `area_id` | INTEGER | Required. References `areas.id`. |
| `purpose` | TEXT | Required, trimmed |
| `start_at` / `end_at` | DATE | Required. `end_at >= start_at`. All-day trips are stored at UTC midnight. |
| `all_day` | BOOLEAN | Default `false` |
| `number_of_people` | INTEGER | Required, non-negative |
| `estimated_miles` | INTEGER | Default `0`. Recalculated when destinations change. |
| `approver_id` | INTEGER | Optional. References `users.id`. |
| `approved_at` | DATE | Optional |
| `status` | ENUM | `pending`, `awaiting_vehicle`, `reserved`, `returned`, `cancelled`, `denied`. Default `pending`. |

## `vehicle_request_destinations` / `vehicle_request_drivers` / `vehicle_request_vehicles` (Feature 8)

| Table | Columns | Rules |
| ----- | ------- | ----- |
| `vehicle_request_destinations` | `vehicle_request_id`, `destination_id`, `stop_order` | One row per stop, 1-based order. A destination may repeat, but not twice in a row. |
| `vehicle_request_drivers` | `vehicle_request_id`, `driver_id` | Unique per pair |
| `vehicle_request_vehicles` | `vehicle_request_id`, `vehicle_id` | Unique per pair |

Deleting a request cascades to its stops, drivers, and vehicles (requests are never deleted by the API).

### Stub tables (remove when their features merge)

`roles` (Feature 3), `vehicleTypes` (Feature 4, plus `requiresCdl`), `vehicles` (Feature 5, subset of fields), `destinations` (Feature 6, ERD fields), `drivers` (Feature 7, ERD fields plus `hasCdl`). Each model file is marked `STUB(feature-N)`.
