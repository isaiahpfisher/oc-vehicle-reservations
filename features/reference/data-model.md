# Data Model Reference

**Status:** Feature 2 adds `areas`. Feature 3 adds `roles`; the starter-kit course tables and `users.role` are removed. Feature 4 adds `vehicleTypes`. Feature 5 adds `vehicles`. Feature 6 adds `destinations`. Feature 7 adds `drivers`. Feature 9 adds `mileage_logs`. Feature 10 adds `issue_reports` and an interim `vehicle_requests` table. Feature 12 adds `service_types`. Sequelize creates `id`, `createdAt`, and `updatedAt`, and stores attributes in snake_case columns (`underscored: true`).

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

## `mileage_logs`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `vehicle_id` | INTEGER | Required. References `vehicles.id`. |
| `user_id` | INTEGER | Required. The user who added the reading. Set from the session. References `users.id`. |
| `odometer_reading` | INTEGER | Required. Whole number of 0 or more. |
| `recorded_at` | DATEONLY | Required. Calendar date `YYYY-MM-DD`. |
| `createdAt` | DATE | Sequelize timestamp |
| `updatedAt` | DATE | Sequelize timestamp |

JSON keys are `vehicleId`, `userId`, `odometerReading`, and `recordedAt`.

## `issue_reports`

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `vehicle_id` | INTEGER | Required. Existing vehicle. |
| `vehicle_request_id` | INTEGER | Null when omitted. Existing vehicle request when present. |
| `author_id` | INTEGER | Required. Set from the signed-in user. Not taken from the body. |
| `assignee_id` | INTEGER | Null when omitted. Existing user when present. |
| `type` | ENUM | `low_gas`, `dirty`, `maintenance`, or `other` |
| `description` | TEXT | Required, trimmed. Whitespace-only is rejected. |
| `status` | ENUM | `pending`, `resolved`, or `cancelled` |
| `resolved_at` | DATEONLY | Required when `status` is `resolved`. Null otherwise. |
| `created_at` | DATE | Sequelize timestamp |
| `updated_at` | DATE | Sequelize timestamp |

JSON keys are camelCase: `vehicleId`, `vehicleRequestId`, `authorId`, `assigneeId`, `resolvedAt`, `createdAt`, `updatedAt`.

## `vehicle_requests` (interim)

Stand-in until Feature 8. Remove this table definition from the stand-in model when the real vehicle request model lands. Sequelize `alter` will add Feature 8's columns.

| Column | Type | Rules |
| ------ | ---- | ----- |
| `id` | INTEGER | Primary key, auto-increment |
| `purpose` | TEXT | Required |
| `created_at` | DATE | Sequelize timestamp |
| `updated_at` | DATE | Sequelize timestamp |

## Associations

- A user has many sessions. A session belongs to one user. Deleting the user deletes their sessions.
- A user has many roles. A role belongs to one user. Deleting the user deletes their roles.
- An area has many roles. A role optionally belongs to one area. Deleting the area deletes its roles.
- An area has many vehicles. A vehicle belongs to one area. The area cannot be deleted while it still has vehicles.
- A vehicle type has many vehicles. A vehicle belongs to one vehicle type. The vehicle type cannot be deleted while it still has vehicles.
- A user has zero or one driver. A driver optionally belongs to one user. Deleting the user keeps the driver with no linked user.
- Service types have no associations.
- Destinations have no associations.
- A vehicle has many mileage logs. A mileage log belongs to one vehicle. The vehicle cannot be deleted while it still has mileage logs.
- A user has many mileage logs. A mileage log belongs to one user. The user cannot be deleted while they still have mileage logs.
- A vehicle has many issue reports. An issue report belongs to one vehicle. The vehicle cannot be deleted while it still has issue reports.
- A vehicle request has many issue reports. An issue report optionally belongs to one vehicle request. Deleting the vehicle request keeps the issue report with no linked request.
- A user has many issue reports as author. An issue report belongs to one author. The author cannot be deleted while they still have issue reports.
- A user has many issue reports as assignee. An issue report optionally belongs to one assignee. Deleting the assignee keeps the issue report with no assignee.
