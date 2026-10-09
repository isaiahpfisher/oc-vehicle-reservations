# API Reference

**Status:** Feature 6 enrollment routes are in force. Mount path defaults to `/api` (see `backend/server.js`).

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
