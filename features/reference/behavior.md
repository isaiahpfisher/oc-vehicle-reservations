# Behavior & Rules Reference

**Living snapshot** of product rules currently in force. Feature 2 area rules, Feature 3 role rules, and Feature 12 service type rules are recorded here.

These files answer: *"What rules does the app enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, sort, validation, UI rules |

## Authentication

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Sign-in uses a Google ID token | `POST /api/login` body is `{ googleCredentials }`. The server reads email and name from the verified token. | Feature 1, FR-001, FR-006 |
| Stored name follows Google | Every successful login writes `given_name` and `family_name` onto the user. No API changes `firstName`, `lastName`, or `email`. | Feature 1, FR-006; Feature 3 |
| Only OC emails can sign in | The domain must be `oc.edu` or a subdomain such as `eagles.oc.edu`. Any other verified email returns `401` `{ "message": "Non OC email used." }` and creates nothing. | Feature 1, FR-006 |
| Only sign-in creates users | A new verified email creates a user on login. No endpoint creates users. | Feature 3, FR-013 |
| Development sign-in | With `DEV_LOGIN=true` (never in production), `POST /api/dev-login` signs in as an existing user with the shared `DEV_LOGIN_PASSWORD`. The login page shows the form only in development builds. `npm run seed` loads test users for every role. | Feature 3, FR-014–FR-016 |
| Session is an app JWT for 24 hours | Stored in `sessions` and `localStorage` key `user`. Later calls send `Authorization: Bearer`. An unexpired session for that user is reused. | Feature 1, FR-002, FR-003 |
| Opening `/` without a session redirects to login | Router guard. A stored session that opens `/login` redirects home. | Feature 1, FR-005 |
| Sign out deletes that session | `POST /api/logout` deletes the matching session row and the client removes `user`. | Feature 1, US-1.4 |
| `authenticate` sets `req.user` | Bearer token must match an unexpired session row. `req.user` is `{ id, roles }`, loaded from the database on every request. | Feature 1, FR-004; Feature 3, FR-009 |
| No profile editing | The avatar menu shows name, email, and **Sign out** only. | Feature 3 |

## Areas

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Any signed-in user can list areas; only admins manage them | `GET /api/areas` and `GET /api/areas/:areaId` use `authenticate`. `POST`, `PUT`, and `DELETE` use `authenticateAdmin` (`403` otherwise). `/areas` has `meta.roles: ["admin"]`, so non-admins don't see the **Areas** link and are redirected home. | Feature 2, FR-001; Feature 3, US-3.6 |
| Name is trimmed, required, unique, and at most 255 characters | Empty or whitespace-only name returns `400` `{ "message": "Missing name." }`. A longer name returns `{ "message": "Name too long." }`. A name already stored on a different area returns `{ "message": "Name already taken." }`. Saving an area with its own current name is allowed. | Feature 2, FR-002, FR-004 |
| Logo is a URL or an empty string | The value is trimmed. `""` is stored when the logo is omitted or blank. `logo.png` returns `400` `{ "message": "Invalid logo URL." }`. A non-empty logo must be an `http` or `https` URL. The areas list renders an image only when `logo` is not empty. | Feature 2, FR-005, FR-006 |
| Delete removes the area | `DELETE` returns `200` and does not check for other rows that point at the area. The area's `area_admin` roles are deleted with it. | Feature 2, Assumptions; Feature 3 |
| Areas are managed on one screen | `/areas` heading is **Area Management**. Create and edit use a dialog with **Name** and **Logo**. Delete uses the shared confirmation dialog. Empty list copy is **No areas yet. Create your first area.** | Feature 2, Screen Requirements |

## Roles

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Roles are `admin`, `area_admin` (per area), `maintenance` | `roles` rows; everyone also has requester permissions. A user can hold several roles but not the same one twice. | Feature 3, FR-002, FR-003 |
| Admins pass every role check | `authorizeRoles` and `useRoles().hasAnyRole()` both treat `admin` as holding every role. `hasRole()` does not (display only). | Feature 3, FR-004, FR-010 |
| Role failures are `403` | Role middleware returns `403` with a role message; missing/invalid sessions stay `401`. | Feature 3, FR-010 |
| Only admins manage users | `GET /api/users`, `PUT` and `DELETE /api/users/:id` require `admin`. Non-admins may `GET` only themselves (others → `404`). | Feature 3 |
| Admins cannot lock themselves out | An admin cannot remove their own `admin` role or delete themselves (`400`; the UI blocks or disables it first). | Feature 3 |
| Roles are replaced atomically | `PUT /api/users/:id` swaps the full role set in one transaction. | Feature 3, FR-012 |
| First admin comes from a script | `npm run make-admin -- <email>` in `backend/` grants `admin` to an existing user. No API does this. | Feature 3, FR-008 |
| Routes declare `meta.roles` | The user needs any listed role (admin always passes); no `meta.roles` = any signed-in user. The router guard and MenuBar links use the same `canOpen()` check. Routes open without a session (login) declare `meta.public`. | Feature 3, FR-011; Feature 1, FR-005 |
| Frontend refreshes roles per page load | The first navigation after a page load calls `GET /api/users/:id` and replaces the stored roles before any role check. A `401` clears `user` and goes to login. | Feature 3, FR-009 |
| Users list | Admin-only table at `/users`: name, email, role chips (`Admin`, `Maintenance`, `Area Admin — <area>`), 10 per page, name search (case-insensitive) and role filter; changing either returns to page 1. | Feature 3, US-3.1–3.3 |
| User details | `/users/:id`: header with name, email, role chips, and member-since date; **Access** card with checkboxes (System roles; Area admin of, one per area) and its own Save/Cancel that stay on the page; **Driver** card and **Requests** / **Issue reports** / **Maintenance** (maintenance users only) tabs show "Coming soon" until Features 7–13; **Account** card deletes the user. On your own page, Admin and Delete are disabled. | Feature 3, US-3.4, US-3.5 |
| Delete user | Confirm dialog naming the user, from the users list or the details page; disabled for the admin's own account. | Feature 3, US-3.5 |

## Service types

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Only admins, area admins, and maintenance users manage service types | Every `/api/service-types` route uses `authorizeRoles("admin", "area_admin", "maintenance")`. A missing token is `401`. A signed-in user without one of those roles is `403` `{ "message": "One of these roles is required: admin, area_admin, maintenance." }`. `/service-types` has `meta.roles: ["admin", "area_admin", "maintenance"]`, so other signed-in users are redirected home and do not see the **Service Types** link. | Feature 12, FR-001, US-12.5 |
| Name is trimmed, required, unique ignoring case, and at most 255 characters | Empty or whitespace-only name returns `400` `{ "message": "Missing name." }`. A longer name returns `{ "message": "Name too long." }`. A name that matches another service type when compared case-insensitively returns `{ "message": "Name already taken." }`. Saving a service type with its own current name is allowed. | Feature 12, FR-002, FR-004 |
| At least one frequency is required | Days, miles, or both may be set. The empty one is stored as `null`. Omitting both returns `400` `{ "message": "Missing service_frequency_days or service_frequency_miles." }`. Zero, a negative, or a non-integer returns `{ "message": "Invalid service_frequency_days." }` or `{ "message": "Invalid service_frequency_miles." }`. | Feature 12, FR-003 |
| Delete removes the service type | `DELETE` returns `200` and does not check for other rows that point at the service type. | Feature 12, Assumptions |
| Service types are managed on one screen | `/service-types` heading is **Service Type Management**. Service types are a table (name, frequency days, frequency miles). Create uses a dialog with those fields. Edit replaces that row with the same fields and **Save** / **Cancel**. Delete uses the shared confirmation dialog. Empty list copy is **No service types yet. Create your first service type.** | Feature 12, Screen Requirements |
