# Feature: Notes

**Feature ID:** 14
**Branch pattern:** `feature/14-notes`
**Status:** Draft
**Created:** 2026-11-04
**Input:** Users can add notes to vehicle requests, issue reports, and maintenance needs. Notes function like comments.
**Depends on:** Feature 8, 10, 11 (Vehicle Requests, Issue Reports, Maintenance Needs)

---

## User Stories

### US-14.1: Add notes to entities

**As a** signed-in user
**I want to** add notes/comments to vehicle requests, issue reports, and maintenance needs that I have access to
**So that** I can add additional context or have short discussions about the request/report/need.

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can submit notes.
**Acceptance scenarios:** see ### US-14.1 under Acceptance Criteria

### US-14.2: View notes on entities

**As a** signed-in user
**I want to** see notes that are attached to vehicle requests, issue reports, and/or maintenance needs
**So that** I can see any additional info that people have attached to the request.

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can see any existing notes.
**Acceptance scenarios:** see ### US-14.2 under Acceptance Criteria

### US-14.3: Toggle visibility

**As a** signed-in admin or area_admin or maintenance user
**I want to** be able to submit notes that are only visible to other admin/maintenance users (not to the person making the request)
**So that** I can have private conversation with other admin/maintenance users

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can see notes that only admin/maintenance users can see.
**Acceptance scenarios:** see ### US-14.3 under Acceptance Criteria

### US-14.4: Admin can delete notes

**As a** signed-in admin user (not area_admin or maintenance)
**I want to** be able to delete notes
**So that** I can do some clean up if need be.

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can delete existing comments.
**Acceptance scenarios:** see ### US-14.4 under Acceptance Criteria

### US-14.5: Users can delete their own notes if no one has responded

**As a** signed-in user
**I want to** be able to delete my own notes if no one has responded yet
**So that** I can fix typos and other mistakes

**Priority:** P1
**Independent test:** Open a vehicle request, issue report, and/or maintenance need. Verify that you can delete your own comments if they're the newest comments.
**Acceptance scenarios:** see ### US-14.5 under Acceptance Criteria

### US-14.6: Issue report page

**As a** signed-in user
**I want to** report a vehicle problem on a clear, guided form, and later open that report on its own page to see its details and notes (and, if I manage it, edit or delete it there)
**So that** reporting is quick for requesters, triage is easy for admins, and every report has a home for its notes

**Priority:** P2
**Independent test:** As a requester, open **Report an issue** from one of your trips, submit a report, and land on its page. As an admin, open that page, change its status and assignee, and save.
**Acceptance scenarios:** see ### US-14.6 under Acceptance Criteria

### US-14.7: Create a maintenance need from an issue report

**As a** signed-in admin or area admin who manages an issue report
**I want to** start a maintenance need from the report, with its details already filled in
**So that** I can schedule the repair without retyping the report

**Priority:** P2
**Independent test:** Open a maintenance issue report, click **Create maintenance need**, adjust the pre-filled form, and create it. The report then links to the new need.
**Acceptance scenarios:** see ### US-14.7 under Acceptance Criteria

### US-14.8: Find issue reports

**As a** signed-in user who can see issue reports
**I want to** search, filter, and sort the issue reports table, and see only the columns that matter
**So that** I can find a report quickly without scrolling sideways

**Priority:** P2
**Independent test:** On `/issue-reports`, search by a vehicle number or person, filter by status and type, and sort by a column. The table fits without horizontal scrolling.
**Acceptance scenarios:** see ### US-14.8 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All note endpoints must enforce access. Admins can view everything, area_admins and maintenance users can view notes for entities they have access to, regular users can only view notes on their own requests.
- **FR-002**: The note content should be trimmed and sanitized before save. An empty note should be rejected.
- **FR-003**: A note that is marked as **not visible** should be hidden from regular users.
- **FR-004**: Users can only delete a note if no one else has responded since the note was created. Admins can delete any notes.
- **FR-005**: Note content must be sanitized before being saved or shown to users.

---

## Assumptions

- The implementation will re-use the same logic for vehicle requests, issue reports, and maintenance needs. Just leave the FK blank if the note isn't for that type.
- "Can read the parent" follows each parent's feature exactly: vehicle requests (Feature 8) — the requester or an admin / area admin of its area; issue reports (Feature 10) — the author or an admin / area admin of the vehicle's area; maintenance needs (Feature 11) — admins and maintenance users, or an area admin of the vehicle's area. Standard users can't read maintenance needs, so they can't see or post notes on them.
- "Responded" (FR-004, US-14.5) means a later note by **anyone else** on the same parent, hidden notes included. The author's own follow-up notes don't block deleting an earlier one.
- Sanitizing (FR-002, FR-005) removes tag-like markup and control characters before save; the UI renders note content as plain text, never HTML.
- Issue reports get their own page (US-14.6), and one form (`IssueReportForm.vue`) creates, edits, and shows them. Who may edit follows Feature 10 unchanged (FR-014): admins and area admins of the vehicle's area edit and delete; the author only reads. Maintenance users get no new access.
- Requesters can't list vehicles (`GET /api/vehicles` is admin / area admin / maintenance), so the form offers them the vehicles on their own trips (`GET /api/me/requests`). Managers also see the trips they manage (`GET /api/requests`). Cancelled and denied trips aren't offered.
- Requesters never see or set status or assignee: their reports are created `pending` and unassigned, and they see both as read-only text on the report page.
- An assignee must be an admin, an area admin of the report's vehicle area, or a maintenance user. The form lists only those people (`GET /api/issue-reports/assignees?vehicleId=`), and the API enforces it on create and update.
- Changes to earlier features for US-14.6 (their specs stay as written):
  - Feature 10: the list's create and edit dialogs are replaced by the issue report page (`/issue-reports/new` and `/issue-reports/:issueReportId`). **+ New Issue Report** opens the page; a manager's **Edit issue report** row icon and everyone else's **View issue report** icon open the report. The row delete stays.
  - Feature 10: status is a set of three chips that always has one chosen (it starts **Pending**), so "missing status" can't happen in the UI. Validation messages are shown next to each field instead of one **Required field.** alert.
  - Feature 10: responses add `areaId` to `vehicle`. New endpoint `GET /api/issue-reports/assignees?vehicleId=` (admin or area admin). `POST`/`PUT` with an assignee who isn't eligible → `400` `{ "message": "Assignee must be an admin, an area admin for this vehicle, or a maintenance user." }`.
  - Feature 11: the `/issue-reports/:id` placeholder redirect is replaced by the page, so **View issue report** on a maintenance need opens it.
  - Feature 11 (US-14.7): **Create maintenance need** moves from the issue reports list (which created the need immediately) to the issue report page, where it opens the maintenance need form filled in from the report. On create with `issueReportId`, fields the body sends are kept and only missing fields are copied from the report (previously the body was ignored); the report's assignee is copied only if they are a maintenance user. The option still shows only for `maintenance` reports with no linked need; a linked need shows **View maintenance need** instead.
  - Feature 10 (US-14.7): a fourth status, `moved_to_maintenance` (**Moved to maintenance**), closes a report because its work moved to a maintenance need. It acts like `resolved`: `resolvedAt` is required with it (labelled **Moved on**, defaulting to today) and cleared when the report reopens. Creating a maintenance need from a report (`POST /api/maintenance-needs` with `issueReportId`) sets that report to `moved_to_maintenance` with today's date, in the same transaction as the need; the form says so before **Create**, and the report page confirms it afterwards. Managers can also set it by hand. Seed data marks reports that became needs this way.
  - Feature 10 (US-14.8): the list shows **Issue** (type icon, description link, type and reporter underneath), **Vehicle**, **Status** (chip), **Reported** (date), and actions. Vehicle request, assignee, and resolved date move to the report page.
  - Feature 8: a request with assigned vehicles shows **Report an issue** on its Vehicles card, opening the form with that trip filled in.

## Edge Cases

- Empty or whitespace-only note content → client block and/or `400`.
- Unauthenticated API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in users can create and see notes on all requests, reports, and needs that they have access to.
- **SC-003**: `npm test` passes for note API and note view behavior.

---

## Data Ownership & Isolation

A note belongs to exactly one parent: a vehicle request, an issue report, or a maintenance need. Who can read or add notes depends on who can read the parent, as set by that parent's feature (Features 8, 10, 11). Hidden notes (`isVisible: false`) are only shown to `admin`, `area_admin`, and `maintenance` users who can read the parent.

| Rule              | Requirement                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parent access** | Every note endpoint requires a Bearer token. The caller must be able to read the parent. Admins can read every parent. Area admins and maintenance users can read the parents their role allows. Other users can read only parents they created. Otherwise `403`.                                                                                                                               |
| **Read scope**    | The parent list endpoints (`GET /api/requests/:requestId/notes`, `GET /api/issue-reports/:issueReportId/notes`, `GET /api/maintenance-needs/:maintenanceNeedId/notes`) and `GET /api/notes/:noteId` return notes on parents the caller can read. Users without `admin`, `area_admin`, or `maintenance` never receive hidden notes. A hidden note requested by id returns `404` for those users. |
| **Create scope**  | `POST /api/notes` is open to any user who can read the parent. `authorId` is always the current user. Only `admin`, `area_admin`, or `maintenance` may set `isVisible: false`. Anyone else gets `403`.                                                                                                                                                                                          |
| **Delete scope**  | `admin` may delete any note. Any other user may delete only their own note, and only if no later note by someone else on the same parent exists. Another user's note → `403`. A note that already has a reply gives `400`.                                                                                                                                                                      |
| **No edit**       | Notes cannot be edited. To fix a mistake, delete the note (see US-14.5) and post it again.                                                                                                                                                                                                                                                                                                      |

---

## API Requirements

| Method   | Endpoint                                          | Auth                                                 | Purpose                               |
| -------- | ------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- |
| `GET`    | `/api/requests/:requestId/notes`                  | Yes - can read that vehicle request                  | Fetch the notes on a vehicle request  |
| `GET`    | `/api/issue-reports/:issueReportId/notes`         | Yes - can read that issue report                     | Fetch the notes on an issue report    |
| `GET`    | `/api/maintenance-needs/:maintenanceNeedId/notes` | Yes - can read that maintenance need                 | Fetch the notes on a maintenance need |
| `GET`    | `/api/notes/:noteId`                              | Yes - can read the note's parent (and the note)      | Fetch a single note                   |
| `POST`   | `/api/notes`                                      | Yes - can read the parent                            | Create a note                         |
| `DELETE` | `/api/notes/:noteId`                              | Yes - admin, or the author before anyone has replied | Delete a note                         |

- A parent id that is not a valid integer → `400` (for example `{ "message": "Invalid request id." }`). A parent that does not exist → `404`.
- All three parent list endpoints share one controller handler. Each passes the matching foreign key (`vehicleRequestId`, `issueReportId`, or `maintenanceNeedId`).
- Lists are ordered by `createdAt`, oldest first.

**Create note request body:**

```json
{
  "vehicleRequestId": 12,
  "content": "Can we pick up the van at 7am instead?",
  "isVisible": true,
  "includeInEmail": false
}
```

- The body must have exactly one of `vehicleRequestId`, `issueReportId`, or `maintenanceNeedId`. None or more than one → `400`. If the parent does not exist → `404`.
- `content` is required. It is trimmed and sanitized before save (FR-002, FR-005). Empty or whitespace-only content → `400`.
- `isVisible` is optional and defaults to `true`. `includeInEmail` is optional and defaults to `false`. `includeInEmail` is out of scope for now.
- Any `authorId` in the body is ignored.

**Note success response** (`200` / `201`):

```json
{
  "id": 1,
  "vehicleRequestId": 12,
  "issueReportId": null,
  "maintenanceNeedId": null,
  "authorId": 4,
  "author": { "id": 4, "firstName": "Jane", "lastName": "Doe" },
  "content": "Can we pick up the van at 7am instead?",
  "isVisible": true,
  "includeInEmail": false,
  "createdAt": "2026-11-04T12:00:00.000Z",
  "updatedAt": "2026-11-04T12:00:00.000Z"
}
```

Each parent list endpoint returns an array of this shape. `DELETE` returns `204` with no body.

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Bad id:** `400` `{ "message": "Invalid note id." }` (or the matching parent id message).
**Not found:** `404` `{ "message": "Note with id=${id} not found." }`. This includes hidden notes requested by users who cannot see them.
**Unauthenticated:** `401` `{ "message": "Unauthorized! No token provided." }`.
**Forbidden:** `403`. This covers a parent the caller cannot read, a user without `admin`/`area_admin`/`maintenance` setting `isVisible: false`, and deleting another user's note without the `admin` role.
**Already replied:** `400` `{ "message": "Notes can only be deleted before someone replies." }`.

---

## Screen Requirements

US-14.6 adds one new screen, the issue report page (below). The following screens should receive a new notes section:

- Vehicle Request
- Issue Report
- Maintenance Need

The UI should look a lot like a standard comment section. Depending on the page in question, this could be a new section at the bottom, or a side panel on the right side of the screen. It should include a textarea to draft a note at the bottom, then show notes like a text thread with avatars and timestamps. If the active user is an admin, area_admin, or maintenance user, then they can toggle `isVisible` before saving new notes. Ignore `includeInEmail` for now. That will be used by a later feature.

### Notes thread (`components/notes/NotesThread.vue`)

- **Two channels for staff, kept apart.** On a vehicle request or issue report, staff (admin, area admin, maintenance) see two tabs: **Everyone** (`isVisible: true`, the notes the requester or reporter reads) and **Staff only** (`isVisible: false`), each with its count. Each tab has its own thread, composer, and draft. Staff choose a note's visibility by the tab they post in, not by a toggle, so a staff note can't land in the shared thread by a missed switch. Each channel says who reads it (**Shared with the reporter.** / **Hidden from the reporter.** …), and the composer repeats it under the box (**The reporter will see this.** / **Only staff will see this.**). The post button names the channel (**Post note** / **Post staff note**). The Staff only channel uses the `staff` amber colour throughout (tab, panel, button), and every staff note carries a **Staff only** label.
- **Everyone else** sees one thread and no tabs, with nothing hinting that staff notes exist. On a **maintenance need** every reader is staff, so there is one thread for everyone (hidden notes included, unlabelled) and every note posts as visible.
- **Thread.** Oldest first, newest just above the composer. Other people's notes are on the left with an initials avatar, name, and a grey bubble. Your own are on the right as **You**, in a solid maroon bubble (solid amber in Staff only) without an avatar. Bubbles take up to 85% of the width. Under each bubble: a friendly time (**Today at 2:15 PM**, **Yesterday at …**, the weekday this week, else the date; the full date and time on hover) and, when allowed (FR-004), **Delete**.
- **Composer.** **Write a note** text box (grows with the text) with **Post note**, disabled while empty. Ctrl+Enter (⌘+Enter on a Mac) posts; Enter adds a line. Drafts are kept per channel in the browser tab's session storage, so leaving the page or reloading doesn't lose them. A failed post keeps the text and shows the error under the box. After posting, the new note briefly highlights, a screen reader hears **Note posted.**, and focus stays in the box.
- **States.** Loading shows a skeleton; a failed load shows the error with **Try again** (no composer); an empty channel says what it's for (**No notes yet.** / **No staff notes yet.**).

### [View: Issue Report] — routes `issueReportCreate` (`/issue-reports/new`) and `issueReport` (`/issue-reports/:issueReportId`) (US-14.6)

One page and one form (`components/issueReports/IssueReportForm.vue`) for creating, editing, and viewing. `PageShell` (max width 800, centered) with stacked `SectionCard`s and the notes last.

- **Header.** Create: **Report an issue**, subtitle explaining that staff will follow up in the notes. Existing: `<Type> · <vehicle universityId>`, subtitle `Reported by <author> on <date>`, a status chip (icon + label), and for managers a **More actions** menu (⋮) holding **Delete issue report** (kept away from Save). Breadcrumbs **Issue Reports** › title.
- **Vehicle card.** **Trip (optional)** and **Vehicle**, both searchable autocompletes. Trips search by purpose, dates, area, or vehicle number and show their dates and area; vehicles search by number, year, make, model, color, or plate and read `V-100 · 2022 Ford Transit`. Picking a trip with one vehicle fills it in; a trip with several narrows the vehicle list to them; clearing the trip shows every vehicle the user may pick. Opening the form from a trip (`?vehicleRequestId=`) starts with it filled in, and **Cancel** returns to that trip. A requester with no trip vehicles sees a short explanation.
- **Problem card.** Four type tiles (icon, label, one-line hint) that work as a radio group (one tab stop, arrow keys move the choice), then **Description** with a hint and example.
- **Status card** (managers editing or creating; read-only text for everyone else; hidden from requesters while creating). Status chips **Pending** / **Resolved** / **Cancelled** / **Moved to maintenance** with an even gap, always one chosen, plus a sentence saying what the status means. Choosing **Resolved** shows **Resolved on**, and **Moved to maintenance** shows **Moved on**; both default to today. **Assignee (optional)** is a searchable autocomplete of eligible people with their roles underneath; it is disabled until a vehicle is chosen, and switching to a vehicle the assignee can't take clears them with a note. If the list can't load, a warning says so (the report can still be saved).
- **Validation.** Submitting checks every field at once, shows each message under its field (**Choose the vehicle.**, **Choose the kind of problem.**, **Describe the problem.**, **Enter the date it was closed.**), and scrolls to and focuses the first one. Server errors appear in the action bar.
- **Actions.** A sticky bar at the bottom. Create: **Cancel** and **Submit report**; success opens the new report with **Issue report submitted.** Edit: the bar appears only after a change, reading **Unsaved changes** with **Discard** and **Save changes**; saving stays on the page with **Changes saved.** Leaving (in-app or closing the tab) with unsaved changes asks first.
- **View mode** (the author, or an area admin of another area): the same cards as text: vehicle, trip and dates, type with its hint, description, status chip with its meaning, resolved date, and assignee (or **Not assigned yet**). No inputs or actions.
- **Maintenance** card (US-14.7; admins and area admins who manage the report, on `maintenance` reports or once a need is linked): **Create maintenance need** opens `/maintenance-needs/new?issueReportId=<id>`; with a linked need it shows the need's title, status, and priority and **View maintenance need**.
- **Notes** (existing reports, last on the page): the Feature 14 notes thread.
- **Loading / error:** the page shell's skeleton; a failed load (`403`, `404`) shows the API message.

### Maintenance need form from an issue report (US-14.7)

`/maintenance-needs/new?issueReportId=<id>` loads the report and fills in: title (the description's first line, at most 50 characters, cut at a word with "…"), vehicle, description, assignee (only if they're a maintenance user, otherwise the form's usual default), out of service **Yes**, priority **None**, status **Open**. An info alert names the report. Every field stays editable. **Create** and **Cancel** both return to the issue report.

### [View: Issue Reports] table (US-14.8)

- **Search** (one box): matches description, type, status, vehicle number, reporter, assignee, and trip purpose; every word must match, in any order and case.
- **Status** and **Type** filters (clearable selects; empty means all). Changing search or filters returns to page 1. While filtering, **Showing N of M** with **Clear filters** sits above the table; nothing matching shows **No issue reports match**.
- **Columns:** **Issue** (type icon; description as a link in the primary color, underlined on hover; `<Type> · <reporter>` underneath; truncates), **Vehicle** (120px), **Status** (chip with icon, 136px), **Reported** (date, 136px), **Actions**. Issue takes the remaining width. Sortable by every column but Actions; newest first by default. No horizontal scrolling at any screen width.
- **Phones** (below the `md` breakpoint): each report is one compact row: type icon, description (up to two lines), `<Type> · <reporter>`, then status chip, vehicle, and date, with the row actions on the right. Sorting uses Vuetify's mobile **Sort by** control.
- **Row actions:** **Edit issue report** and **Delete issue report** (admins and area admins) or **View issue report** (others). No maintenance-need action.

---

## Key Entities

- **Note**: a comment left on a vehicle request, issue report, or maintenance need

---

## Data Model Requirements

### `notes` table

| Field               | Type       | Rules                                                                                           |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `id`                | INTEGER PK | Auto-increment                                                                                  |
| `vehicleRequestId`  | INTEGER FK | Optional; `null` or must reference `vehicleRequests.id`; deleting the request deletes its notes |
| `issueReportId`     | INTEGER FK | Optional; `null` or must reference `issueReports.id`; deleting the report deletes its notes     |
| `maintenanceNeedId` | INTEGER FK | Optional; `null` or must reference `maintenanceNeeds.id`; deleting the need deletes its notes   |
| `authorId`          | INTEGER FK | Required; set from the session; must reference `users.id`                                       |
| `content`           | TEXT       | Required; trimmed; sanitized; not whitespace-only                                               |
| `isVisible`         | BOOLEAN    | Required; defaults to `true`                                                                    |
| `includeInEmail`    | BOOLEAN    | Required; defaults to `false`; unused until a later feature                                     |
| `createdAt`         | DATE       | Sequelize timestamps                                                                            |
| `updatedAt`         | DATE       | Sequelize timestamps                                                                            |

Exactly one of `vehicleRequestId`, `issueReportId`, or `maintenanceNeedId` must be set. The other two are `null`.

### Associations (in `models/index.js`)

- `Note` belongs to `VehicleRequest`
- `Note` belongs to `IssueReport`
- `Note` belongs to `MaintenanceNeed`
- `Note` belongs to `User` as `author` through `authorId`
- `VehicleRequest` has many `Note`
- `IssueReport` has many `Note`
- `MaintenanceNeed` has many `Note`
- `User` has many `Note` as author

---

## Acceptance Criteria (Gherkin)

### US-14.1 — Add notes to entities

#### Scenario: Unauthenticated user cannot create notes

- **Given** I have no valid session token
- **When** I request to create a note
- **Then** the API rejects my request

#### Scenario: Unauthorized standard user cannot create notes on requests they don't have access to

- **Given** I am sign-in as a standard user
- **When** I request to create a note on a request I did not make
- **Then** the API rejects my request

#### Scenario: Unauthorized area_admin user cannot create notes on requests they don't have access to

- **Given** I am sign-in as an area_admin
- **When** I request to create a note on a request that I do not have access to
- **Then** the API rejects my request

#### Scenario: Standard user can create notes

- **Given** I am sign-in as a standard user
- **When** I request to create a note on a request I made
- **Then** the request is successful

#### Scenario: Area admin and maintenance users can create notes

- **Given** I am sign-in as an area_admin or maintenance user
- **When** I request to create a note on a request I have access to
- **Then** the request is successful

#### Scenario: Admin user can create notes

- **Given** I am sign-in as an admin user
- **When** I request to create a note on any request
- **Then** the request is successful

---

### US-14.2 — View notes on entities

#### Scenario: Users can view notes on requests, issue reports, maintenance needs

- **Given** I am a signed-in user
- **When** I open a vehicle request, issue report, or maintenance need that I have access to
- **Then** I see the notes for that entity

---

### US-14.3 — Toggle visibility

#### Scenario: Admin, area_admins, maintenance users can toggle visibility

- **Given** I am sign-in as a non-standard user
- **When** I can toggle isVisible when creating a note for a request
- **Then** that note is only visible to other non-standard users with access to the request

#### Scenario: Standard user cannot toggle note visibility

- **Given** I am sign-in as a standard user
- **When** I am creating a note
- **Then** that I cannot toggle note visibility

#### Scenario: Standard user cannot see notes with isVisible set to false

- **Given** I am sign-in as a standard user
- **When** viewing a request
- **Then** I do not see any notes that have isVisible toggled to false

---

### US-14.4 — Admin can delete notes

#### Scenario: Admin can delete all notes

- **Given** I am sign-in as an admin user
- **When** I view notes on requests
- **Then** I can successfully delete any note

---

### US-14.5 — Users can delete their own notes if no one has responded

#### Scenario: All sign-in users can delete their own notes if no one has responded

- **Given** I am sign-in as any kind of user
- **When** I view notes on a request
- **Then** I can delete a note only if it belongs to me and no one has responded to it yet

---

### US-14.6 — Issue report page

#### Scenario: Requester reports an issue from their trip

- **Given** I am signed in without admin, area_admin, or maintenance, and one of my trips has a vehicle
- **When** I open **Report an issue** from that trip, choose a type, describe the problem, and submit
- **Then** the report is created for that trip's vehicle as pending and unassigned, and its page opens
- **And** I never saw status or assignee fields

#### Scenario: Admin or area admin creates a triaged issue report

- **Given** I am signed in as an admin or area admin
- **When** I create a report and choose a status and an assignee
- **Then** only admins, the vehicle's area admins, and maintenance users are offered as assignees
- **And** the report is created with that status and assignee

#### Scenario: Admin or area admin edits an issue report on its page

- **Given** I am signed in as an admin, or an area admin of the report's vehicle area
- **When** I open the issue report page, change its details, and click **Save changes**
- **Then** the report is updated and I stay on the page

#### Scenario: Author views their issue report read-only

- **Given** I am signed in as the report's author without admin or area_admin
- **When** I open the issue report page
- **Then** I see its details, status, and assignee as text, with no inputs or actions
- **And** I see its notes at the bottom

#### Scenario: Admin or area admin deletes an issue report from its page

- **Given** I am signed in as an admin, or an area admin of the report's vehicle area
- **When** I choose **Delete issue report** from **More actions** and confirm
- **Then** the report is deleted and I return to the issue reports list

#### Scenario: User without access cannot open an issue report page

- **Given** I am signed in and cannot read the issue report
- **When** I open its page
- **Then** I see the API's error message instead of the report

#### Scenario: Issue reports list opens the issue report page

- **Given** I am signed in and see an issue report in the list
- **When** I click **View issue report** on its row
- **Then** I am on that issue report's page

### US-14.7 — Create a maintenance need from an issue report

#### Scenario: Admin or area admin creates a maintenance need from an issue report

- **Given** I manage a `maintenance` issue report with no maintenance need
- **When** I click **Create maintenance need** on its page, change the pre-filled form, and click **Create**
- **Then** the need is created with my values and linked to the report
- **And** the report's status becomes **Moved to maintenance**, dated today
- **And** I return to the report, which shows **View maintenance need**

#### Scenario: Issue reports list has no maintenance need action

- **Given** I am signed in as an admin
- **When** I view the issue reports list
- **Then** there is no **Create maintenance need** action on its rows

### US-14.8 — Find issue reports

#### Scenario: Issue reports table shows only the key columns

- **Given** there are issue reports
- **When** I open the issue reports list
- **Then** I see the Issue, Vehicle, Status, Reported, and Actions columns

#### Scenario: User searches issue reports

- **Given** there are issue reports
- **When** I search by any of their details
- **Then** only matching reports are listed, and I can clear the search

#### Scenario: User filters issue reports by status and type

- **Given** there are issue reports
- **When** I choose a status and/or a type
- **Then** only reports with that status and type are listed

#### Scenario: User sorts issue reports

- **Given** there are issue reports
- **When** I click a column heading
- **Then** the reports are sorted by that column, newest first until I choose otherwise

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-14.1 | Unauthenticated user cannot create notes | `backend/tests/notes.test.js` | `Unauthenticated user cannot create notes` |
| US-14.1 | Unauthorized standard user cannot create notes on requests they don't have access to | `backend/tests/notes.test.js` | `Unauthorized standard user cannot create notes on requests they don't have access to` |
| US-14.1 | Unauthorized area_admin user cannot create notes on requests they don't have access to | `backend/tests/notes.test.js` | `Unauthorized area_admin user cannot create notes on requests they don't have access to` |
| US-14.1 | Standard user can create notes | `backend/tests/notes.test.js` | `Standard user can create notes` |
| US-14.1 | Area admin and maintenance users can create notes | `backend/tests/notes.test.js` | `Area admin and maintenance users can create notes` |
| US-14.1 | Admin user can create notes | `backend/tests/notes.test.js` | `Admin user can create notes` |
| US-14.2 | Users can view notes on requests, issue reports, maintenance needs | `backend/tests/notes.test.js` | `Users can view notes on requests, issue reports, maintenance needs` |
| US-14.2 | Users can view notes on requests, issue reports, maintenance needs | `frontend/tests/Notes.test.js` | `Users can view notes on requests, issue reports, maintenance needs` |
| US-14.2 | Users can view notes on requests, issue reports, maintenance needs | `frontend/tests/IssueReport.test.js` | `Author views their issue report read-only` |
| US-14.2 | Users can view notes on requests, issue reports, maintenance needs | `frontend/tests/MaintenanceNeeds.test.js` | `Users can view notes on requests, issue reports, maintenance needs` |
| US-14.2 | Users can view notes on requests, issue reports, maintenance needs | `frontend/tests/VehicleRequests.test.js` | `User views the details of their own request` (Feature 14 assertions) |
| US-14.3 | Admin, area_admins, maintenance users can toggle visibility | `backend/tests/notes.test.js` | `Admin, area_admins, maintenance users can toggle visibility` |
| US-14.3 | Admin, area_admins, maintenance users can toggle visibility | `frontend/tests/Notes.test.js` | `Admin, area_admins, maintenance users can toggle visibility` (Everyone / Staff only channels), `keeps a separate draft in each channel, and keeps drafts after leaving the page`, `shows one thread with no staff channel on a maintenance need` |
| US-14.3 | Standard user cannot toggle note visibility | `backend/tests/notes.test.js` | `Standard user cannot toggle note visibility` |
| US-14.3 | Standard user cannot toggle note visibility | `frontend/tests/Notes.test.js` | `Standard user cannot toggle note visibility` |
| US-14.3 | Standard user cannot see notes with isVisible set to false | `backend/tests/notes.test.js` | `Standard user cannot see notes with isVisible set to false` |
| US-14.4 | Admin can delete all notes | `backend/tests/notes.test.js` | `Admin can delete all notes` |
| US-14.4 | Admin can delete all notes | `frontend/tests/Notes.test.js` | `Admin can delete all notes` |
| US-14.5 | All sign-in users can delete their own notes if no one has responded | `backend/tests/notes.test.js` | `All sign-in users can delete their own notes if no one has responded` |
| US-14.5 | All sign-in users can delete their own notes if no one has responded | `frontend/tests/Notes.test.js` | `All sign-in users can delete their own notes if no one has responded` |
| US-14.6 | Requester reports an issue from their trip | `frontend/tests/IssueReport.test.js` | `Requester reports an issue from their trip` |
| US-14.6 | Admin or area admin creates a triaged issue report | `frontend/tests/IssueReport.test.js` | `Admin or area admin creates a triaged issue report` |
| US-14.6 | Admin or area admin creates a triaged issue report | `backend/tests/issueReports.test.js` | `lists who a report on a vehicle can be assigned to`, `rejects an assignee who can't take reports on that vehicle` |
| US-14.6 | Admin or area admin edits an issue report on its page | `frontend/tests/IssueReport.test.js` | `Admin or area admin edits an issue report on its page` |
| US-14.6 | Author views their issue report read-only | `frontend/tests/IssueReport.test.js` | `Author views their issue report read-only` |
| US-14.6 | Admin or area admin deletes an issue report from its page | `frontend/tests/IssueReport.test.js` | `Admin or area admin deletes an issue report from its page` |
| US-14.6 | User without access cannot open an issue report page | `frontend/tests/IssueReport.test.js` | `User without access cannot open an issue report page` |
| US-14.6 | Issue reports list opens the issue report page | `frontend/tests/IssueReports.test.js` | `Issue reports list opens the issue report page` |
| US-14.6 | (Feature 10 response change) issue report `vehicle` includes `areaId` | `backend/tests/issueReports.test.js` | `User creates issue report` (Feature 14 assertion) |
| US-14.7 | Admin or area admin creates a maintenance need from an issue report | `frontend/tests/IssueReports.test.js` | `Admin user creates a maintenance need from an issue report` (Feature 11 scenario, updated) |
| US-14.7 | Admin or area admin creates a maintenance need from an issue report | `backend/tests/maintenanceNeeds.test.js` | US-11.2 create-from-report test (Feature 14 assertions) |
| US-14.7 | Issue reports list has no maintenance need action | `frontend/tests/IssueReports.test.js` | `Admin user sees Create Maintenance Need on a maintenance issue report` (Feature 11 scenario, updated) |
| US-14.7 | (Feature 10 status) Moved to maintenance closes a report like Resolved | `backend/tests/issueReports.test.js` | `closes a report like Resolved, with its own name` |
| US-14.7 | (Feature 10 status) Moved to maintenance closes a report like Resolved | `frontend/tests/IssueReport.test.js` | `closes a report as moved to maintenance, like Resolved` |
| US-14.8 | Issue reports table shows only the key columns | `frontend/tests/IssueReports.test.js` | `Issue reports table shows only the key columns` |
| US-14.8 | Issue reports table shows only the key columns | `frontend/tests/IssueReports.test.js` | `Issue reports table fits small screens without scrolling sideways` |
| US-14.8 | User searches issue reports | `frontend/tests/IssueReports.test.js` | `User searches issue reports` |
| US-14.8 | User filters issue reports by status and type | `frontend/tests/IssueReports.test.js` | `User filters issue reports by status and type` |
| US-14.8 | User sorts issue reports | `frontend/tests/IssueReports.test.js` | `User sorts issue reports` |
| US-14.6 | (Feature 8) a trip links to **Report an issue** | `frontend/tests/VehicleRequests.test.js` | `Admin assigns vehicles to a request` (Feature 14 assertion) |

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-001**–**FR-004** satisfied)
- [x] **Success Criteria (SC-001**–**SC-003)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Sending notifications about notes
- `includeInEmail`: still make the column, but ignore it for now. Let it default to false.

---

## Delivered to later features

- `includeInEmail` for emails feature
