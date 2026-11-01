# Data Model Reference

**Status:** Feature 2 adds `areas`. Feature 3 adds `roles`; the starter-kit course tables and `users.role` are removed. Feature 4 adds `vehicleTypes`. Feature 5 adds `vehicles`. Feature 12 adds `service_types`. Sequelize creates `id`, `createdAt`, and `updatedAt`, and stores attributes in snake_case columns (`underscored: true`).

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

## Associations

- A user has many sessions. A session belongs to one user. Deleting the user deletes their sessions.
- A user has many roles. A role belongs to one user. Deleting the user deletes their roles.
- An area has many roles. A role optionally belongs to one area. Deleting the area deletes its roles.
- An area has many vehicles. A vehicle belongs to one area. The area cannot be deleted while it still has vehicles.
- A vehicle type has many vehicles. A vehicle belongs to one vehicle type. The vehicle type cannot be deleted while it still has vehicles.
- Service types have no associations.
