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
