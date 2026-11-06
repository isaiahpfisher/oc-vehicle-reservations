# Feature: User Authentication and Session Management

**Feature ID:** 17
**Branch pattern:** `feature/17-area-logo`
**Status:** Draft
**Created:** 2026-11-06
**Input:** This feature will allow uploading of images for the area logo.
**Related:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## User Stories

### US-17.1: Upload area logo

**As a** signed in admin user
**I want to** upload an image as an area logo
**So that** I can store images from my computer as an area logo

**Priority:** P1
**Independent test:** Upload an image as area logo; it is stored in Supabase and the link to the Supabase image is stored in the database.
**Acceptance scenarios:** see ### US-17.1 under Acceptance Criteria

### US-17.1: Edit area logo

**As a** signed in admin user
**I want to** edit what image is stored as the area logo
**So that** I can keep logos up to date

**Priority:** P1
**Independent test:** Upload a new image as area logo; it is stored in Supabase and the link to the Supabase image is stored in the database. The previous image upload is deleted.
**Acceptance scenarios:** see ### US-17.2 under Acceptance Criteria

## Requirements

### Functional Requirements

- **FR-001**: `logo` behavior stays the same as in Feature 2 for what values it can or cannot hold.
- **FR-002**: `logo` holds the public https URL of the image uploaded to Supabase.

## Assumptions


## Edge Cases

- File upload unsuccessful → `whatever error code that is`

## Success Criteria

- **SC-001**: Every Gherkin scenario in this feature has at least one automated test before merge.
- **SC-002**: Signed in admin user can upload and edit an area logo.
- **SC-003**: `npm test` passes for area logo API and view behavior.
## Data Ownership & Isolation

Unchanged from Feature 2. Only admins can handle area logos.

## Key Entities

- **Area**: The area that the logo is an attribute of.

## API Requirements

Area methods are the same as Feature 2.

Logo upload methods:
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/areas/logo/` | Yes | Upload an area logo |
| `PUT` | `/api/areas/logo/:areaName` | Yes | Edit an area logo |
| `DELETE` | `/api/areas/logo/:areaName` | Yes | Delete an area logo |

New sample area requests:
**Create area request body:**

```json
{
  "name": "Athletics",
  "logo": "https://vehicle-registration.supabase.co/storage/v1/object/public/area-logos/Athletics/example.png" 
}
```

**Area success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Athletics",
  "logo": "https://vehicle-registration.supabase.co/storage/v1/object/public/area-logos/Athletics/example.png",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

Logo upload requests:
**Create area logo request body:**

```json
{
  "areaName": "Athletics",
  "logo": "https://vehicle-registration.supabase.co/storage/v1/object/public/area-logos/Athletics/example.png" Is this right??
}
```

**Area success response** (`200` / `201`):

```json
{
  "area_name": "Athletics",
  "logo": "https://vehicle-registration.supabase.co/storage/v1/object/public/area-logos/Athletics/example.png",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404` (do not use `403`).

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
- Name and email are display only. There is no **Edit Profile** action (removed in Feature 3).
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

## Test Coverage Map

Each scenario above must map to at least one automated test. `it("…")` titles match the Gherkin scenario names exactly.

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
