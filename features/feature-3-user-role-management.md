# Feature: User Role Management

**Feature ID:** 3
**Branch pattern:** `feature/3-user-role-management`
**Status:** Draft
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

### US-3.3: Edit and delete users

**As a** signed-in admin user
**I want** each user row to have **edit** and **delete** actions
**So that** I can manage users from the users view

**Priority:** P1
**Independent test:** Each user row exposes edit and delete icon actions for an admin
**Acceptance scenarios:** see ### US-3.3 under Acceptance Criteria

### US-3.4: Edit user

**As a** signed-in admin user
**I want to** add and remove roles from a user
**So that** I can keep strict access rules in the system

**Priority:** P1
**Independent test:** Click edit on a user. It opens a new page that lets admins edit the user's information and roles.
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

### US-3.8: Bootstrap the first admin

**As a** system administrator deploying the app
**I want to** run a script that makes an existing account an admin by email
**So that** someone can manage roles in a fresh install where every account comes from Google sign-in

**Priority:** P1
**Independent test:** Sign in with Google once, run `npm run make-admin -- <your email>` in `backend/`, reload the app, and confirm you hold the admin role.
**Acceptance scenarios:** see ### US-3.8 under Acceptance Criteria

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
- **FR-009**: The backend is the source of truth for roles. `authenticate` loads the user's roles from the database on every request. The frontend refreshes the stored `user`'s roles from `GET /api/users/:userId` on the first navigation after each page load, before any role check runs.
- **FR-010**: `authorizeRoles(...roles)` is a middleware factory. It authenticates like `authenticate`, then passes if the user holds **any** of the listed roles (admin always passes). Otherwise it returns `403`. `authenticateAdmin`, `authenticateMaintenance`, and `authenticateAreaAdmin` are defined as `authorizeRoles('admin')`, `authorizeRoles('maintenance')`, and `authorizeRoles('area_admin')`.
- **FR-011**: Frontend routes declare required roles as `meta: { roles: [...] }`. The user needs **any one** of the listed roles (admin always passes). A route without `meta.roles` is open to every signed-in user. `router.beforeEach` and the navigation both read `meta.roles` through `useRoles().hasAnyRole()`, so there is one rule for both.

---

## Assumptions

- User management does NOT use **dialog-based** workflows. Edit gets its own page. Only delete confirmation uses a dialog. Users register through Google, so no user creation.
- The first admin signs in with Google once to create their account, then someone with server access runs `make-admin` for their email (**FR-008**). After that, admins grant admin through the Edit User page. There is no API endpoint for bootstrapping admins.
- `useRoles()` exposes:
  - `hasRole(role, areaId?)`: true only if the user holds that exact role. For `area_admin`, passing an `areaId` checks that specific area, and leaving it out matches any area. Admins are **not** treated as holding other roles here, so `hasRole` stays accurate for display (chips, labels).
  - `hasAnyRole(roles)`: true if the user holds any listed role **or** is an admin. Use this for access checks (route guards, nav links, action buttons).
  - `areaAdminAreaIds`: the ids of every area the user is area admin of, for scoping area admin UI.

## Edge Cases

- Empty or whitespace-only user name or email → client block and/or `400`.
- User name or email longer than 255 characters → `400`.
- Missing name or email → `400`.
- Unauthorized users screen or `GET /api/users` → redirect or `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin can view, edit (including role assignment), and delete users.
- **SC-003**: `npm test` passes for users API and users view behavior.

---

## Data Ownership & Isolation

Only signed-in admin users may view, edit, and delete users. A user may also edit their information (from a profile page accessible from the profile dropdown) and view their roles, but they cannot change their roles unless they're an admin. Even admins cannot remove their own admin role.

| Rule                    | Requirement                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User Read All Scope** | `GET /api/users` require require `req.user.roles` `admin`.                                                                                                         |
| **User Read One Scope** | `GET /api/users/:userId` require require `req.user.roles` `admin` or `:userId` = `req.user.id`                                                                     |
| **User Write Scope**    | `PUT` and `DELETE` `/api/users/:userId` require `req.user.roles` `admin` or `:userId` = `req.user.id`, admin's cannot delete themselves or remove their admin role |
| **Role Read Scope**     | `GET`, `PUT` - `/api/roles/:userId` require `req.user.roles` `admin`                                                                                               |
| **Role Delete Scope**   | `GET`, `PUT` - `/api/roles/:userId` require `req.user.roles` `admin`                                                                                               |

---

## API Requirements

| Method   | Endpoint                     | Auth                | Purpose                   |
| -------- | ---------------------------- | ------------------- | ------------------------- |
| `GET`    | `/api/users`                 | Yes - Admin         | Fetch all users           |
| `GET`    | `/api/users/:userId`         | Yes - Self or Admin | Fetch a single user       |
| `PUT`    | `/api/users/:userId`         | Yes - Self or Admin | Edit a user               |
| `DELETE` | `/api/users/:userId`         | Yes - Admin         | Delete a user             |
| `GET`    | `/api/roles/:userId`         | Yes - Admin         | Get a user's roles        |
| `POST`   | `/api/roles/:userId`         | Yes - Admin         | Add a new role for a user |
| `DELETE` | `/api/roles/:userId/:roleId` | Yes - Admin         | Remove a role from a user |

---

## Screen Requirements

### [View: Users] — route name `users`

**ListUsers.vue** (`/src/views/users/ListUsers.vue`)

- Heading: **Users**
- No primary action
- Display users in a paginated data table with search and filters at the top
- Admin **Edit** icon opens a `EditUser.vue` page
- Admin **Delete** icon opens the reusable useConfirm dialog.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit user**, **Delete user**).
- **Empty state:** **"No users yet."** when there are no users.
- **Loading state:** skeleton or progress indicator while users are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

### [View: Edit User] — route name `editUser`

**EditUser.vue** (`/src/views/users/EditUser.vue`)

- Heading: **Edit User**
- Displays a form with user's information
- Form includes a Vuetify select multiple with chips. The options are admin, maintenance, and one area_admin entry for each area that exists in the areas table.
- Save button
- Breadcrumbs that link back to the Users page
- **Loading state:** skeleton of form
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

| Field       | Type       | Rules                                                |
| ----------- | ---------- | ---------------------------------------------------- |
| `id`        | INTEGER PK | Auto-increment                                       |
| `user_id`   | INTEGER FK | Required, constraind                                 |
| `area_id`   | INTEGER FK | Optional, required for area_admin type               |
| `role`      | STRING     | Required; on of `admin`, `area_admin`, `maintenance` |
| `createdAt` | DATE       | Sequelize timestamps                                 |
| `updatedAt` | DATE       | Sequelize timestamps                                 |

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

### US-3.3 — Edit and delete users

#### Scenario: User rows have edit and delete actions for admins

- **Given** I am signed in as an admin and users exist
- **When** I view the users list
- **Then** each row shows **Edit user** and **Delete user** icon buttons with matching `aria-label`s

#### Scenario: Edit action opens the edit page

- **Given** I am signed in as an admin on the users view
- **When** I click **Edit user** on a row
- **Then** I am taken to the `editUser` route for that user

#### Scenario: Delete action opens a confirmation dialog

- **Given** I am signed in as an admin on the users view
- **When** I click **Delete user** on a row
- **Then** a confirm dialog opens naming that user

#### Scenario: Admin cannot delete themselves from the list

- **Given** I am signed in as an admin on the users view
- **When** I view my own row
- **Then** **Delete user** is disabled

---

### US-3.4 — Edit user

#### Scenario: Edit page loads the user's current data

- **Given** I am signed in as an admin and a user holds `maintenance` and `Area Admin — Athletics`
- **When** I open that user's edit page
- **Then** the form shows their information with those two roles preselected as chips

#### Scenario: Role select options

- **Given** I am signed in as an admin and areas `Athletics` and `Music` exist
- **When** I open the role select on the edit page
- **Then** the options are `admin`, `maintenance`, `Area Admin — Athletics`, and `Area Admin — Music`

#### Scenario: Admin adds a role

- **Given** I am signed in as an admin editing a user without the maintenance role
- **When** I add `maintenance` and save
- **Then** the API returns `200` with `maintenance` in the user's roles

#### Scenario: Admin removes a role

- **Given** I am signed in as an admin editing a user with the admin role
- **When** I remove `admin` and save
- **Then** the API returns `200` without `admin` in the user's roles

#### Scenario: Admin assigns area admin for multiple areas

- **Given** I am signed in as an admin editing a user
- **When** I assign `Area Admin — Athletics` and `Area Admin — Music` and save
- **Then** both area admin roles are saved for that user

#### Scenario: Admin removes their own admin role

- **Given** I am signed in as an admin on my own edit page
- **When** I remove `admin` and save
- **Then** the save is blocked with an error message

#### Scenario: Cancel editing

- **Given** I am signed in as an admin with unsaved changes on the edit page
- **When** I click **Cancel**
- **Then** I return to the users list without saving

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
- **Then** `req.user` contains the user's `id` and a `roles` array with each role and its `area_id`

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

### US-3.8 — Bootstrap the first admin

#### Scenario: Script makes an existing user an admin

- **Given** a user `jane@example.com` exists without the admin role
- **When** I run `make-admin` with `jane@example.com`
- **Then** that user holds the `admin` role and the script exits `0`

#### Scenario: Script matching ignores case and spaces

- **Given** a user `jane@example.com` exists without the admin role
- **When** I run `make-admin` with `" Jane@Example.com "`
- **Then** that user holds the `admin` role

#### Scenario: Script with an unknown email

- **Given** no user has the email `sam@example.com`
- **When** I run `make-admin` with `sam@example.com`
- **Then** it prints **"No account found for sam@example.com. Sign in with Google first."**, creates no user or role, and exits `1`

#### Scenario: Script on an existing admin

- **Given** a user `jane@example.com` already holds the admin role
- **When** I run `make-admin` with `jane@example.com`
- **Then** no duplicate role is created and the script exits `0`

#### Scenario: Script without an email

- **Given** the script is run
- **When** no email argument is given
- **Then** it prints **"Usage: npm run make-admin -- <email>"** and exits `1`

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
| US-3.3 | User rows have edit and delete actions for admins             | `frontend/tests/Users.test.js`         | `User rows have edit and delete actions for admins`           |
| US-3.3 | Edit action opens the edit page                               | `frontend/tests/Users.test.js`         | `Edit action opens the edit page`                             |
| US-3.3 | Delete action opens a confirmation dialog                     | `frontend/tests/Users.test.js`         | `Delete action opens a confirmation dialog`                   |
| US-3.3 | Admin cannot delete themselves from the list                  | `frontend/tests/Users.test.js`         | `Admin cannot delete themselves from the list`                |
| US-3.4 | Edit page loads the user's current data                       | `backend/tests/users.test.js`          | `Edit page loads the user's current data`                     |
| US-3.4 | Edit page loads the user's current data                       | `frontend/tests/EditUser.test.js`      | `Edit page loads the user's current data`                     |
| US-3.4 | Role select options                                           | `frontend/tests/EditUser.test.js`      | `Role select options`                                         |
| US-3.4 | Admin adds a role                                             | `backend/tests/users.test.js`          | `Admin adds a role`                                           |
| US-3.4 | Admin adds a role                                             | `frontend/tests/EditUser.test.js`      | `Admin adds a role`                                           |
| US-3.4 | Admin removes a role                                          | `backend/tests/users.test.js`          | `Admin removes a role`                                        |
| US-3.4 | Admin removes a role                                          | `frontend/tests/EditUser.test.js`      | `Admin removes a role`                                        |
| US-3.4 | Admin assigns area admin for multiple areas                   | `backend/tests/users.test.js`          | `Admin assigns area admin for multiple areas`                 |
| US-3.4 | Admin assigns area admin for multiple areas                   | `frontend/tests/EditUser.test.js`      | `Admin assigns area admin for multiple areas`                 |
| US-3.4 | Admin removes their own admin role                            | `backend/tests/users.test.js`          | `Admin removes their own admin role`                          |
| US-3.4 | Admin removes their own admin role                            | `frontend/tests/EditUser.test.js`      | `Admin removes their own admin role`                          |
| US-3.4 | Cancel editing                                                | `frontend/tests/EditUser.test.js`      | `Cancel editing`                                              |
| US-3.5 | Admin deletes a user                                          | `frontend/tests/Users.test.js`         | `Admin deletes a user`                                        |
| US-3.5 | Admin deletes a user via API                                  | `backend/tests/users.test.js`          | `Admin deletes a user via API`                                |
| US-3.5 | Admin cancels delete                                          | `frontend/tests/Users.test.js`         | `Admin cancels delete`                                        |
| US-3.6 | Admin can access everything                                   | `backend/tests/authorization.test.js`  | `Admin can access everything`                                 |
| US-3.6 | Admins can manage Areas                                       | `backend/tests/areas.test.js`          | `Admins can manage Areas`                                     |
| US-3.6 | Admins can manage Areas                                       | `frontend/tests/Areas.test.js`         | `Admins can manage Areas`                                     |
| US-3.6 | Non-admins cannot manage Areas                                | `backend/tests/areas.test.js`          | `Non-admins cannot manage Areas`                              |
| US-3.6 | Non-admins cannot manage Areas                                | `frontend/tests/Areas.test.js`         | `Non-admins cannot manage Areas`                              |
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

## Definition of Done

- [ ] Backend and frontend implemented per this spec (all function requirements satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `make-admin` script added to `backend/package.json` and documented in the README setup steps
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- User creation (Google sign in handles this)
