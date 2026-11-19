# Feature: Driver Sign-up

**Feature ID:** 20
**Branch pattern:** `feature/20-driver-sign-up`
**Status:** Draft
**Created:** 2026-11-12
**Input:** A signed-in user signs up as a driver with their name, phone number, and license. An admin or area admin still approves them on the drivers page.
**Depends on:** Feature 1 [Users], Feature 3 [Roles], Feature 7 [Drivers]

---

## User Stories

### US-20.1: Sign up as a driver

**As a** signed-in user
**I want to** sign up as a driver with my name, phone number, license state, and license expiration date
**So that** I can be chosen on a vehicle request after an admin or area admin approves me

**Priority:** P1
**Independent test:** Open driver sign-up, submit the form; a pending driver is saved for the signed-in user
**Acceptance scenarios:** see ### US-20.1 under Acceptance Criteria

### US-20.2: See my driver status

**As a** signed-in user
**I want to** see whether I have a driver record and what its status is
**So that** I know if I am still waiting to be approved

**Priority:** P1
**Independent test:** Open driver sign-up with an existing driver and see the status; with no driver, see the empty form
**Acceptance scenarios:** see ### US-20.2 under Acceptance Criteria

### US-20.3: Update my driver details

**As a** signed-in user
**I want to** update my name, phone number, and license
**So that** my driver record stays current

**Priority:** P2
**Independent test:** Change the license expiration on an existing driver and save; the status stays the same
**Acceptance scenarios:** see ### US-20.3 under Acceptance Criteria

### US-20.4: Only my own driver record

**As a** signed-in user
**I want** driver sign-up to show and change only my own driver
**So that** I cannot see or edit someone else's license

**Priority:** P2
**Independent test:** An unsigned visit redirects to `/login`; each signed-in user receives only the driver linked to them
**Acceptance scenarios:** see ### US-20.4 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: `GET`, `POST`, and `PUT /api/me/driver` MUST require a valid session. Any signed-in user may use them. There is no driver role.
- **FR-002**: Sign-up writes the Feature 7 `drivers` table. `id` is assigned by the database. `userId` is the signed-in user. A `userId`, `status`, or `approvedAt` in the body MUST be ignored.
- **FR-003**: Create MUST save `status` as `pending` and `approvedAt` as null. The user cannot approve, deny, revoke, or mark themselves former.
- **FR-004**: A user has at most one driver. A second create MUST be rejected. Opening the page when a driver already exists shows that driver for update.
- **FR-005**: `firstName` and `lastName` MUST be trimmed. An empty value MUST be rejected. A value longer than 255 characters after trim MUST be rejected. The form starts with the signed-in user's first and last name, and the user may change them.
- **FR-006**: `phoneNumber` MUST be trimmed, required, unique, and in format `xxx-xxx-xxxx`. Saving the driver's own current number is allowed.
- **FR-007**: `licenseState` MUST be one of the 50 states and `DC`. The form preselects `OK`. `licenseExpirationDate` MUST be a real date in format `yyyy-mm-dd`. A past date MUST be accepted.
- **FR-008**: An update MAY change `firstName`, `lastName`, `phoneNumber`, `licenseState`, and `licenseExpirationDate`. It MUST NOT change `userId`, `status`, or `approvedAt`. A field left out of the body keeps its stored value.
- **FR-009**: `GET /api/me/driver` returns the signed-in user's driver, or `404` when they have none. It MUST NOT return another user's driver.
- **FR-010**: A driver created here is selectable on a vehicle request only under Feature 7's rule: status `approved` and a license expiration date of today or later. Sign-up does not change that rule.
- **FR-011**: Feature 7's `/api/drivers` routes stay limited to admin and area admin. Sign-up does not open those routes to every user.

---

## Assumptions

- This is the sign-up Feature 7 left out of scope ("Letting users request to make themselves drivers").
- Approval stays on the Feature 7 driver form. An admin or area admin sets `approved`, `denied`, `revoked`, or `former`, and the server still sets `approvedAt`.
- Updating your own license or phone does not change status. An admin reviews the driver on the drivers page.
- The same validation messages as Feature 7 apply to these fields.
- An empty required field on the form shows **Required field.** A request that still reaches the API uses the messages in the error table.
- **License expiration** is a calendar field (`type="date"`). The browser shows the local date format, and the saved value is `yyyy-mm-dd`.
- There is no new table and no new role.

## Edge Cases

- Empty or whitespace-only first name, last name, phone number, license state, or expiration date → `400`.
- First or last name longer than 255 characters → `400`.
- Phone number not in format `xxx-xxx-xxxx` → `400`.
- Phone number already used by another driver → `400`.
- License state not a state abbreviation → `400`.
- Expiration date not a real `yyyy-mm-dd` date → `400`.
- Past license expiration date → accepted.
- Body `userId` for a different user → ignored; the row is linked to the signed-in user.
- Body `status` of `approved` on create → ignored; the row is `pending` and `approvedAt` is null.
- Body `status` on update → ignored; the stored status stays.
- Second create for the same user → `400`.
- Update when the user has no driver → `404`.
- Unsigned page visit → redirect to `/login`.
- Unsigned API request → `401`.

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: A signed-in user can sign up and see a pending driver linked to themselves.
- **SC-003**: A signed-in user cannot set their own status or read another user's driver.
- **SC-004**: `npm test` passes for driver sign-up API and driver sign-up view behavior.

---

## Data Ownership & Isolation

Any signed-in user may create and update the one driver linked to themselves, and may read that driver. They may not list, read, or change other drivers through these routes. Admin and area admin management of every driver stays on Feature 7.

| Rule | Requirement |
| ---- | ----------- |
| **Read scope** | `GET /api/me/driver` requires a Bearer token and returns only the signed-in user's driver. |
| **Create scope** | `POST /api/me/driver` requires a Bearer token and always sets `userId` from the session. |
| **Update scope** | `PUT /api/me/driver` requires a Bearer token and updates only that user's driver. |

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/me/driver` | Any signed-in user | Fetch the signed-in user's driver |
| `POST` | `/api/me/driver` | Any signed-in user | Sign up as a driver |
| `PUT` | `/api/me/driver` | Any signed-in user | Update the signed-in user's driver |

**Sign-up request body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "405-425-1234",
  "licenseState": "OK",
  "licenseExpirationDate": "2027-09-01"
}
```

The same keys are accepted with underscores (`first_name`, `last_name`, `phone_number`, `license_state`, `license_expiration_date`).

**Driver success response** (`200` / `201`):

```json
{
  "id": 1,
  "userId": 4,
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "405-425-1234",
  "licenseState": "OK",
  "licenseExpirationDate": "2027-09-01",
  "status": "pending",
  "approvedAt": null,
  "createdAt": "2026-11-12T12:00:00.000Z",
  "updatedAt": "2026-11-12T12:00:00.000Z"
}
```

`userId` in the response is the signed-in user's id.

**Error response:** `{ "message": "Human-readable explanation." }`

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Missing or whitespace-only first name, last name, phone number, license state, or expiration date | `400` | `{ "message": "Missing first name." }` and the matching message for that field |
| First or last name longer than 255 characters after trim | `400` | `{ "message": "First name too long." }` or `{ "message": "Last name too long." }` |
| Phone number not in format `xxx-xxx-xxxx` | `400` | `{ "message": "Phone number must be in format 'xxx-xxx-xxxx'." }` |
| Phone number used by another driver | `400` | `{ "message": "Phone number already taken." }` |
| License state is not a state abbreviation | `400` | `{ "message": "Invalid license state." }` |
| Expiration date is not a real `yyyy-mm-dd` date | `400` | `{ "message": "License expiration date must be in format 'yyyy-mm-dd'." }` |
| The user already has a driver | `400` | `{ "message": "User is already linked to a driver." }` |
| `GET` or `PUT` when the user has no driver | `404` | `{ "message": "No driver record." }` |

---

## Screen Requirements

### [View: Driver sign-up] — route name `driverSignUp`, path `/driver-sign-up` (`DriverSignUp.vue`)

- Nav label **Driver sign-up**, group **Trips**, icon `mdi-account-plus-outline`
- No `meta.roles`, so any signed-in user sees the link. An unsigned visit redirects to `/login`
- Heading: **Driver sign-up**
- With no driver: fields **First name**, **Last name**, **Phone number**, **License state**, and **License expiration**. First and last name start as the signed-in user's name. License state starts as `OK`. Primary action: **Sign up**
- With a driver: the same fields, filled from that driver, plus the status as text: **Pending**, **Approved**, **Denied**, **Revoked**, or **Former**. There is no status control. Primary action: **Save**
- **Cancel** returns home (`/`)
- A failed save shows its message and stays on the page
- Empty required fields show **Required field.**

---

## Key Entities

- **Driver**: the Feature 7 person who can be selected on a vehicle request. Sign-up creates or updates the one driver linked to the signed-in user. Status still says whether they may be selected.

---

## Data Model Requirements

No new table and no new columns. Sign-up uses the Feature 7 `drivers` table.

| Field | Sign-up rule |
| ----- | ------------ |
| `user_id` | The signed-in user. Unique, so one driver per user |
| `first_name`, `last_name` | Required; trimmed; max 255 |
| `phone_number` | Required; trimmed; unique; format `xxx-xxx-xxxx` |
| `license_state` | Required; a state abbreviation, including `DC` |
| `license_expiration_date` | Required; `yyyy-mm-dd`; past dates allowed |
| `status` | `pending` on create. Unchanged on the user's update |
| `approved_at` | Null on create. Unchanged on the user's update |

---

## Acceptance Criteria (Gherkin)

### US-20.1 — Sign up as a driver

#### Scenario: Signed-in user opens driver sign-up

- **Given** I am signed in
- **When** I open the app
- **Then** I can open **Driver sign-up** and see the name, phone, and license fields

#### Scenario: Driver sign-up saves a pending driver

- **Given** I am signed in and have no driver
- **When** I submit a valid sign-up
- **Then** a driver is saved with my user id, status `pending`, and `approvedAt` null

#### Scenario: Names are filled in from the user

- **Given** I am signed in and have no driver
- **When** I open driver sign-up
- **Then** first name and last name start as my user name

#### Scenario: Cannot submit without required fields

- **Given** I am signed in and have no driver
- **When** I submit a sign-up with a required field missing
- **Then** the request returns 400 with the matching missing-field message

#### Scenario: Invalid phone number is rejected

- **Given** I am signed in and have no driver
- **When** I submit a phone number not in format `xxx-xxx-xxxx`
- **Then** the request returns 400 with `{ "message": "Phone number must be in format 'xxx-xxx-xxxx'." }`

#### Scenario: Duplicate phone number is rejected

- **Given** another driver already has a phone number
- **When** I submit a sign-up with that phone number
- **Then** the request returns 400 with `{ "message": "Phone number already taken." }`

#### Scenario: Past license expiration date is accepted

- **Given** I am signed in and have no driver
- **When** I submit a sign-up with a past license expiration date
- **Then** the driver is saved

#### Scenario: A second sign-up is rejected

- **Given** I already have a driver
- **When** I submit another sign-up
- **Then** the request returns 400 with `{ "message": "User is already linked to a driver." }`

#### Scenario: Client-supplied user and status are ignored

- **Given** I am signed in and have no driver
- **When** I submit a sign-up with another user's id and status `approved`
- **Then** the driver is linked to me, status is `pending`, and `approvedAt` is null

### US-20.2 — See my driver status

#### Scenario: Signed-in user sees their driver status

- **Given** I have a driver with status `pending`
- **When** I open driver sign-up
- **Then** I see **Pending** and my saved name, phone, and license

#### Scenario: User with no driver sees the sign-up form

- **Given** I am signed in and have no driver
- **When** I open driver sign-up
- **Then** I see the empty sign-up form and **Sign up**

### US-20.3 — Update my driver details

#### Scenario: Signed-in user updates their license

- **Given** I have a driver
- **When** I change the license expiration date and save
- **Then** the new date is saved

#### Scenario: Updating a driver does not change status

- **Given** my driver is `approved`
- **When** I update my phone number and send status `pending`
- **Then** the phone number changes and the status stays `approved`

#### Scenario: Saving the same phone number is allowed

- **Given** I have a driver
- **When** I save that same phone number
- **Then** the driver is saved

### US-20.4 — Only my own driver record

#### Scenario: Signed-in user does not see another user's driver

- **Given** another user has a driver
- **When** I fetch my driver
- **Then** I do not receive that user's driver

#### Scenario: Un-signed-in user accesses driver sign-up

- **Given** I am not signed in
- **When** I open `/driver-sign-up`
- **Then** I am redirected to `/login`

#### Scenario: Un-signed-in driver sign-up request is rejected

- **Given** I have no token
- **When** I request `/api/me/driver`
- **Then** the request returns 401 with `{ "message": "Unauthorized! No token provided." }`

#### Scenario: A pending driver is not selectable

- **Given** my driver is `pending`
- **When** selectable drivers are listed
- **Then** my driver is not in the list

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
| ----- | -------- | --------- | --------- |
| US-20.1 | Signed-in user opens driver sign-up | `frontend/tests/DriverSignUp.test.js` | `Signed-in user opens driver sign-up` |
| US-20.1 | Driver sign-up saves a pending driver | `backend/tests/driverSignUp.test.js` | `Driver sign-up saves a pending driver` |
| US-20.1 | Names are filled in from the user | `frontend/tests/DriverSignUp.test.js` | `Names are filled in from the user` |
| US-20.1 | Cannot submit without required fields | `backend/tests/driverSignUp.test.js` | `Cannot submit without required fields` |
| US-20.1 | Invalid phone number is rejected | `backend/tests/driverSignUp.test.js` | `Invalid phone number is rejected` |
| US-20.1 | Duplicate phone number is rejected | `backend/tests/driverSignUp.test.js` | `Duplicate phone number is rejected` |
| US-20.1 | Past license expiration date is accepted | `backend/tests/driverSignUp.test.js` | `Past license expiration date is accepted` |
| US-20.1 | A second sign-up is rejected | `backend/tests/driverSignUp.test.js` | `A second sign-up is rejected` |
| US-20.1 | Client-supplied user and status are ignored | `backend/tests/driverSignUp.test.js` | `Client-supplied user and status are ignored` |
| US-20.2 | Signed-in user sees their driver status | `frontend/tests/DriverSignUp.test.js` | `Signed-in user sees their driver status` |
| US-20.2 | User with no driver sees the sign-up form | `frontend/tests/DriverSignUp.test.js` | `User with no driver sees the sign-up form` |
| US-20.3 | Signed-in user updates their license | `backend/tests/driverSignUp.test.js` | `Signed-in user updates their license` |
| US-20.3 | Updating a driver does not change status | `backend/tests/driverSignUp.test.js` | `Updating a driver does not change status` |
| US-20.3 | Saving the same phone number is allowed | `backend/tests/driverSignUp.test.js` | `Saving the same phone number is allowed` |
| US-20.4 | Signed-in user does not see another user's driver | `backend/tests/driverSignUp.test.js` | `Signed-in user does not see another user's driver` |
| US-20.4 | Un-signed-in user accesses driver sign-up | `frontend/tests/DriverSignUp.test.js` | `Un-signed-in user accesses driver sign-up` |
| US-20.4 | Un-signed-in driver sign-up request is rejected | `backend/tests/driverSignUp.test.js` | `Un-signed-in driver sign-up request is rejected` |
| US-20.4 | A pending driver is not selectable | `backend/tests/driverSignUp.test.js` | `A pending driver is not selectable` |

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 20 from @features/feature-20-driver-sign-up.md on branch `feature/20-driver-sign-up`.

Follow layer order in @features/framework.md (routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes or product rules changed per this spec, update @features/reference/api.md and @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
Leave @features/feature-7-drivers.md unchanged.
```

**Reference updates for this feature:** `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-001**–**FR-011**)
- [ ] **Success Criteria (SC-001**–**SC-004)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/api.md` updated
- [ ] `features/reference/behavior.md` updated

---

## Out of Scope

- CDLs
- UI consistency
- Approving, denying, revoking, or marking a driver former (Feature 7)
- Creating or deleting a driver for someone else (Feature 7)
- A driver role
- Deleting your own driver
- An email when a driver is approved

---

## Delivered to later features

- `/driver-sign-up` is in the nav as **Driver sign-up** with no role list, so any signed-in user can open it. Feature 19 can show that route as an icon.
