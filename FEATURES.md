Reference the current database design [here](ERD.md). It’s not finalized, so feel free to change it if necessary.

## 1. Auth (Google Auth)

There’s an example in the league repository (including an example spec, but the spec is for adding Google auth to an app that already had regular auth).

## 2. Area

Name and logo. Logo will require finding a way to store images. I recommend an S3 bucket. AWS charges money. Supabase is free last I checked. We can wait to do logos until a later feature so it doesn't block us.

Note: I wrote the feature spec to store the logo URL. (Lana) 

Blocked by: Auth

## 3. Roles/Permissions

Roles are admin, area_admin, maintenance. Every user has the “requester” role by default. Users can have multiple roles. If an area_admin, the role record needs an area_id to indicate which area.

Blocked by: Auth, Areas

Be sure to go back and use the new roles to enforce role access to the Area feature.

## 4. Vehicle Types

Just a name. Maybe add some default types like car, van, bus, and golf cart, but admin should be able to add custom vehicle types.

Blocked by: Roles

## 5. Vehicles

Belongs to an Area and has a Vehicle Type.

Blocked by: Areas, Vehicle Types

## 6. Destinations

These are weird because there are standard “official” destinations you can select, or you can enter a new one (with city, state). I’m thinking of just one table for both, with an is_saved column that means it should count as an “official” destination. Admins can toggle that column to make a custom-entered destination an official one.

Blocked by: Roles

## 7. Drivers

Optionally linked to a user record.

Blocked by: Roles

## 8. Vehicle Request and Vehicle_Request_Driver

Vehicle_id is nullable because it won’t be filled in until the area admin assigns a vehicle to the request.

Will need to make the vehicle_request_driver pivot table at the same time, because a single request can have more than one driver, so it’s a many-to-many relationship.

Blocked by: Areas, Destinations, Drivers, Vehicles

## 9. Mileage Log

Each row is one odometer reading for a single vehicle. Also stores which user added the record.

Blocked by: Vehicles

## 10. Issue Report

This is primarily designed for a requester to fill out before, during, or after their trip. FK to vehicle_request. Optional assignee_id.

Blocked by: Vehicles, Vehicle Requests

## 11. Maintenance Need

These may be redundant with Issue Report, but my thinking is that it’s not the requester’s job to decide if maintenance is needed. And stuff like low gas isn’t necessarily a maintenance need, but it still needs to be reported as an issue. We can add a button that lets area admins easily generate a maintenance need from an issue report with a single click if we want.

Blocked by: Vehicles, Issue Reports

## 12. Service Types

No FKs on this table, so no blockers except Auth and Roles. Has service_frequency_days and service_frequency_miles to indicate how often the service should be performed (ex. change oil every 5000 miles). Only one needs to be filled out.

Blocked by: Roles

## 13. Service Log

Optionally linked to a maintenance need. Required FK to mileage log, so maintenance staff will be required to log the odometer every time they service a vehicle.

Blocked by: Vehicles, Service Types, Mileage Log, Maintenance Need

## 14. Note

Can be attached to vehicle requests, issue reports, and maintenance needs. I’m thinking of them sort of like comments. is_visible is so admins can add notes that requesters can’t see. include_in_email is for if we decide to include notes in email alerts (not an essential feature).

Blocked by: Vehicle Request, Issue Report, Maintenance Need

## 15. Vehicle Type Instructions

These contain the email content for the given vehicle type. FK to vehicle_type and an optional FK to area. Admin users will supply the defaults, but if it has an area_id, that means it’s the area overriding the default instructions for that vehicle type.

Blocked by: Vehicle Types, Area
