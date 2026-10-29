# API Reference

**Status:** Feature 2 area routes and Feature 6 enrollment routes are in force. Mount path defaults to `/api` (see `backend/server.js`).

## Authentication

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `POST` | `/api/login` | No | `200` with `email`, `firstName`, `lastName`, `userId`, and session `token`. Body is `{ "googleCredentials": "<google id token>" }`. |
| `POST` | `/api/logout` | Bearer | `200`. Deletes the session row for that token. |
| `GET` | `/api/users/:id` | Bearer | `200` with that user. |

Login verifies the Google ID token and reads `email`, `given_name`, and `family_name` from it. The email domain must be `oc.edu` or a subdomain such as `eagles.oc.edu`. A new email creates a user. An existing email is reused, the stored first and last name are replaced from the token, and an unexpired session is reused. `PUT /api/users/:id` does not change `firstName`, `lastName`, or `email`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| Google token missing or unverifiable, or name missing | `401` | `{ "message": "Bad Credentials." }` |
| Verified email domain is not `oc.edu` or a subdomain of it | `401` | `{ "message": "Non OC email used." }` |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Bearer token missing from `sessions` or expired | `401` | `{ "message": "Unauthorized! Invalid or expired token." }` |

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.
- `studentId` is taken from the session. The client does not send it.

## Enrollments

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/enrollments` | Student | `200` array of `{ id, studentId, sectionId, createdAt, updatedAt }` for the signed-in student. Empty list is `[]`. |
| `POST` | `/api/enrollments` | Student | `201` with the created enrollment. Body is `{ "sectionId": 1 }`. |
| `DELETE` | `/api/enrollments/:sectionId` | Student | `204` with no body. |

`POST` removes this student's other enrollments whose sections share that course and `semesterId`, then creates the new row. Enrollments for the same course in another semester stay.

| Condition | Status |
| --------- | ------ |
| No session | `401` |
| Missing or invalid `sectionId` | `400` |
| Unknown section, another student's enrollment, or role `admin` | `404` |

## Areas

Any signed-in user. Routes use `authenticate`. There is no role check.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/areas` | Bearer | `200` array of areas, ordered by `name`. |
| `GET` | `/api/areas/:areaId` | Bearer | `200` with one area. |
| `POST` | `/api/areas` | Bearer | `201` with the created area. Body is `{ "name": "Athletics", "logo": "https://example.com/logo.png" }`. Omitted `logo` is stored as `""`. |
| `PUT` | `/api/areas/:areaId` | Bearer | `200` with the updated area. A field omitted from the body keeps its stored value. |
| `DELETE` | `/api/areas/:areaId` | Bearer | `200`. The area row is removed. |

Success body: `{ "id", "name", "logo", "createdAt", "updatedAt" }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Missing or whitespace-only `name` | `400` | `{ "message": "Missing name." }` |
| `name` longer than 255 characters after trim | `400` | `{ "message": "Name too long." }` |
| `name` matches another area | `400` | `{ "message": "Name already taken." }` |
| Non-empty `logo` is not an `http` or `https` URL | `400` | `{ "message": "Invalid logo URL." }` |
| `areaId` is not an integer | `400` | `{ "message": "Invalid area id." }` |
| Area id does not exist | `404` | `{ "message": "Area with id=… not found." }` |

## Vehicle Requests (Feature 8)

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/me/requests` | Bearer | `200` array of the signed-in user's requests |
| `GET` | `/api/requests` | `admin` or `area_admin` | `200` all requests (admin) or those in managed areas (area admin) |
| `POST` | `/api/requests` | Bearer | `201` with the created request, owned by the signed-in user |
| `GET` | `/api/requests/:requestId` | Bearer | `200` if the user owns it or manages its area |
| `PUT` | `/api/requests/:requestId` | Bearer | `200` with the updated request. Omitted fields keep their stored values. |
| `GET` | `/api/requests/:requestId/vehicle-options` | `admin` or `area_admin` | `200` array of `{ vehicle, cdl_ok, conflicting_request_ids, out_of_service, miles_until_service }` for the request's area |

Body fields: `area_id`, `purpose`, `start_at`, `end_at`, `all_day`, `number_of_people`, `drivers` (array of driver ids), `destinations` (ordered array of `{ id }` for saved destinations or `{ name, addressLine1, addressLine2, city, state, zipCode }` for new ones). `PUT` also takes `status` and `vehicles` (array of vehicle ids, managers only).

Responses include `area`, `user`, `approver`, and flattened `drivers`, ordered `destinations`, and `vehicles`. All-day `start_at`/`end_at` are returned as `YYYY-MM-DD`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| Missing `area_id`, `purpose`, `start_at`, `end_at`, `number_of_people`, `drivers`, or `destinations` | `400` | `{ "message": "Missing <field>." }` |
| `number_of_people` not a non-negative integer | `400` | `number_of_people must be a non-negative integer.` |
| End before start | `400` | `end_at cannot be before start_at.` |
| Same destination twice in a row | `400` | `A destination is listed twice in a row.` |
| Driver not approved / license expired / expires before trip ends | `400` | `<Name> is not an approved driver.` / `<Name>'s license has expired.` / `<Name>'s license expires before the trip ends.` |
| Vehicle outside the request's area | `400` | `Vehicles must belong to the request's area.` |
| Requester assigns vehicles, sets a status other than `cancelled`, or edits a non-pending request | `403` | |
| Request not found or not visible to the user | `404` | `Vehicle request with id=… not found.` |

### Stub endpoints (Features 6 and 7)

`GET /api/drivers` (approved, unexpired) and `GET /api/destinations` (saved) feed the request form until Drivers and Destinations merge. See `backend/app/routes/featureStubs.routes.js`.
