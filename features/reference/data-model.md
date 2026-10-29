# Data Model Reference

**Status:** Feature 2 adds `areas`. Feature 3 adds `roles`. Feature 8 adds `vehicle_requests` and its stop, driver, and vehicle tables, plus interim tables for Features 4–7; the starter-kit course tables and `users.role` are removed. Sequelize creates `id`, `createdAt`, and `updatedAt`, and stores attributes in snake_case columns (`underscored: true`).

## `users`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `firstName` | STRING | Required. Replaced from the Google token on every login. No API changes it. |
| `lastName` | STRING | Required. Replaced from the Google token on every login. No API changes it. |
| `email` | STRING | Required, unique. Google login stores the lowercased token email. No API changes it. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

Users are only created by Google sign-in (`POST /api/login`).

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

## `areas`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `name` | STRING | Required, trimmed, unique, max 255 |
| `logo` | TEXT | Required. Trimmed. Empty string when no logo. A non-empty value is an `http` or `https` URL. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

## `roles`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `userId` (`user_id`) | INTEGER | Required. References `users.id`. |
| `areaId` (`area_id`) | INTEGER | Required for `area_admin`, `null` otherwise. References `areas.id`. |
| `role` | STRING(20) | Required. One of `admin`, `area_admin`, `maintenance`. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

Unique on (`user_id`, `role`, `area_id`). Every user also has requester permissions without a row.

## Associations

- A user has many sessions. A session belongs to one user. Deleting the user deletes their sessions.
- A user has many roles. A role belongs to one user. Deleting the user deletes their roles.
- An area has many roles. A role optionally belongs to one area. Deleting the area deletes its roles.

- A user has many enrollments (`studentId`). Deleting the user deletes those enrollments.
- An enrollment belongs to one user and one section.
- A section has many enrollments (`sectionId`). Deleting the section deletes those enrollments.

## `vehicle_requests` (Feature 8)

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `userId` (`user_id`) | INTEGER | Required. References `users.id`. Set from the session. |
| `areaId` (`area_id`) | INTEGER | Required. References `areas.id`. |
| `purpose` | TEXT | Required, trimmed |
| `startAt` / `endAt` (`start_at` / `end_at`) | DATE | Required. `endAt >= startAt`. All-day trips are stored at UTC midnight. |
| `allDay` (`all_day`) | BOOLEAN | Default `false` |
| `numberOfPeople` (`number_of_people`) | INTEGER | Required, non-negative |
| `estimatedMiles` (`estimated_miles`) | INTEGER | Default `0`. Recalculated when destinations change. |
| `approverId` (`approver_id`) | INTEGER | Optional. References `users.id`. |
| `approvedAt` (`approved_at`) | DATE | Optional |
| `status` | ENUM | `pending`, `awaiting_vehicle`, `reserved`, `returned`, `cancelled`, `denied`. Default `pending`. |

## `vehicle_request_destinations` / `vehicle_request_drivers` / `vehicle_request_vehicles` (Feature 8)

| Table | Columns | Rules |
| ----- | ------- | ----- |
| `vehicle_request_destinations` | `vehicleRequestId`, `destinationId`, `stopOrder` (`stop_order`) | One row per stop, 1-based order. A destination may repeat, but not twice in a row. |
| `vehicle_request_drivers` | `vehicleRequestId`, `driverId` | Unique on (`driver_id`, `vehicle_request_id`) |
| `vehicle_request_vehicles` | `vehicleRequestId`, `vehicleId` | Unique on (`vehicle_request_id`, `vehicle_id`) |

Deleting a request cascades to its stops, drivers, and vehicles (requests are never deleted by the API).

### Interim tables (removed when their features merge)

`vehicle_types` (Feature 4, plus `requiresCdl`), `vehicles` (Feature 5, a subset of fields), `destinations` (Feature 6, ERD fields), `drivers` (Feature 7, ERD fields plus `hasCdl`). Each model file is marked `INTERIM(feature-N)`. `npm run seed` fills them with sample rows.
