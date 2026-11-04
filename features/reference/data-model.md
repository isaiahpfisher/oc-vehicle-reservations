# Data Model Reference

**Status:** Feature 2 adds `areas`. Feature 3 adds `roles`; the starter-kit course tables and `users.role` are removed. Feature 4 adds `vehicleTypes`. Feature 5 adds `vehicles`. Feature 6 adds `destinations`. Feature 7 adds `drivers`. Feature 12 adds `service_types`. Feature 8 adds `vehicle_requests` and its stop, driver, and vehicle tables. Sequelize creates `id`, `createdAt`, and `updatedAt`, and stores attributes in snake_case columns (`underscored: true`).

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

## `vehicleTypes`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `name` | STRING | Required, trimmed, unique without regard to case, max 255 |
| `identifier` | ENUM | Required. Exactly `VIN` or `Serial` |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

## `vehicles`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `areaId` (`area_id`) | INTEGER | Required. References `areas.id`. Deleting an area that still has vehicles is rejected. |
| `vehicleTypeId` (`vehicle_type_id`) | INTEGER | Required. References `vehicleTypes.id`. Deleting a vehicle type that still has vehicles is rejected. |
| `universityId` (`university_id`) | STRING | Required, trimmed, unique, max 255 |
| `make` | STRING | Required, trimmed, max 255 |
| `model` | STRING | Required, trimmed, max 255 |
| `year` | INTEGER | Required. Integer from 1950 through the current year + 1 |
| `identifier` | STRING | Required, trimmed, unique, max 255. Exactly 17 characters when the vehicle type's identifier is `VIN` |
| `purchasedAt` (`purchased_at`) | DATEONLY | Required. `yyyy-mm-dd` from `1950-01-01` through today |
| `color` | STRING | Required, trimmed, max 255 |
| `passengerCapacity` (`passenger_capacity`) | INTEGER | Required. Integer from 1 through 300 |
| `licensePlate` (`license_plate`) | STRING | Null when blank. Unique when not null. Max 8 |
| `licensePlateExpirationDate` (`license_plate_expiration_date`) | DATEONLY | Null when blank. `yyyy-mm-dd` when set. No minimum date |
| `status` | ENUM | Required. `active` or `retired` |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

JSON keys are the camelCase names above.

## `drivers`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `userId` (`user_id`) | INTEGER | Null when there is no linked user. References `users.id`. Unique when not null. Set to null when the user is deleted. |
| `firstName` (`first_name`) | STRING | Required, trimmed, max 255 |
| `lastName` (`last_name`) | STRING | Required, trimmed, max 255 |
| `phoneNumber` (`phone_number`) | STRING | Required, trimmed, unique. Format `xxx-xxx-xxxx` |
| `licenseState` (`license_state`) | STRING | Required. A state abbreviation (the 50 states and `DC`) |
| `licenseExpirationDate` (`license_expiration_date`) | DATEONLY | Required. `yyyy-mm-dd`. Past dates are allowed |
| `approvedAt` (`approved_at`) | DATE | Set by the server. The time the driver became `approved`; null while any other status |
| `status` | ENUM | Required. `pending`, `approved`, `denied`, `revoked`, or `former`. Defaults to `pending` |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

JSON keys are the camelCase names above.

## `service_types`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `name` | STRING | Required, trimmed, unique ignoring case, max 255 |
| `service_frequency_days` | INTEGER | Null when omitted. Positive whole number when present. At least one frequency is required. |
| `service_frequency_miles` | INTEGER | Null when omitted. Positive whole number when present. At least one frequency is required. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

The JSON body uses `service_frequency_days` and `service_frequency_miles`.

## `destinations`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `name` | STRING | Required, trimmed, max 255. Not unique. |
| `address_line_1` | STRING | Required, trimmed, max 255 |
| `address_line_2` | STRING | Trimmed. Null when empty. Max 255 |
| `city` | STRING | Required, trimmed, max 255 |
| `state` | STRING | Required, trimmed, max 255 |
| `zip_code` | STRING | Trimmed. Null when empty. Max 255 |
| `is_saved` | BOOLEAN | Required. `true` means available. `false` means not available. |
| `miles_from_campus` | INTEGER | Null when empty. Whole number of 0 or more when present. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

The JSON body uses `address_line_1`, `address_line_2`, `zip_code`, `is_saved`, and `miles_from_campus`. There is no `area_id`.

## Associations

- A user has many sessions. A session belongs to one user. Deleting the user deletes their sessions.
- A user has many roles. A role belongs to one user. Deleting the user deletes their roles.
- An area has many roles. A role optionally belongs to one area. Deleting the area deletes its roles.
- An area has many vehicles. A vehicle belongs to one area. The area cannot be deleted while it still has vehicles.
- A vehicle type has many vehicles. A vehicle belongs to one vehicle type. The vehicle type cannot be deleted while it still has vehicles.
- A user has zero or one driver. A driver optionally belongs to one user. Deleting the user keeps the driver with no linked user.
- Service types have no associations.
- A destination has many request stops (Feature 8). It can't be deleted while a request uses it.

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
| `estimatedMiles` (`estimated_miles`) | INTEGER | Nullable: `null` when the trip couldn't be estimated (FR-007). Recalculated when destinations change, or on any edit while `null`. |
| `approverId` (`approver_id`) | INTEGER | Optional. References `users.id`. |
| `approvedAt` (`approved_at`) | DATE | Optional |
| `status` | ENUM | `pending`, `awaiting_vehicle`, `reserved`, `returned`, `cancelled`, `denied`. Default `pending`. |

## `vehicle_request_destinations` / `vehicle_request_drivers` / `vehicle_request_vehicles` (Feature 8)

| Table | Columns | Rules |
| ----- | ------- | ----- |
| `vehicle_request_destinations` | `vehicleRequestId`, `destinationId`, `stopOrder` (`stop_order`) | One row per stop, 1-based order. A destination may repeat, but not twice in a row. |
| `vehicle_request_drivers` | `vehicleRequestId`, `driverId` | Unique on (`driver_id`, `vehicle_request_id`) |
| `vehicle_request_vehicles` | `vehicleRequestId`, `vehicleId` | Unique on (`vehicle_request_id`, `vehicle_id`) |

Deleting a request cascades to its stops, drivers, and vehicles (requests are never deleted by the API; only `npm run seed` clears them).

Requests restrict deleting the user who made them and the area, destinations, drivers, and vehicles they use (`onDelete: RESTRICT`). Deleting an approver sets `approverId` to `null`.
