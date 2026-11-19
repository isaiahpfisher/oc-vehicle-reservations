# Feature: Area Logos

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

### US-17.2: Edit area logo

**As a** signed in admin user
**I want to** edit what image is stored as the area logo
**So that** I can keep logos up to date

**Priority:** P1
**Independent test:** Upload a new image as area logo; it is stored in Supabase and the link to the Supabase image is stored in the database. The previous image upload is deleted.
**Acceptance scenarios:** see ### US-17.2 under Acceptance Criteria

### US-17.3: Delete area with logo

**As a** signed in admin user
**I want to** delete the area logo when I delete an area
**So that** I do not think I have deleted something and it didn't happen

**Priority:** P1
**Independent test:** Delete an area with a logo; the Supabase logo is also deleted 
**Acceptance scenarios:** see ### US-17.3 under Acceptance Criteria

## Requirements

### Functional Requirements

- **FR-001**: `logo` behavior stays the same as in Feature 2 for what values it can or cannot hold.
- **FR-002**: `logo` holds the public https URL of the image uploaded to Supabase.

## Assumptions

- Updating an area logo removes the previous area logo in Supabase.
- Deleting an area logo removes the logo in Supabase.
- Deleting an area removes the folder with that area id and its area logo in Supabase.
- Only .png, .jpeg/.jpg, and .webp images allowed.
- Max file size 2 MB

## Edge Cases

- File upload unsuccessful → `500` and `{ "message": "Failed to upload logo." }` The row is saved without changing the logo.
- File type other than .png, .jpeg, and .webp → `400` and `{ "message": "Unsupported file type." }`
- File size over 2 MB → `400` and `{ "message": "File must be under 2 MB." }`

## Success Criteria

- **SC-001**: Every Gherkin scenario in this feature has at least one automated test before merge.
- **SC-002**: Signed in admin user can upload and edit an area logo.
- **SC-003**: `npm test` passes for area logo API and view behavior.
## Data Ownership & Isolation

Unchanged from Feature 2. Only admins can handle area logos.

## Key Entities

- **Area**: The area that the logo is an attribute of.

## API Requirements

Area methods are the same as Feature 2 unless stated otherwise. The request is multipart/form-data with the area name and logo file (POST and PUT). The area is stored in the database without the logo. Then the backend gets the id from the response and stores the logo in Supabase under that id. The backend updates the database entry for that id to have the logo URL of the logo in Supabase. This response is sent back to the user.

New sample area requests:
**Create area request body:**

```
Content-Type: multipart/form-data

name: Athletics
logo: example.png
```

**Area success response** (`200` / `201`):

```json
{
  "id": 1,
  "name": "Athletics",
  "logo": "https://vehicle-registration.supabase.co/storage/v1/object/public/area-logos/prod/1/example.png",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404` (do not use `403`).

## Screen Requirements

`Areas.vue` and `AreaFormModal.vue` are changed to match the UI of `Service Types`. Create opens the modal. Edit edits the fields inline. The list is a table. 

### [View: Areas page] 

Implementation notes:
- For Area Logo, the rendered logo is the first cell in the row. The filename and the upload and remove icons stay in the Logo column. Those icons keep the same position whether or not that row has a logo.

### [View: AreaFormModal ] 

Implementation notes:
- For Area Logo, there is a button with appropriate coloration by Logo to upload a file. This button changes to Remove File if a file is uploaded. The file uploaded is depicted as the filename.

## Data Model Requirements

No updated data model.

## Supabase Requirements

- The bucket is public. The browser never receives the Supabase key.
- Bucket name: `area-logos`
- Path: `{AREA_LOGO_PREFIX}/{areaId}/{filename}`
- `AREA_LOGO_PREFIX` is an environment variable. Each developer sets their own name. Production sets `prod`. The prefix is part of the public logo URL.
- Removing a logo or deleting an area removes that area's files only. The prefix folder stays. `reset-local-data` stops the backend, deletes that folder and recreates it, and drops and recreates the databases named by `DB_NAME` in `backend/.env` and `backend/.env.test`.
- The server reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and AREA_LOGO_PREFIX, which are off the frontend and out of Git.

---

## Acceptance Criteria (Gherkin)

### US-17.1: Upload area logo

#### Scenario: User sees upload button

- **Given** I am signed in as admin and on the areas page
- **When** I open the new area modal
- **Then** I see a button to upload the logo
- **And** Clicking the button opens a way to select a file from my computer

#### Scenario: User uploads logo 

- **Given** I am signed in as admin and on the new area modal
- **When** I upload a file and click **Save**
- **Then** The logo is saved in Supabase and the database
- **And** I see the logo rendered for that area on the list page

---

### US-17.2: Edit area logo

#### Scenario: User sees upload and remove icons

- **Given** I am signed in as admin and on the areas page
- **And** Areas exist 
- **When** I click the edit button on a row
- **Then** On that row I see an icon to upload a logo and an icon to remove the logo
- **And** The remove logo is grayed out if there is no logo

#### Scenario: User uploads logo on edit

- **Given** I am signed in as admin and editing an area row
- **When** I click the upload icon, upload a file, and click **Save**
- **Then** The logo is saved in Supabase and the database
- **And** I see the logo rendered for that area on the list page
- **And** There is only one logo in Supabase for that area id

#### Scenario: User removes logo 

- **Given** I am signed in as admin and editing an area row
- **When** I click the delete logo icon and click **Save**
- **Then** The logo is removed in Supabase and the database
- **And** I see no logo rendered for that area on the list page
- **And** There is no logo in Supabase for that area id

---

### US-17.3: Delete area with logo

#### Scenario: User deletes an area with a logo

- **Given** I am signed in as admin and on the areas page
- **And** And area with id `1` and a logo exists
- **When** I click the delete button on that row
- **Then** The area is deleted
- **And** The area folder and the area logo in Supabase are deleted

--- 

## Test Coverage Map

Each scenario above must map to at least one automated test. `it("…")` titles match the Gherkin scenario names exactly.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-17.1 | User sees upload button | `frontend/tests/Areas.test.js` | `User sees upload button` |
| US-17.1 | User uploads logo | `backend/tests/areas.test.js` | `User uploads logo` |
| US-17.1 | User uploads logo | `frontend/tests/Areas.test.js` | `User uploads logo` |
| US-17.2 | User sees upload and remove icons | `frontend/tests/Areas.test.js` | `User sees upload and remove icons` |
| US-17.2 | User uploads logo on edit | `backend/tests/areas.test.js` | `User uploads logo on edit` |
| US-17.2 | User uploads logo on edit | `frontend/tests/Areas.test.js` | `User uploads logo on edit` |
| US-17.2 | User removes logo | `backend/tests/areas.test.js` | `User removes logo` |
| US-17.2 | User removes logo | `frontend/tests/Areas.test.js` | `User removes logo` |
| US-17.3 | User deletes an area with a logo | `backend/tests/areas.test.js` | `User deletes an area with a logo` |
| US-17.3 | User deletes an area with a logo | `frontend/tests/Areas.test.js` | `User deletes an area with a logo` |

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 17 from @features/feature-17-area-logo.md on branch `feature/17-area-logo`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-001**–**FR-002** satisfied)
- [x] **Success Criteria (SC-001**–**SC-003)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

## Out of Scope

- Changing UI for other parts of the app.

## Delivered to later features

- A link to Supabase to get a valid logo as part of an area.
