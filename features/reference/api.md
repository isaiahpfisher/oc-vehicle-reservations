# API Reference

**Status:** Feature 1 auth, Feature 2 area routes, Feature 3 user and role routes, Feature 4 vehicle type routes, Feature 5 vehicle routes, Feature 6 destination routes, Feature 7 driver routes, Feature 8 vehicle request routes, Feature 9 mileage log routes, Feature 10 issue report routes, Feature 11 maintenance need routes, and Feature 12 service type routes are in force; the starter-kit course routes are removed. Mount path defaults to `/api` (see `backend/server.js`).

## Authentication

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `POST` | `/api/login` | No | `200` with `email`, `firstName`, `lastName`, `userId`, `roles`, and session `token`. Body is `{ "googleCredentials": "<google id token>" }`. |
| `POST` | `/api/logout` | Bearer | `200`. Deletes the session row for that token. |
| `POST` | `/api/dev-login` | No (development only) | Same `200` payload as `/api/login`. Body `{ "email", "password" }` for an existing user; the password is `DEV_LOGIN_PASSWORD` (default `password`). `404` unless `DEV_LOGIN=true` and `NODE_ENV` is not `production`; wrong password or unknown email → `401` `{ "message": "Bad Credentials." }`. |

Login verifies the Google ID token and reads `email`, `given_name`, and `family_name` from it. The email domain must be `oc.edu` or a subdomain such as `eagles.oc.edu`. A new email creates a user (the only way users are created). An existing email is reused, the stored first and last name are replaced from the token, and an unexpired session is reused.

| Condition | Status | Body |
| --------- | ------ | ---- |
| Google token missing or unverifiable, or name missing | `401` | `{ "message": "Bad Credentials." }` |
| Verified email domain is not `oc.edu` or a subdomain of it | `401` | `{ "message": "Non OC email used." }` |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Bearer token missing from `sessions` or expired | `401` | `{ "message": "Unauthorized! Invalid or expired token." }` |

## Role middleware

Exported from `backend/app/authorization/authorization.js`. Admins pass every role check.

| Middleware | Passes | Otherwise |
| ---------- | ------ | --------- |
| `authenticate` | Valid session; sets `req.user = { id, roles: [{ id, role, areaId }] }` | `401` (messages above) |
| `authenticateAdmin` | `admin` | `403` `{ "message": "Admin role required." }` |
| `authenticateMaintenance` | `maintenance` or `admin` | `403` `{ "message": "Maintenance role required." }` |
| `authenticateAreaAdmin` | `area_admin` of any area, or `admin` | `403` `{ "message": "Area admin role required." }` |
| `authorizeRoles(...roles)` | Any listed role, or `admin` | `403`. One listed role uses its role message (`Admin role required.`, `Area admin role required.`, or `Maintenance role required.`). `authorizeRoles("admin", "area_admin")` uses `{ "message": "Admin or area admin role required." }`. Any other combination uses `{ "message": "One of these roles is required: <roles>." }`. |

`canAccessArea(req.user, areaId)` is true for admins and area admins of that area; area-scoped controllers use it.

## Users

User payload: `{ id, firstName, lastName, email, createdAt, roles: [{ id, role, areaId, area: { id, name } | null }] }`.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/users` | Admin | `200` array of users, sorted by last then first name. |
| `GET` | `/api/users/:id` | Self or admin | `200` with that user, plus `driver`: `{ status, licenseState, licenseExpirationDate, phoneNumber }` for the linked driver, or `null`. Another user (non-admin) → `404`. |
| `PUT` | `/api/users/:id` | Admin | `200` with the user. Body `{ "roles": [{ "role": "maintenance" }, { "role": "area_admin", "areaId": 2 }] }` replaces all roles in one transaction. Name and email in the body are ignored. |
| `DELETE` | `/api/users/:id` | Admin | `204` with no body. Deletes the user's sessions and roles. A linked driver is kept with `userId` set to `null`. |

| Condition | Status | Body |
| --------- | ------ | ---- |
| Non-numeric `:id` | `400` | `{ "message": "Invalid user id." }` |
| Unknown `:id` | `404` | `{ "message": "User with id=<id> not found." }` |
| `roles` not an array | `400` | `{ "message": "Roles must be an array." }` |
| Role not `admin` / `area_admin` / `maintenance` | `400` | `{ "message": "Invalid role." }` |
| `area_admin` without a valid `areaId` | `400` | `{ "message": "Area admin role requires a valid area." }` |
| Admin `PUT` on self without `admin` | `400` | `{ "message": "You cannot remove your own admin role." }` |
| Admin `DELETE` on self | `400` | `{ "message": "You cannot delete your own account." }` |

## Areas

`GET` routes accept any signed-in user (other features list areas); creating, editing, and deleting areas is admin-only (Feature 3 US-3.6).

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/areas` | Bearer | `200` array of areas, ordered by `name`. |
| `GET` | `/api/areas/:areaId` | Bearer | `200` with one area. |
| `POST` | `/api/areas` | Admin | `201` with the created area. Body is `{ "name": "Athletics", "logo": "https://example.com/logo.png" }`. Omitted `logo` is stored as `""`. |
| `PUT` | `/api/areas/:areaId` | Admin | `200` with the updated area. A field omitted from the body keeps its stored value. |
| `DELETE` | `/api/areas/:areaId` | Admin | `200`. The area row is removed, along with every `area_admin` role for it. An area that still has vehicles is `400`. |

Success body: `{ "id", "name", "logo", "createdAt", "updatedAt" }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Non-admin `POST`, `PUT`, or `DELETE` | `403` | `{ "message": "Admin role required." }` |
| Missing or whitespace-only `name` | `400` | `{ "message": "Missing name." }` |
| `name` longer than 255 characters after trim | `400` | `{ "message": "Name too long." }` |
| `name` matches another area | `400` | `{ "message": "Name already taken." }` |
| Non-empty `logo` is not an `http` or `https` URL | `400` | `{ "message": "Invalid logo URL." }` |
| `areaId` is not an integer | `400` | `{ "message": "Invalid area id." }` |
| Area id does not exist | `404` | `{ "message": "Area with id=… not found." }` |
| Area still has vehicles | `400` | `{ "message": "Area has vehicles. Delete vehicles or reassign them to a different area first." }` |

## Vehicle types

Creating, editing, and deleting vehicle types requires `admin`. Reading them also allows `area_admin` so the vehicle form can list types (Feature 5). A signed-in user with neither role still gets `403` `{ "message": "Admin role required." }`.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/vehicle-types` | Admin or area admin | `200` array of vehicle types, ordered by `name`. |
| `GET` | `/api/vehicle-types/:vehicleTypeId` | Admin or area admin | `200` with one vehicle type. |
| `POST` | `/api/vehicle-types` | Admin | `201` with the created vehicle type. Body is `{ "name": "Bus", "identifier": "VIN" }`. |
| `PUT` | `/api/vehicle-types/:vehicleTypeId` | Admin | `200` with the updated vehicle type. A field omitted from the body keeps its stored value. |
| `DELETE` | `/api/vehicle-types/:vehicleTypeId` | Admin | `200`. The vehicle type row is removed. A type that still has vehicles is `400`. |

Success body: `{ "id", "name", "identifier", "createdAt", "updatedAt" }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Signed in without `admin` | `403` | `{ "message": "Admin role required." }` |
| Missing or whitespace-only `name` | `400` | `{ "message": "Missing name." }` |
| `name` longer than 255 characters after trim | `400` | `{ "message": "Name too long." }` |
| `name` matches another vehicle type, ignoring case | `400` | `{ "message": "Name already taken." }` |
| Missing `identifier` | `400` | `{ "message": "Missing identifier." }` |
| `identifier` is not `VIN` or `Serial` | `400` | `{ "message": "Unknown identifier." }` |
| `vehicleTypeId` is not an integer | `400` | `{ "message": "Invalid vehicle type id." }` |
| Vehicle type id does not exist | `404` | `{ "message": "Vehicle type with id=… not found." }` |
| Vehicle type still has vehicles | `400` | `{ "message": "Vehicle type has vehicles. Delete vehicles or reassign them to a different vehicle type first." }` |

## Vehicles

Every vehicle route requires a Bearer token and `admin` or `area_admin`. Admins pass. Area admins only see and change vehicles in areas they administer. JSON keys are camelCase.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/vehicles` | Admin or area admin | `200` array. Admins receive every vehicle. Area admins receive vehicles whose `areaId` is one of their areas. Ordered by make, then model. |
| `GET` | `/api/vehicles/:vehicleId` | Admin or area admin | `200` with one vehicle. An area admin asking for another area's vehicle is `403`. |
| `POST` | `/api/vehicles` | Admin or area admin | `201` with the created vehicle. An area admin can only set `areaId` to an area they administer. |
| `PUT` | `/api/vehicles/:vehicleId` | Admin or area admin | `200` with the updated vehicle. A field omitted from the body keeps its stored value. An area admin cannot edit a vehicle outside their areas, or move one into an area they do not administer. |
| `DELETE` | `/api/vehicles/:vehicleId` | Admin or area admin | `200`. The vehicle row is removed. An area admin cannot delete a vehicle outside their areas. |

Create body: `{ "areaId", "vehicleTypeId", "universityId", "make", "model", "year", "identifier", "purchasedAt", "color", "passengerCapacity", "licensePlate", "licensePlateExpirationDate", "status" }`. A blank license plate or expiration date is stored as `null`. The same keys are accepted with underscores (`area_id`, `purchased_at`).

Success body: `{ "id", "areaId", "vehicleTypeId", "universityId", "make", "model", "year", "identifier", "purchasedAt", "color", "passengerCapacity", "licensePlate", "licensePlateExpirationDate", "status", "createdAt", "updatedAt" }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Signed in without `admin` or `area_admin` | `403` | `{ "message": "Admin or area admin role required." }` |
| Area admin acts on another area | `403` | `{ "message": "Not authorized for the specified area." }` |
| Missing or whitespace-only required text | `400` | `{ "message": "Missing university id." }` (and the same shape for make, model, identifier, and color) |
| Missing area, vehicle type, year, purchase date, passenger capacity, or status | `400` | `{ "message": "Missing area id." }` and the matching message for that field |
| Unknown area or vehicle type | `400` | `{ "message": "Area does not exist." }` or `{ "message": "Vehicle type does not exist." }` |
| Text longer than 255 characters | `400` | `{ "message": "University id too long." }` (make, model, and color use the same shape) |
| Serial identifier longer than 255 characters | `400` | `{ "message": "Serial number too long." }` |
| VIN identifier not exactly 17 characters | `400` | `{ "message": "VIN must be 17 characters." }` |
| Duplicate university id, identifier, or license plate | `400` | `{ "message": "University id already taken." }` (identifier and license plate use the same shape) |
| Year is not an integer, or is outside 1950 through next year | `400` | `{ "message": "Year must be an integer." }` or `{ "message": "Year must be between 1950 and the year after this year." }` |
| Passenger capacity is not an integer, or is outside 1 through 300 | `400` | `{ "message": "Passenger capacity must be an integer." }` or `{ "message": "Passenger capacity must be between 1 and 300." }` |
| Purchase date is not numerical, not `yyyy-mm-dd`, or outside 1950-01-01 through today | `400` | `{ "message": "Purchase date must be a numerical date." }`, `{ "message": "Purchase date must be in format 'yyyy-mm-dd'." }`, or `{ "message": "Purchase date must be between 1950 and the current date." }` |
| Expiration date is not numerical or not `yyyy-mm-dd` | `400` | `{ "message": "License plate expiration date must be a numerical date." }` or `{ "message": "License plate expiration date must be in format 'yyyy-mm-dd'." }` |
| License plate longer than 8 characters | `400` | `{ "message": "License plate too long." }` |
| Status is not `active` or `retired` | `400` | `{ "message": "Invalid status." }` |
| `:vehicleId` is not an integer | `400` | `{ "message": "Invalid vehicle id." }` |
| Vehicle id does not exist | `404` | `{ "message": "Vehicle with id=… not found." }` |

## Drivers

Every route requires a Bearer token. Every route except `GET /api/drivers/selectable` also requires `admin` or `area_admin` (`authorizeRoles("admin", "area_admin")`). Admins pass that check. Drivers are global: an area admin can read and change every driver.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/drivers` | Admin or area admin | `200` array of drivers, ordered by last name, then first name. |
| `GET` | `/api/drivers/selectable` | Bearer | `200` array of `{ id, firstName, lastName }` for `approved` drivers whose license expires today or later, ordered the same way. |
| `GET` | `/api/drivers/available-users` | Admin or area admin | `200` array of `{ id, firstName, lastName, email }` for users with no driver, ordered by last name, then first name. `?driverId=` also includes that driver's linked user. |
| `GET` | `/api/drivers/:driverId` | Admin or area admin | `200` with one driver. |
| `POST` | `/api/drivers` | Admin or area admin | `201` with the created driver. |
| `PUT` | `/api/drivers/:driverId` | Admin or area admin | `200` with the updated driver. A field omitted from the body keeps its stored value. A blank `userId` unlinks the user. |
| `DELETE` | `/api/drivers/:driverId` | Admin or area admin | `200` `{ "message": "Driver deleted successfully." }`. `400` while a vehicle request uses the driver (Feature 8). |

Create body: `{ "userId", "firstName", "lastName", "phoneNumber", "licenseState", "licenseExpirationDate", "status" }`. The same keys are accepted with underscores (`user_id`, `first_name`). `userId` is optional. A blank `status` is saved as `pending`.

`approvedAt` is set by the server and ignored in request bodies: the current time when `status` becomes `approved`, and `null` when it changes to anything else.

Success body: `{ "id", "userId", "firstName", "lastName", "phoneNumber", "licenseState", "licenseExpirationDate", "status", "approvedAt", "createdAt", "updatedAt" }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Signed in without `admin` or `area_admin` | `403` | `{ "message": "Admin or area admin role required." }` |
| Unknown or non-integer `userId` | `400` | `{ "message": "User does not exist." }` |
| `userId` linked to another driver | `400` | `{ "message": "User is already linked to a driver." }` |
| `phoneNumber` used by another driver | `400` | `{ "message": "Phone number already taken." }` |
| Missing or whitespace-only first name, last name, phone number, license state, or expiration date | `400` | `{ "message": "Missing first name." }` and the matching message for that field |
| First or last name longer than 255 characters after trim | `400` | `{ "message": "First name too long." }` or `{ "message": "Last name too long." }` |
| Phone number not in format `xxx-xxx-xxxx` | `400` | `{ "message": "Phone number must be in format 'xxx-xxx-xxxx'." }` |
| License state is not a state abbreviation | `400` | `{ "message": "Invalid license state." }` |
| Expiration date is not a real `yyyy-mm-dd` date | `400` | `{ "message": "License expiration date must be in format 'yyyy-mm-dd'." }` |
| Status is not `pending`, `approved`, `denied`, `revoked`, or `former` | `400` | `{ "message": "Invalid status." }` |
| `:driverId` or `?driverId=` is not an integer | `400` | `{ "message": "Invalid driver id." }` |
| Driver id does not exist | `404` | `{ "message": "Driver with id=… not found." }` |

## Service types

Every route requires a Bearer token and `admin`, `area_admin`, or `maintenance` (`authorizeRoles("admin", "area_admin", "maintenance")`). Admins pass that check.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/service-types` | Admin, area admin, or maintenance | `200` array of service types, ordered by `name`. |
| `GET` | `/api/service-types/:serviceTypeId` | Admin, area admin, or maintenance | `200` with one service type. |
| `POST` | `/api/service-types` | Admin, area admin, or maintenance | `201` with the created service type. Body is `{ "name": "Oil Change", "service_frequency_days": 500, "service_frequency_miles": 5000 }`. Either frequency may be `null`. `name` is trimmed before save. |
| `PUT` | `/api/service-types/:serviceTypeId` | Admin, area admin, or maintenance | `200` with the updated service type. Body is the same shape as create. |
| `DELETE` | `/api/service-types/:serviceTypeId` | Admin, area admin, or maintenance | `200`. The service type row is removed. A service type used by a service log is `400` `{ "message": "Service type is used by a service log and can't be deleted." }`. |

Success body: `{ "id", "name", "service_frequency_days", "service_frequency_miles", "createdAt", "updatedAt" }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Signed in without `admin`, `area_admin`, or `maintenance` | `403` | `{ "message": "One of these roles is required: admin, area_admin, maintenance." }` |
| Missing or whitespace-only `name` | `400` | `{ "message": "Missing name." }` |
| `name` longer than 255 characters after trim | `400` | `{ "message": "Name too long." }` |
| `name` matches another service type, ignoring case | `400` | `{ "message": "Name already taken." }` |
| Both frequencies omitted or blank | `400` | `{ "message": "Missing service_frequency_days or service_frequency_miles." }` |
| A provided frequency is not a positive whole number | `400` | `{ "message": "Invalid service_frequency_days." }` or `{ "message": "Invalid service_frequency_miles." }` |
| `serviceTypeId` is not an integer | `400` | `{ "message": "Invalid service type id." }` |
| Service type id does not exist | `404` | `{ "message": "Service type with id=… not found." }` |

## Destinations

Every route requires a Bearer token and `admin` or `area_admin` (`authorizeRoles("admin", "area_admin")`). Admins pass that check. Destinations are global: the body has no `area_id`, and an area admin can read and change every destination.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/destinations` | Admin or area admin | `200` array of destinations, ordered by `name`. |
| `GET` | `/api/destinations/:destinationId` | Admin or area admin | `200` with one destination. |
| `POST` | `/api/destinations` | Admin or area admin | `201` with the created destination. Body is `{ "name": "Pops", "address_line_1": "660 OK-66", "address_line_2": null, "city": "Arcadia", "state": "OK", "zip_code": "73007", "is_saved": true, "miles_from_campus": 22 }`. |
| `PUT` | `/api/destinations/:destinationId` | Admin or area admin | `200` with the updated destination. Body is the same shape as create. Required fields must be sent again. |
| `DELETE` | `/api/destinations/:destinationId` | Admin or area admin | `200` `{ "message": "Destination deleted successfully." }`. The destination row is removed. |

Success body: `{ "id", "name", "address_line_1", "address_line_2", "city", "state", "zip_code", "is_saved", "miles_from_campus", "createdAt", "updatedAt" }`.

`name`, `address_line_1`, `city`, and `state` are trimmed and required. `address_line_2` and `zip_code` are trimmed and stored as `null` when blank. Names are not unique. `is_saved` must be boolean `true` (available) or `false` (not available). `miles_from_campus` is `null` when omitted or blank, or a whole number of 0 or more.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Signed in without `admin` or `area_admin` | `403` | `{ "message": "Admin or area admin role required." }` |
| Missing or whitespace-only `name` | `400` | `{ "message": "Missing name." }` |
| Missing or whitespace-only `address_line_1` | `400` | `{ "message": "Missing address line 1." }` |
| Missing or whitespace-only `city` | `400` | `{ "message": "Missing city." }` |
| Missing or whitespace-only `state` | `400` | `{ "message": "Missing state." }` |
| `name` longer than 255 characters after trim | `400` | `{ "message": "Name too long." }` |
| `address_line_1` longer than 255 characters after trim | `400` | `{ "message": "Address line 1 too long." }` |
| `address_line_2` longer than 255 characters after trim | `400` | `{ "message": "Address line 2 too long." }` |
| `city` longer than 255 characters after trim | `400` | `{ "message": "City too long." }` |
| `state` longer than 255 characters after trim | `400` | `{ "message": "State too long." }` |
| `zip_code` longer than 255 characters after trim | `400` | `{ "message": "ZIP code too long." }` |
| `is_saved` missing | `400` | `{ "message": "Missing is_saved." }` |
| `is_saved` is not boolean `true` or `false` | `400` | `{ "message": "is_saved must be true or false." }` |
| `miles_from_campus` is negative or not a whole number | `400` | `{ "message": "Miles from campus must be a whole number of 0 or more." }` |
| `destinationId` is not an integer | `400` | `{ "message": "Invalid destination id." }` |
| Destination id does not exist | `404` | `{ "message": "Destination with id=… not found." }` |

## Issue reports

Every route requires a Bearer token. Role checks are in the controller. A missing or invalid session is `401` `{ "message": "Unauthorized." }`. A signed-in user who is not allowed is `403` `{ "message": "Forbidden." }`.

`authorId` is the signed-in user on create and is ignored in the body. It does not change on update. `vehicleRequestId` and `assigneeId` are optional and may be `null`. `type` is `low_gas`, `dirty`, `maintenance`, or `other`. `status` is `pending`, `resolved`, or `cancelled`. `resolvedAt` is `YYYY-MM-DD` when status is `resolved`, and must be omitted or `null` otherwise. `description` is trimmed.

`GET /api/issue-reports` with no query returns every report for an admin and area-scoped reports for an area admin, newest id first. Another signed-in user receives `403`. `?userId=` returns reports whose `authorId` is that user. An admin may request any user. An area admin's results stay inside their areas. Any other signed-in user may request only their own id. `?vehicleId=` returns reports for that vehicle. An admin may request any vehicle. An area admin may request it only when the vehicle is in an area they administer. Both query filters apply together. A missing report is `404`, not `403`. The author may `GET` their own report. `PUT` and `DELETE` do not allow an author who is not an admin or area admin for that vehicle's area.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/issue-reports` | Bearer | `200` array. Admin: every report. Area admin: reports whose vehicle is in an area they administer. |
| `GET` | `/api/issue-reports?userId=` | Bearer | `200` array of that author's reports, still limited by the caller's role. |
| `GET` | `/api/issue-reports?vehicleId=` | Bearer | `200` array for that vehicle when the caller may see it. |
| `GET` | `/api/issue-reports/:issueReportId` | Bearer | `200` with one issue report. Admin, area admin for that vehicle's area, or the author. |
| `POST` | `/api/issue-reports` | Bearer | `201` with the created issue report. Any signed-in user. |
| `PUT` | `/api/issue-reports/:issueReportId` | Bearer | `200` with the updated issue report. Admin, or area admin for the report's current vehicle and the vehicle in the body. |
| `DELETE` | `/api/issue-reports/:issueReportId` | Bearer | `200` `{ "message": "Issue report deleted successfully." }`. |

Success body: `{ "id", "vehicleId", "vehicleRequestId", "authorId", "assigneeId", "type", "description", "status", "resolvedAt", "author", "assignee", "vehicle", "vehicleRequest", "createdAt", "updatedAt" }`. `author` and `assignee` are `{ "id", "firstName", "lastName" }` or `null`. `vehicle` is `{ "id", "universityId" }`. `vehicleRequest` is `{ "id", "purpose" }` or `null`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token, or the session is missing or expired | `401` | `{ "message": "Unauthorized." }` |
| Signed-in user is not allowed to read or change that report | `403` | `{ "message": "Forbidden." }` |
| Missing `vehicleId` | `400` | `{ "message": "Missing vehicle." }` |
| Missing `type` | `400` | `{ "message": "Missing type." }` |
| `type` is not one of the allowed values | `400` | `{ "message": "Invalid type." }` |
| Missing or whitespace-only `description` | `400` | `{ "message": "Missing description." }` |
| Missing `status` | `400` | `{ "message": "Missing status." }` |
| `status` is not one of the allowed values | `400` | `{ "message": "Invalid status." }` |
| `status` is `resolved` and `resolvedAt` is missing | `400` | `{ "message": "Missing resolved date." }` |
| `resolvedAt` is not a real `YYYY-MM-DD` date | `400` | `{ "message": "Invalid resolved date." }` |
| `resolvedAt` is sent when `status` is not `resolved` | `400` | `{ "message": "Resolved date must be empty." }` |
| `vehicleId` does not exist | `404` | `{ "message": "Vehicle not found." }` |
| `vehicleRequestId` does not exist | `404` | `{ "message": "Vehicle request not found." }` |
| `assigneeId` does not exist | `404` | `{ "message": "Assignee not found." }` |
| `userId` query is not an integer | `400` | `{ "message": "Invalid user id." }` |
| `userId` query does not match a user, for an admin or area admin | `404` | `{ "message": "User not found." }` |
| `vehicleId` query is not an integer | `400` | `{ "message": "Invalid vehicle id." }` |
| `vehicleId` query does not match a vehicle | `404` | `{ "message": "Vehicle not found." }` |
| `:issueReportId` is not an integer | `400` | `{ "message": "Invalid issue report id." }` |
| Issue report id does not exist | `404` | `{ "message": "Issue report with id=… not found." }` |

## Mileage logs

Every route requires a Bearer token (`authenticate`). An admin may read and change mileage logs for any vehicle. An area admin may do that only when the vehicle belongs to an area they administer. Any other signed-in user receives `403` `{ "message": "Forbidden." }`. A missing session is `401` `{ "message": "Unauthorized." }`.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/mileage-logs?vehicleId=:vehicleId` | Admin, or area admin for that vehicle | `200` array of that vehicle's mileage logs, newest recorded date first. |
| `GET` | `/api/mileage-logs/:mileageLogId` | Admin, or area admin for that vehicle | `200` with one mileage log. |
| `POST` | `/api/mileage-logs` | Admin, or area admin for that vehicle | `201` with the created mileage log. Body is `{ "vehicleId": 3, "odometerReading": 12050, "recordedAt": "2026-10-23" }`. |
| `PUT` | `/api/mileage-logs/:mileageLogId` | Admin, or area admin for that vehicle | `200` with the updated mileage log. `vehicleId` must be the log's current vehicle. |
| `DELETE` | `/api/mileage-logs/:mileageLogId` | Admin, or area admin for that vehicle | `200` `{ "message": "Mileage log deleted successfully." }`. |

Success body: `{ "id", "vehicleId", "userId", "odometerReading", "recordedAt", "user": { "id", "firstName", "lastName" }, "vehicle": { "id", "universityId" }, "createdAt", "updatedAt" }`. `userId` is the signed-in user on create and is ignored in the body. An update does not change `userId`. `recordedAt` is `YYYY-MM-DD`. `odometerReading` is an integer of 0 or more.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized." }` |
| Signed in without access to that vehicle | `403` | `{ "message": "Forbidden." }` |
| Missing `vehicleId` | `400` | `{ "message": "Missing vehicle." }` |
| Missing odometer reading | `400` | `{ "message": "Missing odometer reading." }` |
| Missing recorded date | `400` | `{ "message": "Missing recorded date." }` |
| Odometer reading is not a whole number | `400` | `{ "message": "Odometer reading must be a whole number." }` |
| Odometer reading is negative | `400` | `{ "message": "Odometer reading must be zero or greater." }` |
| Recorded date is not a real `YYYY-MM-DD` date | `400` | `{ "message": "Invalid recorded date." }` |
| `vehicleId` does not exist | `404` | `{ "message": "Vehicle not found." }` |
| Update sends a different existing `vehicleId` | `400` | `{ "message": "Vehicle cannot be changed." }` |
| `:mileageLogId` is not an integer | `400` | `{ "message": "Invalid mileage log id." }` |
| Mileage log id does not exist | `404` | `{ "message": "Mileage log with id=… not found." }` |
| Mileage log is used by a service log | `400` | `{ "message": "Mileage log is used by a service log and can't be deleted." }` |

## Service logs

Every route uses `authorizeRoles("admin", "area_admin", "maintenance")`. A missing session is `401` `{ "message": "Unauthorized! No token provided." }`. A signed-in user without one of those roles is `403` `{ "message": "One of these roles is required: admin, area_admin, maintenance." }`.

An admin or a maintenance user may create, update, and delete a service log for any vehicle. An area admin may do that only when the vehicle belongs to an area they administer. A vehicle outside that scope is `403` `{ "message": "Not authorized for the specified area." }`. `GET` is not limited by area.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/service-logs` | Admin, area admin, or maintenance | `200` array of every service log, newest `servicedAt` first. |
| `GET` | `/api/service-logs/:serviceLogId` | Admin, area admin, or maintenance | `200` with one service log. |
| `GET` | `/api/service-logs/vehicle/:vehicleId` | Admin, area admin, or maintenance | `200` array of that vehicle's service logs, newest `servicedAt` first. |
| `POST` | `/api/service-logs` | Admin, area admin for that vehicle, or maintenance | `201` with the created service log. Also creates the attached mileage log. |
| `PUT` | `/api/service-logs/:serviceLogId` | Admin, area admin for the current and new vehicle, or maintenance | `200` with the updated service log. Updates the attached mileage log's reading, vehicle, and date. |
| `DELETE` | `/api/service-logs/:serviceLogId` | Admin, area admin for that vehicle, or maintenance | `200` `{ "message": "Service log deleted successfully." }`. The mileage log stays. |

Create and update body: `{ "userId": 1, "vehicleId": 2, "serviceTypeId": 1, "miles": 12050, "maintenanceNeedId": null, "servicedAt": "2026-07-02" }`. `maintenanceNeedId` may be omitted. `miles` is a whole number of 0 or more and is stored on a new mileage log at create. That mileage log's `userId` is the signed-in user. The service log's `userId` is the user in the body.

Success body: `{ "id", "userId", "vehicleId", "serviceTypeId", "mileageLogId", "maintenanceNeedId", "servicedAt", "user": { "id", "firstName", "lastName" }, "vehicle": { "id", "universityId" }, "serviceType": { "id", "name" }, "mileageLog": { "id", "odometerReading" }, "createdAt", "updatedAt" }`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Signed in without `admin`, `area_admin`, or `maintenance` | `403` | `{ "message": "One of these roles is required: admin, area_admin, maintenance." }` |
| Area admin uses a vehicle outside their areas | `403` | `{ "message": "Not authorized for the specified area." }` |
| Missing `userId`, `vehicleId`, `serviceTypeId`, `miles`, or `servicedAt` | `400` | `{ "message": "Missing user." }` / `Missing vehicle.` / `Missing service type.` / `Missing mileage.` / `Missing serviced at.` |
| Id is not a positive integer | `400` | `{ "message": "Invalid user." }` / `Invalid vehicle.` / `Invalid service type.` |
| `miles` is not a whole number | `400` | `{ "message": "Mileage must be a whole number." }` |
| `miles` is negative | `400` | `{ "message": "Mileage must be zero or greater." }` |
| `maintenanceNeedId` is not a positive integer | `400` | `{ "message": "Invalid maintenance need." }` |
| `servicedAt` is not a real `YYYY-MM-DD` date | `400` | `{ "message": "Invalid serviced at." }` |
| `servicedAt` is after today | `400` | `{ "message": "serviced_at cannot be after current date." }` |
| `userId` does not exist | `404` | `{ "message": "User not found." }` |
| `vehicleId` does not exist | `404` | `{ "message": "Vehicle not found." }` |
| `serviceTypeId` does not exist | `404` | `{ "message": "Service type not found." }` |
| `:serviceLogId` or `:vehicleId` is not an integer | `400` | `{ "message": "Invalid service log id." }` / `{ "message": "Invalid vehicle id." }` |
| Service log id does not exist | `404` | `{ "message": "Service log with id=… not found." }` |

## Maintenance needs

Every `/api/maintenance-needs` route uses `authorizeRoles("admin", "area_admin", "maintenance")`. Admins and maintenance users see every need and every vehicle. An area admin sees and changes needs only when the vehicle is in an area they administer. A missing token is `401` `{ "message": "Unauthorized! No token provided." }`. A signed-in user without one of those roles is `403` `{ "message": "One of these roles is required: admin, area_admin, maintenance." }`. An area admin using a vehicle outside their areas is `403` `{ "message": "Unauthorized for this area." }`.

`authorId` is always the signed-in user. A body `authorId` is ignored. `issueReportId` must be null unless the signed-in user is an admin or area admin. On create, a non-null `issueReportId` copies the issue report: title `Maintenance Needed`, that report's vehicle, assignee, and description, `outOfService` true, priority `None`, status `Open`, and `resolvedAt` null.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/maintenance-needs` | Admin, area admin, or maintenance | `200` array, newest `createdAt` first. Area admins only receive needs for their vehicles. |
| `GET` | `/api/maintenance-needs/options` | Admin, area admin, or maintenance | `200` `{ "vehicles", "assignees" }` for the create and edit form. Vehicles follow the same area rule. Assignees are users who hold the maintenance role. |
| `GET` | `/api/maintenance-needs/:maintenanceNeedId` | Admin, area admin for that vehicle, or maintenance | `200` with one maintenance need. |
| `POST` | `/api/maintenance-needs` | Admin, area admin for that vehicle, or maintenance | `201` with the created maintenance need. |
| `PUT` | `/api/maintenance-needs/:maintenanceNeedId` | Admin, area admin for the current vehicle and the vehicle in the body, or maintenance | `200` with the updated maintenance need. |
| `DELETE` | `/api/maintenance-needs/:maintenanceNeedId` | Admin, area admin for that vehicle, or maintenance | `200` `{ "message": "Maintenance need deleted." }`. |

Success body: `{ "id", "issueReportId", "authorId", "vehicleId", "assigneeId", "title", "description", "outOfService", "priority", "status", "resolvedAt", "author", "assignee", "vehicle", "createdAt", "updatedAt" }`. `author` and `assignee` are `{ "id", "firstName", "lastName" }` (`assignee` is null when unset). `vehicle` is `{ "id", "color", "make", "model", "licensePlate", "areaId", "universityId" }`. `resolvedAt` is `yyyy-mm-dd` or null.

| Condition | Status | Body |
| --------- | ------ | ---- |
| No Bearer token | `401` | `{ "message": "Unauthorized! No token provided." }` |
| Signed in without admin, area admin, or maintenance | `403` | `{ "message": "One of these roles is required: admin, area_admin, maintenance." }` |
| Area admin and the vehicle is outside their areas | `403` | `{ "message": "Unauthorized for this area." }` |
| Missing or whitespace-only title | `400` | `{ "message": "Missing title." }` |
| Title longer than 50 characters | `400` | `{ "message": "Title cannot be longer than 50 characters." }` |
| Missing `vehicleId` | `400` | `{ "message": "Missing vehicle id." }` |
| `vehicleId` does not exist | `400` | `{ "message": "Vehicle does not exist." }` |
| `assigneeId` does not exist | `400` | `{ "message": "User does not exist." }` |
| Assignee does not have the maintenance role | `400` | `{ "message": "User does not have maintenance role." }` |
| Missing `outOfService` | `400` | `{ "message": "Out of service boolean is required." }` |
| `outOfService` is not a boolean | `400` | `{ "message": "Out of service boolean must be a boolean." }` |
| Missing `priority` | `400` | `{ "message": "Priority is required." }` |
| `priority` is not High, Medium, Low, or None | `400` | `{ "message": "Priority must be Low, Medium, High, or None." }` |
| Missing `status` | `400` | `{ "message": "Status is required." }` |
| `status` is not Open, In Progress, Completed, or Canceled | `400` | `{ "message": "Status must be Open, In Progress, Completed, or Canceled." }` |
| `resolvedAt` is not `yyyy-mm-dd` | `400` | `{ "message": "Resolved at date must be in format yyyy-mm-dd." }` |
| `resolvedAt` is before 1950-01-01 or after today | `400` | `{ "message": "Resolved at date must be between 1950 and today." }` |
| Status is Open or In Progress and a valid `resolvedAt` was sent | `201` or `200` | `resolvedAt` is stored as null. |
| Status is Completed or Canceled and `resolvedAt` is null | `201` or `200` | `resolvedAt` is stored as today's date. |
| `issueReportId` does not exist | `400` | `{ "message": "Issue report id does not exist." }` |
| `issueReportId` is already used by a maintenance need | `400` | `{ "message": "Issue report already belongs to a maintenance need." }` |
| Maintenance need id does not exist | `404` | `{ "message": "Maintenance need does not exist." }` |

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.

## Vehicle Requests (Feature 8)

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/me/requests` | Bearer | `200` array of the signed-in user's requests |
| `GET` | `/api/requests` | `authenticateAreaAdmin` | `200` all requests (admin) or those in managed areas (area admin) |
| `POST` | `/api/requests` | Bearer | `201` with the created request, owned by the signed-in user |
| `GET` | `/api/requests/:requestId` | Bearer | `200` if the user owns it or manages its area |
| `PUT` | `/api/requests/:requestId` | Bearer | `200` with the updated request. Omitted fields keep their stored values. |
| `GET` | `/api/requests/:requestId/vehicle-options` | `authenticateAreaAdmin` | `200` array of `{ vehicle, conflictingRequestIds, outOfService, milesUntilService }` for the request's area |

Body fields: `areaId`, `purpose`, `startAt`, `endAt`, `allDay`, `numberOfPeople`, `drivers` (array of driver ids), `destinations` (ordered array of `{ id }` for saved destinations or `{ name, addressLine1, addressLine2, city, state, zipCode }` for new ones). `PUT` also takes `status` and `vehicles` (array of vehicle ids, managers only).

Responses include `area`, `user`, `approver`, and flattened `drivers`, ordered `destinations`, and `vehicles`. All-day `startAt`/`endAt` are returned as `YYYY-MM-DD`.

| Condition | Status | Body |
| --------- | ------ | ---- |
| Missing `areaId`, `purpose`, `startAt`, `endAt`, `numberOfPeople`, `drivers`, or `destinations` | `400` | `{ "message": "Missing <field>." }` |
| `numberOfPeople` not a non-negative integer | `400` | `numberOfPeople must be a non-negative integer.` |
| End before start | `400` | `endAt cannot be before startAt.` |
| Same destination twice in a row | `400` | `A destination is listed twice in a row.` |
| More than 10 destinations | `400` | `A trip can have at most 10 destinations.` |
| Driver not approved / license expired / expires before trip ends | `400` | `<Name> is not an approved driver.` / `<Name>'s license has expired.` / `<Name>'s license expires before the trip ends.` |
| Vehicle outside the request's area | `400` | `Vehicles must belong to the request's area.` |
| Requester assigns vehicles, sets a status other than `cancelled`, or edits a non-pending request | `403` | |
| Requester calls `GET /api/requests` or `vehicle-options` | `403` | `{ "message": "Area admin role required." }` |
| Request not found or not visible to the user | `404` | `Vehicle request with id=… not found.` |

### Address search (Feature 8, FR-008)

Proxies Google Places so the key stays on the server. Any signed-in user. Pass the same `sessionToken` (a client-generated UUID) to every call for one address so Google bills them as one session.

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/places/autocomplete?input=…&sessionToken=…` | Bearer | `200` array of `{ placeId, name, description }`, biased toward campus, US only |
| `GET` | `/api/places/:placeId?sessionToken=…` | Bearer | `200` `{ addressLine1, addressLine2, city, state, zipCode }` |
| `GET` | `/api/places/:placeId/miles-from-campus` | `admin` or `area_admin` | `200` `{ milesFromCampus }`: one-way driven miles from campus (Google Routes; billed per call) |

| Condition | Status | Body |
| --------- | ------ | ---- |
| `input` shorter than 3 or longer than 200 characters | `400` | `Enter 3 to 200 characters to search.` |
| Bad `sessionToken` / `placeId` | `400` | `Invalid session token.` / `Invalid place id.` |
| `GOOGLE_MAPS_API_KEY` not set | `503` | `Address search isn't available.` |
| Google request failed | `502` | `Address search failed.` |

### Lists for the request form

| Method | Endpoint | Auth | Success |
| ------ | -------- | ---- | ------- |
| `GET` | `/api/destinations/selectable` | Bearer | `200` array of official destinations (`isSaved: true`) by name: `{ id, name, addressLine1, addressLine2, city, state, zipCode, milesFromCampus }` |

In a request, `drivers` carries `{ id, firstName, lastName }` only, and `vehicles` omits the VIN or serial number.

The request form loads drivers from Feature 7's `GET /api/drivers/selectable`.

A stop in `destinations` is `{ id }` or `{ name, addressLine1, addressLine2, city, state, zipCode }`. A new stop requires `name`, `addressLine1`, `city`, and `state` (at most 255 characters each) and is saved unofficial (`isSaved: false`). `{ id }` of an unofficial destination returns `400` unless the request already has it.

### Delete guards

Requests are never deleted, so these return `400` while a request points at the row: `DELETE /api/destinations/:id`, `/api/vehicles/:id`, `/api/drivers/:id`, `/api/areas/:id`, and `/api/users/:id` (for the user who made the request). Deleting a user who only approved a request clears `approverId`.
