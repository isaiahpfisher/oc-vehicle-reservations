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
**I want to** sign in using google auth with a pre-existing OC Google account (`@oc.edu` or `@eagles.oc.edu`)
**So that** I can sign in and use the vehicle registration app

**Priority:** P1
**Independent test:** Log in with google with a new google account, land on home (`/`) with `user` in `localStorage`
**Acceptance scenarios:** see ### US-1.1 under Acceptance Criteria

### US-1.2: Sign in

**As a** returning user
**I want to** sign in with my pre-existing OC Google account (`@oc.edu` or `@eagles.oc.edu`)
**So that** I can access the application

**Priority:** P1
**Independent test:** Log in with known pre-existing google account, receive and verify google token, create session and redirect to home
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


### US-1.7: Stay signed in across page navigation

**As a** signed-in user
**I want** my session to persist when I move between pages
**So that** I do not have to log in again when I change pages

**Priority:** P1
**Independent test:** Log in, navigate from `/` to another route with valid `localStorage` session — still treated as signed in
**Acceptance scenarios:** see ### US-1.7 under Acceptance Criteria

## Requirements

### Functional Requirements

- **FR-001**: Users MUST authenticate with **Google Auth**. This will include being sent to the google login page and redirected back to the vehicle registration app.
- **FR-002**: Sessions MUST be rows in the `sessions` table. The client token is a **JWT** stored in `sessions.token`. The client sends `Authorization: Bearer <token>` on later requests.
- **FR-003**: Session lifetime MUST be **24 hours** from creation.
- **FR-004**: Every authenticated request MUST resolve to exactly one user via `req.user.id` from the session token (`authenticate`).
- **FR-005**: User API calls MUST require a Bearer token. Opening `/` with no session MUST redirect to login.
- **FR-006**: Login verifies `googleCredentials` and reads the user's email, first name, and last name from that Google token. The email domain must be `oc.edu` or a subdomain such as `eagles.oc.edu`. Every successful login stores that first and last name on the user. The user cannot change their name or email.

## Assumptions

- This is the Vehicle Registration app (Vue + Express under `/api`), not the Todo sample.
- Single browser `localStorage` key `user` per device.

## Edge Cases

- Missing or expired Bearer token on a protected API → `401`

## Success Criteria

- **SC-001**: Every Gherkin scenario in this feature has at least one automated test before merge.
- **SC-002**: A new user can log in, reach home (`/`), and log out in one manual pass.
- **SC-003**: `npm test` passes with backend auth and frontend login coverage.

## Data Ownership & Isolation

Feature 1 is the identity boundary. A session belongs to exactly one user.

| Rule                  | Requirement                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Read scope**        | `GET /api/users/:id` requires a Bearer token.                                                                                                    |
| **Write scope**       | Logout revokes only the session matching the caller’s Bearer token.                                                                              |
| **Create scope**      | login create a `users` and/or `sessions` row for that user only.                       |
| **Cross-user access** | Another user’s resource → `404` (not `403`) when a later feature enforces ownership on a single row. |
| **UI scope**          | Menu links and the user avatar menu show only when `localStorage` `user` is set. Opening `/` with no session redirects to login.                 |
| **Implementation**    | `authenticate` in `backend/app/authorization/authorization.js` sets `req.user.id`|

## Key Entities

- **User**: account with first name, last name, email.
- **Session**: server-side row for one user (email, expiration, `userId`). The browser stores the session JWT as `token`.

## API Requirements

Mount prefix: `/api`. Flat JSON. Errors: `{ "message": "..." }`.

| Method | Endpoint         | Auth                            | Purpose                                                          |
| ------ | ---------------- | ------------------------------- | ---------------------------------------------------------------- |
| `POST` | `/api/login`     | JSON body                       | Log in; reuse or create a 24-hour session (`200`)                |
| `POST` | `/api/logout`    | Bearer token                    | Delete the session                                               |
| `GET`  | `/api/users/:id` | Bearer token                    | Probe for a valid session (`200` / `401`)                        |


**login request**:

```json
{
  "googleCredentials": "<google verification token>"
}
```
**login (`200`) success**:

```json
{
  "email": "jane@eagles.oc.edu",
  "firstName": "Jane",
  "lastName": "Doe",
  "userId": 1,
  "token": "<jwt>"
}
```

**Quoted errors**

| Status | Body                                                       |
| ------ | ---------------------------------------------------------- |
| `401`  | `{ "message": "Bad Credentials." }`        |
| `401`  | `{ "message": "Non OC email used." }`        |
| `401`  | `{ "message": "Unauthorized! No token provided." }`        |
| `401`  | `{ "message": "Unauthorized! Invalid or expired token." }` |

## Screen Requirements

Existing views only. Labels match `Login.vue` and `MenuBar.vue`. API errors show in a `<v-alert>`, not a `<v-snackbar>`.

### [View: Login] — route name `login` (`/login`)

File: `frontend/src/views/Login.vue`. Public.

- Heading: **Log in with Google**

### [View: Home] — route name `home` (`/`)

File: `frontend/src/views/Home.vue`.

- No session: redirect to `login`
- After login, this is the landing page

### App chrome — `MenuBar.vue`

- Title **Vehicle Registration System**
- Session present: avatar menu with name/email and **Sign out**
- Name and email are display only. **Edit Profile** has no first name, last name, or email fields.
- **Sign out** calls `POST /api/logout`, removes `localStorage` `user`, navigates to `login`

Axios (`frontend/src/services/services.js`) attaches `Authorization: Bearer <token>` from `localStorage` `user` when present.

## Data Model Requirements

### `users` table

| Field                     | Type       | Rules                                                                 |
| ------------------------- | ---------- | --------------------------------------------------------------------- |
| `id`                      | INTEGER PK | Auto-increment                                                        |
| `firstName`               | STRING     | Required                                                              |
| `lastName`                | STRING     | Required                                                              |
| `email`                   | STRING     | Required , Unique                                                            |
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

No `username` column. 

---

## Acceptance Criteria (Gherkin)

### US-1.1 — Create account

#### Scenario: User registers with valid information

- **Given** I am on the login page as a new user
- **When** I click **Log in with Google** and log in with a valid OC google account
- **Then** POST /api/login returns `200` with `email`, `firstName`, `lastName`, `userId`, and `token`
- **And** my user account and session are created in the Vehicle Registration app DB
- **And** I am sent to home
- **And** my session is stored in `localStorage` under the key `user`

---

### US-1.2 — Sign in

#### Scenario: Returning User Signs in

- **Given** I am on the login page
- **And** a I am a returning user
- **When** I log in with google
- **And** I am redirected back to the vehicle registration app
- **Then** POST /api/login returns `200` with `email`, `firstName`, `lastName`, `userId`, and `token`
- **And** the user entry is not duplicated in the database.
- **And** the stored first and last name match that Google token
- **And** a session row exists for me in the database
- **And** I am sent to home
- **And** my session is stored in `localStorage` under the key `user`

#### Scenario: User cannot change name or email

- **Given** I am signed in
- **When** I update my profile with a different first name, last name, or email
- **Then** my stored name and email stay unchanged
- **And** the profile form has no first name, last name, or email fields

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
| US-1.2 | Returning User Signs in                             | `backend/tests/auth.test.js`   | `Returning User Signs in`                             |
| US-1.2 | Returning User Signs in                             | `frontend/tests/Login.test.js` | `Returning User Signs in`                             |
| US-1.2 | User cannot change name or email                    | `backend/tests/auth.test.js`   | `User cannot change name or email`                    |
| US-1.2 | User cannot change name or email                    | `frontend/tests/Login.test.js` | `User cannot change name or email`                    |
| US-1.3 | Signed-in user refreshes the home page              | `frontend/tests/Login.test.js` | `Signed-in user refreshes the home page`              |
| US-1.3 | API request includes session token                  | `frontend/tests/Login.test.js` | `API request includes session token`                  |
| US-1.3 | Protected API request succeeds with a valid session | `backend/tests/auth.test.js`   | `Protected API request succeeds with a valid session` |
| US-1.3 | Signed-in user visits the login page                | `frontend/tests/Login.test.js` | `Signed-in user visits the login page`                |
| US-1.3 | Expired or invalid session token                    | `backend/tests/auth.test.js`   | `Expired or invalid session token`                    |
| US-1.4 | User logs out                                       | `backend/tests/auth.test.js`   | `User logs out`                                       |
| US-1.4 | User logs out                                       | `frontend/tests/Login.test.js` | `User logs out`                                       |
| US-1.5 | Unauthenticated user is sent to login               | `frontend/tests/Login.test.js` | `Unauthenticated user is sent to login`               |
| US-1.5 | Protected API is called without a token             | `backend/tests/auth.test.js`   | `Protected API is called without a token`             |
| US-1.7 | Signed-in user changes pages                        | `frontend/tests/Login.test.js` | `Signed-in user changes pages`                        |

## Agent implementation request


**Reference updates for this feature:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-006** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)
- [ ] Feature catalog row added in [README.md §2.3](../README.md#23-feature-catalog)
- [ ] PR targets `dev` (not `main`)

## Out of Scope

- email verification

## Delivered to later features

- `req.user.id` from the session token are the ownership and privilege keys for later features.
- After login, users land on home (`/`).
