# Feature: User Role Management

**Feature ID:** 3
**Branch pattern:** `feature/3-user-role-management`
**Status:** Ready
**Created:** 2026-10-18
**Input:** Signed-in admin users manage users and their roles.
**Depends on:** Feature 1, 2

---

## User Stories

### US-3.1: View users

**As a** signed-in admin user
**I want to** view a paginated data table with a list of all users and all the roles each user holds
**So that** I can see who has access in the system.

**Priority:** P1
**Independent test:** Navigate to the users page and look for the list of users.
**Acceptance scenarios:** see ### US-3.1 under Acceptance Criteria

### US-3.2: Search and filter users

**As a** signed-in admin user
**I want to** search and filter the list of users by name and roles
**So that** I can find users more easily

**Priority:** P1
**Independent test:** The user's table has a working search bar and filters
**Acceptance scenarios:** see ### US-3.2 under Acceptance Criteria

### US-3.3: User row actions

**As a** signed-in admin user
**I want** each user row to have **view** and **delete** actions
**So that** I can manage users from the users view

**Priority:** P1
**Independent test:** Each user row exposes view and delete icon actions for an admin
**Acceptance scenarios:** see ### US-3.3 under Acceptance Criteria

### US-3.4: User details

**As a** signed-in admin user
**I want to** open a user's details page and add and remove their roles there
**So that** I can keep strict access rules in the system and see everything about a user in one place

**Priority:** P1
**Independent test:** Click view on a user. Their details page shows who they are and an Access card where admins change roles.
**Acceptance scenarios:** see ### US-3.4 under Acceptance Criteria

### US-3.5: Delete user

**As a** signed-in admin user
**I want to** delete users
**So that** I can remove old users

**Priority:** P1
**Independent test:** Click delete on a user. After confirmation, the user is deleted
**Acceptance scenarios:** see ### US-3.5 under Acceptance Criteria

### US-3.6: Roles are enforced

**As a** system administrator
**I want to** ensure that access on the frontend and backend is enforced by role
**So that** users cannot access things they should not be able to.

**Priority:** P1
**Independent test:** Make requests to endpoints that require roles other than what the current user has.
**Acceptance scenarios:** see ### US-3.6 under Acceptance Criteria

### US-3.7: Reusable Authorization Middleware and Hooks

**As a** developer
**I want to** have access to convenient middleware and frontend components and utils to enforce role access
**So that** I can easily and reliably enforce role access

**Priority:** P1
**Acceptance scenarios:** see ### US-3.7 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All user and user_role endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: The app must enforce role access on every page and endpoint (roles are admin, area_admin, and maintenance. Every user has the requester permissions.)
- **FR-003**: A user can have more than one role, but not two of the same role (unique constrain on user_id and role_id)
- **FR-004**: Admin users can access everything.
- **FR-005**: area_admin users can access vehicles, requests, vehicle_instructions, issue reports, maintenance_needs, and destinations (all scoped to their area, except destinations which has a global scope)
- **FR-006**: Maintenance users can access vehicles, maintenance needs, service types
- **FR-007**: Users with no special roles can only access their own vehicle requests (and create new ones)
- **FR-008**: `backend/scripts/make-admin.mjs` (run as `npm run make-admin -- <email>` from `backend/`) takes one email, trimmed and matched case-insensitively. If a user with that email exists, it adds the `admin` role and exits `0`. If the user is already an admin, it changes nothing and exits `0`. If no user has that email, or no email is given, it prints an error, changes nothing, and exits `1`. The logic is exported as `makeAdmin(email)` so tests can call it without spawning a process.
- **FR-012**: `PUT /api/users/:userId` is the only way to change roles. It is admin-only and takes `{ "roles": [{ "role": "maintenance" }, { "role": "area_admin", "areaId": 2 }] }`. It replaces the user's roles in one transaction (all or nothing) and returns `200` with the user and their new roles. `areaId` is required for `area_admin` and ignored for other roles. Duplicate entries are saved once. `firstName`, `lastName`, and `email` in the body are ignored (they come from Google, see Feature 1 FR-006).
- **FR-013**: Users are only created by Google sign-in (Feature 1 `POST /api/login`). No endpoint creates users. (The development seed script in **FR-016** inserts rows directly and is not an endpoint.)
- **FR-014**: `POST /api/dev-login` with `{ "email", "password" }` signs in as an **existing** user and returns the same payload and session as `POST /api/login`. It is available only when `DEV_LOGIN=true` **and** `NODE_ENV` is not `production`; otherwise it returns `404`. The password must equal `DEV_LOGIN_PASSWORD` (default `password`); there is no password column. The email is trimmed and matched case-insensitively. A wrong password or unknown email returns `401` `{ "message": "Bad Credentials." }`.
- **FR-015**: The login page shows a **Developer sign-in** form (email, password, **Sign in**) only in development builds (`import.meta.env.DEV`). Production builds never render it.
- **FR-016**: `backend/scripts/seed.mjs` (`npm run seed`, optionally `-- --keep <email>` one or more times) replaces all users, sessions, roles, and areas with seed data, keeping any `--keep` users with their sessions and non-area roles. Seed users have `@oc.edu` emails and include one test account per role (see the README). It refuses to run when `NODE_ENV=production` and exits `1`. The logic is exported as `seed({ keep })` for tests.
- **FR-009**: The backend is the source of truth for roles. `authenticate` loads the user's roles from the database on every request. The frontend refreshes the stored `user`'s roles from `GET /api/users/:userId` on the first navigation after each page load, before any role check runs.
- **FR-010**: `authorizeRoles(...roles)` is a middleware factory. It authenticates like `authenticate`, then passes if the user holds **any** of the listed roles (admin always passes). Otherwise it returns `403`. `authenticateAdmin`, `authenticateMaintenance`, and `authenticateAreaAdmin` are defined as `authorizeRoles('admin')`, `authorizeRoles('maintenance')`, and `authorizeRoles('area_admin')`.
- **FR-011**: Frontend routes declare required roles as `meta: { roles: [...] }`. The user needs **any one** of the listed roles (admin always passes). A route without `meta.roles` is open to every signed-in user. `router.beforeEach` and the navigation both read `meta.roles` through `useRoles().hasAnyRole()`, so there is one rule for both.

---

## Assumptions

- User management does NOT use **dialog-based** workflows. Each user gets a **User details** page (`userDetails`) where roles are edited. Only delete confirmation uses a dialog. Users register through Google, so no user creation (**FR-013**).
- A user's name and email come from Google and cannot be edited by anyone. The User details page shows them read-only.
- There is no profile page. The Feature 1 **Edit Profile** dialog is removed; the avatar menu shows name, email, and **Sign out** only.
- Areas come from Feature 2 (Area Management): its `Area` model, `/api/areas` endpoints, and Areas page. This feature restricts creating, editing, and deleting areas to admins and hides the Areas page from everyone else; listing areas stays open to any signed-in user so other features can show them.
- The first admin signs in with Google once to create their account, then someone with server access runs `make-admin` for their email (**FR-008**). After that, admins grant admin from the User details page. There is no API endpoint for bootstrapping admins.
- `useRoles()` exposes:
  - `hasRole(role, areaId?)`: true only if the user holds that exact role. For `area_admin`, passing an `areaId` checks that specific area, and leaving it out matches any area. Admins are **not** treated as holding other roles here, so `hasRole` stays accurate for display (chips, labels).
  - `hasAnyRole(roles)`: true if the user holds any listed role **or** is an admin. Use this for access checks (route guards, nav links, action buttons).
  - `areaAdminAreaIds`: the ids of every area the user is area admin of, for scoping area admin UI.

## Edge Cases

- Unauthorized users screen → redirect. `GET /api/users` with no session → `401`; signed in without admin → `403`.
- Non-numeric `:userId` → `400` `{ "message": "Invalid user id." }`. Unknown `:userId` → `404`.
- `GET /api/users/:userId` for another user by a non-admin → `404` (Feature 1 cross-user rule).
- `PUT` body without a `roles` array → `400` `{ "message": "Roles must be an array." }`.
- `PUT` with a role other than `admin`, `area_admin`, `maintenance` → `400` `{ "message": "Invalid role." }`.
- `PUT` with `area_admin` and a missing or unknown `areaId` → `400` `{ "message": "Area admin role requires a valid area." }`.
- Admin `PUT` on themselves without `admin` in `roles` → `400` `{ "message": "You cannot remove your own admin role." }`.
- Admin `DELETE` on themselves → `400` `{ "message": "You cannot delete your own account." }`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin can view, edit (including role assignment), and delete users.
- **SC-003**: `npm test` passes for users API and users view behavior.

---

## Data Ownership & Isolation

Only signed-in admin users may view, edit, and delete users. Any signed-in user may read their own user record (with roles) so the frontend can refresh roles (**FR-009**). Name and email are never editable. Even admins cannot remove their own admin role or delete themselves.

| Rule                    | Requirement                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **User Read All Scope** | `GET /api/users` requires the `admin` role.                                                                                             |
| **User Read One Scope** | `GET /api/users/:userId` requires the `admin` role or `:userId` = `req.user.id`. Otherwise `404`.                                       |
| **Role Write Scope**    | `PUT /api/users/:userId` requires the `admin` role. An admin cannot remove their own `admin` role.                                      |
| **User Delete Scope**   | `DELETE /api/users/:userId` requires the `admin` role (`area_admin` and `maintenance` do not count). An admin cannot delete themselves. |

---

## API Requirements

| Method                  | Endpoint                           | Auth                | Purpose                                                 |
| ----------------------- | ---------------------------------- | ------------------- | ------------------------------------------------------- |
| `GET`                   | `/api/users`                       | Yes - Admin         | Fetch all users with their roles                        |
| `GET`                   | `/api/users/:userId`               | Yes - Self or Admin | Fetch a single user with their roles                    |
| `PUT`                   | `/api/users/:userId`               | Yes - Admin         | Replace a user's roles (**FR-012**)                     |
| `DELETE`                | `/api/users/:userId`               | Yes - Admin         | Delete a user (`204`)                                   |
| `GET`                   | `/api/areas`, `/api/areas/:areaId` | Yes                 | List or fetch areas (Feature 2); any signed-in user     |
| `POST`, `PUT`, `DELETE` | `/api/areas[/:areaId]`             | Yes - Admin         | Manage areas (Feature 2); `403` for non-admins (US-3.6) |
| `POST`                  | `/api/dev-login`                   | No (dev only)       | Sign in as an existing user without Google (**FR-014**) |

**User response** (`GET` items, `GET` one, `PUT`):

```json
{
  "id": 7,
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@eagles.oc.edu",
  "createdAt": "2026-10-20T15:04:00.000Z",
  "roles": [
    { "id": 3, "role": "maintenance", "areaId": null, "area": null },
    { "id": 4, "role": "area_admin", "areaId": 2, "area": { "id": 2, "name": "Athletics" } }
  ]
}
```

**Update roles request** (`PUT /api/users/:userId`):

```json
{ "roles": [{ "role": "maintenance" }, { "role": "area_admin", "areaId": 2 }] }
```

`POST /api/login` (Feature 1) also returns the user's `roles` array in this shape.

**Role middleware errors:** `403` with the messages in US-3.7 (`"Admin role required."`, `"Maintenance role required."`, `"Area admin role required."`, `"One of these roles is required: …"`).

---

## Screen Requirements

### [View: Users] — route name `users`

**ListUsers.vue** (`/src/views/users/ListUsers.vue`)

- Heading: **User Management**
- No primary action
- Display users in a paginated data table with search and filters at the top
- Name and email stay on one line (long emails are truncated with the full address on hover). The Roles column shows at most two chips (Admin, then Maintenance, then Area Admin by area name), then a **+N** chip whose tooltip and `aria-label` list the remaining roles.
- The user's name and the **View** icon open the `userDetails` page
- Admin **Delete** icon opens the reusable useConfirm dialog.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**View user**, **Delete user**).
- **Empty state:** **"No users yet."** when there are no users.
- **Loading state:** skeleton or progress indicator while users are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

### [View: User details] — route name `userDetails` (`/users/:id`)

**UserDetails.vue** (`/src/views/users/UserDetails.vue`).

- Breadcrumbs: **Users** / _user's name_. Heading: the user's name.
- **Header card:** initials avatar, name, email, a chip per role (same labels as the users list), and **Member since** _Month YYYY_ (from `createdAt`). Name and email are read-only.
- Two columns on desktop (stacked on small screens):
  - **Left:** **Access**, **Driver**, and **Account** cards.
  - **Right:** tabs for user activity.
- **Access card:** "Every user can request vehicles. Roles grant access to manage the rest of the system."
  - **System roles** checkboxes: **Admin**, **Maintenance**.
  - **Area admin of** checkboxes: one per area (plus any area the user already administers). When there are none, show **"Area Admin roles appear here once areas are created."**
  - On the admin's own page, **Admin** is checked and disabled with **"You cannot remove your own admin role."**
  - **Save** (disabled until something changes) saves with `PUT /api/users/:id` and stays on the page, showing **"Roles saved."** **Cancel** (disabled until something changes) restores the saved roles.
  - Role labels are capitalized everywhere they are shown (chips, filter, checkboxes).
- **Driver card:** **"Coming soon"** (Feature 7).
- **Account card:** **Delete user** opens the confirm dialog; after deleting, go to the users list. Disabled on the admin's own page.
- **Tabs:** **Requests** (Feature 8), **Issue reports** (Feature 10), and **Maintenance** (Features 9, 11, 13; only shown for users with the Maintenance role). Each shows **"Coming soon"** until its feature replaces it.
- **Loading state:** skeleton of the header and cards.
- **Error state:** `<v-alert type="error">` for API failures.

---

## Key Entities

- **Users**: a user of the system
- **Roles**: admin, area_admin, maintenance (all users have requester permissions)

---

## Data Model Requirements

### `users` table

Defined in a previous feature

### `roles` table

Sequelize uses `underscored: true`, so the columns are `user_id` / `area_id` while model attributes and JSON use `userId` / `areaId` (same as `sessions`).

| Field       | Type       | Rules                                                                   |
| ----------- | ---------- | ----------------------------------------------------------------------- |
| `id`        | INTEGER PK | Auto-increment                                                          |
| `user_id`   | INTEGER FK | Required; references `users.id`; deleting the user deletes their roles  |
| `area_id`   | INTEGER FK | Optional; required for `area_admin`; deleting the area deletes the role |
| `role`      | STRING     | Required; one of `admin`, `area_admin`, `maintenance`                   |
| `createdAt` | DATE       | Sequelize timestamps                                                    |
| `updatedAt` | DATE       | Sequelize timestamps                                                    |

Unique on (`user_id`, `role`, `area_id`) (**FR-003**). The `users.role` column from the starter kit is removed.

### Associations (in `models/index.js`)

- User has many Roles
- Role belongs to User
- Area has many Roles
- Roles belongs to Area (nullable)

---

## Acceptance Criteria (Gherkin)

### US-3.1 — View users

#### Scenario: Admin views users list

- **Given** I am signed in as an admin and users exist
- **When** I open the users view
- **Then** each row shows the user's name, email, and a chip for each role they hold (area_admin chips include the area name, e.g. `Area Admin — Athletics`)
- **And** a user with more than two roles shows two chips and a **+N** chip listing the rest

#### Scenario: Users list is paginated

- **Given** I am signed in as an admin and more users exist than fit on one page
- **When** I click the next page control
- **Then** the next page of users is shown

#### Scenario: Users loading state

- **Given** I am signed in as an admin on the users view
- **When** users are still being fetched
- **Then** I see a loading indicator in place of the table

#### Scenario: Users error state

- **Given** I am signed in as an admin
- **When** `GET /api/users` fails
- **Then** I see an error alert

#### Scenario: Non-admin cannot open the users view

- **Given** I am signed in without the admin role
- **When** I navigate to the users route
- **Then** I am redirected away from the users view

#### Scenario: Users nav link is hidden for non-admins

- **Given** I am signed in without the admin role
- **When** I view the navigation
- **Then** the **Users** link is not visible

#### Scenario: Non-admin requests all users via API

- **Given** I am signed in without the admin role
- **When** I send `GET /api/users`
- **Then** the API returns `403`

---

### US-3.2 — Search and filter users

#### Scenario: Admin searches users by partial name

- **Given** I am signed in as an admin and users `Jane Smith` and `Bob Jones` exist
- **When** I type `smi` in the search bar
- **Then** only `Jane Smith` is shown

#### Scenario: Search is case-insensitive

- **Given** I am signed in as an admin and user `Jane Smith` exists
- **When** I type `SMITH` in the search bar
- **Then** `Jane Smith` is shown

#### Scenario: Admin filters users by role

- **Given** I am signed in as an admin and some users have the maintenance role
- **When** I filter by `maintenance`
- **Then** only users with the maintenance role are shown

#### Scenario: Admin filters by area admin for a specific area

- **Given** I am signed in as an admin and users are area admins of different areas
- **When** I filter by `Area Admin — Athletics`
- **Then** only area admins of Athletics are shown

#### Scenario: Admin combines search and role filter

- **Given** I am signed in as an admin on the users view
- **When** I search `smi` and filter by `admin`
- **Then** only users matching both the search and the filter are shown

#### Scenario: Search returns no results

- **Given** I am signed in as an admin on the users view
- **When** my search or filter matches no users
- **Then** I see **"No users match your search."**

#### Scenario: Clearing search and filters

- **Given** I am signed in as an admin with a search or filter applied
- **When** I clear the search and filters
- **Then** the full paginated list is shown starting on page 1

---

### US-3.3 — User row actions

#### Scenario: User rows have view and delete actions for admins

- **Given** I am signed in as an admin and users exist
- **When** I view the users list
- **Then** each row shows **View user** and **Delete user** icon buttons with matching `aria-label`s

#### Scenario: View action opens the user details page

- **Given** I am signed in as an admin on the users view
- **When** I click **View user** or the user's name on a row
- **Then** I am taken to the `userDetails` route for that user

#### Scenario: Delete action opens a confirmation dialog

- **Given** I am signed in as an admin on the users view
- **When** I click **Delete user** on a row
- **Then** a confirm dialog opens naming that user

#### Scenario: Admin cannot delete themselves from the list

- **Given** I am signed in as an admin on the users view
- **When** I view my own row
- **Then** **Delete user** is disabled

---

### US-3.4 — User details

#### Scenario: User details page loads the user's current data

- **Given** I am signed in as an admin and a user holds `Maintenance` and `Area Admin — Athletics`
- **When** I open that user's details page
- **Then** I see their name, email, member-since date, and a chip for each role
- **And** **Maintenance** and **Athletics** are checked in the Access card

#### Scenario: Role options

- **Given** I am signed in as an admin and areas `Athletics` and `Music` exist
- **When** I open a user's details page
- **Then** **System roles** lists `Admin` and `Maintenance` and **Area admin of** lists `Athletics` and `Music`

#### Scenario: Admin adds a role

- **Given** I am signed in as an admin viewing a user without the maintenance role
- **When** I check **Maintenance** and save
- **Then** the API returns `200` with `maintenance` in the user's roles
- **And** I stay on the page and see **"Roles saved."**

#### Scenario: Admin removes a role

- **Given** I am signed in as an admin viewing a user with the admin role
- **When** I uncheck **Admin** and save
- **Then** the API returns `200` without `admin` in the user's roles

#### Scenario: Admin assigns area admin for multiple areas

- **Given** I am signed in as an admin viewing a user
- **When** I check **Athletics** and **Music** under **Area admin of** and save
- **Then** both area admin roles are saved for that user

#### Scenario: Admin removes their own admin role

- **Given** I am signed in as an admin on my own details page
- **When** I look at the Access card
- **Then** **Admin** is checked and disabled with **"You cannot remove your own admin role."**
- **And** `PUT /api/users/{my id}` without `admin` returns `400`

#### Scenario: Cancel editing

- **Given** I am signed in as an admin with unsaved role changes on a details page
- **When** I click **Cancel**
- **Then** the checkboxes return to the saved roles and no request is sent

#### Scenario: Later sections show Coming soon

- **Given** I am signed in as an admin viewing a user with the maintenance role
- **When** I open each of the **Requests**, **Issue reports**, and **Maintenance** tabs and look at the **Driver** card
- **Then** each shows **"Coming soon"**
- **And** the **Maintenance** tab is not shown for users without the maintenance role

---

### US-3.5 — Delete user

#### Scenario: Admin deletes a user

- **Given** I am signed in as an admin and user `Bob Jones` exists
- **When** I confirm delete on that row
- **Then** `Bob Jones` is removed from the users list

#### Scenario: Admin deletes a user via API

- **Given** I am signed in as an admin and user `Bob Jones` exists
- **When** I send `DELETE /api/users/{bobId}`
- **Then** the API returns `204`

#### Scenario: Admin cancels delete

- **Given** I am signed in as an admin with the delete confirm dialog open
- **When** I click cancel
- **Then** no request is sent and the user remains in the list and I return to the user list

#### Scenario: Admin deletes a user from the details page

- **Given** I am signed in as an admin on `Bob Jones`'s details page
- **When** I click **Delete user** and confirm
- **Then** `Bob Jones` is deleted and I am taken to the users list

#### Scenario: Admin cannot delete themselves from the details page

- **Given** I am signed in as an admin on my own details page
- **When** I look at the Account card
- **Then** **Delete user** is disabled

---

### US-3.6 — Roles are enforced

#### Scenario: Admin can access everything

- **Given** I am signed in as an admin
- **When** I request any protected endpoint
- **Then** the API does not return `403`

#### Scenario: Admins can manage Areas

- **Given** I am signed in as an admin
- **When** I open the app
- **Then** I see and can open the Areas page and create/edit/delete areas

#### Scenario: Non-admins cannot manage Areas

- **Given** I am signed in as a non-admin
- **When** I open the app
- **Then** I cannot see or open the Areas page or create/edit/delete areas

#### Scenario: Deleting an area removes its area admin roles

- **Given** a user is Area Admin of Athletics and also holds `maintenance`
- **When** an admin deletes the Athletics area
- **Then** the user's `Area Admin — Athletics` role is removed and `maintenance` stays

#### Scenario: Frontend route guard redirects

- **Given** I am signed in without the role a route requires
- **When** I navigate to that route directly by URL
- **Then** I am redirected away

#### Scenario: Navigation hides unauthorized links

- **Given** I am signed in without the role a route requires
- **When** I view the navigation
- **Then** the link to that route is not visible

---

### US-3.7 — Reusable Authorization Middleware and Hooks

#### Scenario: `authenticate` attaches the user's roles

- **Given** a valid session for a user with `maintenance` and `Area Admin — Athletics`
- **When** a route protected with `[authenticate]` is called
- **Then** `req.user` contains the user's `id` and a `roles` array with each role and its `areaId`

#### Scenario: `authenticate` rejects a missing token

- **Given** a route protected with `[authenticate]`
- **When** it is called without a `Bearer` authorization header
- **Then** the API returns `401` with **"Unauthorized! No token provided."**

#### Scenario: `authenticate` rejects an expired token

- **Given** a route protected with `[authenticate]`
- **When** it is called with an expired or unknown token
- **Then** the API returns `401` with **"Unauthorized! Invalid or expired token."**

#### Scenario: `authenticateAdmin` allows admins

- **Given** a route protected with `[authenticateAdmin]`
- **When** a user with the admin role calls it
- **Then** the request reaches the controller

#### Scenario: `authenticateAdmin` rejects non-admins

- **Given** a route protected with `[authenticateAdmin]`
- **When** a user without the admin role calls it
- **Then** the API returns `403` with **"Admin role required."**

#### Scenario: `authenticateMaintenance` allows maintenance users

- **Given** a route protected with `[authenticateMaintenance]`
- **When** a user with the maintenance role calls it
- **Then** the request reaches the controller

#### Scenario: `authenticateMaintenance` rejects other users

- **Given** a route protected with `[authenticateMaintenance]`
- **When** a user without the maintenance or admin role calls it
- **Then** the API returns `403` with **"Maintenance role required."**

#### Scenario: `authenticateAreaAdmin` allows area admins of any area

- **Given** a route protected with `[authenticateAreaAdmin]`
- **When** a user who is area admin of any area calls it
- **Then** the request reaches the controller

#### Scenario: `authenticateAreaAdmin` rejects other users

- **Given** a route protected with `[authenticateAreaAdmin]`
- **When** a user without the area_admin or admin role calls it
- **Then** the API returns `403` with **"Area admin role required."**

#### Scenario: `authorizeRoles` allows any listed role

- **Given** a route protected with `[authorizeRoles('area_admin', 'maintenance')]`
- **When** a user with only the maintenance role calls it
- **Then** the request reaches the controller

#### Scenario: `authorizeRoles` rejects users with none of the listed roles

- **Given** a route protected with `[authorizeRoles('area_admin', 'maintenance')]`
- **When** a user with no roles calls it
- **Then** the API returns `403` with **"One of these roles is required: area_admin, maintenance."**

#### Scenario: Admin passes every role middleware

- **Given** a route protected with `[authenticateMaintenance]`, `[authenticateAreaAdmin]`, or `[authorizeRoles(...)]` without `admin` in the list
- **When** an admin calls it
- **Then** the request reaches the controller

#### Scenario: Area admin controllers scope by `req.user` areas

- **Given** a route protected with `[authenticateAreaAdmin]`
- **When** the area admin of Athletics requests a resource in Music
- **Then** the API returns `403`

#### Scenario: Stored user includes roles

- **Given** I am on the login page
- **When** I sign in and the login response is saved to the `user` store
- **Then** the stored `user` includes my `roles` array

#### Scenario: `useRoles` returns true for held roles

- **Given** the stored `user` holds the maintenance role
- **When** `hasRole('maintenance')` from `useRoles()` is called
- **Then** it returns `true`

#### Scenario: `useRoles` returns false for missing roles

- **Given** the stored `user` holds only the maintenance role
- **When** `hasRole('admin')` from `useRoles()` is called
- **Then** it returns `false`

#### Scenario: `hasRole` checks a specific area

- **Given** the stored `user` is area admin of Athletics only
- **When** `hasRole('area_admin', athleticsId)` and `hasRole('area_admin', musicId)` are called
- **Then** they return `true` and `false`

#### Scenario: `hasRole` without an area matches any area

- **Given** the stored `user` is area admin of Athletics only
- **When** `hasRole('area_admin')` is called
- **Then** it returns `true`

#### Scenario: `hasAnyRole` passes admins but `hasRole` does not

- **Given** the stored `user` holds only the admin role
- **When** `hasAnyRole(['maintenance'])` and `hasRole('maintenance')` are called
- **Then** they return `true` and `false`

#### Scenario: `router.beforeEach` redirects users without the required role

- **Given** I am signed in without the admin role
- **When** I navigate to the `users` route
- **Then** `router.beforeEach` redirects me to `home`

#### Scenario: `meta.roles` allows any listed role

- **Given** a route with `meta: { roles: ['area_admin', 'maintenance'] }` and I hold only the maintenance role
- **When** I navigate to that route
- **Then** the route opens

#### Scenario: Routes without `meta.roles` are open to every signed-in user

- **Given** a route with no `meta.roles` and I hold no roles
- **When** I navigate to that route
- **Then** the route opens

#### Scenario: Roles refresh on page load

- **Given** my stored `user` has no roles and an admin has since given me the maintenance role
- **When** I reload the app
- **Then** `GET /api/users/:userId` is called before the first route check, my stored `user` includes the maintenance role, and maintenance-only links are visible

#### Scenario: Removed role is dropped on page load

- **Given** my stored `user` includes the admin role but an admin has since removed it
- **When** I reload the app and navigate to the `users` route
- **Then** I am redirected to `home` and the **Users** link is not visible

#### Scenario: Role refresh with an invalid session

- **Given** my stored `user` has an expired or deleted session
- **When** I reload the app and the role refresh returns `401`
- **Then** the stored `user` is cleared and I am redirected to `login`

---

## Test Coverage Map

| Story  | Scenario                                                      | Test file                              | Test name                                                     |
| ------ | ------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| US-3.1 | Admin views users list                                        | `backend/tests/users.test.js`          | `Admin views users list`                                      |
| US-3.1 | Admin views users list                                        | `frontend/tests/Users.test.js`         | `Admin views users list`                                      |
| US-3.1 | Users list is paginated                                       | `frontend/tests/Users.test.js`         | `Users list is paginated`                                     |
| US-3.1 | Users loading state                                           | `frontend/tests/Users.test.js`         | `Users loading state`                                         |
| US-3.1 | Users error state                                             | `frontend/tests/Users.test.js`         | `Users error state`                                           |
| US-3.1 | Non-admin cannot open the users view                          | `frontend/tests/Users.test.js`         | `Non-admin cannot open the users view`                        |
| US-3.1 | Users nav link is hidden for non-admins                       | `frontend/tests/Authorization.test.js` | `Users nav link is hidden for non-admins`                     |
| US-3.1 | Non-admin requests all users via API                          | `backend/tests/users.test.js`          | `Non-admin requests all users via API`                        |
| US-3.2 | Admin searches users by partial name                          | `frontend/tests/Users.test.js`         | `Admin searches users by partial name`                        |
| US-3.2 | Search is case-insensitive                                    | `frontend/tests/Users.test.js`         | `Search is case-insensitive`                                  |
| US-3.2 | Admin filters users by role                                   | `frontend/tests/Users.test.js`         | `Admin filters users by role`                                 |
| US-3.2 | Admin filters by area admin for a specific area               | `frontend/tests/Users.test.js`         | `Admin filters by area admin for a specific area`             |
| US-3.2 | Admin combines search and role filter                         | `frontend/tests/Users.test.js`         | `Admin combines search and role filter`                       |
| US-3.2 | Search returns no results                                     | `frontend/tests/Users.test.js`         | `Search returns no results`                                   |
| US-3.2 | Clearing search and filters                                   | `frontend/tests/Users.test.js`         | `Clearing search and filters`                                 |
| US-3.3 | User rows have view and delete actions for admins             | `frontend/tests/Users.test.js`         | `User rows have view and delete actions for admins`           |
| US-3.3 | View action opens the user details page                       | `frontend/tests/Users.test.js`         | `View action opens the user details page`                     |
| US-3.3 | Delete action opens a confirmation dialog                     | `frontend/tests/Users.test.js`         | `Delete action opens a confirmation dialog`                   |
| US-3.3 | Admin cannot delete themselves from the list                  | `frontend/tests/Users.test.js`         | `Admin cannot delete themselves from the list`                |
| US-3.4 | User details page loads the user's current data               | `backend/tests/users.test.js`          | `User details page loads the user's current data`             |
| US-3.4 | User details page loads the user's current data               | `frontend/tests/UserDetails.test.js`   | `User details page loads the user's current data`             |
| US-3.4 | Role options                                                  | `frontend/tests/UserDetails.test.js`   | `Role options`                                                |
| US-3.4 | Admin adds a role                                             | `backend/tests/users.test.js`          | `Admin adds a role`                                           |
| US-3.4 | Admin adds a role                                             | `frontend/tests/UserDetails.test.js`   | `Admin adds a role`                                           |
| US-3.4 | Admin removes a role                                          | `backend/tests/users.test.js`          | `Admin removes a role`                                        |
| US-3.4 | Admin removes a role                                          | `frontend/tests/UserDetails.test.js`   | `Admin removes a role`                                        |
| US-3.4 | Admin assigns area admin for multiple areas                   | `backend/tests/users.test.js`          | `Admin assigns area admin for multiple areas`                 |
| US-3.4 | Admin assigns area admin for multiple areas                   | `frontend/tests/UserDetails.test.js`   | `Admin assigns area admin for multiple areas`                 |
| US-3.4 | Admin removes their own admin role                            | `backend/tests/users.test.js`          | `Admin removes their own admin role`                          |
| US-3.4 | Admin removes their own admin role                            | `frontend/tests/UserDetails.test.js`   | `Admin removes their own admin role`                          |
| US-3.4 | Cancel editing                                                | `frontend/tests/UserDetails.test.js`   | `Cancel editing`                                              |
| US-3.4 | Later sections show Coming soon                               | `frontend/tests/UserDetails.test.js`   | `Later sections show Coming soon`                             |
| US-3.5 | Admin deletes a user                                          | `frontend/tests/Users.test.js`         | `Admin deletes a user`                                        |
| US-3.5 | Admin deletes a user via API                                  | `backend/tests/users.test.js`          | `Admin deletes a user via API`                                |
| US-3.5 | Admin cancels delete                                          | `frontend/tests/Users.test.js`         | `Admin cancels delete`                                        |
| US-3.5 | Admin deletes a user from the details page                    | `frontend/tests/UserDetails.test.js`   | `Admin deletes a user from the details page`                  |
| US-3.5 | Admin cannot delete themselves from the details page          | `frontend/tests/UserDetails.test.js`   | `Admin cannot delete themselves from the details page`        |
| US-3.6 | Admin can access everything                                   | `backend/tests/authorization.test.js`  | `Admin can access everything`                                 |
| US-3.6 | Admins can manage Areas                                       | `backend/tests/areas.test.js`          | `Admins can manage Areas`                                     |
| US-3.6 | Admins can manage Areas                                       | `frontend/tests/Areas.test.js`         | `Admins can manage Areas`                                     |
| US-3.6 | Non-admins cannot manage Areas                                | `backend/tests/areas.test.js`          | `Non-admins cannot manage Areas`                              |
| US-3.6 | Non-admins cannot manage Areas                                | `frontend/tests/Areas.test.js`         | `Non-admins cannot manage Areas`                              |
| US-3.6 | Deleting an area removes its area admin roles                 | `backend/tests/areas.test.js`          | `Deleting an area removes its area admin roles`               |
| US-3.6 | Frontend route guard redirects                                | `frontend/tests/Authorization.test.js` | `Frontend route guard redirects`                              |
| US-3.6 | Navigation hides unauthorized links                           | `frontend/tests/Authorization.test.js` | `Navigation hides unauthorized links`                         |
| US-3.7 | `authenticate` attaches the user's roles                      | `backend/tests/authorization.test.js`  | `authenticate attaches the user's roles`                      |
| US-3.7 | `authenticate` rejects a missing token                        | `backend/tests/authorization.test.js`  | `authenticate rejects a missing token`                        |
| US-3.7 | `authenticate` rejects an expired token                       | `backend/tests/authorization.test.js`  | `authenticate rejects an expired token`                       |
| US-3.7 | `authenticateAdmin` allows admins                             | `backend/tests/authorization.test.js`  | `authenticateAdmin allows admins`                             |
| US-3.7 | `authenticateAdmin` rejects non-admins                        | `backend/tests/authorization.test.js`  | `authenticateAdmin rejects non-admins`                        |
| US-3.7 | `authenticateMaintenance` allows maintenance users            | `backend/tests/authorization.test.js`  | `authenticateMaintenance allows maintenance users`            |
| US-3.7 | `authenticateMaintenance` rejects other users                 | `backend/tests/authorization.test.js`  | `authenticateMaintenance rejects other users`                 |
| US-3.7 | `authenticateAreaAdmin` allows area admins of any area        | `backend/tests/authorization.test.js`  | `authenticateAreaAdmin allows area admins of any area`        |
| US-3.7 | `authenticateAreaAdmin` rejects other users                   | `backend/tests/authorization.test.js`  | `authenticateAreaAdmin rejects other users`                   |
| US-3.7 | `authorizeRoles` allows any listed role                       | `backend/tests/authorization.test.js`  | `authorizeRoles allows any listed role`                       |
| US-3.7 | `authorizeRoles` rejects users with none of the listed roles  | `backend/tests/authorization.test.js`  | `authorizeRoles rejects users with none of the listed roles`  |
| US-3.7 | Admin passes every role middleware                            | `backend/tests/authorization.test.js`  | `Admin passes every role middleware`                          |
| US-3.7 | Area admin controllers scope by `req.user` areas              | `backend/tests/authorization.test.js`  | `Area admin controllers scope by req.user areas`              |
| US-3.7 | Stored user includes roles                                    | `backend/tests/auth.test.js`           | `Stored user includes roles`                                  |
| US-3.7 | Stored user includes roles                                    | `frontend/tests/Login.test.js`         | `Stored user includes roles`                                  |
| US-3.7 | `useRoles` returns true for held roles                        | `frontend/tests/Authorization.test.js` | `useRoles returns true for held roles`                        |
| US-3.7 | `useRoles` returns false for missing roles                    | `frontend/tests/Authorization.test.js` | `useRoles returns false for missing roles`                    |
| US-3.7 | `hasRole` checks a specific area                              | `frontend/tests/Authorization.test.js` | `hasRole checks a specific area`                              |
| US-3.7 | `hasRole` without an area matches any area                    | `frontend/tests/Authorization.test.js` | `hasRole without an area matches any area`                    |
| US-3.7 | `hasAnyRole` passes admins but `hasRole` does not             | `frontend/tests/Authorization.test.js` | `hasAnyRole passes admins but hasRole does not`               |
| US-3.7 | `router.beforeEach` redirects users without the required role | `frontend/tests/Authorization.test.js` | `router.beforeEach redirects users without the required role` |
| US-3.7 | `meta.roles` allows any listed role                           | `frontend/tests/Authorization.test.js` | `meta.roles allows any listed role`                           |
| US-3.7 | Routes without `meta.roles` are open to every signed-in user  | `frontend/tests/Authorization.test.js` | `Routes without meta.roles are open to every signed-in user`  |
| US-3.7 | Roles refresh on page load                                    | `frontend/tests/Authorization.test.js` | `Roles refresh on page load`                                  |
| US-3.7 | Removed role is dropped on page load                          | `frontend/tests/Authorization.test.js` | `Removed role is dropped on page load`                        |
| US-3.7 | Role refresh with an invalid session                          | `frontend/tests/Authorization.test.js` | `Role refresh with an invalid session`                        |
| US-3.8 | Script makes an existing user an admin                        | `backend/tests/makeAdmin.test.js`      | `Script makes an existing user an admin`                      |
| US-3.8 | Script matching ignores case and spaces                       | `backend/tests/makeAdmin.test.js`      | `Script matching ignores case and spaces`                     |
| US-3.8 | Script with an unknown email                                  | `backend/tests/makeAdmin.test.js`      | `Script with an unknown email`                                |
| US-3.8 | Script on an existing admin                                   | `backend/tests/makeAdmin.test.js`      | `Script on an existing admin`                                 |
| US-3.8 | Script without an email                                       | `backend/tests/makeAdmin.test.js`      | `Script without an email`                                     |
| US-3.9 | Developer signs in as a seeded user                           | `backend/tests/devLogin.test.js`       | `Developer signs in as a seeded user`                         |
| US-3.9 | Developer signs in as a seeded user                           | `frontend/tests/Login.test.js`         | `Developer signs in as a seeded user`                         |
| US-3.9 | Developer sign-in with a wrong password                       | `backend/tests/devLogin.test.js`       | `Developer sign-in with a wrong password`                     |
| US-3.9 | Developer sign-in for an unknown email                        | `backend/tests/devLogin.test.js`       | `Developer sign-in for an unknown email`                      |
| US-3.9 | Developer sign-in is off unless enabled                       | `backend/tests/devLogin.test.js`       | `Developer sign-in is off unless enabled`                     |
| US-3.9 | Developer sign-in is never available in production            | `backend/tests/devLogin.test.js`       | `Developer sign-in is never available in production`          |
| US-3.9 | Developer sign-in form only appears in development builds     | `frontend/tests/Login.test.js`         | `Developer sign-in form only appears in development builds`   |
| US-3.9 | Seed replaces data and keeps listed accounts                  | `backend/tests/seed.test.js`           | `Seed replaces data and keeps listed accounts`                |
| US-3.9 | Seed refuses to run in production                             | `backend/tests/seed.test.js`           | `Seed refuses to run in production`                           |

## Definition of Done

- [x] Backend and frontend implemented per this spec (all function requirements satisfied)
- [x] **Success Criteria (SC-001**–**SC-003)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `make-admin` script added to `backend/package.json` and documented in the README setup steps
- [x] `seed` script and `DEV_LOGIN` documented in the README with the seeded test accounts
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- User creation (Google sign in handles this)
- Content of the User details **Driver** card and **Requests** / **Issue reports** / **Maintenance** tabs (see below)

## Delivered to later features

- **User details page** (`userDetails`, `/users/:id`) with placeholder sections showing **"Coming soon"**. Each feature replaces its placeholder and adds its scenarios to its own spec:
  - **Driver** card → Feature 7 (Drivers): linked driver status, license state and expiration, phone.
  - **Requests** tab → Feature 8 (Vehicle Requests): the user's requests (upcoming, then past) and trips they drive.
  - **Issue reports** tab → Feature 10 (Issue Report): reports the user filed and reports assigned to them.
  - **Maintenance** tab → Features 9, 11, 13 (Mileage Log, Maintenance Need, Service Log): needs assigned to them, services logged, odometer readings.
