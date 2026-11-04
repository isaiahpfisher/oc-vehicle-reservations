# Behavior & Rules Reference


**Living snapshot** of product rules currently in force. Feature 2 area rules, Feature 3 role rules, Feature 4 vehicle type rules, Feature 5 vehicle rules, Feature 6 destination rules, Feature 7 driver rules, Feature 12 service type rules, and Feature 8 vehicle request rules are recorded here.

These files answer: *"What rules does the app enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, sort, validation, UI rules |

## Authentication

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Sign-in uses a Google ID token | `POST /api/login` body is `{ googleCredentials }`. The server reads email and name from the verified token. | Feature 1, FR-001, FR-006 |
| Stored name follows Google | Every successful login writes `given_name` and `family_name` onto the user. No API changes `firstName`, `lastName`, or `email`. | Feature 1, FR-006; Feature 3 |
| Only OC emails can sign in | The domain must be `oc.edu` or a subdomain such as `eagles.oc.edu`. Any other verified email returns `401` `{ "message": "Non OC email used." }` and creates nothing. | Feature 1, FR-006 |
| Only sign-in creates users | A new verified email creates a user on login. No endpoint creates users. | Feature 3, FR-013 |
| Development sign-in | With `DEV_LOGIN=true` (never in production), `POST /api/dev-login` signs in as an existing user with the shared `DEV_LOGIN_PASSWORD`. The login page shows the form only in development builds. `npm run seed` loads test users for every role. | Feature 3, FR-014–FR-016 |
| Session is an app JWT for 24 hours | Stored in `sessions` and `localStorage` key `user`. Later calls send `Authorization: Bearer`. An unexpired session for that user is reused. | Feature 1, FR-002, FR-003 |
| Opening `/` without a session redirects to login | Router guard. A stored session that opens `/login` redirects home. | Feature 1, FR-005 |
| Sign out deletes that session | `POST /api/logout` deletes the matching session row and the client removes `user`. | Feature 1, US-1.4 |
| `authenticate` sets `req.user` | Bearer token must match an unexpired session row. `req.user` is `{ id, roles }`, loaded from the database on every request. | Feature 1, FR-004; Feature 3, FR-009 |
| No profile editing | The avatar menu shows name, email, and **Sign out** only. | Feature 3 |

## Areas

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Any signed-in user can list areas; only admins manage them | `GET /api/areas` and `GET /api/areas/:areaId` use `authenticate`. `POST`, `PUT`, and `DELETE` use `authenticateAdmin` (`403` otherwise). `/areas` has `meta.roles: ["admin"]`, so non-admins don't see the **Areas** link and are redirected home. | Feature 2, FR-001; Feature 3, US-3.6 |
| Name is trimmed, required, unique, and at most 255 characters | Empty or whitespace-only name returns `400` `{ "message": "Missing name." }`. A longer name returns `{ "message": "Name too long." }`. A name already stored on a different area returns `{ "message": "Name already taken." }`. Saving an area with its own current name is allowed. | Feature 2, FR-002, FR-004 |
| Logo is a URL or an empty string | The value is trimmed. `""` is stored when the logo is omitted or blank. `logo.png` returns `400` `{ "message": "Invalid logo URL." }`. A non-empty logo must be an `http` or `https` URL. The areas list renders an image only when `logo` is not empty. | Feature 2, FR-005, FR-006 |
| Delete removes the area when it has no vehicles | `DELETE` returns `200` and deletes the area's `area_admin` roles with it. If the area still has vehicles, `DELETE` returns `400` `{ "message": "Area has vehicles. Delete vehicles or reassign them to a different area first." }` and the area stays. | Feature 2, Assumptions; Feature 3; Feature 5, FR-026 |
| Areas are managed on one screen | `/areas` heading is **Area Management**. Create and edit use a dialog with **Name** and **Logo**. Delete uses the shared confirmation dialog. Empty list copy is **No areas yet. Create your first area.** | Feature 2, Screen Requirements |

## Vehicle types

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Only admins manage vehicle types | `POST`, `PUT`, and `DELETE` use `authorizeRoles('admin')`. `GET` also allows `area_admin` so the vehicle form can list types. A missing token is `401`. A signed-in user with neither role is `403` `{ "message": "Admin role required." }`. `/vehicle-types` has `meta.nav: "Vehicle Types"` and `meta.roles: ["admin"]`, so admins see the **Vehicle Types** link and everyone else does not. Non-admins who open the URL are redirected home. An unsigned visit redirects to `/login`. | Feature 4, FR-001, US-4.5; Feature 5 |
| Name is trimmed, required, unique without regard to case, and at most 255 characters | Empty or whitespace-only name returns `400` `{ "message": "Missing name." }`. A longer name returns `{ "message": "Name too long." }`. A name already stored on a different vehicle type, compared after lowercasing, returns `{ "message": "Name already taken." }`. Saving a vehicle type with its own current name is allowed. | Feature 4, FR-002, FR-004 |
| Identifier is `VIN` or `Serial` | Any other value returns `400` `{ "message": "Unknown identifier." }`. An empty identifier returns `{ "message": "Missing identifier." }`. | Feature 4, FR-005 |
| A field left out of an update keeps its stored value | `PUT` with only `name` does not clear `identifier`, and the reverse. | Feature 4, US-4.4 |
| Delete removes the vehicle type when it has no vehicles | `DELETE` returns `200`. If the vehicle type still has vehicles, `DELETE` returns `400` `{ "message": "Vehicle type has vehicles. Delete vehicles or reassign them to a different vehicle type first." }` and the type stays. | Feature 4, Assumptions; Feature 5, FR-027 |
| Vehicle types are managed on one screen | `/vehicle-types` heading is **Vehicle Type Management**. The list is a table of 10 rows per page with **Name** and **Identifier**. Create uses a dialog with **Name** and an **Identifier** select (`VIN`, `Serial`). Edit replaces that row with the same fields and **Save** / **Cancel**; Cancel leaves the stored row unchanged. Row icon buttons use `size="small"` and `variant="text"`. Delete uses the shared confirmation dialog. Empty list copy is **No vehicle types yet. Create your first vehicle type.** | Feature 4, Screen Requirements |

## Vehicles

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Admins and area admins manage vehicles | Every `/api/vehicles` route requires `admin` or `area_admin`. A missing token is `401`. Anyone else is `403` `{ "message": "Admin or area admin role required." }`. `/vehicles`, `/vehicles/new`, and `/vehicles/:id` use `meta.roles: ["admin", "area_admin"]`. `/vehicles` has `meta.nav: "Vehicles"`, so admins and area admins see the **Vehicles** link and everyone else does not. Unsigned visits redirect to `/login`. Other signed-in roles redirect home (`/`). | Feature 5, FR-001, US-5.5 |
| Area admins stay in their areas | The list returns only vehicles in their areas. Reading, editing, or deleting a vehicle in another area is `403` `{ "message": "Not authorized for the specified area." }`. Creating or moving a vehicle into another area is the same `403`. The create and edit pages list only their areas. Opening another area's vehicle redirects home. | Feature 5, FR-001, US-5.5 |
| Required fields are trimmed | Empty or whitespace-only university id, make, model, identifier, or color is `400` with `Missing …`. Area, vehicle type, year, purchase date, passenger capacity, and status use the same shape. A blank license plate or expiration date is stored as `null`. | Feature 5, FR-002–FR-025 |
| Length, range, and format | Text max 255. A VIN identifier must be 17 characters (`VIN must be 17 characters.`). A longer serial identifier is `Serial number too long.`. Year is an integer from 1950 through next year. Passenger capacity is an integer from 1 through 300. Purchase date is `yyyy-mm-dd` from `1950-01-01` through today. Expiration date is `yyyy-mm-dd` or null, including dates before today. License plate max 8. Status is `active` or `retired`. | Feature 5, FR-010–FR-025 |
| University id, identifier, and license plate are unique | A duplicate is `400` with `University id already taken.`, `Identifier already taken.`, or `License plate already taken.`. Saving a vehicle with its own current value is allowed. | Feature 5, FR-014, FR-024 |
| A field left out of an update keeps its stored value | `PUT` changes only the keys in the body. | Feature 5, US-5.4 |
| Vehicles are a table plus two pages | `/vehicles` heading is **Vehicle Management**. The table shows 10 rows per page with **Make**, **Model**, **Color**, and a status chip. The chip is red when `retired`, bright sunny yellow (`#FFE500`) when `active` and there is no expiration date or the date is before today, and green when `active` and the date is today or later. Make, Model, Color, Status, and Actions are equal width. Make is text. **Edit vehicle** opens `/vehicles/:id`. **Delete vehicle** uses the shared confirmation dialog. Empty copy is **No vehicles yet. Create your first vehicle.** `/vehicles/new` heading is **New vehicle** and **Create** returns to the list. **Year** is a number input of at most 4 characters. Edit heading is the make and model. **Save** shows **Saving…** while the request runs, then returns to the list. A failed save shows its message above the buttons and stays on the page. **Cancel** on create and on edit returns to the list and does not call the API. The identifier label is **VIN** until a `Serial` type is selected. | Feature 5, Screen Requirements |

## Roles

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Roles are `admin`, `area_admin` (per area), `maintenance` | `roles` rows; everyone also has requester permissions. A user can hold several roles but not the same one twice. | Feature 3, FR-002, FR-003 |
| Admins pass every role check | `authorizeRoles` and `useRoles().hasAnyRole()` both treat `admin` as holding every role. `hasRole()` does not (display only). | Feature 3, FR-004, FR-010 |
| Role failures are `403` | Role middleware returns `403` with a role message; missing/invalid sessions stay `401`. | Feature 3, FR-010 |
| Only admins manage users | `GET /api/users`, `PUT` and `DELETE /api/users/:id` require `admin`. Non-admins may `GET` only themselves (others → `404`). | Feature 3 |
| Admins cannot lock themselves out | An admin cannot remove their own `admin` role or delete themselves (`400`; the UI blocks or disables it first). | Feature 3 |
| Roles are replaced atomically | `PUT /api/users/:id` swaps the full role set in one transaction. | Feature 3, FR-012 |
| First admin comes from a script | `npm run make-admin -- <email>` in `backend/` grants `admin` to an existing user. No API does this. | Feature 3, FR-008 |
| Routes declare `meta.roles` | The user needs any listed role (admin always passes); no `meta.roles` = any signed-in user. The router guard and MenuBar links use the same `canOpen()` check. Routes open without a session (login) declare `meta.public`. | Feature 3, FR-011; Feature 1, FR-005 |
| Frontend refreshes roles per page load | The first navigation after a page load calls `GET /api/users/:id` and replaces the stored roles before any role check. A `401` clears `user` and goes to login. | Feature 3, FR-009 |
| Users list | Admin-only table at `/users`: name, email, role chips (`Admin`, `Maintenance`, `Area Admin — <area>`), 10 per page, name search (case-insensitive) and role filter; changing either returns to page 1. | Feature 3, US-3.1–3.3 |
| User details | `/users/:id`: header with name, email, role chips, and member-since date; **Access** card with checkboxes (System roles; Area admin of, one per area) and its own Save/Cancel that stay on the page; **Driver** card shows the linked driver's status, license state and expiration, and phone number, or **No linked driver.**; **Requests** / **Issue reports** / **Maintenance** (maintenance users only) tabs show "Coming soon" until Features 8–13; **Account** card deletes the user. On your own page, Admin and Delete are disabled. | Feature 3, US-3.4, US-3.5; Feature 7, FR-020 |
| Delete user | Confirm dialog naming the user, from the users list or the details page; disabled for the admin's own account. A linked driver is kept with no linked user. | Feature 3, US-3.5; Feature 7, FR-017 |

## Destinations

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Only admins and area admins manage destinations | Every `/api/destinations` route except Feature 8's `/selectable` uses `authorizeRoles("admin", "area_admin")`. A missing token is `401`. A signed-in user without one of those roles is `403` `{ "message": "Admin or area admin role required." }`. `/destinations` has `meta.nav: "Destinations"` and `meta.roles: ["admin", "area_admin"]`, so those roles see the **Destinations** link and everyone else does not. Other signed-in users who open the URL are redirected home. An unsigned visit redirects to `/login`. | Feature 6, FR-001, US-6.5 |
| Destinations are global | There is no `area_id`. An area admin reads, creates, edits, and deletes every destination. | Feature 6, FR-002 |
| Required text is trimmed and at most 255 characters | `name`, `address_line_1`, `city`, and `state` are required. Empty or whitespace-only values return `400` with `Missing name.`, `Missing address line 1.`, `Missing city.`, or `Missing state.`. A longer value returns `Name too long.`, `Address line 1 too long.`, `City too long.`, or `State too long.`. Names are not unique. | Feature 6, FR-005–FR-008, FR-011–FR-014 |
| Optional text is stored as null when blank | `address_line_2` and `zip_code` are trimmed. Blank becomes `null`. A value longer than 255 characters returns `Address line 2 too long.` or `ZIP code too long.`. | Feature 6, FR-009, FR-010, FR-015, FR-016 |
| `is_saved` is a required boolean | `true` means available (Official). `false` means not available (Unofficial). Missing returns `{ "message": "Missing is_saved." }`. Any other value returns `{ "message": "is_saved must be true or false." }`. The create dialog starts with Official on. The edit dialog can turn it on or off. Both values stay on the admin list. Feature 8's request form selects from Official ones. | Feature 6, FR-017, FR-019, FR-020 |
| Miles from campus is optional | Empty is stored as `null`. A negative or non-integer value returns `{ "message": "Miles from campus must be a whole number of 0 or more." }`. The API doesn't call a maps service; since Feature 8 (FR-010), the form can fill it from Google Maps. | Feature 6, FR-018 |
| Delete removes the destination | `DELETE` returns `200`, unless a vehicle request uses it (`400`, see Vehicle Requests). | Feature 6, Assumptions; Feature 8 |
| Destinations are managed on one screen and a form page | `/destinations` heading is **Destination Management**. The list is a table of 10 rows per page with **Name**, **City**, **State**, and an **Official** or **Unofficial** chip. A search box matches every word against the name and address, and **Filter by availability** shows Official or Unofficial only; with no match it reads **No destinations match your search.** Create and edit open their own page (`/destinations/new`, `/destinations/:id`), grouped into sections like the Driver form; the name links there too. Row icon buttons use `size="small"` and `variant="text"` with aria-labels **Edit destination** and **Delete destination**. Delete uses the shared confirmation dialog. Empty list copy is **No destinations yet. Create your first destination.** | Feature 6, Screen Requirements; Feature 8, FR-010, FR-011 |

## Drivers

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Only admins and area admins manage drivers | Every `/api/drivers` route except `/selectable` uses `authorizeRoles("admin", "area_admin")`. A missing token is `401`. A signed-in user without one of those roles is `403` `{ "message": "Admin or area admin role required." }`. `/drivers`, `/drivers/new`, and `/drivers/:id` use `meta.roles: ["admin", "area_admin"]`. `/drivers` has `meta.nav: "Drivers"`, so those roles see the **Drivers** link and everyone else does not. Other signed-in users who open a URL are redirected home. An unsigned visit redirects to `/login`. | Feature 7, FR-001, US-7.5 |
| Drivers are global | There is no area. An area admin reads, creates, edits, and deletes every driver. | Feature 7, Data Ownership |
| Any signed-in user can list selectable drivers | `GET /api/drivers/selectable` returns only `id`, `firstName`, and `lastName`, for `approved` drivers whose license expires today or later. | Feature 7, FR-015 |
| A driver links to at most one user | `userId` is optional, must be an existing user, and is unique. A duplicate is `400` `{ "message": "User is already linked to a driver." }`. The form's **User** field lists users with no driver, plus the driver's own linked user when editing, and typing in it filters them by name or email. | Feature 7, FR-003, FR-014, FR-016 |
| Phone numbers are unique | Each driver has a different phone number. A duplicate is `400` `{ "message": "Phone number already taken." }`. Saving a driver with its own current number is allowed. | Feature 7, FR-021 |
| Deleting a user keeps the driver | The driver stays, with `userId` set to null. | Feature 7, FR-017 |
| Required fields are trimmed and validated | First and last name are required, max 255. Phone number is required, in format `xxx-xxx-xxxx`. License state is required, one of the 50 states and `DC`; the form preselects `OK`. License expiration date is a required `yyyy-mm-dd` date, and past dates are accepted. Status is `pending`, `approved`, `denied`, `revoked`, or `former`; blank is saved as `pending`. | Feature 7, FR-004–FR-011, FR-013, FR-019 |
| `approvedAt` is set by the server | Client values are ignored. It is the current time when a driver is created as `approved` or changes to `approved`, stays the same while the driver remains `approved`, and is null when the status changes to anything else. | Feature 7, FR-012 |
| A field left out of an update keeps its stored value | `PUT` changes only the keys in the body. | Feature 7, Assumptions |
| Drivers are a table plus a form page | `/drivers` heading is **Driver Management**. The table shows 10 rows per page with **Name** (first and last name), **Status**, **Phone Number**, and **License Expiration**. The name links to the driver. Search matches first name, last name, and phone number, and a status filter narrows the list; changing either returns to page 1. An expiration date before today is highlighted with a red chip. **Edit driver** opens `/drivers/:id`. **Delete driver** uses the shared confirmation dialog. Empty copy is **No drivers yet. Create your first driver.** `/drivers/new` heading is **New Driver**. The form groups its fields into sections (**Name**, **Contact**, **User account**, **License**, **Approval**), each with a title and description on the left and its fields vertically centered on the right, stacked on small screens. The form is centered on the page. Edit heading is the driver's name. **Save** and **Cancel** return to the list; a failed save shows its message and stays on the page. | Feature 7, Screen Requirements |

## Service types

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Only admins, area admins, and maintenance users manage service types | Every `/api/service-types` route uses `authorizeRoles("admin", "area_admin", "maintenance")`. A missing token is `401`. A signed-in user without one of those roles is `403` `{ "message": "One of these roles is required: admin, area_admin, maintenance." }`. `/service-types` has `meta.roles: ["admin", "area_admin", "maintenance"]`, so other signed-in users are redirected home and do not see the **Service Types** link. | Feature 12, FR-001, US-12.5 |
| Name is trimmed, required, unique ignoring case, and at most 255 characters | Empty or whitespace-only name returns `400` `{ "message": "Missing name." }`. A longer name returns `{ "message": "Name too long." }`. A name that matches another service type when compared case-insensitively returns `{ "message": "Name already taken." }`. Saving a service type with its own current name is allowed. | Feature 12, FR-002, FR-004 |
| At least one frequency is required | Days, miles, or both may be set. The empty one is stored as `null`. Omitting both returns `400` `{ "message": "Missing service_frequency_days or service_frequency_miles." }`. Zero, a negative, or a non-integer returns `{ "message": "Invalid service_frequency_days." }` or `{ "message": "Invalid service_frequency_miles." }`. | Feature 12, FR-003 |
| Delete removes the service type | `DELETE` returns `200` and does not check for other rows that point at the service type. | Feature 12, Assumptions |
| Service types are managed on one screen | `/service-types` heading is **Service Type Management**. Service types are a table (name, frequency days, frequency miles). Create uses a dialog with those fields. Edit replaces that row with the same fields and **Save** / **Cancel**. Delete uses the shared confirmation dialog. Empty list copy is **No service types yet. Create your first service type.** | Feature 12, Screen Requirements |

## Vehicle Requests

| Rule | Enforcement | Provenance |
| ---- | ----------- | ---------- |
| Requesters see only their own requests | `GET /me/requests` filters by `userId`. Another user's request returns `404`. | Feature 8, FR-002 |
| Admins see all requests; area admins see their areas | `managedRequestsWhere()` in `authorization/vehicleRequestScope.js` | Feature 8, US-8.4 |
| Only managers assign vehicles or change status | Requesters get `403`, except cancelling their own open request | Feature 8, FR-003, Delete scope |
| Requesters edit only while pending | `403` once status leaves `pending`. The form becomes read-only. | Feature 8, Screen Requirements |
| Approving sets `awaiting_vehicle` | Approve button. `approverId` and `approvedAt` are set when a request first reaches an approved status. | Feature 8, FR-005 |
| Assigning vehicles sets `reserved`; removing all sets `awaiting_vehicle` | Applied when `vehicles` changes and no explicit `status` is sent | Feature 8, FR-006 |
| Editing trip fields on an approved request resets it to `pending` | Area, purpose, dates, all-day, people, drivers, or destinations. Approval is cleared. The UI warns before saving. | Feature 8, US-8.7 |
| Short capacity is flagged, not blocked | Request page and assign dialog show a warning when seats < people | Feature 8, FR-004 |
| Estimated miles use Google Routes | Round trip campus → stops → campus when `GOOGLE_MAPS_API_KEY` is set. Without Google, only a single saved stop is estimated (2 × `milesFromCampus`); otherwise `estimatedMiles` is `null` ("Unknown") and is retried on the next edit | Feature 8, FR-007 |
| Custom addresses can be searched | The custom address dialog suggests addresses through the backend (`/api/places/…`, Google Places). Picking one fills the fields, which stay editable; without a key the fields are typed in | Feature 8, FR-008 |
| At most 10 destinations per trip | The form stops offering more at 10; the API returns `400` above that | Feature 8, FR-009 |
| Requests are never deleted | Status changes to `cancelled`. Only `npm run seed` removes them, replacing them with sample requests along with the users and areas they belong to. | Feature 8, Delete scope |
| Home is My Requests | `/` (route `home`) lists the signed-in user's requests and replaces Feature 3's welcome page. Nav: **My Requests** for everyone, **Requests** (`/requests`) for admins and area admins. | Feature 8, Screen Requirements |
| Request page edits one card at a time | Trip details, Destinations, and Drivers each have their own Cancel / Save. A new request is one form with one **Submit request**. Read-only requests show text, not disabled inputs. | Feature 8, Screen Requirements; `ui-style-system.mdc` |
| Destinations are searched with Google | The request form's custom address dialog and the destination form page share one address search. On the Destination Management form, picking a result also fills **Miles from campus** (one way, by road) through a separate billed lookup; the value stays editable, and without Google it is typed in | Feature 8, FR-008, FR-010 |
| Requesters choose from official destinations | `GET /api/destinations/selectable` is open to any signed-in user and lists `isSaved: true` only. Feature 6's own routes stay limited to admins and area admins. A custom stop needs a street address, is saved Unofficial, and shows on Destination Management for review | Feature 8, Feature 6 FR-017 |
| Things requests point at can't be deleted | Deleting a destination, vehicle, driver, or area that a request uses, or a user who made one, returns `400` with a message. Database foreign keys also restrict it. Deleting an approver clears `approverId` | Feature 8, Delete scope |
| Requests show driver names only | Driver phone and license details stay with Feature 7's admin screens. The request form lists `GET /api/drivers/selectable` | Feature 8; Feature 7, FR-015 |
