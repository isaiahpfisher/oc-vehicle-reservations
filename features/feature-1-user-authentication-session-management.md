# Feature: User Authentication and Session Management

**Feature ID:** 1
**Branch pattern:** `feature/1-user-authentication-session-management`
**Status:** Ready
**Created:** 2026-09-16
**Input:** This feature will allow users to create an account and login to their account
**Related:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## User Stories

### US-1.1: Create account

**As a** new user
**I want to** create an account with first name, last name, email, and password
**So that** I can sign in and access my courses

**Priority:** P1
**Independent test:** Submit valid registration from Create Account, land on home (`/`) with `user` in `localStorage`
**Acceptance scenarios:** see ### US-1.1 under Acceptance Criteria

### US-1.2: Sign in

**As a** registered user
**I want to** sign in with my email and password
**So that** I can access my courses

**Priority:** P1
**Independent test:** Log in with known email/password, receive session token, redirect to home
**Acceptance scenarios:** see ### US-1.2 under Acceptance Criteria

### US-1.3: Stay signed in across page loads

**As a** signed-in user
**I want** my session to persist in the browser
**So that** I do not have to log in again when I refresh the page

**Priority:** P1
**Independent test:** Log in, refresh `/` with valid `localStorage` session — still treated as signed in
**Acceptance scenarios:** see ### US-1.3 under Acceptance Criteria

### US-1.4: Sign out

**As a** signed-in user
**I want to** log out
**So that** no one else can use my account on a shared device

**Priority:** P2
**Independent test:** Logout clears the server session and `localStorage`; user lands on login
**Acceptance scenarios:** see ### US-1.4 under Acceptance Criteria

### US-1.5: Protect authenticated APIs and signed-in UI

**As the** application
**I want to** require a valid session for user-owned API calls and signed-in chrome
**So that** unauthenticated users are sent back to login

**Priority:** P1
**Independent test:** Open `/` with no session → redirect to login; call `GET /api/users/:id` without a token → `401`
**Acceptance scenarios:** see ### US-1.5 under Acceptance Criteria

### US-1.6: Ensure user roles stay separate

**As the** application
**I want to** give each signed-in user only their own role
**So that** a signed-in user is recognized as `student` or `admin` for later features

**Priority:** P1
**Independent test:** Register a user and receive `role` `student`; log in as a user whose stored role is `admin` and receive `role` `admin`
**Acceptance scenarios:** see ### US-1.6 under Acceptance Criteria

### US-1.7: Stay signed in across page navigation

**As a** signed-in user
**I want** my session to persist when I move between pages
**So that** I do not have to log in again when I change pages

**Priority:** P1
**Independent test:** Log in, navigate from `/` to another route with valid `localStorage` session — still treated as signed in
**Acceptance scenarios:** see ### US-1.7 under Acceptance Criteria

## Requirements

### Functional Requirements

- **FR-001**: Users MUST authenticate with **email** + **password**.
- **FR-002**: Registration MUST collect first name, last name, email, and password.
- **FR-003**: Passwords MUST be stored as a **bcrypt** hash; hashes MUST never be returned by the API.
- **FR-004**: Sessions MUST be rows in the `sessions` table. The client token is a **JWT** stored in `sessions.token`. The client sends `Authorization: Bearer <token>` on later requests.
- **FR-005**: Session lifetime MUST be **24 hours** from creation.
- **FR-006**: Login and registration MUST **reuse** the user's unexpired session if one exists; otherwise they create a new session.
- **FR-007**: Login MUST send credentials as a JSON body (`{ email, password }`) to `POST /api/login`.
- **FR-008**: Every authenticated request MUST resolve to exactly one user via `req.user.id` and that user’s `req.user.role` from the session token (`authenticate`).
- **FR-009**: Public registration MUST store `role` as `student`. The register request MUST NOT let the client choose `admin`.
- **FR-010**: Every user MUST have role `student` or `admin`. Register and login success MUST return `role`. User API calls MUST require a Bearer token. Opening `/` with no session MUST redirect to login.

## Assumptions

- This is the Courses app (Vue + Express under `/api`), not the Todo sample.
- Single browser `localStorage` key `user` per device.
- Opening the login page clears `localStorage` `user` (current `Login.vue` `onMounted`).
- course, section, and faculty management CRUD belong to other team features.
- The first `admin` user is inserted in the database (seed or manual SQL). Feature 1 has no endpoint to create an admin. The admin login scenario uses that existing row.

## Edge Cases

- Duplicate email on register → `400` with `{ "message": "Email is already registered." }`
- Unknown email on login → `401` with `{ "message": "Invalid email or password." }`
- Wrong password → `401` with `{ "message": "Invalid email or password." }`
- Missing or expired Bearer token on a protected API → `401`
- Missing first name, last name, email, or password on register → `400`
- Register body includes `"role": "admin"` → stored and returned role is still `student`

## Success Criteria

- **SC-001**: Every Gherkin scenario in this feature has at least one automated test before merge.
- **SC-002**: A new user can register, log in, reach home (`/`), and log out in one manual pass.
- **SC-003**: `npm test` passes with backend auth and frontend login/register coverage.

## Data Ownership & Isolation

Feature 1 is the identity boundary. A session belongs to exactly one user. Signed-in course reads use that user’s id.

| Rule                  | Requirement                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Read scope**        | `GET /api/users/:id` requires a Bearer token. There is no public course list.                                                                    |
| **Write scope**       | Logout revokes only the session matching the caller’s Bearer token.                                                                              |
| **Create scope**      | Register/login create a `users` and/or `sessions` row for that user only. Public registration sets `role` to `student`.                          |
| **Cross-user access** | Another user’s resource → `404` (not `403`) when a later feature enforces ownership on a single row. Feature 1 MUST NOT return password or salt. |
| **UI scope**          | Menu links and the user avatar menu show only when `localStorage` `user` is set. Opening `/` with no session redirects to login.                 |
| **Implementation**    | `authenticate` in `backend/app/authorization/authorization.js` sets `req.user.id` and `req.user.role`.                                           |

## Key Entities

- **User**: account with first name, last name, email, role (`student` or `admin`), and stored password hash; can own courses.
- **Session**: server-side row for one user (email, expiration, `userId`). The browser stores the session JWT as `token`.

## API Requirements

Mount prefix: `/api`. Flat JSON. Errors: `{ "message": "..." }`.

| Method | Endpoint         | Auth                            | Purpose                                                          |
| ------ | ---------------- | ------------------------------- | ---------------------------------------------------------------- |
| `POST` | `/api/register`  | No                              | Register; create user + session; return identity + token (`201`) |
| `POST` | `/api/login`     | JSON body `{ email, password }` | Log in; reuse or create a 24-hour session (`200`)                |
| `POST` | `/api/logout`    | Bearer token                    | Delete the session                                               |
| `GET`  | `/api/users/:id` | Bearer token                    | Probe for a valid session (`200` / `401`)                        |

**Register request body** (`POST /api/register`):

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "password1"
}
```

**Register (`201`) or login (`200`) success**:

```json
{
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "userId": 1,
  "role": "student",
  "token": "<encrypted-session-id>"
}
```

**Quoted errors**

| Status | Body                                                       |
| ------ | ---------------------------------------------------------- |
| `400`  | `{ "message": "Email is already registered." }`            |
| `401`  | `{ "message": "Invalid email or password." }`              |
| `401`  | `{ "message": "Unauthorized! No token provided." }`        |
| `401`  | `{ "message": "Unauthorized! Invalid or expired token." }` |

Password hash and salt are omitted from all responses.

## Screen Requirements

Existing views only. Labels match `Login.vue` and `MenuBar.vue`. API errors show in a `<v-alert>`, not a `<v-snackbar>`.

### [View: Login] — route name `login` (`/login`)

File: `frontend/src/views/Login.vue`. Public.

- Heading: **Sign in**
- Fields: **Email**, **Password**
- Primary action: **Sign in**
- Secondary action: **Create an account** (navigates to `register`)
- Success: store `user`, navigate to `home`
- Failure: alert with the API `message`

**Create account page** — route name `register` (`/register`), `Register.vue`

- Title: **Create account**
- Fields: **First name**, **Last name**, **Email**, **Password**, **Confirm password**
- Actions: **Create account**, **Already have an account? Sign in**
- Success: store `user`, navigate to `home`
- Duplicate email: alert **"Email is already registered."**

### [View: Home] — route name `home` (`/`)

File: `frontend/src/views/Home.vue`.

- No session: redirect to `login`
- After login/register, this is the landing page

### App chrome — `MenuBar.vue`

- Title **Course Management System**
- Session present: avatar menu with name/email and **Sign out**
- **Sign out** calls `POST /api/logout`, removes `localStorage` `user`, navigates to `login`

Axios (`frontend/src/services/services.js`) attaches `Authorization: Bearer <token>` from `localStorage` `user` when present.

## Data Model Requirements

### `users` table

| Field                     | Type       | Rules                                                                 |
| ------------------------- | ---------- | --------------------------------------------------------------------- |
| `id`                      | INTEGER PK | Auto-increment                                                        |
| `firstName`               | STRING     | Required                                                              |
| `lastName`                | STRING     | Required                                                              |
| `email`                   | STRING     | Required                                                              |
| `role`                    | STRING     | Required; `student` or `admin`. Public registration stores `student`. |
| `password`                | STRING     | Required; bcrypt hash only                                            |
| `createdAt` / `updatedAt` | DATETIME   | Sequelize timestamps                                                  |

### `sessions` table

| Field                     | Type       | Rules                              |
| ------------------------- | ---------- | ---------------------------------- |
| `id`                      | INTEGER PK | Auto-increment                     |
| `token`                   | STRING     | Required; JWT sent to the client   |
| `email`                   | STRING     | Required                           |
| `expirationDate`          | DATE       | Required; creation time + 24 hours |
| `userId`                  | INTEGER FK | Required, references `users.id`    |
| `createdAt` / `updatedAt` | DATETIME   | Sequelize timestamps               |

**Associations:** `User` hasMany `Session`; `Session` belongsTo `User`.

No `username` column. Role lives on `users.role`.

---

## Acceptance Criteria (Gherkin)

### US-1.1 — Create account

#### Scenario: User registers with valid information

- **Given** I am on the login page
- **When** I open **Create an account**
- **And** I enter valid first name, last name, email, and password
- **And** I click **Create account**
- **Then** the API returns `201` with `email`, `firstName`, `lastName`, `userId`, `role` `student`, and `token`
- **And** my password is stored as a bcrypt hash
- **And** I am sent to home
- **And** my session is stored in `localStorage` under the key `user`

#### Scenario: User registers with a duplicate email

- **Given** a user with email `jane@example.com` already exists
- **When** I submit **Create account** with email `jane@example.com`
- **Then** the API returns `400` with `{ "message": "Email is already registered." }`
- **And** the error is shown in an alert

---

### US-1.2 — Sign in

#### Scenario: User logs in with valid credentials

- **Given** I am on the login page
- **And** a registered user exists with email `jane@example.com` and a known password
- **When** I enter that email and the correct password
- **And** I click **Sign in**
- **Then** the API returns `200` with `email`, `firstName`, `lastName`, `userId`, `role` `student`, and `token`
- **And** a session row exists for me in the database
- **And** I am sent to home
- **And** my session is stored in `localStorage` under the key `user`

#### Scenario: User logs in with an unknown email

- **Given** I am on the login page
- **When** I enter an email that is not registered and any password
- **And** I click **Sign in**
- **Then** the API returns `401` with `{ "message": "Invalid email or password." }`
- **And** I remain on the login page
- **And** the error is shown in an alert

#### Scenario: User logs in with an invalid password

- **Given** I am on the login page
- **And** a registered user exists with email `jane@example.com`
- **When** I enter that email and an incorrect password
- **And** I click **Sign in**
- **Then** the API returns `401` with `{ "message": "Invalid email or password." }`
- **And** I remain on the login page
- **And** the error is shown in an alert

---

### US-1.3 — Stay signed in across page loads

#### Scenario: Signed-in user refreshes the home page

- **Given** I have a valid session in `localStorage`
- **And** I am on home
- **When** I refresh the page
- **Then** I remain signed in

#### Scenario: API request includes session token

- **Given** I am signed in
- **When** the frontend makes an authenticated API request
- **Then** the request includes header `Authorization: Bearer <token>`

#### Scenario: Protected API request succeeds with a valid session

- **Given** I am signed in as user A
- **And** user B also exists
- **When** I send an authenticated `GET /api/users/{userA.id}` request
- **Then** the API returns `200`
- **And** only user A is returned

#### Scenario: Signed-in user visits the login page

- **Given** I have a valid session in `localStorage`
- **When** I navigate to the login page
- **Then** I am redirected to home

#### Scenario: Expired or invalid session token

- **Given** I am signed in with an expired or revoked token
- **When** the frontend makes an authenticated API request
- **Then** the API returns `401` with an unauthorized message

---

### US-1.4 — Sign out

#### Scenario: User logs out

- **Given** I am signed in on home
- **When** I click **Sign out**
- **Then** the API invalidates my session on the server
- **And** `localStorage` key `user` is removed
- **And** I am sent to the login page

---

### US-1.5 — Protect authenticated APIs and signed-in UI

#### Scenario: Unauthenticated user is sent to login

- **Given** I have no session in `localStorage`
- **When** I open home (`/`)
- **Then** I am redirected to login
- **And** I am back at the login page

#### Scenario: Protected API is called without a token

- **Given** I have no session token
- **When** I send `GET /api/users/1` without `Authorization`
- **Then** the API returns `401`

---

### US-1.6 — Ensure user roles stay separate

#### Scenario: Registration stores the student role

- **Given** I am on the login page
- **When** I submit **Create account** with valid first name, last name, email, and password and `"role": "admin"` in the body
- **Then** the API returns `201` with `role` `student`
- **And** the stored user role is `student`

#### Scenario: Admin logs in with the admin role

- **Given** I am on the login page
- **And** a user exists with email `admin@example.com`, a known password, and role `admin`
- **When** I enter that email and the correct password
- **And** I click **Sign in**
- **Then** the API returns `200` with `role` `admin`
- **And** I am sent to home

---

### US-1.7 — Stay signed in across page navigation

#### Scenario: Signed-in user changes pages

- **Given** I have a valid session in `localStorage`
- **And** I am on home
- **When** I navigate to another page in the app
- **Then** I remain signed in

---

## Test Coverage Map

Each scenario above must map to at least one automated test. `it("…")` titles match the Gherkin scenario names exactly.

| Story  | Scenario                                            | Test file                      | Test name                                             |
| ------ | --------------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| US-1.1 | User registers with valid information               | `backend/tests/auth.test.js`   | `User registers with valid information`               |
| US-1.1 | User registers with valid information               | `frontend/tests/Login.test.js` | `User registers with valid information`               |
| US-1.1 | User registers with a duplicate email               | `backend/tests/auth.test.js`   | `User registers with a duplicate email`               |
| US-1.1 | User registers with a duplicate email               | `frontend/tests/Login.test.js` | `User registers with a duplicate email`               |
| US-1.2 | User logs in with valid credentials                 | `backend/tests/auth.test.js`   | `User logs in with valid credentials`                 |
| US-1.2 | User logs in with valid credentials                 | `frontend/tests/Login.test.js` | `User logs in with valid credentials`                 |
| US-1.2 | User logs in with an unknown email                  | `backend/tests/auth.test.js`   | `User logs in with an unknown email`                  |
| US-1.2 | User logs in with an unknown email                  | `frontend/tests/Login.test.js` | `User logs in with an unknown email`                  |
| US-1.2 | User logs in with an invalid password               | `backend/tests/auth.test.js`   | `User logs in with an invalid password`               |
| US-1.2 | User logs in with an invalid password               | `frontend/tests/Login.test.js` | `User logs in with an invalid password`               |
| US-1.3 | Signed-in user refreshes the home page              | `frontend/tests/Login.test.js` | `Signed-in user refreshes the home page`              |
| US-1.3 | API request includes session token                  | `frontend/tests/Login.test.js` | `API request includes session token`                  |
| US-1.3 | Protected API request succeeds with a valid session | `backend/tests/auth.test.js`   | `Protected API request succeeds with a valid session` |
| US-1.3 | Signed-in user visits the login page                | `frontend/tests/Login.test.js` | `Signed-in user visits the login page`                |
| US-1.3 | Expired or invalid session token                    | `backend/tests/auth.test.js`   | `Expired or invalid session token`                    |
| US-1.4 | User logs out                                       | `backend/tests/auth.test.js`   | `User logs out`                                       |
| US-1.4 | User logs out                                       | `frontend/tests/Login.test.js` | `User logs out`                                       |
| US-1.5 | Unauthenticated user is sent to login               | `frontend/tests/Login.test.js` | `Unauthenticated user is sent to login`               |
| US-1.5 | Protected API is called without a token             | `backend/tests/auth.test.js`   | `Protected API is called without a token`             |
| US-1.6 | Registration stores the student role                | `backend/tests/auth.test.js`   | `Registration stores the student role`                |
| US-1.6 | Admin logs in with the admin role                   | `backend/tests/auth.test.js`   | `Admin logs in with the admin role`                   |
| US-1.7 | Signed-in user changes pages                        | `frontend/tests/Login.test.js` | `Signed-in user changes pages`                        |

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 1 from @features/feature-1-user-authentication-session-management.md on branch `feature/1-user-authentication-session-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec. Store `users.role` as `student` or `admin`. Public registration always sets `student`.
```

**Reference updates for this feature:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-010** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)
- [ ] Feature catalog row added in [README.md §2.3](../README.md#23-feature-catalog)
- [ ] PR targets `dev` (not `main`)

## Out of Scope

- Password reset, email verification, OAuth / social login

## Delivered to later course features

- `req.user.id` and `req.user.role` from the session token are the ownership and privilege keys for later features.
- After login, users land on home (`/`). There is no guest course list.
