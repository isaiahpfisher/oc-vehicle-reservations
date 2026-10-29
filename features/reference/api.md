# API Reference

**Status:** Feature 1 auth, Feature 2 area routes, Feature 3 user and role routes, and Feature 8 vehicle request routes are in force; the starter-kit course routes are removed. Mount path defaults to `/api` (see `backend/server.js`).

## Authentication

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `POST` | `/api/login` | No | `200` with `email`, `firstName`, `lastName`, `userId`, `roles`, and session `token`. Body is `{ "googleCredentials": "<google id token>" }`. |
| `POST` | `/api/logout` | Bearer | `200`. Deletes the session row for that token. |
| `POST` | `/api/dev-login` | No (development only) | Same `200` payload as `/api/login`. Body `{ "email", "password" }` for an existing user; the password is `DEV_LOGIN_PASSWORD` (default `password`). `404` unless `DEV_LOGIN=true` and `NODE_ENV` is not `production`; wrong password or unknown email → `401` `{ "message": "Bad Credentials." }`. |

Login verifies the Google ID token and reads `email`, `given_name`, and `family_name` from it. The email domain must be `oc.edu` or a subdomain such as `eagles.oc.edu`. A new email creates a user (the only way users are created). An existing email is reused, the stored first and last name are replaced from the token, and an unexpired session is reused.

| Condition | Status | Body |
| --------- | ------ | ---- |
| Google token missing or unverifiable, or name missing | `401` | `{ "message": "Bad Credentials." }` |
| Verified email domain is not `oc.edu` or a subdomain of it | `401` | `{ "message": "Non OC email used." }` |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Bearer token missing from `sessions` or expired | `401` | `{ "message": "Unauthorized! Invalid or expired token." }` |

## Role middleware

Exported from `backend/app/authorization/authorization.js`. Admins pass every role check.

| Middleware | Passes | Otherwise |
| ---------- | ------ | --------- |
| `authenticate` | Valid session; sets `req.user = { id, roles: [{ id, role, areaId }] }` | `401` (messages above) |
| `authenticateAdmin` | `admin` | `403` `{ "message": "Admin role required." }` |
| `authenticateMaintenance` | `maintenance` or `admin` | `403` `{ "message": "Maintenance role required." }` |
| `authenticateAreaAdmin` | `area_admin` of any area, or `admin` | `403` `{ "message": "Area admin role required." }` |
| `authorizeRoles(...roles)` | Any listed role, or `admin` | `403` `{ "message": "One of these roles is required: <roles>." }` |

`canAccessArea(req.user, areaId)` is true for admins and area admins of that area; area-scoped controllers use it.

## Users

User payload: `{ id, firstName, lastName, email, createdAt, roles: [{ id, role, areaId, area: { id, name } | null }] }`.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/users` | Admin | `200` array of users, sorted by last then first name. |
| `GET` | `/api/users/:id` | Self or admin | `200` with that user. Another user (non-admin) → `404`. |
| `PUT` | `/api/users/:id` | Admin | `200` with the user. Body `{ "roles": [{ "role": "maintenance" }, { "role": "area_admin", "areaId": 2 }] }` replaces all roles in one transaction. Name and email in the body are ignored. |
| `DELETE` | `/api/users/:id` | Admin | `204` with no body. Deletes the user's sessions and roles. |

| Condition | Status | Body |
| --------- | ------ | ---- |
| Non-numeric `:id` | `400` | `{ "message": "Invalid user id." }` |
| Unknown `:id` | `404` | `{ "message": "User with id=<id> not found." }` |
| `roles` not an array | `400` | `{ "message": "Roles must be an array." }` |
| Role not `admin` / `area_admin` / `maintenance` | `400` | `{ "message": "Invalid role." }` |
| `area_admin` without a valid `areaId` | `400` | `{ "message": "Area admin role requires a valid area." }` |
| Admin `PUT` on self without `admin` | `400` | `{ "message": "You cannot remove your own admin role." }` |
| Admin `DELETE` on self | `400` | `{ "message": "You cannot delete your own account." }` |

## Areas

`GET` routes accept any signed-in user (other features list areas); creating, editing, and deleting areas is admin-only (Feature 3 US-3.6).

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/areas` | Bearer | `200` array of areas, ordered by `name`. |
| `GET` | `/api/areas/:areaId` | Bearer | `200` with one area. |
| `POST` | `/api/areas` | Admin | `201` with the created area. Body is `{ "name": "Athletics", "logo": "https://example.com/logo.png" }`. Omitted `logo` is stored as `""`. |
| `PUT` | `/api/areas/:areaId` | Admin | `200` with the updated area. A field omitted from the body keeps its stored value. |
| `DELETE` | `/api/areas/:areaId` | Admin | `200`. The area row is removed, along with every `area_admin` role for it. |

Success body: `{ "id", "name", "logo", "createdAt", "updatedAt" }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Non-admin `POST`, `PUT`, or `DELETE` | `403` | `{ "message": "Admin role required." }` |
| Missing or whitespace-only `name` | `400` | `{ "message": "Missing name." }` |
| `name` longer than 255 characters after trim | `400` | `{ "message": "Name too long." }` |
| `name` matches another area | `400` | `{ "message": "Name already taken." }` |
| Non-empty `logo` is not an `http` or `https` URL | `400` | `{ "message": "Invalid logo URL." }` |
| `areaId` is not an integer | `400` | `{ "message": "Invalid area id." }` |
| Area id does not exist | `404` | `{ "message": "Area with id=… not found." }` |

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.

## Vehicle Requests (Feature 8)

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/me/requests` | Bearer | `200` array of the signed-in user's requests |
| `GET` | `/api/requests` | `authenticateAreaAdmin` | `200` all requests (admin) or those in managed areas (area admin) |
| `POST` | `/api/requests` | Bearer | `201` with the created request, owned by the signed-in user |
| `GET` | `/api/requests/:requestId` | Bearer | `200` if the user owns it or manages its area |
| `PUT` | `/api/requests/:requestId` | Bearer | `200` with the updated request. Omitted fields keep their stored values. |
| `GET` | `/api/requests/:requestId/vehicle-options` | `authenticateAreaAdmin` | `200` array of `{ vehicle, cdlOk, conflictingRequestIds, outOfService, milesUntilService }` for the request's area |

Body fields: `areaId`, `purpose`, `startAt`, `endAt`, `allDay`, `numberOfPeople`, `drivers` (array of driver ids), `destinations` (ordered array of `{ id }` for saved destinations or `{ name, addressLine1, addressLine2, city, state, zipCode }` for new ones). `PUT` also takes `status` and `vehicles` (array of vehicle ids, managers only).

Responses include `area`, `user`, `approver`, and flattened `drivers`, ordered `destinations`, and `vehicles`. All-day `startAt`/`endAt` are returned as `YYYY-MM-DD`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| Missing `areaId`, `purpose`, `startAt`, `endAt`, `numberOfPeople`, `drivers`, or `destinations` | `400` | `{ "message": "Missing <field>." }` |
| `numberOfPeople` not a non-negative integer | `400` | `numberOfPeople must be a non-negative integer.` |
| End before start | `400` | `endAt cannot be before startAt.` |
| Same destination twice in a row | `400` | `A destination is listed twice in a row.` |
| Driver not approved / license expired / expires before trip ends | `400` | `<Name> is not an approved driver.` / `<Name>'s license has expired.` / `<Name>'s license expires before the trip ends.` |
| Vehicle outside the request's area | `400` | `Vehicles must belong to the request's area.` |
| Requester assigns vehicles, sets a status other than `cancelled`, or edits a non-pending request | `403` | |
| Requester calls `GET /api/requests` or `vehicle-options` | `403` | `{ "message": "Area admin role required." }` |
| Request not found or not visible to the user | `404` | `Vehicle request with id=… not found.` |

### Interim endpoints (Features 6 and 7)

`GET /api/drivers` (approved, unexpired) and `GET /api/destinations` (saved) feed the request form until Drivers and Destinations merge. Any signed-in user. See `backend/app/routes/interim.routes.js`.
