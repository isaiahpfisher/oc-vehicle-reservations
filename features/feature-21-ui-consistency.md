# Feature: UI Consistency

**Feature ID:** 21
**Branch pattern:** `feature/21-ui-consistency`
**Status:** Draft
**Created:** 2026-11-23
**Input:** Make the app's pages, lists, and forms work the same way everywhere, and fix the broken or missing behavior a full UI/UX audit (2026-11-20) found along the way.
**Depends on:** Features 1-18

---

## User Stories

### A. App shell and consistency

### US-21.1: Find my way around the app

**As a** signed-in user
**I want to** see the app's pages grouped in the sidebar, with counts of what needs to be done
**So that** I can find my work without looking all over for it

**Priority:** P2
**Independent test:** An area admin with 2 pending requests sees "2" on Requests in the sidebar
**Acceptance scenarios:** see ### US-21.1 under Acceptance Criteria

### US-21.2: See my profile and anyone's activity

**As a** signed-in user
**I want to** see my roles, driver record, and activity on my profile
**So that** I can check them in one place

**Priority:** P3
**Independent test:** Your profile shows the user's roles and their requests
**Acceptance scenarios:** see ### US-21.2 under Acceptance Criteria

### US-21.3: Forms behave the same everywhere

**As a** signed-in user
**I want to** have every form show errors, save, and warn me about unsaved changes the same way
**So that** I don't have to relearn each form or lose my work

**Priority:** P1
**Independent test:** Leaving a changed form asks "Discard changes?"
**Acceptance scenarios:** see ### US-21.3 under Acceptance Criteria

### US-21.4: Lists work the same everywhere

**As a** signed-in user
**I want to** search, page through, open, edit, and delete records the same way on every list
**So that** every list feels familiar

**Priority:** P2
**Independent test:** Every list has a search box that narrows its rows
**Acceptance scenarios:** see ### US-21.4 under Acceptance Criteria

### B. Vehicles and fleet setup

### US-21.5: See a vehicle at a glance

**As a** signed-in admin, area admin, or maintenance user
**I want to** see a vehicle's details, status, and history on one page
**So that** I know everything about it without opening several pages

**Priority:** P1
**Independent test:** A vehicle's page shows its details as text and a Work and history card
**Acceptance scenarios:** see ### US-21.5 under Acceptance Criteria

### US-21.6: Find the vehicles that need attention

**As a** signed-in admin, area admin, or maintenance user
**I want to** find vehicles by any detail and see which ones need attention
**So that** problems get handled before a trip

**Priority:** P1
**Independent test:** A vehicle with a plate expiring in a week counts under Needs attention
**Acceptance scenarios:** see ### US-21.6 under Acceptance Criteria

### US-21.7: Keep vehicle records valid

**As a** signed-in admin
**I want to** have the app refuse vehicle data that can't be right and deletes that would lose history
**So that** the system's records stay accurate

**Priority:** P1
**Independent test:** Saving a VIN with an O is refused
**Acceptance scenarios:** see ### US-21.7 under Acceptance Criteria

### US-21.8: Scan the setup lists

**As a** signed-in admin
**I want to** see areas, vehicle types, and service types as easy-to-scan cards and lists
**So that** I can spot what needs setting up at a glance

**Priority:** P3
**Independent test:** An area with no admin shows a warning on its card
**Acceptance scenarios:** see ### US-21.8 under Acceptance Criteria

### C. Service and mileage logs

### US-21.9: Log service by visit, with readings in order

**As a** signed-in admin, area admin, or maintenance user
**I want to** log every service from one visit together, with readings that stay in order
**So that** the service log matches what actually happened

**Priority:** P1
**Independent test:** Logging an oil change and tire rotation at once creates one odometer reading
**Acceptance scenarios:** see ### US-21.9 under Acceptance Criteria

### US-21.10: Understand each mileage reading

**As a** signed-in admin, area admin, or maintenance user
**I want to** see where each mileage reading came from and how much it changed
**So that** I can trust the vehicle's mileage

**Priority:** P2
**Independent test:** A reading from a service visit names its services
**Acceptance scenarios:** see ### US-21.10 under Acceptance Criteria

### US-21.11: See service on a calendar

**As a** signed-in admin, area admin, or maintenance user
**I want to** see a vehicle's service visits and due dates on a month calendar
**So that** I can see what was done and what's coming due

**Priority:** P2
**Independent test:** A vehicle's service log in month view shows a past visit and an upcoming due date
**Acceptance scenarios:** see ### US-21.11 under Acceptance Criteria

### D. Maintenance needs and issue reports

### US-21.12: Work a maintenance need from its page

**As a** signed-in admin, area admin, or maintenance user
**I want to** update, log work on, and close a maintenance need from its page
**So that** I can do the job without leaving the need

**Priority:** P1
**Independent test:** Mark in progress saves and stays on the need's page
**Acceptance scenarios:** see ### US-21.12 under Acceptance Criteria

### US-21.13: Find the needs that matter

**As a** signed-in admin, area admin, or maintenance user
**I want to** narrow the maintenance needs list to what matters
**So that** urgent work stands out

**Priority:** P2
**Independent test:** Out of service shows only needs keeping a vehicle off trips
**Acceptance scenarios:** see ### US-21.13 under Acceptance Criteria

### US-21.14: Keep issue reports with the right people

**As a** signed-in admin or area admin
**I want to** keep issue reports with the people who handle them
**So that** maintenance users only see the work meant for them

**Priority:** P2
**Independent test:** A maintenance-only user doesn't see Issue Reports
**Acceptance scenarios:** see ### US-21.14 under Acceptance Criteria

### E. Requests and trips

### US-21.15: Requests keep the right status and stops

**As a** signed-in user
**I want to** have requests keep the right status and reuse saved destinations
**So that** trips don't get stuck or duplicate places

**Priority:** P1
**Independent test:** Re-approving a request that has its vehicles makes it Reserved
**Acceptance scenarios:** see ### US-21.15 under Acceptance Criteria

### US-21.16: See requests in a list or a calendar

**As a** signed-in admin or area admin
**I want to** see requests in a table or calendar, with problems marked
**So that** I can plan around what's coming

**Priority:** P2
**Independent test:** The calendar marks a trip whose vehicle is out of service
**Acceptance scenarios:** see ### US-21.16 under Acceptance Criteria

### F. Instructions and drivers

### US-21.17: Write instructions on each vehicle type

**As a** signed-in admin or area admin
**I want to** write pickup and return instructions on each vehicle type
**So that** drivers get the right instructions for their area

**Priority:** P1
**Independent test:** Adding Athletics' own instructions shows them on the type's page
**Acceptance scenarios:** see ### US-21.17 under Acceptance Criteria

### US-21.18: Use variables in instructions

**As a** signed-in admin or area admin
**I want to** use variables like the pickup time in instructions
**So that** each driver gets details for their own trip

**Priority:** P2
**Independent test:** Clicking Vehicle in the variables list adds {{vehicle}} at the cursor
**Acceptance scenarios:** see ### US-21.18 under Acceptance Criteria

### US-21.19: Reach drivers and keep licenses current

**As a** signed-in admin or area admin
**I want to** have every driver's email and see whose license needs renewing
**So that** drivers can be reached and nobody drives on an expired license

**Priority:** P1
**Independent test:** Licenses to renew shows a driver whose license expires in 12 days
**Acceptance scenarios:** see ### US-21.19 under Acceptance Criteria

---

## Requirements

### Functional Requirements

Only rules with detail that isn't in the stories, acceptance criteria, or the sections below. Exact messages are in [api.md](./reference/api.md) and [behavior.md](./reference/behavior.md), last sections.

- **FR-001**: The sidebar counts are: requests that are pending or awaiting a vehicle, issue reports that are pending, and maintenance needs that are open or in progress, counting those assigned to the user for maintenance users, and those nobody is assigned to for admins and area admins
- **FR-002**: A vehicle's Work and history card opens on the tab the user last picked on any vehicle page, remembered in their browser. Until they've picked one, it opens on Maintenance needs when any are open, and on Service visits otherwise.
- **FR-003**: Vehicles are named "University ID · year make model" (for example, "V-100 · 2015 Toyota Sienna") everywhere where vehicles are displayed.
- **FR-004**: A plate counts as expiring soon from today through 30 days out. Plate Expiring ranks below Service Due Soon and above Available, so a vehicle that's due for service shows that instead.
- **FR-005**: A new vehicle's starting odometer is a whole number of 0 or more, saved as its first mileage reading dated today.
- **FR-006**: A vehicle can't be deleted while it has mileage logs, service logs, issue reports, or maintenance needs. A user can't be deleted while they have mileage logs or wrote issue reports or maintenance needs.
- **FR-007**: Deleting a vehicle type or area also deletes its instructions. Its vehicles can be moved to another type or area in the same step, but not to itself, and serial-numbered vehicles can't move to a type identified by VIN. An area that has requests can't be deleted.
- **FR-008**: An area card shows its logo (or initials), vehicle count, first admin with "+N" for the rest, and how many requests await approval. A vehicle type card shows an icon for the kind of vehicle, its identifier, vehicle count, and which instructions it has. A service type shows its schedule in words ("Every 5,000 mi or 180 days, whichever comes first").
- **FR-009**: Editing a visit changes the odometer reading and date for all of its services at once, and can't move the visit to another vehicle.
- **FR-010**: A reading can equal the one before it. Readings recorded on the same day count as earlier ones, so a second reading that day can't be lower than the first.
- **FR-011**: The service log dialog only offers open maintenance needs.
- **FR-012**: The service calendars are month-only (visits are whole days). Visits show in green, services overdue in red, and services due soon in orange on their due dates. The chosen view is remembered. Clicking a due date on a vehicle's calendar starts a new service log with that service already picked.
- **FR-013**: Requests are sorted with upcoming trips first, soonest at the top, then past trips, newest first. The chosen view (table, week, or month) is remembered for each requests page.
- **FR-014**: The six variables are `{{trip}}`, `{{pickup_time}}`, `{{return_time}}`, `{{vehicle}}`, `{{driver_first_name}}`, and `{{area_admins}}`. Each driver gets their own email, so `{{driver_first_name}}` is one name; `{{vehicle}}` lists every vehicle of that type on the trip. New default instructions start from an example that uses them.
- **FR-015**: License flags only show for approved and pending drivers

---

## Changes to earlier features

| Feature                      | Replaced or added rule                                                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 Authentication             | `403`s don't sign the user out. App name is "OC Vehicles"                                                                                                                                                                                              |
| 2 Areas                      | Areas show as a card grid, not a table. An area is edited in a dialog, not inline. Deleting an area requires re-assigning its current vehicles                                                                                                         |
| 3 User roles                 | User search matches email. Deleting a user who has records is refused. The landing page after sign-in depends on role.                                                                                                                                 |
| 4 Vehicle types              | Vehicle types show as cards, each with its own page. A type is edited in a dialog, not inline. Deleting a type requires re-assigning its current vehicles                                                                                              |
| 5 Vehicles                   | The purchase date can't be before the year before the model year. Deleting a vehicle with history is refused (they have to be `retired` instead). New vehicles take a starting odometer. An existing vehicle's page is read-only, with an edit dialog. |
| 6 Destinations               | Deleted from the three-dots menu on their page. A destination's page lists the trips that stop there. Custom stops reuse stored destinations.                                                                                                          |
| 7 Drivers                    | New email field is required. New filter to surface drivers with expiring or expired drivers licenses.                                                                                                                                                  |
| 8 Vehicle requests           | A trip must have at least 1 person.                                                                                                                                                                                                                    |
| 9 Mileage log                | Odometer readings can never go backwards.                                                                                                                                                                                                              |
| 10 Issue reports             | Maintenance-only users can't use issue reports. The issue report list starts on Pending.                                                                                                                                                               |
| 11 Maintenance needs         | Saving doesn't overwrite the author. A need's page is read-only, with an edit dialog. The resolved date is set automatically. The list has an out-of-service filter                                                                                    |
| 12 Service types             | Moved to a list instead of a table.                                                                                                                                                                                                                    |
| 13 Service log               | A log takes several service types at once and the log shows one row per visit                                                                                                                                                                          |
| 14 Notes                     | List rows show how many notes the viewer can read                                                                                                                                                                                                      |
| 15 Vehicle type instructions | Got rid of the separate instructions page. They live on each vehicle type's page. Area admins can read the default. Added template variables.                                                                                                          |
| 18 Vehicle status            | Added a `Plate Expiring` status for plates expiring within 30 days.                                                                                                                                                                                    |

---

## Assumptions

- Phone layouts are out of scope (AI keeps trying to make the layout mobile-size responsive).
- Instruction variables are stored and validated now, but nothing fills them in yet. A later emails feature sends instructions to drivers with the variables filled in from each trip.
- A service "visit" is the service logs that share one mileage log (odometer reading). No visit table is added.

## Edge Cases

- Editing a visit that removes every service should get refused (a visit needs at least one service type). Delete the visit instead.
- An odometer reading between two existing readings must be at least the earlier one and at most the later one.
- Moving serial-numbered vehicles to a VIN type should get refused with a message naming the problem.
- A user with maintenance plus another role → keeps issue report access (only maintenance-only users lose it).
- Reopening a closed maintenance need or issue report clears its resolved date.
- An instruction with single braces (`{north}`) gets treated as plain text (not a variable)
- An instruction that used a variable that doesn't exist gets refused on save as an unknown variable.
- For a driver linked to a user, the driver's email starts as the user's email but can be changed.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Every list in the app uses the same search row, page sizes, record links, and empty-state pattern.
- **SC-003**: Every record with its own page is edited and deleted the same way: **Edit details** (or an edit dialog) and a ⋮ menu.
- **SC-004**: `npm test` passes in `backend` and `frontend`.

---

## Data Ownership & Isolation

No new data ownership model. This feature changes who can read or write some existing data:

| Rule                          | Requirement                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sidebar counts**            | Sidebar nav counts are filtered to the entities that the current user has access to. For example, it won't include requests from outside the current user's area(s) |
| **Issue reports**             | Maintenance users cannot access issue reports, unless they have a a different role that gives them access                                                           |
| **Issue report assignees**    | Issue reports can be assigned to admins and area admins.                                                                                                            |
| **Vehicle type instructions** | Area admins can read the default instructions but write only their own areas' instructions. Admins write all.                                                       |
| **Destination trips**         | Admins see all trips, and area admins only their areas.                                                                                                             |
| **Note counts**               | Only counts the notes the caller may read.                                                                                                                          |
| **Service visits**            | Admins, maintenance, and area admins can edit/delete service logs for vehicles in their areas.                                                                      |
| **Implementation**            | Scope checks live in one place (`authorization.js`) and don't get diuplicated elsewhere                                                                             |

---

## Screen Requirements

Only views this feature adds or changes.

**App chrome**

- Sidebar sections are **Trips**, **Fleet**, **Setup**, **Administration**; red count badges on Requests, Drivers, Vehicles, Issue Reports, and Maintenance Needs (a dot when collapsed); the current page's link is marked, including pages outside its path.
- The app is **OC Vehicles**; browser tabs read "{{Page}} · OC Vehicles." The profile menu has **Your profile**.
- One success toast for every create, save, and delete.

**Shared list conventions**

- Search row: compact outlined search field and filters, 40px buttons, wrapping.
- Tables offer 10, 25, 50, or 100 rows; record names link to their page; icon-only buttons have tooltips; empty states use the app's illustrations with a create button when allowed.

### [View: Sign in] — route name `login`

- Redesigned with new app name and logo.

### [View: Profile] — route name `profile`

- New page. Like the user page, but for the current user and read-only.

### [View: Vehicles] — route name `vehicles`

- **Needs attention** includes Plate Expiring status, as well as area and "due for a service" filters.

### [View: Vehicle] — route name `vehicleDetails`

- Status card, read-only details with an edit dialog., Work and history card with tabs. **Report an issue** and **New maintenance need** buttons in the header.

### [View: Areas] — route name `areas`

- Card grid instead of a table.

### [View: Vehicle Types] — route name `vehicle-types`

- Card grid instead of table

### [View: Vehicle Type] — route name `vehicleTypeDetails`

- Default instructions and areas with their own.
- Iinstruction dialog with write/preview tabs and a variables list.

### [View: Service Types] — route name `service-types`

- List instead of table, with due soon and overdue counts.

### [View: Service log] — route name `service-logs`

- One row per visit.
- Table and month calendar views.

### [View: Mileage log] — route name `vehicle-mileage-logs`

- Updated table with the change since the previous reading, current estimate, source columns.

### [View: Maintenance Needs] — route name `maintenance-needs`

- Filters like the other lists instead of tabs: a Status dropdown starting on Open and In Progress, and an **Assigned to me** button for maintenance users (on by default).
- Out of service filter button.

### [View: Maintenance Need] — route name `maintenanceNeedEdit`

- Read-only details card with an edit dialog dialog.

### [View: Issue Reports] — route name `issue-reports`

- Status filter starts on pending
- Note counts on rows.

### [View: Requests] — route name `adminRequests`

- Table first, upcoming trips first
- Calendar hides cancelled and denied trips and marks trips with vehicle problems.

### [View: Request] — route name `request`

- **Override status** with a confirmation
- Custom address dialog suggests saved destinations if the address matches an existing one

### [View: Destination] — route name `destinationDetails`

- Lists the trips that stop at the given destination

### [View: Drivers] — route name `drivers`

- Contact column with phone and email.
- License flags in words.
- Expiring/expired license filters

### [View: Driver] — route name `driverDetails`

- Required email field, filled from a linked user.

---

## Key Entities

No new entities. Changed:

- Driver: now has a required email, where trip emails to the driver will go.
- Service visit (not stored): the service logs that share one mileage log.

## Data Model Requirements

### `drivers` table (existing, but changed)

| Field   | Type   | Rules                                  |
| ------- | ------ | -------------------------------------- |
| `email` | STRING | Required, trimmed, lowercased, max 255 |

---

## Acceptance Criteria (Gherkin)

### A. App shell and consistency

### US-21.1 — Find my way around the app

#### Scenario: The sidebar groups pages into sections

- **Given** I am signed in as an admin
- **When** I open any page
- **Then** the sidebar's sections are **Trips**, **Fleet**, **Setup**, and **Administration**

#### Scenario: The sidebar counts what's waiting for me

- **Given** I am an area admin and my area has 2 pending requests
- **When** I open any page
- **Then** **Requests** in the sidebar shows a badge reading "2"

#### Scenario: A vehicle's service log marks Vehicles in the sidebar

- **Given** I am signed in as an admin
- **When** I open a vehicle's service log
- **Then** **Vehicles** stays the highlighted link in the sidebar

### US-21.2 — See my profile and anyone's activity

#### Scenario: Any user opens their profile

- **Given** I am signed in
- **When** I choose **Your profile** from the profile menu
- **Then** I see my roles and the requests I've made

#### Scenario: My profile warns about an expired license

- **Given** I am a driver whose license has expired
- **When** I open my profile
- **Then** my driver record warns that my license has expired

#### Scenario: A user's page lists their activity

- **Given** I am an admin and another user has made a request
- **When** I open that user's page
- **Then** their **Requests** tab lists the request, linking to it

### US-21.3 — Forms behave the same everywhere

#### Scenario: A missing required field shows on the field

- **Given** I am creating a destination
- **When** I save it without a name
- **Then** "Required field." shows under the name field
- **And** nothing is saved

#### Scenario: Pressing Enter saves a form

- **Given** I am editing a driver with valid details
- **When** I press Enter in one of its fields
- **Then** the driver is saved

#### Scenario: Leaving a changed form asks first

- **Given** I changed a driver's phone number without saving
- **When** I open another page
- **Then** "Discard changes?" asks before I leave

#### Scenario: A save's success message survives the page changing

- **Given** I am creating a maintenance need
- **When** I create it and the app returns to the list
- **Then** "Maintenance need created." is still showing

### US-21.4 — Lists work the same everywhere

#### Scenario: Searching narrows a list

- **Given** I am on Drivers
- **When** I search for a driver's last name
- **Then** only drivers matching it are listed

#### Scenario: A record without its own page is edited in its dialog

- **Given** I am on Service Types
- **When** I choose edit on a service type
- **Then** an "Edit service type" dialog opens, filled in with that service type

#### Scenario: A record with its own page is deleted from its ⋮ menu

- **Given** I am on a destination's page
- **When** I choose delete from its ⋮ menu and confirm
- **Then** the destination is deleted and I am back on Destinations
- **And** no row on Destinations has a delete button

#### Scenario: An empty list explains itself

- **Given** I am an admin and there are no vehicles
- **When** I open Vehicles
- **Then** it says "No vehicles yet" and offers **+ New Vehicle**

### B. Vehicles and fleet setup

### US-21.5 — See a vehicle at a glance

#### Scenario: A vehicle's page shows its details as text

- **Given** I am an admin
- **When** I open a vehicle's page
- **Then** its details show as text, not form fields, with **Edit details**

#### Scenario: Edit details saves in a dialog and stays on the page

- **Given** I am an admin on a vehicle's page
- **When** I change its color in **Edit details** and save
- **Then** the dialog closes and the page shows the new color

#### Scenario: Users who can't edit a vehicle don't see Edit details

- **Given** I am a maintenance user
- **When** I open a vehicle's page
- **Then** I see its details without **Edit details**

#### Scenario: Work and history reopens on the tab I picked last

- **Given** I picked **Mileage** on a vehicle's page
- **When** I open another vehicle's page
- **Then** **Work and history** opens on **Mileage**

### US-21.6 — Find the vehicles that need attention

#### Scenario: Searching finds a vehicle by its plate

- **Given** I am on Vehicles
- **When** I search for a vehicle's plate number
- **Then** only that vehicle is listed

#### Scenario: A plate expiring within 30 days needs attention

- **Given** a vehicle with nothing else wrong has a plate expiring in 7 days
- **When** I open Vehicles
- **Then** its status is **Plate Expiring**
- **And** it is counted and listed under **Needs attention**

### US-21.7 — Keep vehicle records valid

#### Scenario: A starting odometer becomes the first mileage reading

- **Given** I am an admin creating a vehicle
- **When** I create it with a starting odometer of 12000
- **Then** its mileage log has one reading of "12,000 mi" dated today

#### Scenario: A VIN with I, O, or Q is refused

- **Given** I am an admin
- **When** I save a vehicle whose VIN contains an O
- **Then** the API returns `400` with "VIN can only use letters and numbers, and never I, O, or Q."

#### Scenario: A purchase date too early for the model year is refused

- **Given** I am an admin
- **When** I save a 2015 vehicle with a purchase date in 2013
- **Then** the API returns `400` with "Purchase date must be in 2014 or later for a 2015 vehicle."

#### Scenario: A vehicle with history can't be deleted

- **Given** a vehicle has mileage logs
- **When** I delete it
- **Then** the API returns `400` with "Vehicle has mileage logs and can't be deleted. Set its status to retired instead."

#### Scenario: Deleting a vehicle type moves its vehicles first

- **Given** the Van type has vehicles
- **When** I delete Van and choose to move its vehicles to Truck
- **Then** those vehicles are Trucks
- **And** Van and its instructions are deleted

### US-21.8 — Scan the setup lists

#### Scenario: Area cards show vehicles, admins, and waiting requests

- **Given** Athletics has vehicles, admins, and requests awaiting approval
- **When** I open Areas
- **Then** the Athletics card shows its vehicle count, its admins, and "N awaiting approval"

#### Scenario: An area with no admin warns

- **Given** an area has no area admin
- **When** I open Areas
- **Then** its card shows "No area admin to approve trips", linking to Users

#### Scenario: A vehicle type with no default instructions warns

- **Given** a vehicle type has no default instructions
- **When** I open Vehicle Types
- **Then** its card shows "No default instructions"

#### Scenario: A service type's overdue count opens those vehicles

- **Given** 2 vehicles are overdue for an oil change
- **When** I click "2 overdue" on Oil change in Service Types
- **Then** Vehicles opens showing only those 2 vehicles

### C. Service and mileage logs

### US-21.9 — Log service by visit, with readings in order

#### Scenario: Logging two services at once creates one reading

- **Given** I am logging service on a vehicle
- **When** I log an oil change and a tire rotation together at 12,050 mi
- **Then** two service logs are saved sharing one odometer reading

#### Scenario: The service log shows one row per visit

- **Given** a visit logged an oil change and a tire rotation
- **When** I open the vehicle's service log
- **Then** the visit is one row showing both services

#### Scenario: Editing a visit adds and removes services

- **Given** a visit logged an oil change and a tire rotation
- **When** I edit it to an oil change and a brake inspection
- **Then** the visit has an oil change and a brake inspection, and no tire rotation

#### Scenario: Deleting a visit keeps its odometer reading

- **Given** a visit at 12,050 mi
- **When** I delete the visit
- **Then** its service logs are deleted
- **And** the 12,050 mi reading stays in the mileage log

#### Scenario: A reading lower than an earlier one is refused

- **Given** the vehicle has a 12,050 mi reading on Oct 1, 2026
- **When** I log a reading of 11,000 mi dated after it
- **Then** the API returns `400` with "Odometer reading can't be lower than 12,050 mi, recorded Oct 1, 2026."

#### Scenario: A reading dated in the future is refused

- **Given** I am logging service
- **When** I date it tomorrow
- **Then** the API returns `400` with "Serviced date can't be in the future."

### US-21.10 — Understand each mileage reading

#### Scenario: The mileage log shows each change and the estimate

- **Given** a vehicle has readings of 12,000 and 12,400 mi
- **When** I open its mileage log
- **Then** the later reading shows "+400 mi"
- **And** the vehicle's current estimate shows above the list

#### Scenario: A reading from a service names its services

- **Given** a reading was taken at a visit that logged an oil change
- **When** I open the mileage log
- **Then** its source reads "Service: Oil change", linking to the service log

#### Scenario: A reading from a service can't be deleted here

- **Given** a reading was taken at a service visit
- **When** I open the mileage log
- **Then** its delete button is disabled, saying "Recorded at a service visit, so the service log still uses it."

### US-21.11 — See service on a calendar

#### Scenario: The month view shows visits and due dates

- **Given** a vehicle had a visit this month and has a service due this month
- **When** I switch its service log to **Month**
- **Then** the visit shows on its day and the service shows on its due date

#### Scenario: Clicking a visit opens it to edit

- **Given** a vehicle's service log is in **Month**
- **When** I click a visit
- **Then** the visit opens in the edit dialog

#### Scenario: Clicking a due date starts a new service log

- **Given** a vehicle's service log is in **Month**
- **When** I click a service's due date
- **Then** a new service log opens with that service already picked

### D. Maintenance needs and issue reports

### US-21.12 — Work a maintenance need from its page

#### Scenario: A need's page shows its details and who created it

- **Given** Jane Doe created a maintenance need
- **When** I open its page
- **Then** its details show as text with "Created by Jane Doe"

#### Scenario: Edit details saves in a dialog and stays on the page

- **Given** I am on a maintenance need's page
- **When** I change its priority in **Edit details** and save
- **Then** the dialog closes and the page shows the new priority

#### Scenario: Mark in progress saves and stays on the page

- **Given** a maintenance need is Open
- **When** I click **Mark in progress**
- **Then** it is saved as In Progress and I stay on its page

#### Scenario: Logging service can complete the need

- **Given** I am on an open maintenance need's page
- **When** I log service from it with "Mark the maintenance need completed" checked
- **Then** the service log is saved for the need's vehicle
- **And** the need is Completed

#### Scenario: Completing a need records today

- **Given** a maintenance need is In Progress
- **When** I mark it completed
- **Then** its resolved date is today

#### Scenario: Saving a need keeps its author

- **Given** Jane Doe created a maintenance need
- **When** another user saves a change to it
- **Then** Jane Doe is still its author

### US-21.13 — Find the needs that matter

#### Scenario: The list starts on open and in-progress needs

- **Given** there are open, in-progress, and completed needs
- **When** I open Maintenance Needs as an admin
- **Then** Status is set to Open and In Progress, and completed needs aren't listed

#### Scenario: Maintenance users start on their own needs

- **Given** I am a maintenance user
- **When** I open Maintenance Needs
- **Then** **Assigned to me** is on and only needs assigned to me are listed

#### Scenario: Out of service shows only needs keeping a vehicle off trips

- **Given** one open need takes its vehicle out of service and another doesn't
- **When** I turn on **Out of service**
- **Then** only the first need is listed

#### Scenario: A need nobody is assigned to says so

- **Given** an open need has no assignee
- **When** I open Maintenance Needs
- **Then** its Assignee reads "Unassigned"

### US-21.14 — Keep issue reports with the right people

#### Scenario: A maintenance-only user doesn't see issue reports

- **Given** my only role is maintenance
- **When** I open the app
- **Then** **Issue Reports** isn't in the sidebar

#### Scenario: The issue reports list starts on Pending

- **Given** there are pending and resolved issue reports
- **When** I open Issue Reports
- **Then** Status is set to Pending and only pending reports are listed

#### Scenario: List rows show note counts

- **Given** an issue report has 3 notes I can read
- **When** I open Issue Reports
- **Then** its row shows a note count of 3

### E. Requests and trips

### US-21.15 — Requests keep the right status and stops

#### Scenario: Re-approving a request that has its vehicles makes it Reserved

- **Given** a pending request already has its vehicles
- **When** an area admin approves it
- **Then** its status is Reserved

#### Scenario: Changing a status directly needs Override status

- **Given** I am an admin on a request
- **When** I choose **Override status** and pick a status
- **Then** I am asked to confirm before it saves

#### Scenario: A custom stop at a saved address uses that destination

- **Given** "1600 Campus Ct, Abilene, TX" is a saved destination
- **When** I add a custom stop at "1600 campus ct., abilene, tx"
- **Then** the request uses the saved destination, and no new destination is created

#### Scenario: The custom address dialog suggests a saved destination

- **Given** a saved destination is on the street I'm typing
- **When** I enter that address in the custom address dialog
- **Then** the dialog suggests the saved destination with **Use this**

#### Scenario: A destination's page lists the trips that stop there

- **Given** a request stops at a destination
- **When** I open the destination's page
- **Then** the request is listed

#### Scenario: A trip needs at least one person

- **Given** I am creating a request
- **When** I submit it with 0 people
- **Then** the API returns `400` with "Number of people must be a whole number of 1 or more."

### US-21.16 — See requests in a list or a calendar

#### Scenario: Requests open in a table with upcoming trips first

- **Given** there are past and upcoming trips
- **When** I open Requests for the first time
- **Then** the table is showing, with the soonest upcoming trip first

#### Scenario: The calendar hides cancelled and denied trips

- **Given** a cancelled trip falls this month
- **When** I switch Requests to **Month**
- **Then** the cancelled trip isn't on the calendar
- **And** a note says 1 cancelled or denied trip is hidden

#### Scenario: The calendar marks trips with vehicle problems

- **Given** a reserved trip's vehicle is out of service
- **When** I switch Requests to **Month**
- **Then** the trip has a warning mark, and hovering it lists the problem

### F. Instructions and drivers

### US-21.17 — Write instructions on each vehicle type

#### Scenario: A vehicle type's page shows the default and areas with their own

- **Given** Van has default instructions and Athletics has its own
- **When** I open Van's page
- **Then** I see the default, then Athletics' instructions

#### Scenario: Adding instructions for an area

- **Given** I am on Van's page
- **When** I choose **Add for an area**, pick Music, and save instructions
- **Then** Music's instructions are listed under the default

#### Scenario: Removing an area's instructions goes back to the default

- **Given** Athletics has its own Van instructions
- **When** I remove them
- **Then** Athletics uses Van's default instructions

#### Scenario: An area admin only changes their own areas' instructions

- **Given** I am the Athletics area admin
- **When** I open Van's page
- **Then** I can read the default but not edit it
- **And** I can edit Athletics' instructions

### US-21.18 — Use variables in instructions

#### Scenario: Clicking a variable adds it at the cursor

- **Given** I am writing instructions with the cursor after "Pick up "
- **When** I click **Vehicle** in the Variables list
- **Then** `{{vehicle}}` is added at the cursor

#### Scenario: Preview fills in variables from a sample trip

- **Given** my instructions say "Pick up {{vehicle}}"
- **When** I open **Preview**
- **Then** it reads "Pick up" followed by a sample vehicle, with no `{{`

#### Scenario: A name that isn't a variable can't be saved

- **Given** my instructions say "Pick up {{vehical}}"
- **When** I save them
- **Then** "{{vehical}} isn't a variable. Pick one from Variables." shows and nothing is saved

### US-21.19 — Reach drivers and keep licenses current

#### Scenario: A driver can't be saved without an email

- **Given** I am creating a driver
- **When** I save it without an email
- **Then** the API returns `400` with "Missing email."

#### Scenario: Linking a user fills in the driver's email

- **Given** I am creating a driver
- **When** I link the user jane@oc.edu
- **Then** the Email field fills in with "jane@oc.edu"

#### Scenario: Expired and expiring licenses are flagged in words

- **Given** one approved driver's license expired on Oct 20, 2026 and another's expires in 12 days
- **When** I open Drivers
- **Then** the first shows "Expired Oct 20, 2026" and the second "Expires in 12 days"

#### Scenario: Licenses to renew shows only those drivers

- **Given** some drivers' licenses are current and two need renewing
- **When** I click **Licenses to renew**
- **Then** only the two drivers needing renewal are listed

---

## Test Coverage Map

Each scenario above must map to at least one automated test. Scenario titles must match the `#### Scenario:` text exactly.

| Story    | Scenario | Test file | Test name |
| -------- | -------- | --------- | --------- |
| US-21.1 | The sidebar groups pages into sections | `frontend/tests/AppShell.test.js` | shows the Sidebar with logo, pages, and profile at the bottom for users with roles |
| US-21.1 | The sidebar counts what's waiting for me | `frontend/tests/AppShell.test.js` | shows count badges on Sidebar links, and a dot when collapsed |
| US-21.1 | The sidebar counts what's waiting for me | `backend/tests/navCounts.test.js` | counts what's waiting for an area admin, in their own area only |
| US-21.1 | A vehicle's service log marks Vehicles in the sidebar | `frontend/tests/AppShell.test.js` | highlights the Sidebar link for the page's section, including nested pages |
| US-21.2 | Any user opens their profile | `frontend/tests/Profile.test.js` | is opened from the profile menu |
| US-21.2 | Any user opens their profile | `frontend/tests/Profile.test.js` | shows a requester who they are, that they aren't a driver, and their own trips |
| US-21.2 | My profile warns about an expired license | `frontend/tests/Profile.test.js` | shows a linked driver record, and warns when the license has expired |
| US-21.2 | A user's page lists their activity | `frontend/tests/UserDetails.test.js` | Activity tabs list the user's requests, issue reports, and maintenance needs |
| US-21.3 | A missing required field shows on the field | `frontend/tests/Destinations.test.js` | Admin user creates a destination with a missing name |
| US-21.3 | Pressing Enter saves a form | `frontend/tests/DriverForm.test.js` | Pressing Enter saves a form |
| US-21.3 | Leaving a changed form asks first | `frontend/tests/DriverForm.test.js` | Leaving a changed form asks first |
| US-21.3 | A save's success message survives the page changing | `frontend/tests/MaintenanceNeeds.test.js` | Admin user saves maintenance need |
| US-21.4 | Searching narrows a list | `frontend/tests/Drivers.test.js` | Search drivers |
| US-21.4 | A record without its own page is edited in its dialog | `frontend/tests/ServiceTypes.test.js` | Service type rows have edit and delete actions in their menu |
| US-21.4 | A record with its own page is deleted from its ⋮ menu | `frontend/tests/Destinations.test.js` | Admin user deletes a destination |
| US-21.4 | A record with its own page is deleted from its ⋮ menu | `frontend/tests/Destinations.test.js` | Destination rows have an edit action, and no delete |
| US-21.4 | An empty list explains itself | `frontend/tests/Vehicles.test.js` | Vehicles empty state |
| US-21.5 | A vehicle's page shows its details as text | `frontend/tests/VehicleForm.test.js` | The vehicle page shows details as text and edits them in a dialog that stays on the page |
| US-21.5 | Edit details saves in a dialog and stays on the page | `frontend/tests/VehicleForm.test.js` | The vehicle page shows details as text and edits them in a dialog that stays on the page |
| US-21.5 | Users who can't edit a vehicle don't see Edit details | `frontend/tests/VehicleForm.test.js` | People who can't edit the vehicle get the details without an Edit button |
| US-21.5 | Work and history reopens on the tab I picked last | `frontend/tests/VehicleForm.test.js` | The vehicle page opens on the tab last picked |
| US-21.6 | Searching finds a vehicle by its plate | `frontend/tests/VehicleStatus.test.js` | Vehicle list can be searched |
| US-21.6 | A plate expiring within 30 days needs attention | `frontend/tests/Vehicles.test.js` | A plate expiring soon gets a yellow chip and counts as needing attention |
| US-21.6 | A plate expiring within 30 days needs attention | `backend/tests/vehicleStatus.test.js` | Plate expiring within 30 days shows Plate Expiring |
| US-21.7 | A starting odometer becomes the first mileage reading | `backend/tests/vehicles.test.js` | Admin user creates a vehicle with a starting odometer reading |
| US-21.7 | A starting odometer becomes the first mileage reading | `frontend/tests/VehicleForm.test.js` | Admin user creates a vehicle with a starting odometer reading |
| US-21.7 | A VIN with I, O, or Q is refused | `backend/tests/vehicles.test.js` | Admin user requests to create a vehicle with a VIN with an O |
| US-21.7 | A purchase date too early for the model year is refused | `backend/tests/vehicles.test.js` | Admin user requests to create a vehicle bought before the year before its model year |
| US-21.7 | A vehicle with history can't be deleted | `backend/tests/vehicles.test.js` | Admin user requests to delete a vehicle that has mileage logs and an issue report |
| US-21.7 | Deleting a vehicle type moves its vehicles first | `backend/tests/vehicleTypes.test.js` | Admin user deletes a vehicle type and moves its vehicles to another type |
| US-21.7 | Deleting a vehicle type moves its vehicles first | `frontend/tests/VehicleTypes.test.js` | Admin user moves a type's vehicles to another type and deletes it |
| US-21.8 | Area cards show vehicles, admins, and waiting requests | `frontend/tests/Areas.test.js` | Areas show as cards with each area's admins |
| US-21.8 | Area cards show vehicles, admins, and waiting requests | `frontend/tests/Areas.test.js` | Areas view shows each area's vehicle count |
| US-21.8 | Area cards show vehicles, admins, and waiting requests | `frontend/tests/Areas.test.js` | counts each area's pending requests and links to them |
| US-21.8 | An area with no admin warns | `frontend/tests/Areas.test.js` | Areas show as cards with each area's admins |
| US-21.8 | A vehicle type with no default instructions warns | `frontend/tests/VehicleTypeInstructions.test.js` | The vehicle types list warns when a type has no default instructions |
| US-21.8 | A service type's overdue count opens those vehicles | `frontend/tests/ServiceTypes.test.js` | counts overdue and due-soon vehicles per service (not retired ones), linking to them |
| US-21.8 | A service type's overdue count opens those vehicles | `frontend/tests/Vehicles.test.js` | lists only the vehicles due for that service, with a chip to clear it |
| US-21.9 | Logging two services at once creates one reading | `backend/tests/serviceLogs.test.js` | logs every service type at the same visit, sharing one mileage log |
| US-21.9 | Logging two services at once creates one reading | `frontend/tests/ServiceLogs.test.js` | Admin user logs several services in one visit |
| US-21.9 | The service log shows one row per visit | `frontend/tests/ServiceLogs.test.js` | shows the services that share a reading as one row, and edits them together |
| US-21.9 | Editing a visit adds and removes services | `backend/tests/serviceLogs.test.js` | edits the whole visit: reading, date and person for every service, and adds or removes services |
| US-21.9 | Deleting a visit keeps its odometer reading | `backend/tests/serviceLogs.test.js` | deletes every service at the visit and keeps the reading |
| US-21.9 | Deleting a visit keeps its odometer reading | `frontend/tests/ServiceLogs.test.js` | deletes the whole visit, naming its services |
| US-21.9 | A reading lower than an earlier one is refused | `backend/tests/serviceLogs.test.js` | rejects a service log whose mileage is lower than an earlier reading |
| US-21.9 | A reading lower than an earlier one is refused | `backend/tests/mileageLogs.test.js` | rejects a reading lower than an earlier one |
| US-21.9 | A reading dated in the future is refused | `backend/tests/serviceLogs.test.js` | Admin user edits a service log serviced_at to after current date |
| US-21.10 | The mileage log shows each change and the estimate | `frontend/tests/MileageLogs.test.js` | Shows each reading's change and the current estimate |
| US-21.10 | A reading from a service names its services | `frontend/tests/MileageLogs.test.js` | labels each reading's source and only lets hand-entered readings be deleted |
| US-21.10 | A reading from a service names its services | `backend/tests/mileageLogs.test.js` | lists the services logged at a reading, and none for one entered by hand |
| US-21.10 | A reading from a service can't be deleted here | `frontend/tests/MileageLogs.test.js` | labels each reading's source and only lets hand-entered readings be deleted |
| US-21.11 | The month view shows visits and due dates | `frontend/tests/ServiceLogs.test.js` | a vehicle's service log month opens a visit to edit it |
| US-21.11 | The month view shows visits and due dates | `frontend/tests/ServiceLogs.test.js` | a due date clicked and logged leaves the calendar without a reload |
| US-21.11 | Clicking a visit opens it to edit | `frontend/tests/ServiceLogs.test.js` | a vehicle's service log month opens a visit to edit it |
| US-21.11 | Clicking a due date starts a new service log | `frontend/tests/ServiceLogs.test.js` | a due date clicked and logged leaves the calendar without a reload |
| US-21.11 | Clicking a due date starts a new service log | `frontend/tests/ServiceLogs.test.js` | + New Service Log after a due date starts with no service picked |
| US-21.12 | A need's page shows its details and who created it | `frontend/tests/MaintenanceNeeds.test.js` | shows who created the need, with breadcrumbs back to the list |
| US-21.12 | A need's page shows its details and who created it | `frontend/tests/MaintenanceNeeds.test.js` | shows the need as text, with the vehicle, assignee, and description |
| US-21.12 | Edit details saves in a dialog and stays on the page | `frontend/tests/MaintenanceNeeds.test.js` | Admin user edits a maintenance need priority |
| US-21.12 | Mark in progress saves and stays on the page | `frontend/tests/MaintenanceNeeds.test.js` | Mark in progress sets status to In Progress |
| US-21.12 | Logging service can complete the need | `frontend/tests/MaintenanceNeeds.test.js` | logs service from the need's page, can close the need, and stays on the need |
| US-21.12 | Completing a need records today | `backend/tests/maintenanceNeeds.test.js` | Admin user requests to edit a maintenance need with status Completed and no resolved date |
| US-21.12 | Saving a need keeps its author | `backend/tests/maintenanceNeeds.test.js` | Editing a maintenance need keeps its original author |
| US-21.13 | The list starts on open and in-progress needs | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs list starts on open needs for admins |
| US-21.13 | The list starts on open and in-progress needs | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs list shows open and in-progress needs first |
| US-21.13 | Maintenance users start on their own needs | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance users start on the open needs assigned to them |
| US-21.13 | Out of service shows only needs keeping a vehicle off trips | `frontend/tests/MaintenanceNeeds.test.js` | shows only out-of-service needs, with a count for the current tab |
| US-21.13 | A need nobody is assigned to says so | `frontend/tests/MaintenanceNeeds.test.js` | Maintenance needs list shows open and in-progress needs first |
| US-21.14 | A maintenance-only user doesn't see issue reports | `frontend/tests/AppShell.test.js` | leaves out Sidebar sections the user has no pages in |
| US-21.14 | The issue reports list starts on Pending | `frontend/tests/IssueReports.test.js` | Only pending reports show at first; clearing the filters shows every report |
| US-21.14 | List rows show note counts | `frontend/tests/IssueReports.test.js` | marks a report that has notes and leaves one without notes unmarked |
| US-21.14 | List rows show note counts | `backend/tests/notes.test.js` | counts issue report and maintenance need notes, and is zero with none |
| US-21.15 | Re-approving a request that has its vehicles makes it Reserved | `backend/tests/vehicleRequests.test.js` | Re-approving an edited request that still has its vehicles reserves it |
| US-21.15 | Changing a status directly needs Override status | `frontend/tests/VehicleRequests.test.js` | Admin overrides a request's status only after opening the override and confirming |
| US-21.15 | A custom stop at a saved address uses that destination | `backend/tests/vehicleRequests.test.js` | uses the saved destination at the same address, ignoring case and punctuation |
| US-21.15 | The custom address dialog suggests a saved destination | `frontend/tests/VehicleRequests.test.js` | User is pointed to the saved destination at the address they type |
| US-21.15 | A destination's page lists the trips that stop there | `frontend/tests/Destinations.test.js` | Shows the trips that stop at a destination |
| US-21.15 | A destination's page lists the trips that stop there | `backend/tests/destinations.test.js` | lists the trips that stop there, newest first, only in the caller's areas |
| US-21.15 | A trip needs at least one person | `backend/tests/vehicleRequests.test.js` | rejects a number of people that is not a whole number of 1 or more |
| US-21.16 | Requests open in a table with upcoming trips first | `frontend/tests/VehicleRequests.test.js` | Lists upcoming trips first and keeps cancelled trips off the calendar |
| US-21.16 | Requests open in a table with upcoming trips first | `frontend/tests/VehicleRequests.test.js` | User views requests as a table |
| US-21.16 | The calendar hides cancelled and denied trips | `frontend/tests/VehicleRequests.test.js` | Lists upcoming trips first and keeps cancelled trips off the calendar |
| US-21.16 | The calendar marks trips with vehicle problems | `frontend/tests/VehicleStatus.test.js` | The calendar marks requests with problematic vehicles too |
| US-21.17 | A vehicle type's page shows the default and areas with their own | `frontend/tests/VehicleTypeInstructions.test.js` | Admin sees the default and every area's instructions |
| US-21.17 | Adding instructions for an area | `frontend/tests/VehicleTypeInstructions.test.js` | Admin user saves an area vehicle type instruction, starting from the default |
| US-21.17 | Removing an area's instructions goes back to the default | `frontend/tests/VehicleTypeInstructions.test.js` | Admin removes an area's instructions, so its trips go back to the default |
| US-21.17 | An area admin only changes their own areas' instructions | `frontend/tests/VehicleTypeInstructions.test.js` | Area admin sees the default and their own areas only |
| US-21.17 | An area admin only changes their own areas' instructions | `frontend/tests/VehicleTypeInstructions.test.js` | Area admin edits a vehicle type instruction in their area |
| US-21.17 | An area admin only changes their own areas' instructions | `backend/tests/vehicleTypeInstructions.test.js` | Area admin updates a default vehicle type instruction |
| US-21.18 | Clicking a variable adds it at the cursor | `frontend/tests/VehicleTypeInstructions.test.js` | Clicking a variable adds it where the cursor was, or at the end |
| US-21.18 | Preview fills in variables from a sample trip | `frontend/tests/VehicleTypeInstructions.test.js` | Preview fills the variables in from a sample trip |
| US-21.18 | A name that isn't a variable can't be saved | `frontend/tests/VehicleTypeInstructions.test.js` | A name that isn't a variable can't be saved |
| US-21.18 | A name that isn't a variable can't be saved | `backend/tests/vehicleTypeInstructions.test.js` | Instructions can use variables, but not unknown ones |
| US-21.19 | A driver can't be saved without an email | `backend/tests/drivers.test.js` | Cannot submit without required fields |
| US-21.19 | Linking a user fills in the driver's email | `frontend/tests/DriverForm.test.js` | Driver is created |
| US-21.19 | Expired and expiring licenses are flagged in words | `frontend/tests/Drivers.test.js` | License Expiration |
| US-21.19 | Expired and expiring licenses are flagged in words | `frontend/tests/Drivers.test.js` | License expiring soon is flagged |
| US-21.19 | Licenses to renew shows only those drivers | `frontend/tests/Drivers.test.js` | Licenses to renew shows only approved and pending drivers whose license has run out or runs out soon |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 21 from @features/feature-21-ui-consistency.md on branch `feature/21-ui-consistency`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/api.md`, `features/reference/behavior.md`, `features/reference/data-model.md` (fold their "UI/UX backlog changes" sections into the main tables)

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001** – **FR-015** satisfied)
- [ ] **Success Criteria (SC-001 – SC-004)** met
- [ ] All mapped tests pass (`npm test` in `backend` and `frontend`)
- [x] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (`drivers.email`)
- [ ] `features/reference/api.md` updated (new and changed endpoints)
- [ ] `features/reference/behavior.md` updated (new and changed rules)
- [ ] Feature catalog row added in [features/README.md](./README.md)

---

## Out of Scope

- Sending instructions to drivers, or filling in their variables (a later emails feature)
- Tying a driver to a specific vehicle on a trip
- Merging destinations that are already stored twice
- The rewritten seed script and README seed section (supporting work, not product behavior)
