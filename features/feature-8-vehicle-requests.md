# Feature: Vehicle Request Management

**Feature ID:** 8
**Branch pattern:** `feature/8-vehicle-requests`
**Status:** Draft
**Created:** 2026-10-22
**Input:** Signed-in users create vehicle requests with drivers and destinations.
**Depends on:** Features 1-7

---

## User Stories

### US-8.1: Create vehicle request

**As a** signed-in user
**I want to** create a vehicle request with the area it's for, multiple ordered destinations (starting/ending at OC's campus), multiple drivers, start date and end date (with optional time).
**So that** I can reserve a vehicle for an upcoming trip.

**Priority:** P1
**Independent test:** Click "New Request" from the home page and fill out the form.
**Acceptance scenarios:** see ### US-8.1 under Acceptance Criteria

### US-8.2: View list of my vehicle requests

**As a** signed-in user
**I want to** see all my vehicle requests, current and past, with details about them
**So that** I can see stay up to date on my pending requests and view past ones for reference.

**Priority:** P1
**Independent test:** Home view loads list of requests, with tabular and calendar views.
**Acceptance scenarios:** see ### US-8.2 under Acceptance Criteria

### US-8.3: View my single vehicle request

**As a** signed-in user
**I want** to click on one of my vehicle requests to see all the information about it and make updates as necessary (until I'm not allowed to anymore)
**So that** track the status of my vehicle request

**Priority:** P1
**Independent test:** Clicking on a vehicle request takes me to a page where I can view all its information
**Acceptance scenarios:** see ### US-8.3 under Acceptance Criteria

### US-8.4: List vehicle requests for admins

**As a** signed-in admin or area_admin user
**I want to** view all vehicle requests that I am responsible for handling in a tabular and calendar format
**So that** I can stay on top of vehicle requests

**Priority:** P1
**Independent test:** All vehicle requests are listed for admins and area_admins (only for their area(s))
**Acceptance scenarios:** see ### US-8.4 under Acceptance Criteria

### US-8.5: Search and filter vehicle requests

**As a** signed-in admin or area_admin user
**I want to** search and filter vehicle requests by area, destination(s), driver(s), dates, vehicle(s)
**So that** I can find vehicle requests more easily

**Priority:** P1
**Independent test:** Searching and filtering works for vehicle requests
**Acceptance scenarios:** see ### US-8.5 under Acceptance Criteria

### US-8.6: Admin views single vehicle request

**As a** signed-in admin or area_admin user
**I want to** click a vehicle request on the table/calendar and open a page with all its details
**So that** I can manage individual vehicle requests

**Priority:** P1
**Independent test:** Clicking on a vehicle request takes me to a page where I can view all its information
**Acceptance scenarios:** see ### US-8.6 under Acceptance Criteria

### US-8.7: Admin edits vehicle request

**As a** signed-in admin or area_admin user
**I want to** update existing vehicle requests
**So that** I can make changes as necessary

**Priority:** P1
**Independent test:** Changing fields and clicking save works
**Acceptance scenarios:** see ### US-8.7 under Acceptance Criteria

### US-8.8: Assign vehicles to requests

**As a** signed-in admin or area_admin user
**I want to** assign vehicles to requests, with helpful filters for meeting the criteria of the request (number of passengers, if drivers have cdls to drive cdl vehicle types, if the vehicle is already reserved or under maintenance, how many miles until the vehicle needs to be serviced (to compare to estimated miles of trip))
**So that** I can fulfill vehicle requests

**Priority:** P1
**Independent test:** Vehicles can be assigned to vehicle requests
**Acceptance scenarios:** see ### US-8.8 under Acceptance Criteria

### US-8.9: View estimated mileage of trip

**As a** signed-in user
**I want to** see an estimated mileage for a vehicle request based on the destinations
**So that** I can know what vehicles to assign based on that

**Priority:** P1
**Independent test:** Vehicles can be assigned to vehicle requests
**Acceptance scenarios:** see ### US-8.9 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: All vehicle request endpoints must require a valid session
- **FR-002**: Requesters without an admin or area_admin role should only see their own requests.
- **FR-003**: Requesters without an admin or area_admin role cannot perform vehicle assignment.
- **FR-004**: The system must flag if the total capacity of the assigned vehicles does not meet the number of people on the request. It can still be saved like this though.
- **FR-005**: Approving a request should change its status to awaiting vehicle.
- **FR-006**: Assigning a vehicle to a request should change the request's status to reserved, regardless of it was approved already. Removing all vehicles should set it back to awaiting vehicle.
- **FR-007**: Estimated mileage will be calculated using Google APIs.

---

## Assumptions

- Every trip starts and ends at OC's campus. It does not need to be specified as a destination.
- Each request belongs to an area.
- API payloads use camelCase field names (`areaId`, `startAt`, …) per `api-conventions.mdc`; table columns stay snake_case.
- Home (route `home`, `/`) is **My Requests**. This replaces Feature 3's welcome page; Feature 3's nav tests were updated to match. The admin list lives at `/requests` and shows in the nav for admins and area admins.
- On the request page, Trip details, Destinations, and Drivers each save on their own (`ui-style-system.mdc` → Detail page conventions). A new request is one form with one submit.
- **INTERIM** (until Features 4–7 merge): minimal models for vehicle types (plus `requiresCdl`), vehicles, destinations, and drivers (plus `hasCdl`); read-only `GET /api/drivers` and `GET /api/destinations` for the request form; and sample rows added by `npm run seed`. Each piece is marked `INTERIM(feature-N)` and is removed when that feature merges.
- **INTERIM** (until Features 9, 11, and 13 merge): every vehicle reports as in service with unknown miles until service (`backend/app/helpers/vehicleService.js`).

## Edge Cases

- Missing area, purpose, dates, or number of people -> 400 bad request
- Number of people is not a non-negative integer -> 400 bad request
- End date before start data -> 400 bad request
- Destination is listed twice in a row on a trip -> 400 bad request
- A driver is not approved or has an expired license -> 400 bad request
- A driver's license expires during a trip -> 400 bad request

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admins/area admins can fully manage the life cycle of a vehicle request.
- **SC-003**: Signed-in admins/area admins can fully manage the life cycle of a vehicle request.
- **SC-004**: `npm test` passes for vehicle requests API and vehicle requests view behavior.

---

## Data Ownership & Isolation

Only signed-in admin users may create, edit, or delete vehicle . Any signed-in user may read the semester list.

| Rule                  | Requirement                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin read scope**  | `GET /api/requests` and `GET /api/requests/:requestId` require an admin or area admin role and return all requests the user should see based on their roles. |
| **Single read scope** | `GET /api/requests/:requestId`. User must have authorization to see the request. Either they created it, or they have an admin role that requires it.        |
| **User read scope**   | `GET /api/me/requests` returns the current user's requests. Must have an active session.                                                                     |
| **User write scope**  | `POST /api/me/requests` and `PUT /api/me/requests/:requestId` creates .                                                                                      |
| **Admin write scope** | `POST /api/requests` and `PUT /api/requests/:requestId` updates a request. User can only update requests they should see based on their roles                |
| **Delete scope**      | Requests are never deleted. Status is just changed to "Cancelled"                                                                                            |
| **UI scope**          | Status fields and vehicle assignment are only editable by admin users                                                                                        |

---

## API Requirements

| Method | Endpoint                   | Auth        | Purpose                                 |
| ------ | -------------------------- | ----------- | --------------------------------------- |
| `GET`  | `/api/requests`            | Yes - Admin | Fetch all requests based on users roles |
| `GET`  | `/api/requests`            | Yes - Admin | Fetch all requests based on users roles |
| `GET`  | `/api/me/requests`         | Yes - Admin | Fetch requests created by a user        |
| `GET`  | `/api/requests/:requestId` | Yes         | Fetch a single request                  |
| `POST` | `/api/requests`            | Yes - Admin | Create a request for the current user   |
| `PUT`  | `/api/requests/:requestId` | Yes         | Update a request                        |

**Create request body:**

```json
{
  "areaId": 1,
  "purpose": "Lorem ipsum dolor sit amet.",
  "startAt": "2026-12-18",
  "endAt": "2026-12-21",
  "allDay": true,
  "numberOfPeople": 9,
  "drivers": [],
  "destinations": []
}
```

**Request success response** (`200` / `201`):

```json
{
  "id": 1,
  "areaId": 1,
  "purpose": "Lorem ipsum dolor sit amet.",
  "startAt": "2026-12-18",
  "endAt": "2026-12-21",
  "allDay": true,
  "numberOfPeople": 9,
  "drivers": [],
  "destinations": [],
  "estimatedMiles": 0,
  "status": "pending",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.
**Not found:** `404` (do not use `403`).

---

## Screen Requirements

### [View: My Requests] — route name `home`

**Single Vue view** (`MyRequests.vue`)

- Heading: **My Requests**
- Primary action: **+ New Request** opens `CreateRequest.vue`
- Requests can be viewed in a searchable/filterable table, or a weekly/monthly calendar
- Each row/calendar event displays important information about the request, and can be clicked to view the request `Request.vue`
- **Empty state:** **"You have not submitted any requests."**.
- **Loading state:** skeleton or progress indicator while requests are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

### [View: Admin Requests] — route name `Admin/Requests.vue`

**Single Vue view** (`Admin/Requests.vue`)

- Heading: **Requests**
- Requests can be viewed in a searchable/filterable table, or a weekly/monthly calendar
- Each row/calendar event displays important information about the request, and can be clicked to view the request `Request.vue`
- It should be easy to filter out requests that don't need the user's attention.
- **Empty state:** **"No one has any submitted requests."**.
- **Loading state:** skeleton or progress indicator while requests are fetching.
- **Error state:** `<v-alert type="error">` for API failures.

### [View: Request] — route name `Requests.vue`

**Single Vue view** (`Request.vue`)

- Shows all the information for a request. Fields are editable for admins. Only editable for regular users if status is still pending
- Section for basic fields
- Section for drivers (can add multiple)
- Section for destinations (can add multiple, reorderable)

- **Error state:** `<v-alert type="error">` for API failures.

### [View: Request] — route name `Requests.vue`

**Single Vue view** (`Request.vue`)

- Shows all the information for a request. Fields are editable for admins. Only editable for regular users if status is still pending
- Section for basic fields
- Section for drivers (can add multiple)
- Section for destinations (can add multiple, reorderable)
- Vehicle assignment (can add multiple, only by admins, only after it's been created)
- Creating and editing happen on this screen. Certain fields are hidden during creation.

- **Error state:** `<v-alert type="error">` for API failures.

---

## Key Entities

- **Vehicle Request**: a user's request for vehicle(s) in one area for a trip
- **Vehicle Request Destination**: a stop (in order) on a request's trip
- **Destination**: an address a request travels to, optionally saved for reuse.
- **Vehicle Request Driver**: a driver on a request (can have multiple)
- **Driver**: must be approved with an unexpired license to be added to a request.
- **Vehicle Request Vehicle**: a vehicle an admin assigned to a request (can have multiple)
- **Vehicle**: an area's vehicle that can be assigned to requests in that area
- **Vehicle Type**: includes whether a vehicle type requires a CDL to drive (check if driver has cdl)
- **Area**: the area a request is for, used to route requests to proper area_admins and to limit available vehicles
- **User**: the requester who owns a request, or the admin who approves it.
- **Role**: decides what requests are shown to which users
- **Maintenance Need / Service Log / Mileage Log / Service Type**: used to flag vehicles that are out of service or due for service.

---

## Data Model Requirements

### `vehicle_requests` table

| Field              | Type      | Rules                                                                                       |
| ------------------ | --------- | ------------------------------------------------------------------------------------------- |
| `id`               | int PK    | Auto-increment                                                                              |
| `user_id`          | int FK    |                                                                                             |
| `area_id`          | int FK    |                                                                                             |
| `purpose`          | text      |                                                                                             |
| `start_at`         | timestamp |                                                                                             |
| `end_at`           | timestamp |                                                                                             |
| `all_day`          | boolean   | Used to account for time being optional on start/end dates                                  |
| `number_of_people` | int       |                                                                                             |
| `estimated_miles`  | int       | Recalculated when destinations change, using Google APIs or saved distances on destinations |
| `approver_id`      | int FK    | Optional                                                                                    |
| `approved_at`      | timestamp | Optional                                                                                    |
| `status`           | enum      | `pending`, `awaiting_vehicle`, `reserved`, `returned`, `cancelled`, `denied`                |
| `created_at`       | timestamp | Sequelize timestamps                                                                        |
| `updated_at`       | timestamp | Sequelize timestamps                                                                        |

### `vehicle_request_destinations` table

| Field                | Type      | Rules                |
| -------------------- | --------- | -------------------- |
| `id`                 | int PK    | Auto-increment       |
| `destination_id`     | int FK    |                      |
| `vehicle_request_id` | int FK    |                      |
| `stop_order`         | int       |                      |
| `created_at`         | timestamp | Sequelize timestamps |
| `updated_at`         | timestamp | Sequelize timestamps |

### `vehicle_request_vehicles` table

| Field                | Type      | Rules                            |
| -------------------- | --------- | -------------------------------- |
| `id`                 | int PK    | Auto-increment                   |
| `vehicle_request_id` | int FK    |                                  |
| `vehicle_id`         | int FK    | Unique with `vehicle_request_id` |
| `created_at`         | timestamp | Sequelize timestamps             |
| `updated_at`         | timestamp | Sequelize timestamps             |

### `vehicle_request_drivers` table

| Field                | Type      | Rules                            |
| -------------------- | --------- | -------------------------------- |
| `id`                 | int PK    | Auto-increment                   |
| `driver_id`          | int FK    | Unique with `vehicle_request_id` |
| `vehicle_request_id` | int FK    |                                  |
| `created_at`         | timestamp | Sequelize timestamps             |
| `updated_at`         | timestamp | Sequelize timestamps             |

### Associations (in `models/index.js`)

- User has zero to many Vehicle Requests
- Vehicle Request belongs to User
- User has zero to many approved Vehicle Requests (approver)
- Vehicle Request belongs to zero or one User (approver)
- Area has zero to many Vehicle Requests
- Vehicle Request belongs to Area
- Vehicle Request has one to many Vehicle Request Destinations
- Vehicle Request Destination belongs to Vehicle Request
- Destination has zero to many Vehicle Request Destinations
- Vehicle Request Destination belongs to Destination
- Vehicle Request has zero to many Vehicle Request Vehicles
- Vehicle Request Vehicle belongs to Vehicle Request
- Vehicle has zero to many Vehicle Request Vehicles
- Vehicle Request Vehicle belongs to Vehicle
- Vehicle Request has one to many Vehicle Request Drivers
- Vehicle Request Driver belongs to Vehicle Request
- Driver has zero to many Vehicle Request Drivers
- Vehicle Request Driver belongs to Driver

---

## Acceptance Criteria (Gherkin)

### US-8.1 — Create vehicle request

#### Scenario: Unauthenticated user cannot create a request

- **Given** I have no valid session token
- **When** I send `POST /api/requests`
- **Then** the API returns `401` with an unauthorized message

#### Scenario: Authenticated user creates a request

- **Given** I am signed in
- **When** I click **+ New Request** and submit the form with an area, purpose, start date, end date, number of people, at least one driver, and at least one destination
- **Then** the API returns `201` with that request
- **And** the request appears in my requests list

#### Scenario: User adds drivers to a new request

- **Given** I am signed in and creating a request
- **When** I add multiple drivers
- **Then** each driver is listed in the drivers section
- **And** all of them are saved with the request

#### Scenario: User adds destinations to a new request

- **Given** I am signed in and creating a request
- **When** I add multiple destinations
- **Then** each destination is listed in the destinations section in the order I added them
- **And** all of them are saved with the request

#### Scenario: User reorders destinations on a new request

- **Given** I am signed in and creating a request with at least two destinations
- **When** I move a destination to a different position
- **Then** the destinations display in the new order
- **And** they are saved with the request in that order

#### Scenario: Vehicle assignment is hidden during creation

- **Given** I am signed in
- **When** I open the new request form
- **Then** the vehicle assignment section is not visible

#### Scenario: User submits a request with missing required fields

- **Given** I am signed in
- **When** I send `POST /api/requests` without one of the required fields
- **Then** the API returns `400` with a message naming the missing field

---

### US-8.2 — View list of my vehicle requests

#### Scenario: Unauthenticated user cannot view requests

- **Given** I have no valid session token
- **When** I send `GET /api/me/requests` or `GET /api/requests`
- **Then** the API returns `401` with an unauthorized message

#### Scenario: User views requests as a table

- **Given** I am signed in and I have submitted requests
- **When** I open the **My Requests** view and choose the table display
- **Then** my requests are listed as rows in a table

#### Scenario: User views requests as a weekly calendar

- **Given** I am signed in and I have submitted requests
- **When** I open the **My Requests** view and choose the weekly calendar display
- **Then** my requests that fall in the selected week appear as calendar events

#### Scenario: User views requests as a monthly calendar

- **Given** I am signed in and I have submitted requests
- **When** I open the **My Requests** view and choose the monthly calendar display
- **Then** my requests that fall in the selected month appear as calendar events

#### Scenario: User searches and filters requests

- **Given** I am signed in and I have submitted requests
- **When** I enter a search term or apply a filter on the **My Requests** view
- **Then** only requests matching the search and filters are shown

#### Scenario: Regular user only sees their own requests

- **Given** I am signed in without an `admin` or `area_admin` role and other users have submitted requests
- **When** I open the **My Requests** view
- **Then** only requests I created are shown

---

### US-8.3 — View my single vehicle request

#### Scenario: User views the details of their own request

- **Given** I am signed in and I have submitted a request
- **When** I click that request in the table or calendar
- **Then** the request view opens with all of its details

#### Scenario: User cannot view another user's request

- **Given** I am signed in without an `admin` or `area_admin` role and a request exists that I did not create
- **When** I send `GET /api/requests/:requestId` for that request
- **Then** the API returns `404`

---

### US-8.4 — List vehicle requests for admins

#### Scenario: Admin sees all requests

- **Given** I am signed in with the `admin` role and requests exist across multiple areas
- **When** I open the **Requests** view
- **Then** all requests from all users and areas are shown
- **And** I can display them as a table, weekly calendar, or monthly calendar

#### Scenario: Area admin sees requests from the areas they manage

- **Given** I am signed in with the `area_admin` role for one or more areas and requests exist in areas I do and do not manage
- **When** I open the **Requests** view
- **Then** only requests from the areas I manage are shown

---

### US-8.5 — Search and filter vehicle requests

#### Scenario: Admin searches and filters requests

- **Given** I am signed in with the `admin` role on the **Requests** view
- **When** I enter a search term or apply a filter
- **Then** only requests matching the search and filters are shown

#### Scenario: Admin filters to requests awaiting their action

- **Given** I am signed in with the `admin` or `area_admin` role on the **Requests** view
- **When** I apply the filter for requests that need my action
- **Then** only requests in my scope with status `pending` or `awaiting_vehicle` are shown

---

### US-8.6 — Admin views single vehicle request

#### Scenario: Admin views the details of a request

- **Given** I am signed in with the `admin` or `area_admin` role and a request exists in my scope
- **When** I click that request in the table or calendar
- **Then** the request view opens with all of its details

---

### US-8.7 — Admin edits vehicle request

#### Scenario: Admin changes a request's status

- **Given** I am signed in with the `admin` or `area_admin` role on the view for a request in my scope
- **When** I change the status and save
- **Then** the API returns `200` with the updated status
- **And** the request view shows the new status

#### Scenario: Changing an approval-affecting field resets status

- **Given** a request has been approved
- **When** a field that affects approval is changed and saved
- **Then** the request's status is reset to `pending`

#### Scenario: Updating a request with missing required fields

- **Given** I am signed in and can edit a request
- **When** I send `PUT /api/requests/:requestId` with a required field removed
- **Then** the API returns `400` with a message naming the missing field

---

### US-8.8 — Assign vehicles to requests

#### Scenario: Admin assigns vehicles to a request

- **Given** I am signed in with the `admin` or `area_admin` role on the view for an existing request in my scope
- **When** I assign one or more vehicles and save
- **Then** the API returns `200` with the assigned vehicles
- **And** the vehicles appear in the request's vehicle assignment section

---

### US-8.9 — View estimated mileage of trip

#### Scenario: Estimated mileage is added when a request is created

- **Given** I am signed in
- **When** I create a request with one or more destinations
- **Then** the saved request includes `estimated_miles` for the trip
- **And** the estimated mileage is shown on the request view

#### Scenario: Estimated mileage updates when destinations change

- **Given** I am signed in and can edit an existing request
- **When** I add, remove, or reorder its destinations and save
- **Then** `estimated_miles` is recalculated for the new route
- **And** the updated estimate is shown on the request view

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
| ----- | -------- | --------- | --------- |
| US-8.1 | Unauthenticated user cannot create a request | `backend/tests/vehicleRequests.test.js` | Unauthenticated user cannot create a request |
| US-8.1 | Authenticated user creates a request | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | Authenticated user creates a request |
| US-8.1 | User adds drivers to a new request | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | User adds drivers to a new request |
| US-8.1 | User adds destinations to a new request | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | User adds destinations to a new request |
| US-8.1 | User reorders destinations on a new request | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | User reorders destinations on a new request |
| US-8.1 | Vehicle assignment is hidden during creation | `frontend/tests/VehicleRequests.test.js` | Vehicle assignment is hidden during creation |
| US-8.1 | User submits a request with missing required fields | `backend/tests/vehicleRequests.test.js` | User submits a request with missing required fields |
| US-8.2 | Unauthenticated user cannot view requests | `backend/tests/vehicleRequests.test.js` | Unauthenticated user cannot view requests |
| US-8.2 | User views requests as a table | `frontend/tests/VehicleRequests.test.js` | User views requests as a table |
| US-8.2 | User views requests as a weekly calendar | `frontend/tests/VehicleRequests.test.js` | User views requests as a weekly calendar |
| US-8.2 | User views requests as a monthly calendar | `frontend/tests/VehicleRequests.test.js` | User views requests as a monthly calendar |
| US-8.2 | User searches and filters requests | `frontend/tests/VehicleRequests.test.js` | User searches and filters requests |
| US-8.2 | Regular user only sees their own requests | `backend/tests/vehicleRequests.test.js` | Regular user only sees their own requests |
| US-8.3 | User views the details of their own request | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | User views the details of their own request |
| US-8.3 | User cannot view another user's request | `backend/tests/vehicleRequests.test.js` | User cannot view another user's request |
| US-8.4 | Admin sees all requests | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | Admin sees all requests |
| US-8.4 | Area admin sees requests from the areas they manage | `backend/tests/vehicleRequests.test.js` | Area admin sees requests from the areas they manage |
| US-8.5 | Admin searches and filters requests | `frontend/tests/VehicleRequests.test.js` | Admin searches and filters requests |
| US-8.5 | Admin filters to requests awaiting their action | `frontend/tests/VehicleRequests.test.js` | Admin filters to requests awaiting their action |
| US-8.6 | Admin views the details of a request | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | Admin views the details of a request |
| US-8.7 | Admin changes a request's status | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | Admin changes a request's status |
| US-8.7 | Changing an approval-affecting field resets status | `backend/tests/vehicleRequests.test.js` | Changing an approval-affecting field resets status |
| US-8.7 | Updating a request with missing required fields | `backend/tests/vehicleRequests.test.js` | Updating a request with missing required fields |
| US-8.8 | Admin assigns vehicles to a request | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | Admin assigns vehicles to a request |
| US-8.9 | Estimated mileage is added when a request is created | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | Estimated mileage is added when a request is created |
| US-8.9 | Estimated mileage updates when destinations change | `backend/tests/vehicleRequests.test.js`, `frontend/tests/VehicleRequests.test.js` | Estimated mileage updates when destinations change |

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-004** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Notes, emails

---
