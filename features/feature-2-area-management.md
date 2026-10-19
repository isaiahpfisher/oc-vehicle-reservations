# Feature: Area Management

**Feature ID:** 2
**Branch pattern:** `feature/2-area-management`
**Status:** Draft
**Created:** 2026-09-24
**Input:** Signed-in users manage areas. Areas are added/edited with a dialog.
**Depends on:** Feature 1 [User Auth]

---

## User Stories

### US-2.1: Create areas

**As a** signed-in user
**I want to** create an area with a name and logo
**So that** users managing and requesting vehicles can do so with a particular area

**Priority:** P1
**Independent test:** Open the area dialog, create an area; it appears in the areas view
**Acceptance scenarios:** see ### US-2.1 under Acceptance Criteria

### US-2.2: View areas

**As a** signed-in user
**I want to** see all areas
**So that** I can see which areas exist.

**Priority:** P1
**Independent test:** Areas view loads a single list of areas
**Acceptance scenarios:** see ### US-2.2 under Acceptance Criteria

### US-2.3: Manage area rows

**As a** signed-in user
**I want** each area row to have **edit** and **delete** actions
**So that** I can manage areas from the areas view

**Priority:** P1
**Independent test:** Each area row exposes edit and delete icon actions 
**Acceptance scenarios:** see ### US-2.3 under Acceptance Criteria

### US-2.4: Edit and delete areas

**As a** signed-in user
**I want to** edit or delete an area
**So that** I can keep areas up to date

**Priority:** P2
**Independent test:** Edit and delete areas from row actions; the areas view updates
**Acceptance scenarios:** see ### US-2.4 under Acceptance Criteria

### US-2.5: Signed-in user access only

**As a** signed-in user
**I want to** have areas visible only to signed-in users
**So that** Unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/areas` is redirected to `/login`; unauthorized API requests receive errors
**Acceptance scenarios:** see ### US-2.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All area endpoints MUST require a valid session (`authenticate` middleware).
- **FR-002**: `name` MUST be trimmed before save. An empty name MUST be rejected.
- **FR-003**: An area MUST store `name`. `id` is assigned by the database.
- **FR-004**: `name` MUST be unique. Creating an area with a name identical to an existing name MUST be rejected. Updating an area to have a different name that is also identical to an existing name MUST be rejected.
- **FR-005**: `logo` MUST be trimmed before save.
- **FR-006**: `logo` MUST be a URL or "".

---

## Assumptions

- Areas use **dialog-based** workflows (no split sidebar / main panel).
- Feature 1 provides sign in but no roles. Updating area code to restrict based on roles will be in a later feature.
- Delete removes the area row. No other table references `areas` yet, so this feature does not block a delete.

## Edge Cases

- Empty or whitespace-only area name → client block and/or `400`.
- Area name longer than 255 characters → `400`.
- Unauthenticated areas screen → redirect. 
- Unauthenticated API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in user can create, view, edit, and delete areas on one screen.
- **SC-003**: `npm test` passes for areas API and areas view behavior.

---

## Data Ownership & Isolation

Any signed in user may create, edit, delete, or read the list of areas.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/areas` and `GET /api/areas/:areaId` require a Bearer token. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token. |
| **Create scope** | `POST` requires a Bearer token. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/areas` | Yes | Fetch all areas |
| `GET` | `/api/areas/:areaId` | Yes | Fetch a single area |
| `POST` | `/api/areas` | Yes | Create an area |
| `PUT` | `/api/areas/:areaId` | Yes | Edit an area |
| `DELETE` | `/api/areas/:areaId` | Yes | Delete an area |

**Create area request body:**

```json
{
  "name": "Athletics",
  "logo": "https://example.com/logo.png"
}
```

**Area success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Athletics",
    "logo": "https://example.com/logo.png",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404` (do not use `403`).

---

## Screen Requirements

### [View: Areas] — route name `areas`

**Single Vue view** (`Areas.vue`) — no sidebar / main-panel split.

- Heading: **Area Management**
- Primary action: **+ New Area** opens a `<v-dialog>` with **Name** and **Logo**, plus **Create** / **Cancel**.
- Display areas as rows. Each row shows **name** and the rendered logo, if any.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current name and logo; **Save** / **Cancel**.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit area**, **Delete area**).
- **Empty state:** **"No areas yet. Create your first area."** when there are no areas.
- **Loading state:** skeleton or progress indicator while areas are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for areas; delete dialog is a reusable component in `components/common` folder; create and edit dialogs should be components stored in a dedicated components/areas folder and modeled after existing create and edit dialogs in `components/` folders.

---

## Key Entities

- **Area**: a region of campus that has vehicles, such as `Athletics`, `Support Central`, or `Maintenance`.

---

## Data Model Requirements

### `areas` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING | Required; trimmed; unique; max 255 |
| `logo` | TEXT | Optional; trimmed |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- N/A

---

## Acceptance Criteria (Gherkin)

### US-2.1 — Create areas

#### Scenario: User creates area

- **Given** I am signed in on the areas view
- **When** I click **+ New Area**
- **Then** a dialog opens with **Name** and **Logo** fields

#### Scenario: User saves area

- **Given** I am signed in on the areas view
- **When** I submit the create dialog with name `Athletics` and logo `https://example.com/logo.png`
- **Then** the API returns `201` with that area
- **And** `Athletics` appears in the areas list

#### Scenario: User creates area with missing name

- **Given** I am signed in on the areas view
- **When** I submit the create dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User creates area with missing logo

- **Given** I am signed in on the areas view
- **When** I submit the create dialog with name `Athletics` and no logo
- **Then** the API returns `201` with that area
- **And** `Athletics` appears in the areas list
- **And** the response includes `logo: ""`

#### Scenario: User requests to create an area with a missing name

- **Given** I am signed in on the areas view
- **When** I request `POST /api/areas` with `{ name: "" }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: User creates area with a whitespace-only name

- **Given** I am signed in on the areas view
- **When** I submit the create dialog with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User requests to create an area with a whitespace-only name

- **Given** I am signed in on the areas view
- **When** I request `POST /api/areas` with `{ name: " " }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: User creates area with name longer than 255 characters

- **Given** I am signed in on the areas view
- **When** I submit the create dialog with an area name longer than 255 characters
- **Then** validation blocks the request and I see a `Name too long.` message

#### Scenario: User requests to create an area with name longer than 255 characters

- **Given** I am signed in on the areas view
- **When** I request `POST /api/areas` with name longer than 255 characters
- **Then** the API returns `400` with `{ message: "Name too long." }`

#### Scenario: User creates an area with a non-unique name

- **Given** I am signed in on the areas view
- **And** An area with name `Athletics` exists
- **When** I submit the create dialog with name `Athletics`
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: User requests to create an area with a non-unique name

- **Given** I am signed in on the areas view
- **And** An area with name `Athletics` exists with id `1`
- **When** I request `POST /api/areas` with `{ name: "Athletics" }`
- **Then** the API returns `400` with `{ message: "Name already taken." }`

#### Scenario: User creates an area with a bad logo URL

- **Given** I am signed in on the areas view
- **When** I submit the create dialog with name `Athletics` and logo `logo.png`
- **Then** validation blocks the request and I see an `Invalid logo URL.` message

#### Scenario: User requests to create an area with a bad logo URL

- **Given** I am signed in on the areas view
- **When** I request `POST /api/areas` with name `Athletics` and logo `logo.png`
- **Then** the API returns `400` with `{ message: "Invalid logo URL." }`

---

### US-2.2 — View areas

#### Scenario: Areas view lists areas

- **Given** I am signed in and areas exist 
- **When** I open the areas view
- **Then** each row shows the area name 

#### Scenario: Areas view lists areas with logo corresponding to if the logo exists

- **Given** I am signed in
- **And** Areas `Athletics` with logo `https://example.com/logo.png` and `Support Central` with no logo exist
- **When** I open the areas view
- **Then** I see a row `Athletics` with the rendered image corresponding to `https://example.com/logo.png`
- **And** I see a row `Support Central` with no rendered logo

#### Scenario: Areas empty state

- **Given** I am signed in and there are no areas
- **When** I open the areas view
- **Then** I see **"No areas yet. Create your first area."**

---

### US-2.3 — Manage area rows

#### Scenario: Area rows have edit and delete actions 

- **Given** I am signed in and at least one area exists
- **When** I view the areas list
- **Then** each row shows **Edit area** and **Delete area**

---

### US-2.4 — Edit and delete areas

#### Scenario: User edits an area name

- **Given** I am signed in and an area named `Athletics` exists
- **When** I change the name to `Athletics A` and submit
- **Then** the API returns `200` with the updated area
- **And** the list shows `Athletics A`

#### Scenario: User edits an area logo

- **Given** I am signed in and an area with name `Athletics` and logo `https://example.com/logo.png` exists
- **When** I change the logo to `https://example.com/logo2.png` and submit
- **Then** the API returns `200` with the updated area
- **And** the list still shows `Athletics`
- **And** the response includes `logo: "https://example.com/logo2.png"`

#### Scenario: User edits an area to have a missing name

- **Given** I am signed in on the areas view
- **And** I am editing an existing area
- **When** I submit the edit dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User edits an area to have a missing logo

- **Given** I am signed in and an area with name `Athletics` and logo `https://example.com/logo.png` exists
- **And** I am editing the `Athletics` area
- **When** I submit the edit dialog without a logo
- **Then** the API returns `200` with the updated area
- **And** the list still shows `Athletics`
- **And** the response includes `logo: ""`

#### Scenario: User requests to edit an area to have a missing name

- **Given** I am signed in on the areas view
- **And** An area with name `Athletics` exists with id `1`
- **When** I request `PUT /api/areas/1` with `{ name: "" }`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: User edits an area to have a whitespace-only name

- **Given** I am signed in on the areas view
- **And** I am editing an existing area
- **When** I submit the edit dialog with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: User requests to edit an area to have a whitespace-only name

- **Given** I am signed in on the areas view
- **And** An area with name `Athletics` exists with id `1`
- **When** I request `PUT /api/areas/1` with `{ name: " " }`
- **Then** the API returns `400` with `{ message: "Missing name." }`


#### Scenario: User edits an area to have a name longer than 255 characters

- **Given** I am signed in on the areas view
- **And** I am editing an existing area
- **When** I submit the edit dialog with an area name longer than 255 characters
- **Then** validation blocks the request and I see a `Name too long.` message

#### Scenario: User requests to edit an area to have a name longer than 255 characters

- **Given** I am signed in on the areas view
- **And** An area with name `Athletics` exists with id `1`
- **When** I request `PUT /api/areas/1` with name longer than 255 characters
- **Then** the API returns `400` with `{ message: "Name too long." }`

#### Scenario: User updates an area to have a non-unique name

- **Given** I am signed in on the areas view
- **And** Areas with names `Athletics` and `Support Central` exist
- **And** I edit `Support Central` to have name `Athletics`
- **When** I submit the edit dialog
- **Then** validation blocks the request and I see a `Name already taken.` message

#### Scenario: User requests to update an area to have a non-unique name 

- **Given** I am signed in on the areas view
- **And** An area with name `Athletics` exists with id `1`
- **And** Another area exists with name `Support Central` and id `2`
- **When** I request `PUT /api/areas/2` with `{ name: "Athletics" }`
- **Then** the API returns `400` with `{ message: "Name already taken." }`

#### Scenario: User updates an area to have a bad logo URL

- **Given** I am signed in on the areas view
- **And** I am editing an existing area
- **When** I submit the edit dialog with a logo `logo.png`
- **Then** validation blocks the request and I see an `Invalid logo URL.` message

#### Scenario: User requests to update an area to have a bad logo URL

- **Given** I am signed in on the areas view
- **And** An area with name `Athletics` exists with id `1`
- **When** I request `PUT /api/areas/1` with logo `logo.png`
- **Then** the API returns `400` with `{ message: "Invalid logo URL." }`

#### Scenario: User deletes an area

- **Given** I am signed in and an area named `Athletics` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that area is removed from the list

#### Scenario: User updates an area that does not exist
-   **Given** I am signed in
-   **And** An area with id `999` does not exist
-   **When** I request `PUT /api/areas/999` with a valid body
-   **Then** the API returns `404`

#### Scenario: User updates an area with an invalid areaId
-   **Given** I am signed in
-   **When** I request `PUT /api/areas/abc` with a valid body
-   **Then** the API returns `400`

#### Scenario: User deletes an area that does not exist
-   **Given** I am signed in
-   **And** An area with id `999` does not exist
-   **When** I request `DELETE /api/areas/999`
-   **Then** the API returns `404`

#### Scenario: User deletes an area with an invalid areaId
-   **Given** I am signed in
-   **When** I request `DELETE /api/areas/abc`
-   **Then** the API returns `400` 

---

### US-2.5: Signed-in user access only

#### Scenario: Un-signed-in user accesses areas page
- **Given** I am not signed in
- **When** I navigate to `/areas` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to areas
- **Given** I have no valid session token
- **When** I request `GET /api/areas`
- **Then** the API returns `401` with `{ message: "Unauthorized." }`

#### Scenario: Unauthenticated API request to a particular area
- **Given** I have no valid session token
- **And** An area with id `1` exists
- **When** I request `GET /api/areas/1`
- **Then** the API returns `401` with `{ message: "Unauthorized." }`

#### Scenario: Unauthenticated API request to create an area
- **Given** I have no valid session token
- **When** I request `POST /api/areas` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized." }`

#### Scenario: Unauthenticated API request to update an area
- **Given** I have no valid session token
- **And** An area with id `1` exists
- **When** I request `PUT /api/areas/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized." }`

#### Scenario: Unauthenticated API request to delete an area
- **Given** I have no valid session token
- **And** An area with id `1` exists
- **When** I request `DELETE /api/areas/1`
- **Then** the API returns `401` with `{ message: "Unauthorized." }`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-2.1 | User creates area | `frontend/tests/Areas.test.js` | `User creates area` |
| US-2.1 | User saves area | `backend/tests/areas.test.js` | `User saves area` |
| US-2.1 | User saves area | `frontend/tests/Areas.test.js` | `User saves area` |
| US-2.1 | User creates area with missing name | `frontend/tests/Areas.test.js` | `User creates area with missing name` |
| US-2.1 | User creates area with missing logo | `backend/tests/areas.test.js` | `User creates area with missing logo` |
| US-2.1 | User creates area with missing logo | `frontend/tests/Areas.test.js` | `User creates area with missing logo` |
| US-2.1 | User requests to create an area with a missing name | `backend/tests/areas.test.js` | `User requests to create an area with a missing name` |
| US-2.1 | User creates area with a whitespace-only name | `frontend/tests/Areas.test.js` | `User creates area with a whitespace-only name` |
| US-2.1 | User requests to create an area with a whitespace-only name | `backend/tests/areas.test.js` | `User requests to create an area with a whitespace-only name` |
| US-2.1 | User creates area with name longer than 255 characters | `frontend/tests/Areas.test.js` | `User creates area with name longer than 255 characters` |
| US-2.1 | User requests to create an area with name longer than 255 characters | `backend/tests/areas.test.js` | `User requests to create an area with name longer than 255 characters` |
| US-2.1 | User creates an area with a non-unique name | `frontend/tests/Areas.test.js` | `User creates an area with a non-unique name` |
| US-2.1 | User requests to create an area with a non-unique name | `backend/tests/areas.test.js` | `User requests to create an area with a non-unique name` |
| US-2.1 | User creates an area with a bad logo URL | `frontend/tests/Areas.test.js` | `User creates an area with a bad logo URL` |
| US-2.1 | User requests to create an area with a bad logo URL | `backend/tests/areas.test.js` | `User requests to create an area with a bad logo URL` |
| US-2.2 | Areas view lists areas | `frontend/tests/Areas.test.js` | `Areas view lists areas` |
| US-2.2 | Areas view lists areas with logo corresponding to if the logo exists | `frontend/tests/Areas.test.js` | `Areas view lists areas with logo corresponding to if the logo exists` |
| US-2.2 | Areas empty state | `frontend/tests/Areas.test.js` | `Areas empty state` |
| US-2.3 | Area rows have edit and delete actions | `frontend/tests/Areas.test.js` | `Area rows have edit and delete actions` |
| US-2.4 | User edits an area name | `backend/tests/areas.test.js` | `User edits an area name` |
| US-2.4 | User edits an area name | `frontend/tests/Areas.test.js` | `User edits an area name` |
| US-2.4 | User edits an area logo | `backend/tests/areas.test.js` | `User edits an area logo` |
| US-2.4 | User edits an area logo | `frontend/tests/Areas.test.js` | `User edits an area logo` |
| US-2.4 | User edits an area to have a missing name | `frontend/tests/Areas.test.js` | `User edits an area to have a missing name` |
| US-2.4 | User edits an area to have a missing logo | `backend/tests/areas.test.js` | `User edits an area to have a missing logo` |
| US-2.4 | User edits an area to have a missing logo | `frontend/tests/Areas.test.js` | `User edits an area to have a missing logo` |
| US-2.4 | User requests to edit an area to have a missing name | `backend/tests/areas.test.js` | `User requests to edit an area to have a missing name` |
| US-2.4 | User edits an area to have a whitespace-only name | `frontend/tests/Areas.test.js` | `User edits an area to have a whitespace-only name` |
| US-2.4 | User requests to edit an area to have a whitespace-only name | `backend/tests/areas.test.js` | `User requests to edit an area to have a whitespace-only name` |
| US-2.4 | User edits an area to have a name longer than 255 characters | `frontend/tests/Areas.test.js` | `User edits an area to have a name longer than 255 characters` |
| US-2.4 | User requests to edit an area to have a name longer than 255 characters | `backend/tests/areas.test.js` | `User requests to edit an area to have a name longer than 255 characters` |
| US-2.4 | User updates an area to have a non-unique name | `frontend/tests/Areas.test.js` | `User updates an area to have a non-unique name` |
| US-2.4 | User requests to update an area to have a non-unique name | `backend/tests/areas.test.js` | `User requests to update an area to have a non-unique name` |
| US-2.4 | User updates an area to have a bad logo URL | `frontend/tests/Areas.test.js` | `User updates an area to have a bad logo URL` |
| US-2.4 | User requests to update an area to have a bad logo URL | `backend/tests/areas.test.js` | `User requests to update an area to have a bad logo URL` |
| US-2.4 | User deletes an area | `backend/tests/areas.test.js` | `User deletes an area` |
| US-2.4 | User deletes an area | `frontend/tests/Areas.test.js` | `User deletes an area` |
| US-2.4 | User updates an area that does not exist | `backend/tests/areas.test.js` | `User updates an area that does not exist` |
| US-2.4 | User updates an area with an invalid areaId | `backend/tests/areas.test.js` | `User updates an area with an invalid areaId` |
| US-2.4 | User deletes an area that does not exist | `backend/tests/areas.test.js` | `User deletes an area that does not exist` |
| US-2.4 | User deletes an area with an invalid areaId | `backend/tests/areas.test.js` | `User deletes an area with an invalid areaId` |
| US-2.5 | Un-signed-in user accesses areas page | `frontend/tests/Areas.test.js` | `Un-signed-in user accesses areas page` |
| US-2.5 | Unauthenticated API request to areas | `backend/tests/areas.test.js` | `Unauthenticated API request to areas` |
| US-2.5 | Unauthenticated API request to a particular area | `backend/tests/areas.test.js` | `Unauthenticated API request to a particular area` |
| US-2.5 | Unauthenticated API request to create an area | `backend/tests/areas.test.js` | `Unauthenticated API request to create an area` |
| US-2.5 | Unauthenticated API request to update an area | `backend/tests/areas.test.js` | `Unauthenticated API request to update an area` |
| US-2.5 | Unauthenticated API request to delete an area | `backend/tests/areas.test.js` | `Unauthenticated API request to delete an area` |

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-006** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Role checks on area endpoints
- Role-specific area screens
- Area logo in object storage
- Restricting deletion based on entities that reference an area

---

## Delivered to later features

- An area row with `id` and `name`
- `GET /api/areas` returns every area for any valid session
- Delete removes an existing area unconditionally and returns `200`
 