# Feature: Vehicle Status

**Feature ID:** 18
**Branch pattern:** `feature/18-vehicle-status`
**Status:** Ready
**Created:** 2026-11-10
**Input:** Vehicle status/availability is surfaced and checked before requests are reserved.
**Depends on:** Features 1-13

---

## User Stories

### US-18.1: See vehicle status on the vehicle list

**As a** signed-in admin or area admin
**I want to** see each vehicle's status on the vehicle list (Retired, Out of Service, Service Overdue, Service Due Soon, Plate Expired, Available)
**So that** I can see which vehicles need attention

**Priority:** P1
**Independent test:** A vehicle with an open out-of-service maintenance need shows an "Out of Service" chip on the vehicle list
**Acceptance scenarios:** see ### US-18.1 under Acceptance Criteria

### US-18.2: Filter vehicles

**As a** signed-in admin or area admin
**I want to** be able to filter vehicles by status, make, model, color, year
**So that** I can easily find vehicles

**Priority:** P2
**Independent test:** Choosing "Out of service" in the filter shows only out of service vehicles
**Acceptance scenarios:** see ### US-18.2 under Acceptance Criteria

### US-18.3: See why a vehicle has its status

**As a** signed-in admin, area admin, or maintenance user
**I want** a vehicle's page to show its estimated current mileage (and how it's being calculated), its current out-of-service maintenance needs, and when each service type is due next
**So that** I know why each vehicle has the status it does

**Priority:** P1
**Independent test:** A vehicle's page shows something like "12,340 mi (12,000 logged Oct 1 + ~340 from 2 trips)" and the miles and date until each service type is next due
**Acceptance scenarios:** see ### US-18.3 under Acceptance Criteria

### US-18.4: Vehicles go out of service from maintenance needs

**As a** signed-in admin, area admin, or maintenance user
**I want** a vehicle to be out of service while it has an open or in-progress maintenance need marked out of service, and available again once that need is completed or canceled
**So that** maintenance needs are reflected in a vehicle's status

**Priority:** P1
**Independent test:** Completing a vehicle's only out-of-service maintenance need makes that vehicle available again
**Acceptance scenarios:** see ### US-18.4 under Acceptance Criteria

### US-18.5: Track when service is due

**As a** signed-in admin, area admin, or maintenance user
**I want** each vehicle's next service for each service type worked out from its last service log of that type, its estimated current mileage, and the service type's mile and day frequencies
**So that** service due dates are always up to date without anyone tracking them by hand

**Priority:** P1
**Independent test:** Logging a service resets the miles and days until that service type is next due for that vehicle
**Acceptance scenarios:** see ### US-18.5 under Acceptance Criteria

### US-18.6: Only assign available vehicles

**As a** signed-in admin or area admin
**I want** the system to stop me from assigning a vehicle that is retired, out of service, or already booked for an overlapping trip
**So that** a reserved trip never ends up with a vehicle that can't be used

**Priority:** P1
**Independent test:** Assigning an out-of-service vehicle to a request is rejected, even when sent directly to the API
**Acceptance scenarios:** see ### US-18.6 under Acceptance Criteria

### US-18.7: Warn when service will be due during a trip

**As a** signed-in admin or area admin
**I want to** be warned when assigning a vehicle whose service will come due during the trip, whether by miles (the estimated mileage of the trip puts the vehicle past the next due mileage for the service) or date (based on end date of the trip)
**So that** I pick a vehicle that won't need service mid-trip

**Priority:** P1
**Independent test:** A vehicle due for service before the trip's end date shows a "Service Due" warning in the assign modal
**Acceptance scenarios:** see ### US-18.7 under Acceptance Criteria

### US-18.8: Warn when a license plate expires before a trip ends

**As a** signed-in admin or area admin
**I want to** be warned when assigning a vehicle whose license plate is expired or expires before the trip ends
**So that** I don't assign a vehicle with expired tags

**Priority:** P2
**Independent test:** A vehicle whose plate expires the day before a trip ends shows a warning in the assign dialog
**Acceptance scenarios:** see ### US-18.8 under Acceptance Criteria

### US-18.9: See problems with vehicles already assigned to a request

**As a** signed-in admin or area admin
**I want to** see a warning on a request for each assigned vehicle that has become unavailable or will be due for service during the trip (including when a request's date or destinations/mileage change)
**So that** I can swap vehicles before the trip happens

**Priority:** P1
**Independent test:** Marking an assigned vehicle out of service shows a warning on that vehicle in the request's Vehicles section
**Acceptance scenarios:** see ### US-18.9 under Acceptance Criteria

### US-18.10: Find requests whose vehicles have problems

**As a** signed-in admin or area admin
**I want to** see which requests on the admin request list have an assigned vehicle with a problem, and filter to just those requests
**So that** I can fix upcoming trips without opening each request

**Priority:** P2
**Independent test:** A reserved request with an out-of-service vehicle is flagged on the list and appears when filtering by requests with problematic vehicles
**Acceptance scenarios:** see ### US-18.10 under Acceptance Criteria

### US-18.11: Warn when taking a booked vehicle out of service

**As a** signed-in admin, area admin, or maintenance user
**I want to** be told which upcoming trips a vehicle is assigned to when I mark one of its maintenance needs out of service
**So that** I know the out-of-service decision affects real trips and whoever manages those trips can be told

**Priority:** P1
**Independent test:** Setting a maintenance need to out of service for a vehicle on an upcoming reserved trip shows that trip in a warning
**Acceptance scenarios:** see ### US-18.11 under Acceptance Criteria

### US-18.12: Warn before retiring a booked vehicle

**As a** signed-in admin or area admin
**I want to** be warned (and see the affected requests) before I retire a vehicle that is assigned to upcoming trips
**So that** I don't silently leave a reserved trip without a usable vehicle

**Priority:** P2
**Independent test:** Retiring a vehicle that is assigned to an upcoming trip shows that trip before saving
**Acceptance scenarios:** see ### US-18.12 under Acceptance Criteria

### US-18.13: Maintenance users see vehicles needing attention

**As a** signed-in maintenance user
**I want** one list of vehicles that are out of service, overdue for service, or due soon, and to be able to open each one's status page
**So that** I know what to work on first

**Priority:** P1
**Independent test:** A maintenance user sees an overdue vehicle on the "Needs Attention" list and can open its status page
**Acceptance scenarios:** see ### US-18.13 under Acceptance Criteria

### US-18.14: Estimate current mileage from trips

**As a** signed-in admin, area admin, or maintenance user
**I want** a vehicle's current mileage to be its most recent odometer reading plus the estimated miles of every trip it has made since that reading
**So that** service due dates stay accurate even when mileage logs aren't entered regularly

**Priority:** P1
**Independent test:** A vehicle with a 12,000-mile reading and one later completed 150-mile trip shows a current mileage of 12,150
**Acceptance scenarios:** see ### US-18.14 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: Only `admin`, `area_admin`, and `maintenance` users can see vehicle status, and area admins see only their own areas' vehicles. Maintenance users can read vehicles but not create, edit, or delete them.
- **FR-002**: Each vehicle shows one status, using the first that applies: Retired, Out of Service (an open or in-progress maintenance need marked out of service), Service Overdue, Plate Expired, Service Due Soon (within 500 miles or 14 days), Available.
- **FR-003**: Estimated current mileage is the latest mileage log reading plus the estimated miles of every completed trip the vehicle has made since that reading. Trips with unknown miles add 0.
- **FR-004**: Each service type is next due at the vehicle's last service of that type plus the type's mile or day frequency. A vehicle never serviced for a type counts from its purchase date and its initial mileage (default to 0)
- **FR-005**: Assigning a vehicle that is retired, out of service, or booked for an overlapping trip returns `400`. Vehicles already on the request are not rejected.
- **FR-006**: Vehicles whose service comes due or whose plate expires during the trip are flagged but can still be assigned. These flags and FR-005's problems show in the assign dialog and on the request.

---

## Assumptions

- Area admins only see vehicles and flags for their own areas.
- Maintenance users can access GET /api/vehicles
- Issue reports do not change a vehicle's status. Only maintenance needs do.
- Service types cannot be deleted if they are used by service logs.

## Edge Cases

N/A

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: Signed-in admin, area admin, and maintenance user can create, view, edit, and delete service logs on one screen.
- **SC-003**: `npm test` passes for service logs API and service logs view behavior.

---

## Data Ownership & Isolation

No new data introduced in this feature.

---

## API Requirements

No new API endpoints required for this feature.

---

## Screen Requirements

Most views only get slight updates. There are very few new views.

### [View: Vehicle List]

**Single Vue view** (`Vehicles.vue`) — no sidebar / main-panel split.

- The current red/yellow/green status chips should be replaced with the six different statuses.
- There should be a new filter by status, make, model, color, year.
- Maintenance users can see vehicles, but should have read-only access
- There should be a filter for "Needs Attention" that shows vehicles that need servicing, renewed license plates, etc.

### [View: Vehicle Page]

- This page needs to be more than just an edit page.
  - Maintenance users can see this page, but cannot edit it. They can edit the mileage and service log though
- It needs a new status section with:
  - The status chip and the reasons it has that status
  - Estimated mileage (and how it's being calculated)
  - Open out-of-service maintenance needs
  - When each kind of service will be due on the vehicle (miles left, due date, overdue/due-soon, never serviced) etc
  - Upcoming trips
- Changing a vehicle's status to retired when it has upcoming trips should open a confirmation dialog that lists the upcoming trips
- Add sections for mileage log and service log. They're currently just linked to from this page. The last few entries should be shown on this page, with a link to the full page. Maintenance users get access to both.
- Change the overall style of this page to match the driver's form (for example)

### [Dialog: Assign Vehicles] - `AssignVehiclesDialog.vue`

- Unavailable vehicles can't be selected. If a vehicle is out of service or already booked, they should be shown, but with a message as to why they're disabled.
- If a vehicle has already been assigned but is now unavailable, there should be a warning
- Warnings include service due by date or miles, a license plate expiring during the trip
- The subtitle that says "Service in \_\_\_ miles" should show the due date for service too
- The service filter needs to check for due dates between the trip's start/end date

### [Card: Reqest Page Vehicle's Card] - ` Request.vue`

- Warnings for each assigned vehicle, matching the style of the current capacity warning
- Don't show these warnings for past requests that are cancelled, denied, returned, etc.

### [View: Admin Request List] - `Admin/Requests.vue`

- Any request with vehicle problems should be flagged
- There should be a filter for requests with vehicles that have problems

### [View: Maintenance Need Form] - `MaintenanceNeedsForm.vue`

- If the user has selected a vehicle, set out of service to true, and the form has a status of open or in progress, show that vehicle's upcoming trips so the maintenance user is aware
- Update the vehicle select dropdown to show the vehicle status

---

## Key Entities

- No new entities

---

## Data Model Requirements

- No new data

---

## Acceptance Criteria (Gherkin)

### US-18.1 — See vehicle status on the vehicle list

#### Scenario: Vehicle list displays in-depth status of each vehicle

- **Given**: I am a signed-in user with access to the vehicle list page
- **When**: I look at a vehicle row
- **Then**: I see the updated status of each vehicle

---

### US-18.2 — Filter vehicles by status

#### Scenario: Vehicle list can be filtered

- **Given**: I am signed in as a user with access to the vehicle list and have vehicles
- **When**: I search or filter vehicles
- **Then**: the list updates accordingly

---

### US-18.3 — See why a vehicle has its status

#### Scenario: Vehicle page has explanation of status

- **Given**: I am signed in with access to a vehicle page
- **When**: I open the vehicle page
- **Then**: then I see its estimated current mileage (and how it's being calculated), its current out-of-service maintenance needs, and when each service type is due next

---

### US-18.4 — Vehicles go out of service from maintenance needs

#### Scenario: Maintenance needs take vehicle out of service

- **Given**: I am signed in with access to maintenance needs and vehicles
- **When**: I make a maintenance need with out of service set to true and an unresolved status
- **Then**: the vehicle is taken out of service and is marked as such when viewing the vehicle or assigning it to a request

---

### US-18.5 — Track when service is due

#### Scenario: Vehicles show when service is next due

- **Given**: I am a signed-in admin, area admin, or maintenance user
- **When**: I look at a vehicle
- **Then**: it shows when each kind of service is next due

---

### US-18.6 — Only assign available vehicles

#### Scenario: Unavailable vehicles cannot be assigned

- **Given**: I am signed in as an admin, area admin
- **When**: I am assigning a vehicle to a request
- **Then**: I see a warning when I try use assign that vehicle to a request

---

### US-18.7 — Warn when service will be due during a trip

#### Scenario: Vehicles that will have service due during a request show a warning

- **Given**: I am signed in with access to a vehicle request
- **When**: I try to assign a vehicle to a request that will make it need service during the trip
- **Then**: I see a warning

---

### US-18.8 — Warn when a license plate expires before a trip ends

#### Scenario: License plate expiring before end of trip gives warning

- **Given**: I am signed in with access to a vehicle request
- **When**: I assign a vehicle whose license plate will expire
- **Then**: I see a warning

---

### US-18.9 — See problems with vehicles already assigned to a request

#### Scenario: Vehicles that have new problems arise after a request has been created handled get surfaced

- **Given**: I am signed in with access to a vehicle request
- **When**: I open a vehicle request
- **Then**: I see any vehicles that have problems with vehicle service, availability, driver license expiration, plate expiration, etc.

---

### US-18.10 — Find requests whose vehicles have problems

#### Scenario: Vehicle Request list shows requests with problematic vehicles

- **Given**: I am signed in with access to a vehicle request
- **When**: I open the vehicle page
- **Then**: I see and can filter to requests with problems

---

### US-18.11 — Warn when taking a booked vehicle out of service

#### Scenario: When a maintenance person (or area admin) takes a vehicle out of service, they're warned about affected requests

- **Given**: I am signed in with access to maintenance needs
- **When**: I take a vehicle out of service
- **Then**: I am warned about any affected trips

---

### US-18.12 — Warn before retiring a booked vehicle

#### Scenario: When a user retires a vehicle, they're warned about affected requests

- **Given**: I am signed in with access to vehicles
- **When**: I retire a vehicle
- **Then**: I am warned about any affected trips

---

### US-18.13 — Maintenance users see vehicles needing attention

#### Scenario: Vehicle list can be filtered to vehicles that need attention

- **Given**: I am signed in as a user with access to vehicles
- **When**: I filter to needs service/maintenance
- **Then**: I see a list of vehicles that need attention

---

### US-18.14 — Estimate current mileage from trips

#### Scenario: Vehicle Current Mileage calculated from trip estimates

- **Given**: I am signed in as a user with access to vehicles
- **When**: I look at a vehicle
- **Then**: I see an estimate of its current mileage based on the most recent mileage entry and the estimate from trips since then

---

## Test Coverage Map

| Story    | Scenario                                                                                                         | Test file                              | Test name                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| US-18.1  | Vehicle list displays in-depth status of each vehicle                                                            | `backend/tests/vehicleStatus.test.js`  | `Vehicle list displays in-depth status of each vehicle`                                                            |
| US-18.1  | Vehicle list displays in-depth status of each vehicle                                                            | `frontend/tests/VehicleStatus.test.js` | `Vehicle list displays in-depth status of each vehicle`                                                            |
| US-18.1  | Vehicle with an open out-of-service maintenance need shows Out of Service                                        | `frontend/tests/VehicleStatus.test.js` | `Vehicle with an open out-of-service maintenance need shows Out of Service`                                        |
| US-18.1  | Vehicle with nothing due shows Available                                                                         | `backend/tests/vehicleStatus.test.js`  | `Vehicle with nothing due shows Available`                                                                         |
| US-18.1  | Retired vehicle shows Retired even with an out-of-service maintenance need                                       | `backend/tests/vehicleStatus.test.js`  | `Retired vehicle shows Retired even with an out-of-service maintenance need`                                       |
| US-18.1  | Out of Service outranks Service Overdue                                                                          | `backend/tests/vehicleStatus.test.js`  | `Out of Service outranks Service Overdue`                                                                          |
| US-18.1  | Service Overdue outranks Plate Expired                                                                           | `backend/tests/vehicleStatus.test.js`  | `Service Overdue outranks Plate Expired`                                                                           |
| US-18.1  | Plate Expired outranks Service Due Soon                                                                          | `backend/tests/vehicleStatus.test.js`  | `Plate Expired outranks Service Due Soon`                                                                          |
| US-18.1  | Plate that expired yesterday shows Plate Expired                                                                 | `backend/tests/vehicleStatus.test.js`  | `Plate that expired yesterday shows Plate Expired`                                                                 |
| US-18.1  | Service within 500 miles shows Service Due Soon                                                                  | `backend/tests/vehicleStatus.test.js`  | `Service within 500 miles shows Service Due Soon`                                                                  |
| US-18.1  | Service within 14 days shows Service Due Soon                                                                    | `backend/tests/vehicleStatus.test.js`  | `Service within 14 days shows Service Due Soon`                                                                    |
| US-18.1  | Service more than 500 miles and 14 days away shows Available                                                     | `backend/tests/vehicleStatus.test.js`  | `Service more than 500 miles and 14 days away shows Available`                                                     |
| US-18.1  | Area admin only sees statuses for their own areas' vehicles                                                      | `backend/tests/vehicleStatus.test.js`  | `Area admin only sees statuses for their own areas' vehicles`                                                      |
| US-18.1  | User without admin, area admin, or maintenance role cannot see vehicle status                                    | `backend/tests/vehicleStatus.test.js`  | `User without admin, area admin, or maintenance role cannot see vehicle status`                                    |
| US-18.1  | Unauthenticated request for vehicle status is rejected                                                           | `backend/tests/vehicleStatus.test.js`  | `Unauthenticated request for vehicle status is rejected`                                                           |
| US-18.2  | Vehicle list can be filtered                                                                                     | `frontend/tests/VehicleStatus.test.js` | `Vehicle list can be filtered`                                                                                     |
| US-18.2  | Filtering by status shows only vehicles with that status                                                         | `frontend/tests/VehicleStatus.test.js` | `Filtering by status shows only vehicles with that status`                                                         |
| US-18.2  | Filtering by make, model, color, and year narrows the list                                                       | `frontend/tests/VehicleStatus.test.js` | `Filtering by make, model, color, and year narrows the list`                                                       |
| US-18.2  | Combined filters show only vehicles matching all of them                                                         | `frontend/tests/VehicleStatus.test.js` | `Combined filters show only vehicles matching all of them`                                                         |
| US-18.2  | Clearing filters shows every vehicle again                                                                       | `frontend/tests/VehicleStatus.test.js` | `Clearing filters shows every vehicle again`                                                                       |
| US-18.2  | Filters that match no vehicles show the empty state                                                              | `frontend/tests/VehicleStatus.test.js` | `Filters that match no vehicles show the empty state`                                                              |
| US-18.3  | Vehicle page has explanation of status                                                                           | `frontend/tests/VehicleStatus.test.js` | `Vehicle page has explanation of status`                                                                           |
| US-18.3  | Vehicle page lists the reasons for the vehicle's status                                                          | `frontend/tests/VehicleStatus.test.js` | `Vehicle page lists the reasons for the vehicle's status`                                                          |
| US-18.3  | Vehicle page lists open out-of-service maintenance needs only                                                    | `backend/tests/vehicleStatus.test.js`  | `Vehicle page lists open out-of-service maintenance needs only`                                                    |
| US-18.3  | Vehicle page lists upcoming trips only                                                                           | `backend/tests/vehicleStatus.test.js`  | `Vehicle page lists upcoming trips only`                                                                           |
| US-18.3  | Vehicle page shows upcoming trips                                                                                | `frontend/tests/VehicleStatus.test.js` | `Vehicle page shows upcoming trips`                                                                                |
| US-18.3  | Vehicle page shows recent mileage and service logs with links to the full pages                                  | `frontend/tests/VehicleStatus.test.js` | `Vehicle page shows recent mileage and service logs with links to the full pages`                                  |
| US-18.3  | Maintenance user sees the vehicle page read-only but can add mileage and service logs                            | `frontend/tests/VehicleStatus.test.js` | `Maintenance user sees the vehicle page read-only but can add mileage and service logs`                            |
| US-18.3  | Maintenance user cannot create, edit, or delete vehicles                                                         | `backend/tests/vehicleStatus.test.js`  | `Maintenance user cannot create, edit, or delete vehicles`                                                         |
| US-18.3  | Vehicle page shows an error when status fails to load                                                            | `frontend/tests/VehicleStatus.test.js` | `Vehicle page shows an error when status fails to load`                                                            |
| US-18.4  | Maintenance needs take vehicle out of service                                                                    | `backend/tests/vehicleStatus.test.js`  | `Maintenance needs take vehicle out of service`                                                                    |
| US-18.4  | Maintenance needs take vehicle out of service                                                                    | `frontend/tests/VehicleStatus.test.js` | `Maintenance needs take vehicle out of service`                                                                    |
| US-18.4  | In-progress out-of-service maintenance need keeps the vehicle out of service                                     | `backend/tests/vehicleStatus.test.js`  | `In-progress out-of-service maintenance need keeps the vehicle out of service`                                     |
| US-18.4  | Completing a vehicle's only out-of-service maintenance need makes it available again                             | `backend/tests/vehicleStatus.test.js`  | `Completing a vehicle's only out-of-service maintenance need makes it available again`                             |
| US-18.4  | Canceling a vehicle's only out-of-service maintenance need makes it available again                              | `backend/tests/vehicleStatus.test.js`  | `Canceling a vehicle's only out-of-service maintenance need makes it available again`                              |
| US-18.4  | Vehicle stays out of service while another out-of-service need is open                                           | `backend/tests/vehicleStatus.test.js`  | `Vehicle stays out of service while another out-of-service need is open`                                           |
| US-18.4  | Open maintenance need not marked out of service leaves the vehicle available                                     | `backend/tests/vehicleStatus.test.js`  | `Open maintenance need not marked out of service leaves the vehicle available`                                     |
| US-18.4  | Issue reports do not change a vehicle's status                                                                   | `backend/tests/vehicleStatus.test.js`  | `Issue reports do not change a vehicle's status`                                                                   |
| US-18.5  | Vehicles show when service is next due                                                                           | `backend/tests/vehicleStatus.test.js`  | `Vehicles show when service is next due`                                                                           |
| US-18.5  | Vehicles show when service is next due                                                                           | `frontend/tests/VehicleStatus.test.js` | `Vehicles show when service is next due`                                                                           |
| US-18.5  | Logging a service resets when that service type is next due                                                      | `backend/tests/vehicleStatus.test.js`  | `Logging a service resets when that service type is next due`                                                      |
| US-18.5  | Next due uses the most recent service log of that type                                                           | `backend/tests/vehicleStatus.test.js`  | `Next due uses the most recent service log of that type`                                                           |
| US-18.5  | Service logs of another type do not change a service type's due date                                             | `backend/tests/vehicleStatus.test.js`  | `Service logs of another type do not change a service type's due date`                                             |
| US-18.5  | Never-serviced vehicle counts from its purchase date and initial mileage                                         | `backend/tests/vehicleStatus.test.js`  | `Never-serviced vehicle counts from its purchase date and initial mileage`                                         |
| US-18.5  | Service is due at whichever of the mile or day frequency comes first                                             | `backend/tests/vehicleStatus.test.js`  | `Service is due at whichever of the mile or day frequency comes first`                                             |
| US-18.5  | Service type with only a day frequency is due by date only                                                       | `backend/tests/vehicleStatus.test.js`  | `Service type with only a day frequency is due by date only`                                                       |
| US-18.5  | Service type with only a mile frequency is due by miles only                                                     | `backend/tests/vehicleStatus.test.js`  | `Service type with only a mile frequency is due by miles only`                                                     |
| US-18.5  | Service type with no frequencies is never due                                                                    | `backend/tests/vehicleStatus.test.js`  | `Service type with no frequencies is never due`                                                                    |
| US-18.5  | Vehicle page marks each service type overdue, due soon, or never serviced                                        | `frontend/tests/VehicleStatus.test.js` | `Vehicle page marks each service type overdue, due soon, or never serviced`                                        |
| US-18.6  | Unavailable vehicles cannot be assigned                                                                          | `backend/tests/vehicleStatus.test.js`  | `Unavailable vehicles cannot be assigned`                                                                          |
| US-18.6  | Unavailable vehicles cannot be assigned                                                                          | `frontend/tests/VehicleStatus.test.js` | `Unavailable vehicles cannot be assigned`                                                                          |
| US-18.6  | Assigning an out-of-service vehicle returns 400                                                                  | `backend/tests/vehicleStatus.test.js`  | `Assigning an out-of-service vehicle returns 400`                                                                  |
| US-18.6  | Assigning a retired vehicle returns 400                                                                          | `backend/tests/vehicleStatus.test.js`  | `Assigning a retired vehicle returns 400`                                                                          |
| US-18.6  | Assigning a vehicle booked for an overlapping trip returns 400                                                   | `backend/tests/vehicleStatus.test.js`  | `Assigning a vehicle booked for an overlapping trip returns 400`                                                   |
| US-18.6  | Vehicle on a cancelled or denied overlapping request can be assigned                                             | `backend/tests/vehicleStatus.test.js`  | `Vehicle on a cancelled or denied overlapping request can be assigned`                                             |
| US-18.6  | Vehicle booked for a non-overlapping trip can be assigned                                                        | `backend/tests/vehicleStatus.test.js`  | `Vehicle booked for a non-overlapping trip can be assigned`                                                        |
| US-18.6  | Vehicles shown as booked in the assign dialog are the ones assignment rejects                                    | `backend/tests/vehicleStatus.test.js`  | `Vehicles shown as booked in the assign dialog are the ones assignment rejects`                                    |
| US-18.6  | Vehicle already on the request is not rejected after it becomes unavailable                                      | `backend/tests/vehicleStatus.test.js`  | `Vehicle already on the request is not rejected after it becomes unavailable`                                      |
| US-18.6  | Out-of-service, retired, and booked vehicles are shown disabled with the reason                                  | `frontend/tests/VehicleStatus.test.js` | `Out-of-service, retired, and booked vehicles are shown disabled with the reason`                                  |
| US-18.6  | Already-assigned vehicle that became unavailable shows a warning in the assign dialog                            | `frontend/tests/VehicleStatus.test.js` | `Already-assigned vehicle that became unavailable shows a warning in the assign dialog`                            |
| US-18.6  | Assign dialog shows the error when assignment is rejected                                                        | `frontend/tests/VehicleStatus.test.js` | `Assign dialog shows the error when assignment is rejected`                                                        |
| US-18.7  | Vehicles that will have service due during a request show a warning                                              | `backend/tests/vehicleStatus.test.js`  | `Vehicles that will have service due during a request show a warning`                                              |
| US-18.7  | Vehicles that will have service due during a request show a warning                                              | `frontend/tests/VehicleStatus.test.js` | `Vehicles that will have service due during a request show a warning`                                              |
| US-18.7  | Service coming due by date before the trip ends is flagged                                                       | `backend/tests/vehicleStatus.test.js`  | `Service coming due by date before the trip ends is flagged`                                                       |
| US-18.7  | Service coming due by miles during the trip is flagged                                                           | `backend/tests/vehicleStatus.test.js`  | `Service coming due by miles during the trip is flagged`                                                           |
| US-18.7  | Service due after the trip is not flagged                                                                        | `backend/tests/vehicleStatus.test.js`  | `Service due after the trip is not flagged`                                                                        |
| US-18.7  | Trip with unknown mileage is only checked by date                                                                | `backend/tests/vehicleStatus.test.js`  | `Trip with unknown mileage is only checked by date`                                                                |
| US-18.7  | Vehicle with service due during the trip can still be assigned                                                   | `backend/tests/vehicleStatus.test.js`  | `Vehicle with service due during the trip can still be assigned`                                                   |
| US-18.7  | Assign dialog subtitle shows the service due date and miles                                                      | `frontend/tests/VehicleStatus.test.js` | `Assign dialog subtitle shows the service due date and miles`                                                      |
| US-18.7  | Service filter includes vehicles due between the trip's start and end dates                                      | `frontend/tests/VehicleStatus.test.js` | `Service filter includes vehicles due between the trip's start and end dates`                                      |
| US-18.8  | License plate expiring before end of trip gives warning                                                          | `backend/tests/vehicleStatus.test.js`  | `License plate expiring before end of trip gives warning`                                                          |
| US-18.8  | License plate expiring before end of trip gives warning                                                          | `frontend/tests/VehicleStatus.test.js` | `License plate expiring before end of trip gives warning`                                                          |
| US-18.8  | Plate expiring the day before the trip ends is flagged                                                           | `backend/tests/vehicleStatus.test.js`  | `Plate expiring the day before the trip ends is flagged`                                                           |
| US-18.8  | Already-expired plate is flagged                                                                                 | `backend/tests/vehicleStatus.test.js`  | `Already-expired plate is flagged`                                                                                 |
| US-18.8  | Plate expiring after the trip ends is not flagged                                                                | `backend/tests/vehicleStatus.test.js`  | `Plate expiring after the trip ends is not flagged`                                                                |
| US-18.8  | Vehicle with an expiring plate can still be assigned                                                             | `backend/tests/vehicleStatus.test.js`  | `Vehicle with an expiring plate can still be assigned`                                                             |
| US-18.9  | Vehicles that have new problems arise after a request has been created handled get surfaced                      | `backend/tests/vehicleStatus.test.js`  | `Vehicles that have new problems arise after a request has been created handled get surfaced`                      |
| US-18.9  | Vehicles that have new problems arise after a request has been created handled get surfaced                      | `frontend/tests/VehicleStatus.test.js` | `Vehicles that have new problems arise after a request has been created handled get surfaced`                      |
| US-18.9  | Marking an assigned vehicle out of service flags it on the request                                               | `backend/tests/vehicleStatus.test.js`  | `Marking an assigned vehicle out of service flags it on the request`                                               |
| US-18.9  | Retiring an assigned vehicle flags it on the request                                                             | `backend/tests/vehicleStatus.test.js`  | `Retiring an assigned vehicle flags it on the request`                                                             |
| US-18.9  | Moving a request's dates onto another trip with the same vehicle flags the vehicle                               | `backend/tests/vehicleStatus.test.js`  | `Moving a request's dates onto another trip with the same vehicle flags the vehicle`                               |
| US-18.9  | Moving a request's end date past a service due date flags the vehicle                                            | `backend/tests/vehicleStatus.test.js`  | `Moving a request's end date past a service due date flags the vehicle`                                            |
| US-18.9  | Changing a request's destinations so the trip passes the next due mileage flags the vehicle                      | `backend/tests/vehicleStatus.test.js`  | `Changing a request's destinations so the trip passes the next due mileage flags the vehicle`                      |
| US-18.9  | Requester viewing their own request does not get vehicle problems                                                | `backend/tests/vehicleStatus.test.js`  | `Requester viewing their own request does not get vehicle problems`                                                |
| US-18.9  | Each problem shows as a warning on its vehicle in the request's Vehicles section                                 | `frontend/tests/VehicleStatus.test.js` | `Each problem shows as a warning on its vehicle in the request's Vehicles section`                                 |
| US-18.9  | Past, cancelled, denied, and returned requests do not show vehicle warnings                                      | `frontend/tests/VehicleStatus.test.js` | `Past, cancelled, denied, and returned requests do not show vehicle warnings`                                      |
| US-18.10 | Vehicle Request list shows requests with problematic vehicles                                                    | `backend/tests/vehicleStatus.test.js`  | `Vehicle Request list shows requests with problematic vehicles`                                                    |
| US-18.10 | Vehicle Request list shows requests with problematic vehicles                                                    | `frontend/tests/VehicleStatus.test.js` | `Vehicle Request list shows requests with problematic vehicles`                                                    |
| US-18.10 | Filtering to requests with vehicle problems shows only flagged requests                                          | `frontend/tests/VehicleStatus.test.js` | `Filtering to requests with vehicle problems shows only flagged requests`                                          |
| US-18.10 | Past, cancelled, denied, and returned requests are not flagged                                                   | `backend/tests/vehicleStatus.test.js`  | `Past, cancelled, denied, and returned requests are not flagged`                                                   |
| US-18.10 | Area admin only sees vehicle problem flags for their own areas                                                   | `backend/tests/vehicleStatus.test.js`  | `Area admin only sees vehicle problem flags for their own areas`                                                   |
| US-18.11 | When a maintenance person (or area admin) takes a vehicle out of service, they're warned about affected requests | `frontend/tests/VehicleStatus.test.js` | `When a maintenance person (or area admin) takes a vehicle out of service, they're warned about affected requests` |
| US-18.11 | Maintenance user can see a vehicle's upcoming trips                                                              | `backend/tests/vehicleStatus.test.js`  | `Maintenance user can see a vehicle's upcoming trips`                                                              |
| US-18.11 | Upcoming trips are not shown when out of service is off                                                          | `frontend/tests/VehicleStatus.test.js` | `Upcoming trips are not shown when out of service is off`                                                          |
| US-18.11 | Upcoming trips are not shown for a completed or canceled need                                                    | `frontend/tests/VehicleStatus.test.js` | `Upcoming trips are not shown for a completed or canceled need`                                                    |
| US-18.11 | Changing the selected vehicle updates the upcoming trips shown                                                   | `frontend/tests/VehicleStatus.test.js` | `Changing the selected vehicle updates the upcoming trips shown`                                                   |
| US-18.11 | Vehicle with no upcoming trips shows no warning                                                                  | `frontend/tests/VehicleStatus.test.js` | `Vehicle with no upcoming trips shows no warning`                                                                  |
| US-18.11 | Maintenance need vehicle dropdown shows each vehicle's status                                                    | `frontend/tests/VehicleStatus.test.js` | `Maintenance need vehicle dropdown shows each vehicle's status`                                                    |
| US-18.12 | When a user retires a vehicle, they're warned about affected requests                                            | `frontend/tests/VehicleStatus.test.js` | `When a user retires a vehicle, they're warned about affected requests`                                            |
| US-18.12 | Retiring a vehicle with no upcoming trips saves without confirmation                                             | `frontend/tests/VehicleStatus.test.js` | `Retiring a vehicle with no upcoming trips saves without confirmation`                                             |
| US-18.12 | Canceling the retire confirmation does not save                                                                  | `frontend/tests/VehicleStatus.test.js` | `Canceling the retire confirmation does not save`                                                                  |
| US-18.12 | Confirming the retire confirmation saves the vehicle                                                             | `frontend/tests/VehicleStatus.test.js` | `Confirming the retire confirmation saves the vehicle`                                                             |
| US-18.12 | Retiring a vehicle assigned to upcoming trips still succeeds                                                     | `backend/tests/vehicleStatus.test.js`  | `Retiring a vehicle assigned to upcoming trips still succeeds`                                                     |
| US-18.13 | Vehicle list can be filtered to vehicles that need attention                                                     | `frontend/tests/VehicleStatus.test.js` | `Vehicle list can be filtered to vehicles that need attention`                                                     |
| US-18.13 | Needs Attention includes out-of-service, overdue, due-soon, and plate-expired vehicles                           | `frontend/tests/VehicleStatus.test.js` | `Needs Attention includes out-of-service, overdue, due-soon, and plate-expired vehicles`                           |
| US-18.13 | Needs Attention excludes available and retired vehicles                                                          | `frontend/tests/VehicleStatus.test.js` | `Needs Attention excludes available and retired vehicles`                                                          |
| US-18.13 | Maintenance user can open a vehicle's status page from the list                                                  | `frontend/tests/VehicleStatus.test.js` | `Maintenance user can open a vehicle's status page from the list`                                                  |
| US-18.13 | Maintenance user sees no create, edit, or delete actions on the vehicle list                                     | `frontend/tests/VehicleStatus.test.js` | `Maintenance user sees no create, edit, or delete actions on the vehicle list`                                     |
| US-18.14 | Vehicle Current Mileage calculated from trip estimates                                                           | `backend/tests/vehicleStatus.test.js`  | `Vehicle Current Mileage calculated from trip estimates`                                                           |
| US-18.14 | Vehicle Current Mileage calculated from trip estimates                                                           | `frontend/tests/VehicleStatus.test.js` | `Vehicle Current Mileage calculated from trip estimates`                                                           |
| US-18.14 | Latest reading is the most recent by recorded date                                                               | `backend/tests/vehicleStatus.test.js`  | `Latest reading is the most recent by recorded date`                                                               |
| US-18.14 | Trips before the latest reading are not added                                                                    | `backend/tests/vehicleStatus.test.js`  | `Trips before the latest reading are not added`                                                                    |
| US-18.14 | Trips with unknown miles add 0                                                                                   | `backend/tests/vehicleStatus.test.js`  | `Trips with unknown miles add 0`                                                                                   |
| US-18.14 | Cancelled, denied, and upcoming trips are not added                                                              | `backend/tests/vehicleStatus.test.js`  | `Cancelled, denied, and upcoming trips are not added`                                                              |
| US-18.14 | Vehicle with no mileage logs starts from its initial mileage                                                     | `backend/tests/vehicleStatus.test.js`  | `Vehicle with no mileage logs starts from its initial mileage`                                                     |
| US-18.14 | Vehicle page explains how current mileage was estimated                                                          | `frontend/tests/VehicleStatus.test.js` | `Vehicle page explains how current mileage was estimated`                                                          |

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-003** satisfied)
- [ ] **Success Criteria (SC-001**–**SC-003)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

---

## Delivered to later features

- A service log db table
- `GET /api/service-logs` returns every service log for any valid session with `admin`, `area_admin`, or `maintenance` role
- `GET /api/service-logs/vehicle/:vehicleId` returns every service log for a vehicle for any valid session with `admin`, `area_admin`, or `maintenance` role
