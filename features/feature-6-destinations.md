# Feature: Destinations

**Feature ID:** 6
**Branch pattern:** `feature/6-destinations`
**Status:** Draft
**Created:** 2026-10-29
**Input:** Signed-in admin and area admin users manage destinations. Destinations are added and edited with a dialog.
**Depends on:** [Feature 3 — User Role Management](feature-3-user-role-management.md)

---

## User Stories

### US-6.1: Create destinations

**As a** signed-in admin or area admin user
**I want to** create a destination with a name, address, city, state, optional ZIP code, and optional miles from campus
**So that** users requesting vehicles can choose an official destination

**Priority:** P1
**Independent test:** Open the create destination dialog, create a destination; it appears in the destinations view
**Acceptance scenarios:** see ### US-6.1 under Acceptance Criteria

### US-6.2: View destinations

**As a** signed-in admin or area admin user
**I want to** see every destination, including unofficial ones, and which ones are official
**So that** I can make an unofficial destination official or remove it

**Priority:** P1
**Independent test:** Destinations view loads a single list of destinations, each marked Official or Unofficial
**Acceptance scenarios:** see ### US-6.2 under Acceptance Criteria

### US-6.3: Manage destination rows

**As a** signed-in admin or area admin user
**I want** each destination row to have **edit** and **delete** actions
**So that** I can manage destinations from the destinations view

**Priority:** P1
**Independent test:** Each destination row exposes edit and delete icon actions
**Acceptance scenarios:** see ### US-6.3 under Acceptance Criteria

### US-6.4: Edit and delete destinations

**As a** signed-in admin or area admin user
**I want to** edit or delete a destination, including turning **Official** on or off
**So that** I can choose which destinations are available and remove ones that should not be kept

**Priority:** P2
**Independent test:** Edit and delete destinations from row actions; the destinations view updates
**Acceptance scenarios:** see ### US-6.4 under Acceptance Criteria

### US-6.5: Signed-in admin or area admin access only

**As a** signed-in admin or area admin user
**I want** destinations visible only to signed-in admin or area admin users, with no area limit
**So that** unauthorized persons cannot tamper with the data

**Priority:** P2
**Independent test:** Unauthorized access to `/destinations` is redirected to `/login`; unauthorized API requests or requests without `admin` or `area_admin` role receive errors; a signed-in user without `admin` or `area_admin` role is redirected to `/home`; an area admin receives every destination
**Acceptance scenarios:** see ### US-6.5 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All destination endpoints MUST require a valid session and `admin` or `area_admin` role (`authorizeRoles('admin', 'area_admin')` middleware).
- **FR-002**: Destinations are global. An `area_admin` MUST be able to read and write every destination. A destination MUST NOT have an `area_id`.
- **FR-003**: `id` is assigned by the database.
- **FR-004**: A destination MUST store `name`, `address_line_1`, `address_line_2`, `city`, `state`, `zip_code`, `is_saved`, and `miles_from_campus`.
- **FR-005**: `name` MUST be trimmed before save. An empty name MUST be rejected.
- **FR-006**: `name` MUST have a max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-007**: `address_line_1` MUST be trimmed before save. An empty address line 1 MUST be rejected.
- **FR-008**: `address_line_1` MUST have a max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-009**: `address_line_2` MUST be trimmed before save. If empty, it is stored as null.
- **FR-010**: `address_line_2` with more than 255 characters MUST be rejected.
- **FR-011**: `city` MUST be trimmed before save. An empty city MUST be rejected.
- **FR-012**: `city` MUST have a max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-013**: `state` MUST be trimmed before save. An empty state MUST be rejected.
- **FR-014**: `state` MUST have a max length of 255 characters after trim. Longer strings MUST be rejected.
- **FR-015**: `zip_code` MUST be trimmed before save. If empty, it is stored as null.
- **FR-016**: `zip_code` with more than 255 characters MUST be rejected.
- **FR-017**: `is_saved` MUST be a boolean `true` or `false`. An empty `is_saved` MUST be rejected. `true` means the destination is available. `false` means it is not available. Both values stay on the admin destinations list.
- **FR-018**: `miles_from_campus` MUST be either null or an integer greater than or equal to 0. A non-integer value MUST be rejected.
- **FR-019**: A destination created in this feature MUST default to available (`is_saved` `true`).
- **FR-020**: When editing a destination, an admin or area admin MUST be able to set `is_saved` to `true` or `false`.

---

## Assumptions

- Destinations use **dialog-based** workflows (no split sidebar / main panel).
- Feature 1 sessions and Feature 3 roles are already available. This feature only checks `admin` and `area_admin`.
- `is_saved` `true` means available. `is_saved` `false` means not available. Choosing a destination from a list is a later feature. This feature only stores the flag.
- A destination created here defaults to `is_saved` `true`. Edit can set either value. Both values stay on the admin list.
- `miles_from_campus` is a number stored on the destination. This feature does not calculate it from a maps API.
- Destination names are not unique.

## Edge Cases

- Empty or whitespace-only name → client block and/or `400`.
- Name longer than 255 characters → `400`.
- Empty or whitespace-only address line 1 → client block and/or `400`.
- Address line 1 longer than 255 characters → `400`.
- Address line 2 longer than 255 characters → `400`.
- Whitespace-only address line 2 → stored as null.
- Empty or whitespace-only city → client block and/or `400`.
- City longer than 255 characters → `400`.
- Empty or whitespace-only state → client block and/or `400`.
- State longer than 255 characters → `400`.
- ZIP code longer than 255 characters → `400`.
- Whitespace-only ZIP code → stored as null.
- Empty `is_saved` → `400`.
- `is_saved` other than `true` or `false` → `400`.
- Empty `miles_from_campus` → stored as null.
- `miles_from_campus` less than 0 → `400`.
- Non-integer `miles_from_campus` → `400`.
- Unauthenticated destinations screen → redirect to `/login`.
- Authenticated destinations screen without `admin` or `area_admin` role → redirect to `/home`.
- Unauthenticated API request → `401`.
- API request without `admin` or `area_admin` role → `403`.
- Area admin reads or writes any destination → allowed. Area mismatch is not a `403`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: A signed-in admin can create, view, edit, and delete destinations on one screen.
- **SC-003**: A signed-in area admin can create, view, edit, and delete every destination on that same screen.
- **SC-004**: `npm test` passes for destinations API and destinations view behavior.

---

## Data Ownership & Isolation

Any signed-in admin or area admin may create, edit, delete, or read every destination. Destinations are not limited to an area admin's area.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/destinations` and `GET /api/destinations/:destinationId` require a Bearer token and `admin` or `area_admin` role. Both roles read every destination. |
| **Write scope** | `PUT` and `DELETE` require a Bearer token and `admin` or `area_admin` role. Both roles may update or delete any destination. |
| **Create scope** | `POST` requires a Bearer token and `admin` or `area_admin` role. Both roles may create a destination. There is no `area_id`. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/destinations` | Yes - Admin, Area Admin | Fetch every destination |
| `GET` | `/api/destinations/:destinationId` | Yes - Admin, Area Admin | Fetch a single destination |
| `POST` | `/api/destinations` | Yes - Admin, Area Admin | Create a destination |
| `PUT` | `/api/destinations/:destinationId` | Yes - Admin, Area Admin | Edit a destination |
| `DELETE` | `/api/destinations/:destinationId` | Yes - Admin, Area Admin | Delete a destination |

**Create destination request body:**

```json
{
  "name": "Pops",
  "address_line_1": "660 OK-66",
  "address_line_2": null,
  "city": "Arcadia",
  "state": "OK",
  "zip_code": "73007",
  "is_saved": true,
  "miles_from_campus": 22
}
```

`PUT /api/destinations/:destinationId` uses the same body. `address_line_2`, `zip_code`, and `miles_from_campus` may be null.

**Destination success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Pops",
  "address_line_1": "660 OK-66",
  "address_line_2": null,
  "city": "Arcadia",
  "state": "OK",
  "zip_code": "73007",
  "is_saved": true,
  "miles_from_campus": 22,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404`.
**Unauthenticated:** `401`.
**Unauthorized** (lacking `admin` or `area_admin` role): `403`.

---

## Screen Requirements

### [View: Destinations] — route name `destinations`

**Single Vue view** (`Destinations.vue`) — no sidebar / main-panel split.

- Heading: **Destination Management**
- Admin and area admin see the same screen and the same full list. There is no area picker.
- Primary action: **+ New Destination** (`oc-cta`) opens a `<v-dialog>` with **Name**, **Address line 1**, **Address line 2** (optional), **City**, **State**, **ZIP code** (optional), **Miles from campus** (optional), and **Official**, plus **Create** / **Cancel**.
    - **Official** is a switch. On create it starts on and submits `is_saved` as `true`.
    - **Miles from campus** submits `miles_from_campus`. An empty value submits null.
    - Empty **Address line 2** and **ZIP code** submit null.
- Display destinations as rows. Each row shows the **name**, **city**, and **state**, plus a chip labeled **Official** when `is_saved` is true and **Unofficial** when `is_saved` is false. Both stay in this list.
- **Edit** icon opens a `<v-dialog>` pre-filled with the current **Name**, **Address line 1**, **Address line 2**, **City**, **State**, **ZIP code**, **Miles from campus**, and **Official**; **Save** / **Cancel**.
    - **Official** can be turned on or off. On submits `is_saved` `true`. Off submits `is_saved` `false`.
- **Delete** icon opens a confirmation `<ConfirmModal>` from `components/common` folder.
- Icon-only row actions use `size="small"` and accessible `aria-label`s (**Edit destination**, **Delete destination**).
- **Empty state:** **"No destinations yet. Create your first destination."** when there are no destinations.
- **Loading state:** skeleton or progress indicator while destinations are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

**Implementation note:** one route/view for destinations; delete dialog is a reusable component in `components/common` folder; create and edit dialogs should be components stored in a dedicated `components/destinations` folder and modeled after existing create and edit dialogs in `components/` folders.

---

## Key Entities

- **Destination**: A physical location a vehicle can drive to from OC's campus. `is_saved` true means it is available. `is_saved` false means it is not available. Both stay on the admin list.

---

## Data Model Requirements

### `destinations` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING | Required; trimmed; max 255 |
| `address_line_1` | STRING | Required; trimmed; max 255 |
| `address_line_2` | STRING | Trimmed; null when empty; max 255 |
| `city` | STRING | Required; trimmed; max 255 |
| `state` | STRING | Required; trimmed; max 255 |
| `zip_code` | STRING | Trimmed; null when empty; max 255 |
| `is_saved` | BOOLEAN | Required; `true` available (default on create); `false` not available |
| `miles_from_campus` | INTEGER | Null allowed; integer greater than or equal to 0 |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

### Associations (in `models/index.js`)

- N/A. A destination has no foreign key in this feature. No other table references `destinations` yet.

---

## Acceptance Criteria (Gherkin)

### US-6.1 — Create destinations

#### Scenario: Admin user creates a destination

- **Given** I am signed in as admin on the destinations view
- **When** I click **+ New Destination**
- **Then** a dialog opens with **Name**, **Address line 1**, **Address line 2**, **City**, **State**, **ZIP code**, **Miles from campus**, and **Official**
- **And** **Official** is on

#### Scenario: Area admin user creates a destination

- **Given** I am signed in as area admin on the destinations view
- **When** I click **+ New Destination**
- **Then** a dialog opens with **Name**, **Address line 1**, **Address line 2**, **City**, **State**, **ZIP code**, **Miles from campus**, and **Official**
- **And** **Official** is on

#### Scenario: Admin user saves an official destination

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with name `Pops`, address line 1 `660 OK-66`, city `Arcadia`, state `OK`, ZIP code `73007`, miles from campus `22`, and **Official** on
- **Then** the API returns `201` with that destination and no `area_id`
- **And** `is_saved` is `true`
- **And** the list shows `Pops`, `Arcadia`, `OK`, and an **Official** chip

#### Scenario: Area admin user saves an official destination

- **Given** I am signed in as area admin on the destinations view
- **When** I submit the create dialog with name `Pops`, address line 1 `660 OK-66`, city `Arcadia`, state `OK`, and **Official** left on
- **Then** the API returns `201` with `is_saved` `true`
- **And** the list shows an **Official** chip

#### Scenario: Admin user saves a destination with empty optional fields

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with name `Pops`, address line 1 `660 OK-66`, city `Arcadia`, state `OK`, **Official** on, and address line 2, ZIP code, and miles from campus left empty
- **Then** the API returns `201` with `address_line_2` null, `zip_code` null, and `miles_from_campus` null

#### Scenario: Admin user requests to create a destination with empty optional fields

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with name `Pops`, address line 1 `660 OK-66`, city `Arcadia`, state `OK`, `is_saved` `true`, and `address_line_2`, `zip_code`, and `miles_from_campus` empty
- **Then** the API returns `201` with `address_line_2` null, `zip_code` null, and `miles_from_campus` null

#### Scenario: Admin user requests to create a destination with whitespace-only optional fields

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `address_line_2` is `" "` and `zip_code` is `" "`
- **Then** the API returns `201` with `address_line_2` null and `zip_code` null

#### Scenario: Admin user requests to create a destination with a name that is trimmed

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `name` is `" Pops "`
- **Then** the API returns `201` with `name` `Pops`

#### Scenario: Admin user creates a destination with a name that already exists

- **Given** I am signed in as admin
- **And** A destination named `Pops` exists
- **When** I request `POST /api/destinations` with name `Pops` and a different address line 1
- **Then** the API returns `201`

#### Scenario: Admin user creates a destination with a missing name

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a destination with a missing address line 1

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog without an address line 1
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a destination with a missing city

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog without a city
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a destination with a missing state

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog without a state
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a destination with a whitespace-only name

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with name ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a destination with a whitespace-only address line 1

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with address line 1 ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a destination with a whitespace-only city

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with city ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a destination with a whitespace-only state

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with state ` `
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user creates a destination with a name longer than 255 characters

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with a name longer than 255 characters
- **Then** validation blocks the request and I see a `Name too long.` message

#### Scenario: Admin user creates a destination with an address line 1 longer than 255 characters

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with an address line 1 longer than 255 characters
- **Then** validation blocks the request and I see an `Address line 1 too long.` message

#### Scenario: Admin user creates a destination with an address line 2 longer than 255 characters

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with an address line 2 longer than 255 characters
- **Then** validation blocks the request and I see an `Address line 2 too long.` message

#### Scenario: Admin user creates a destination with a city longer than 255 characters

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with a city longer than 255 characters
- **Then** validation blocks the request and I see a `City too long.` message

#### Scenario: Admin user creates a destination with a state longer than 255 characters

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with a state longer than 255 characters
- **Then** validation blocks the request and I see a `State too long.` message

#### Scenario: Admin user creates a destination with a ZIP code longer than 255 characters

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with a ZIP code longer than 255 characters
- **Then** validation blocks the request and I see a `ZIP code too long.` message

#### Scenario: Admin user creates a destination with miles from campus less than 0

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with miles from campus `-1`
- **Then** validation blocks the request and I see a `Miles from campus must be a whole number of 0 or more.` message

#### Scenario: Admin user creates a destination with a non-integer miles from campus

- **Given** I am signed in as admin on the destinations view
- **When** I submit the create dialog with miles from campus `12.5`
- **Then** validation blocks the request and I see a `Miles from campus must be a whole number of 0 or more.` message

#### Scenario: Admin user requests to create a destination with a missing name

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `name` is `""`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user requests to create a destination with a missing address line 1

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `address_line_1` is `""`
- **Then** the API returns `400` with `{ message: "Missing address line 1." }`

#### Scenario: Admin user requests to create a destination with a missing city

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `city` is `""`
- **Then** the API returns `400` with `{ message: "Missing city." }`

#### Scenario: Admin user requests to create a destination with a missing state

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `state` is `""`
- **Then** the API returns `400` with `{ message: "Missing state." }`

#### Scenario: Admin user requests to create a destination with a whitespace-only name

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `name` is `" "`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user requests to create a destination with a whitespace-only address line 1

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `address_line_1` is `" "`
- **Then** the API returns `400` with `{ message: "Missing address line 1." }`

#### Scenario: Admin user requests to create a destination with a whitespace-only city

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `city` is `" "`
- **Then** the API returns `400` with `{ message: "Missing city." }`

#### Scenario: Admin user requests to create a destination with a whitespace-only state

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `state` is `" "`
- **Then** the API returns `400` with `{ message: "Missing state." }`

#### Scenario: Admin user requests to create a destination with a name longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `name` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "Name too long." }`

#### Scenario: Admin user requests to create a destination with an address line 1 longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `address_line_1` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "Address line 1 too long." }`

#### Scenario: Admin user requests to create a destination with an address line 2 longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `address_line_2` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "Address line 2 too long." }`

#### Scenario: Admin user requests to create a destination with a city longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `city` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "City too long." }`

#### Scenario: Admin user requests to create a destination with a state longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `state` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "State too long." }`

#### Scenario: Admin user requests to create a destination with a ZIP code longer than 255 characters

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `zip_code` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "ZIP code too long." }`

#### Scenario: Admin user requests to create a destination with a missing is_saved

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `is_saved` is missing
- **Then** the API returns `400` with `{ message: "Missing is_saved." }`

#### Scenario: Admin user requests to create a destination with an is_saved other than true or false

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `is_saved` is `"yes"`
- **Then** the API returns `400` with `{ message: "is_saved must be true or false." }`

#### Scenario: Admin user requests to create a destination with miles from campus less than 0

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `miles_from_campus` is `-1`
- **Then** the API returns `400` with `{ message: "Miles from campus must be a whole number of 0 or more." }`

#### Scenario: Admin user requests to create a destination with a non-integer miles from campus

- **Given** I am signed in as admin
- **When** I request `POST /api/destinations` with a valid body except `miles_from_campus` is `12.5`
- **Then** the API returns `400` with `{ message: "Miles from campus must be a whole number of 0 or more." }`

### US-6.2 — View destinations

#### Scenario: Destinations view lists destinations for admin

- **Given** I am signed in as admin and a destination named `Pops` in `Arcadia`, `OK` exists with `is_saved` `true`
- **When** I open the destinations view
- **Then** the row shows `Pops`, `Arcadia`, `OK`, and an **Official** chip

#### Scenario: Destinations view lists unofficial destinations

- **Given** I am signed in as admin and a destination exists with `is_saved` `false`
- **When** I open the destinations view
- **Then** that row is still listed and shows an **Unofficial** chip

#### Scenario: Destinations view lists every destination for area admin

- **Given** I am signed in as area admin
- **And** Destinations exist that I did not create
- **When** I open the destinations view
- **Then** I see every destination

#### Scenario: Admin user requests the destination list

- **Given** I am signed in as admin
- **And** At least one destination exists
- **When** I request `GET /api/destinations`
- **Then** the API returns `200` with every destination

#### Scenario: Area admin user requests the destination list

- **Given** I am signed in as area admin
- **And** Destinations exist that are not tied to my area
- **When** I request `GET /api/destinations`
- **Then** the API returns `200` with every destination

#### Scenario: Admin user requests one destination

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `GET /api/destinations/1`
- **Then** the API returns `200` with that destination

#### Scenario: Destinations empty state

- **Given** I am signed in as admin and there are no destinations
- **When** I open the destinations view
- **Then** I see **"No destinations yet. Create your first destination."**

### US-6.3 — Manage destination rows

#### Scenario: Destination rows have edit and delete actions

- **Given** I am signed in as admin and at least one destination exists
- **When** I view the destination list
- **Then** each row shows **Edit destination** and **Delete destination** actions

### US-6.4 — Edit and delete destinations

#### Scenario: Admin user opens the destination edit dialog

- **Given** I am signed in as admin and a destination named `Pops` exists
- **When** I choose **Edit destination** on that row
- **Then** a dialog opens pre-filled with its name, address, city, state, ZIP code, miles from campus, and **Official** value

#### Scenario: Admin user edits a destination name

- **Given** I am signed in as admin and a destination named `Pops` exists
- **When** I change the name to `Arcadia Lake` and submit
- **Then** the API returns `200` with the updated destination
- **And** the list shows `Arcadia Lake`

#### Scenario: Admin user makes an unofficial destination official

- **Given** I am signed in as admin and an unofficial destination named `Pops` exists
- **When** I turn **Official** on and submit
- **Then** the API returns `200` with `is_saved` `true`
- **And** the row shows an **Official** chip

#### Scenario: Area admin user makes an unofficial destination official

- **Given** I am signed in as area admin and an unofficial destination named `Pops` exists
- **When** I turn **Official** on and submit
- **Then** the API returns `200` with `is_saved` `true`
- **And** the row shows an **Official** chip

#### Scenario: Admin user turns Official off

- **Given** I am signed in as admin and an official destination named `Pops` exists
- **When** I turn **Official** off and submit
- **Then** the API returns `200` with `is_saved` `false`
- **And** the row stays in the list and shows an **Unofficial** chip

#### Scenario: Admin user edits a destination to have a missing name

- **Given** I am signed in as admin on the destinations view
- **And** I am editing an existing destination
- **When** I submit the edit dialog without a name
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a destination to have a missing address line 1

- **Given** I am signed in as admin on the destinations view
- **And** I am editing an existing destination
- **When** I submit the edit dialog without an address line 1
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a destination to have a missing city

- **Given** I am signed in as admin on the destinations view
- **And** I am editing an existing destination
- **When** I submit the edit dialog without a city
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user edits a destination to have a missing state

- **Given** I am signed in as admin on the destinations view
- **And** I am editing an existing destination
- **When** I submit the edit dialog without a state
- **Then** validation blocks the request and I see a `Required field.` message

#### Scenario: Admin user requests to edit a destination to have a missing name

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `name` is `""`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user requests to edit a destination to have a missing address line 1

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `address_line_1` is `""`
- **Then** the API returns `400` with `{ message: "Missing address line 1." }`

#### Scenario: Admin user requests to edit a destination to have a missing city

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `city` is `""`
- **Then** the API returns `400` with `{ message: "Missing city." }`

#### Scenario: Admin user requests to edit a destination to have a missing state

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `state` is `""`
- **Then** the API returns `400` with `{ message: "Missing state." }`

#### Scenario: Admin user requests to edit a destination to have a whitespace-only name

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `name` is `" "`
- **Then** the API returns `400` with `{ message: "Missing name." }`

#### Scenario: Admin user requests to edit a destination to have a name longer than 255 characters

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `name` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "Name too long." }`

#### Scenario: Admin user requests to edit a destination to have an address line 1 longer than 255 characters

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `address_line_1` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "Address line 1 too long." }`

#### Scenario: Admin user requests to edit a destination to have an address line 2 longer than 255 characters

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `address_line_2` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "Address line 2 too long." }`

#### Scenario: Admin user requests to edit a destination to have a city longer than 255 characters

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `city` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "City too long." }`

#### Scenario: Admin user requests to edit a destination to have a state longer than 255 characters

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `state` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "State too long." }`

#### Scenario: Admin user requests to edit a destination to have a ZIP code longer than 255 characters

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `zip_code` is longer than 255 characters
- **Then** the API returns `400` with `{ message: "ZIP code too long." }`

#### Scenario: Admin user requests to edit a destination to have a missing is_saved

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `is_saved` is missing
- **Then** the API returns `400` with `{ message: "Missing is_saved." }`

#### Scenario: Admin user requests to edit a destination to have an is_saved other than true or false

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `is_saved` is `"yes"`
- **Then** the API returns `400` with `{ message: "is_saved must be true or false." }`

#### Scenario: Admin user requests to edit a destination to have miles from campus less than 0

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `miles_from_campus` is `-1`
- **Then** the API returns `400` with `{ message: "Miles from campus must be a whole number of 0 or more." }`

#### Scenario: Admin user requests to edit a destination to have a non-integer miles from campus

- **Given** I am signed in as admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body except `miles_from_campus` is `12.5`
- **Then** the API returns `400` with `{ message: "Miles from campus must be a whole number of 0 or more." }`

#### Scenario: Admin user deletes a destination

- **Given** I am signed in as admin and a destination named `Pops` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that destination is removed from the list

#### Scenario: Area admin user deletes a destination

- **Given** I am signed in as area admin and a destination named `Pops` exists
- **When** I confirm delete on that row
- **Then** the API returns `200`
- **And** that destination is removed from the list

#### Scenario: Admin user updates a destination that does not exist

- **Given** I am signed in as admin
- **And** A destination with id `999` does not exist
- **When** I request `PUT /api/destinations/999` with a valid body
- **Then** the API returns `404`

#### Scenario: Admin user updates a destination with an invalid destinationId

- **Given** I am signed in as admin
- **When** I request `PUT /api/destinations/abc` with a valid body
- **Then** the API returns `400`

#### Scenario: Admin user deletes a destination that does not exist

- **Given** I am signed in as admin
- **And** A destination with id `999` does not exist
- **When** I request `DELETE /api/destinations/999`
- **Then** the API returns `404`

#### Scenario: Admin user deletes a destination with an invalid destinationId

- **Given** I am signed in as admin
- **When** I request `DELETE /api/destinations/abc`
- **Then** the API returns `400`

#### Scenario: Admin user requests a destination that does not exist

- **Given** I am signed in as admin
- **And** A destination with id `999` does not exist
- **When** I request `GET /api/destinations/999`
- **Then** the API returns `404`

### US-6.5 — Signed-in admin or area admin access only

#### Scenario: Un-signed-in user accesses destinations page

- **Given** I am not signed in
- **When** I navigate to `/destinations` by URL
- **Then** I am redirected to `/login`

#### Scenario: Unauthenticated API request to destinations

- **Given** I have no valid session token
- **When** I request `GET /api/destinations`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to a particular destination

- **Given** I have no valid session token
- **And** A destination with id `1` exists
- **When** I request `GET /api/destinations/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to create a destination

- **Given** I have no valid session token
- **When** I request `POST /api/destinations` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to update a destination

- **Given** I have no valid session token
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Unauthenticated API request to delete a destination

- **Given** I have no valid session token
- **And** A destination with id `1` exists
- **When** I request `DELETE /api/destinations/1`
- **Then** the API returns `401` with `{ message: "Unauthorized! No token provided." }`

#### Scenario: Signed-in user without admin or area admin role accesses destinations page

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **When** I navigate to `/destinations` by URL
- **Then** I am redirected to `/home`

#### Scenario: Signed-in user without admin or area admin role API request to destinations

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **When** I request `GET /api/destinations`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to a particular destination

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **And** A destination with id `1` exists
- **When** I request `GET /api/destinations/1`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to create a destination

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **When** I request `POST /api/destinations` with a valid body
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to update a destination

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Signed-in user without admin or area admin role API request to delete a destination

- **Given** I am signed in
- **And** I do not have role `admin` or `area_admin`
- **And** A destination with id `1` exists
- **When** I request `DELETE /api/destinations/1`
- **Then** the API returns `403` with `{ message: "Admin or area admin role required." }`

#### Scenario: Area admin user requests one destination

- **Given** I am signed in as area admin
- **And** A destination with id `1` exists
- **When** I request `GET /api/destinations/1`
- **Then** the API returns `200` with that destination

#### Scenario: Area admin user updates any destination

- **Given** I am signed in as area admin
- **And** A destination with id `1` exists
- **When** I request `PUT /api/destinations/1` with a valid body
- **Then** the API returns `200`

#### Scenario: Area admin user deletes any destination

- **Given** I am signed in as area admin
- **And** A destination with id `1` exists
- **When** I request `DELETE /api/destinations/1`
- **Then** the API returns `200`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-6.1 | Admin user creates a destination | `frontend/tests/Destinations.test.js` | `Admin user creates a destination` |
| US-6.1 | Area admin user creates a destination | `frontend/tests/Destinations.test.js` | `Area admin user creates a destination` |
| US-6.1 | Admin user saves an official destination | `backend/tests/destinations.test.js` | `Admin user saves an official destination` |
| US-6.1 | Admin user saves an official destination | `frontend/tests/Destinations.test.js` | `Admin user saves an official destination` |
| US-6.1 | Area admin user saves an official destination | `backend/tests/destinations.test.js` | `Area admin user saves an official destination` |
| US-6.1 | Area admin user saves an official destination | `frontend/tests/Destinations.test.js` | `Area admin user saves an official destination` |
| US-6.1 | Admin user saves a destination with empty optional fields | `backend/tests/destinations.test.js` | `Admin user saves a destination with empty optional fields` |
| US-6.1 | Admin user saves a destination with empty optional fields | `frontend/tests/Destinations.test.js` | `Admin user saves a destination with empty optional fields` |
| US-6.1 | Admin user requests to create a destination with empty optional fields | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with empty optional fields` |
| US-6.1 | Admin user requests to create a destination with whitespace-only optional fields | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with whitespace-only optional fields` |
| US-6.1 | Admin user requests to create a destination with a name that is trimmed | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a name that is trimmed` |
| US-6.1 | Admin user creates a destination with a name that already exists | `backend/tests/destinations.test.js` | `Admin user creates a destination with a name that already exists` |
| US-6.1 | Admin user creates a destination with a missing name | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a missing name` |
| US-6.1 | Admin user creates a destination with a missing address line 1 | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a missing address line 1` |
| US-6.1 | Admin user creates a destination with a missing city | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a missing city` |
| US-6.1 | Admin user creates a destination with a missing state | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a missing state` |
| US-6.1 | Admin user creates a destination with a whitespace-only name | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a whitespace-only name` |
| US-6.1 | Admin user creates a destination with a whitespace-only address line 1 | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a whitespace-only address line 1` |
| US-6.1 | Admin user creates a destination with a whitespace-only city | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a whitespace-only city` |
| US-6.1 | Admin user creates a destination with a whitespace-only state | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a whitespace-only state` |
| US-6.1 | Admin user creates a destination with a name longer than 255 characters | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a name longer than 255 characters` |
| US-6.1 | Admin user creates a destination with an address line 1 longer than 255 characters | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with an address line 1 longer than 255 characters` |
| US-6.1 | Admin user creates a destination with an address line 2 longer than 255 characters | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with an address line 2 longer than 255 characters` |
| US-6.1 | Admin user creates a destination with a city longer than 255 characters | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a city longer than 255 characters` |
| US-6.1 | Admin user creates a destination with a state longer than 255 characters | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a state longer than 255 characters` |
| US-6.1 | Admin user creates a destination with a ZIP code longer than 255 characters | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a ZIP code longer than 255 characters` |
| US-6.1 | Admin user creates a destination with miles from campus less than 0 | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with miles from campus less than 0` |
| US-6.1 | Admin user creates a destination with a non-integer miles from campus | `frontend/tests/Destinations.test.js` | `Admin user creates a destination with a non-integer miles from campus` |
| US-6.1 | Admin user requests to create a destination with a missing name | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a missing name` |
| US-6.1 | Admin user requests to create a destination with a missing address line 1 | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a missing address line 1` |
| US-6.1 | Admin user requests to create a destination with a missing city | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a missing city` |
| US-6.1 | Admin user requests to create a destination with a missing state | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a missing state` |
| US-6.1 | Admin user requests to create a destination with a whitespace-only name | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a whitespace-only name` |
| US-6.1 | Admin user requests to create a destination with a whitespace-only address line 1 | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a whitespace-only address line 1` |
| US-6.1 | Admin user requests to create a destination with a whitespace-only city | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a whitespace-only city` |
| US-6.1 | Admin user requests to create a destination with a whitespace-only state | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a whitespace-only state` |
| US-6.1 | Admin user requests to create a destination with a name longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a name longer than 255 characters` |
| US-6.1 | Admin user requests to create a destination with an address line 1 longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with an address line 1 longer than 255 characters` |
| US-6.1 | Admin user requests to create a destination with an address line 2 longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with an address line 2 longer than 255 characters` |
| US-6.1 | Admin user requests to create a destination with a city longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a city longer than 255 characters` |
| US-6.1 | Admin user requests to create a destination with a state longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a state longer than 255 characters` |
| US-6.1 | Admin user requests to create a destination with a ZIP code longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a ZIP code longer than 255 characters` |
| US-6.1 | Admin user requests to create a destination with a missing is_saved | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a missing is_saved` |
| US-6.1 | Admin user requests to create a destination with an is_saved other than true or false | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with an is_saved other than true or false` |
| US-6.1 | Admin user requests to create a destination with miles from campus less than 0 | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with miles from campus less than 0` |
| US-6.1 | Admin user requests to create a destination with a non-integer miles from campus | `backend/tests/destinations.test.js` | `Admin user requests to create a destination with a non-integer miles from campus` |
| US-6.2 | Destinations view lists destinations for admin | `frontend/tests/Destinations.test.js` | `Destinations view lists destinations for admin` |
| US-6.2 | Destinations view lists unofficial destinations | `frontend/tests/Destinations.test.js` | `Destinations view lists unofficial destinations` |
| US-6.2 | Destinations view lists every destination for area admin | `frontend/tests/Destinations.test.js` | `Destinations view lists every destination for area admin` |
| US-6.2 | Admin user requests the destination list | `backend/tests/destinations.test.js` | `Admin user requests the destination list` |
| US-6.2 | Area admin user requests the destination list | `backend/tests/destinations.test.js` | `Area admin user requests the destination list` |
| US-6.2 | Admin user requests one destination | `backend/tests/destinations.test.js` | `Admin user requests one destination` |
| US-6.2 | Destinations empty state | `frontend/tests/Destinations.test.js` | `Destinations empty state` |
| US-6.3 | Destination rows have edit and delete actions | `frontend/tests/Destinations.test.js` | `Destination rows have edit and delete actions` |
| US-6.4 | Admin user opens the destination edit dialog | `frontend/tests/Destinations.test.js` | `Admin user opens the destination edit dialog` |
| US-6.4 | Admin user edits a destination name | `backend/tests/destinations.test.js` | `Admin user edits a destination name` |
| US-6.4 | Admin user edits a destination name | `frontend/tests/Destinations.test.js` | `Admin user edits a destination name` |
| US-6.4 | Admin user makes an unofficial destination official | `backend/tests/destinations.test.js` | `Admin user makes an unofficial destination official` |
| US-6.4 | Admin user makes an unofficial destination official | `frontend/tests/Destinations.test.js` | `Admin user makes an unofficial destination official` |
| US-6.4 | Area admin user makes an unofficial destination official | `backend/tests/destinations.test.js` | `Area admin user makes an unofficial destination official` |
| US-6.4 | Area admin user makes an unofficial destination official | `frontend/tests/Destinations.test.js` | `Area admin user makes an unofficial destination official` |
| US-6.4 | Admin user turns Official off | `backend/tests/destinations.test.js` | `Admin user turns Official off` |
| US-6.4 | Admin user turns Official off | `frontend/tests/Destinations.test.js` | `Admin user turns Official off` |
| US-6.4 | Admin user edits a destination to have a missing name | `frontend/tests/Destinations.test.js` | `Admin user edits a destination to have a missing name` |
| US-6.4 | Admin user edits a destination to have a missing address line 1 | `frontend/tests/Destinations.test.js` | `Admin user edits a destination to have a missing address line 1` |
| US-6.4 | Admin user edits a destination to have a missing city | `frontend/tests/Destinations.test.js` | `Admin user edits a destination to have a missing city` |
| US-6.4 | Admin user edits a destination to have a missing state | `frontend/tests/Destinations.test.js` | `Admin user edits a destination to have a missing state` |
| US-6.4 | Admin user requests to edit a destination to have a missing name | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a missing name` |
| US-6.4 | Admin user requests to edit a destination to have a missing address line 1 | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a missing address line 1` |
| US-6.4 | Admin user requests to edit a destination to have a missing city | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a missing city` |
| US-6.4 | Admin user requests to edit a destination to have a missing state | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a missing state` |
| US-6.4 | Admin user requests to edit a destination to have a whitespace-only name | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a whitespace-only name` |
| US-6.4 | Admin user requests to edit a destination to have a name longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a name longer than 255 characters` |
| US-6.4 | Admin user requests to edit a destination to have an address line 1 longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have an address line 1 longer than 255 characters` |
| US-6.4 | Admin user requests to edit a destination to have an address line 2 longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have an address line 2 longer than 255 characters` |
| US-6.4 | Admin user requests to edit a destination to have a city longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a city longer than 255 characters` |
| US-6.4 | Admin user requests to edit a destination to have a state longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a state longer than 255 characters` |
| US-6.4 | Admin user requests to edit a destination to have a ZIP code longer than 255 characters | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a ZIP code longer than 255 characters` |
| US-6.4 | Admin user requests to edit a destination to have a missing is_saved | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a missing is_saved` |
| US-6.4 | Admin user requests to edit a destination to have an is_saved other than true or false | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have an is_saved other than true or false` |
| US-6.4 | Admin user requests to edit a destination to have miles from campus less than 0 | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have miles from campus less than 0` |
| US-6.4 | Admin user requests to edit a destination to have a non-integer miles from campus | `backend/tests/destinations.test.js` | `Admin user requests to edit a destination to have a non-integer miles from campus` |
| US-6.4 | Admin user deletes a destination | `backend/tests/destinations.test.js` | `Admin user deletes a destination` |
| US-6.4 | Admin user deletes a destination | `frontend/tests/Destinations.test.js` | `Admin user deletes a destination` |
| US-6.4 | Area admin user deletes a destination | `backend/tests/destinations.test.js` | `Area admin user deletes a destination` |
| US-6.4 | Area admin user deletes a destination | `frontend/tests/Destinations.test.js` | `Area admin user deletes a destination` |
| US-6.4 | Admin user updates a destination that does not exist | `backend/tests/destinations.test.js` | `Admin user updates a destination that does not exist` |
| US-6.4 | Admin user updates a destination with an invalid destinationId | `backend/tests/destinations.test.js` | `Admin user updates a destination with an invalid destinationId` |
| US-6.4 | Admin user deletes a destination that does not exist | `backend/tests/destinations.test.js` | `Admin user deletes a destination that does not exist` |
| US-6.4 | Admin user deletes a destination with an invalid destinationId | `backend/tests/destinations.test.js` | `Admin user deletes a destination with an invalid destinationId` |
| US-6.4 | Admin user requests a destination that does not exist | `backend/tests/destinations.test.js` | `Admin user requests a destination that does not exist` |
| US-6.5 | Un-signed-in user accesses destinations page | `frontend/tests/Destinations.test.js` | `Un-signed-in user accesses destinations page` |
| US-6.5 | Unauthenticated API request to destinations | `backend/tests/destinations.test.js` | `Unauthenticated API request to destinations` |
| US-6.5 | Unauthenticated API request to a particular destination | `backend/tests/destinations.test.js` | `Unauthenticated API request to a particular destination` |
| US-6.5 | Unauthenticated API request to create a destination | `backend/tests/destinations.test.js` | `Unauthenticated API request to create a destination` |
| US-6.5 | Unauthenticated API request to update a destination | `backend/tests/destinations.test.js` | `Unauthenticated API request to update a destination` |
| US-6.5 | Unauthenticated API request to delete a destination | `backend/tests/destinations.test.js` | `Unauthenticated API request to delete a destination` |
| US-6.5 | Signed-in user without admin or area admin role accesses destinations page | `frontend/tests/Destinations.test.js` | `Signed-in user without admin or area admin role accesses destinations page` |
| US-6.5 | Signed-in user without admin or area admin role API request to destinations | `backend/tests/destinations.test.js` | `Signed-in user without admin or area admin role API request to destinations` |
| US-6.5 | Signed-in user without admin or area admin role API request to a particular destination | `backend/tests/destinations.test.js` | `Signed-in user without admin or area admin role API request to a particular destination` |
| US-6.5 | Signed-in user without admin or area admin role API request to create a destination | `backend/tests/destinations.test.js` | `Signed-in user without admin or area admin role API request to create a destination` |
| US-6.5 | Signed-in user without admin or area admin role API request to update a destination | `backend/tests/destinations.test.js` | `Signed-in user without admin or area admin role API request to update a destination` |
| US-6.5 | Signed-in user without admin or area admin role API request to delete a destination | `backend/tests/destinations.test.js` | `Signed-in user without admin or area admin role API request to delete a destination` |
| US-6.5 | Area admin user requests one destination | `backend/tests/destinations.test.js` | `Area admin user requests one destination` |
| US-6.5 | Area admin user updates any destination | `backend/tests/destinations.test.js` | `Area admin user updates any destination` |
| US-6.5 | Area admin user deletes any destination | `backend/tests/destinations.test.js` | `Area admin user deletes any destination` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 6 from @features/feature-6-destinations.md on branch `feature/6-destinations`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-00N** satisfied)
- [ ] **Success Criteria (SC-00N)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Selecting a destination. A later feature shows available destinations (`is_saved` `true`) and hides destinations that are not available (`is_saved` `false`).

---

## Delivered to later features

- `is_saved` is stored on every destination. `true` means available. `false` means not available.
- The admin list shows both values and can change either one.
