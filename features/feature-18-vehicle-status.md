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
**I want** each vehicle's next service for each service type worked out from its last service log of that type, its estimated current mileage (US-18.16), and the service type's mile and day frequencies
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

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.3 — See why a vehicle has its status

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.4 — Vehicles go out of service from maintenance needs

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.5 — Track when service is due

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.6 — Only assign available vehicles

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.7 — Warn when service will be due during a trip

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.8 — Warn when a license plate expires before a trip ends

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.9 — See problems with vehicles already assigned to a request

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.10 — Find requests whose vehicles have problems

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.11 — Warn when taking a booked vehicle out of service

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.12 — Warn before retiring a booked vehicle

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.13 — Maintenance users see vehicles needing attention

#### Scenario:

- **Given**
- **When**
- **Then**

---

### US-18.14 — Estimate current mileage from trips

#### Scenario:

- **Given**
- **When**
- **Then**

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
| ----- | -------- | --------- | --------- |

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
