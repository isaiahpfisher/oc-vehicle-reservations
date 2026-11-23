/**
 * Development seed data: a small, hand-written campus that shows every screen, status, and warning in the app without
 * burying it in rows. Every record is here on purpose; see the README's seed section for where to look.
 *
 * Usage (from backend/): npm run seed [-- --keep you@eagles.oc.edu ...] [-- --google]
 *
 * It replaces users, sessions, roles, areas, and every sample table. `--keep` keeps your account (and its non-area
 * roles and session). The project team (TEAM_ADMINS) is always seeded as admins, so they can sign in with Google
 * right after a seed. Dates are offsets from the day you seed, so the data always looks current. Request mileage comes
 * from the destinations' coordinates; `--google` uses Google Routes instead (one billed call per request).
 */
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import db from "../app/models/index.js";
import { estimateMiles } from "../app/helpers/mileage.js";
import { TEAM_ADMINS, isTeamAdmin } from "../app/config/teamAdmins.js";

/* ------------------------------------------------------------------------------------------------------------------ */
/* Dates                                                                                                               */
/* ------------------------------------------------------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const pad = (value, length = 2) => String(value).padStart(length, "0");

/** `YYYY-MM-DD` for `offset` days from today (local time). */
const isoDay = (offset = 0) => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
};

/** Midnight `offset` days from today, or `hour` o'clock that day. All-day trips are stored at UTC midnight (Feature 8). */
const tripDate = (offset, hour) => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  if (hour !== undefined) {
    day.setHours(hour, 0, 0, 0);
    return day;
  }
  return new Date(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T00:00:00.000Z`);
};

/** `days` days and `hours` hours ago. */
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY_MS + hours * HOUR_MS);

/* ------------------------------------------------------------------------------------------------------------------ */
/* Areas and people (Features 2 and 3)                                                                                 */
/* ------------------------------------------------------------------------------------------------------------------ */

export const SEED_AREAS = ["Admissions", "Athletics", "Facilities", "Music", "Student Life", "Theatre"];

const areaAdmin = (...areas) => areas.map((area) => ({ role: "area_admin", area }));
const person = (firstName, lastName, roles = []) => ({
  firstName,
  lastName,
  email: `${firstName}.${lastName}@oc.edu`.toLowerCase(),
  roles,
});

/** One account per role, for the Developer sign-in form (password `password`). */
const TEST_ACCOUNTS = [
  { firstName: "Avery", lastName: "Admin", email: "admin@oc.edu", roles: [{ role: "admin" }] },
  { firstName: "Morgan", lastName: "Maintenance", email: "maintenance@oc.edu", roles: [{ role: "maintenance" }] },
  { firstName: "Taylor", lastName: "Athletics", email: "areaadmin@oc.edu", roles: areaAdmin("Athletics") },
  { firstName: "Casey", lastName: "Multirole", email: "multirole@oc.edu", roles: [{ role: "maintenance" }, ...areaAdmin("Music", "Theatre")] },
  { firstName: "Riley", lastName: "Requester", email: "requester@oc.edu", roles: [] },
];

/** Every area has an area admin; Athletics has three, so its card shows the "+1" overflow. */
const STAFF = [
  person("Dana", "Whitfield", [{ role: "admin" }]),
  person("Marcus", "Bell", areaAdmin("Athletics")),
  person("Kendra", "Wallace", areaAdmin("Athletics")),
  person("Elena", "Ruiz", areaAdmin("Music")),
  person("Grant", "Holloway", areaAdmin("Theatre")),
  person("Jasmine", "Ortiz", areaAdmin("Student Life")),
  person("Priya", "Natarajan", areaAdmin("Admissions")),
  person("Wendy", "Okafor", [{ role: "maintenance" }, ...areaAdmin("Facilities")]),
  person("Hector", "Alvarez", [{ role: "maintenance" }]),
  // Coaches and directors who request trips.
  person("Laura", "Simmons"),
  person("Tom", "Garrison"),
  person("Beth", "Calloway"),
];

const STUDENTS = [
  person("Noah", "Patel"),
  person("Grace", "Kim"),
  person("Hannah", "Lee"),
  person("Jacob", "Miller"),
  person("Ethan", "Brooks"),
  person("Sophia", "Nguyen"),
  person("Abigail", "Reed"),
  person("Levi", "Johnson"),
];

export const SEED_USERS = [...TEAM_ADMINS, ...TEST_ACCOUNTS, ...STAFF, ...STUDENTS];

/* ------------------------------------------------------------------------------------------------------------------ */
/* Vehicle types, service types, and instructions (Features 4, 12, and 15)                                             */
/* ------------------------------------------------------------------------------------------------------------------ */

export const SEED_VEHICLE_TYPES = [
  { name: "Bus", identifier: "VIN" },
  { name: "Car", identifier: "VIN" },
  { name: "Golf Cart", identifier: "Serial" },
  { name: "SUV", identifier: "VIN" },
  { name: "Truck", identifier: "VIN" },
  { name: "Van", identifier: "VIN" },
];

/** One of each kind of schedule: miles and days, miles only, and days only. Every service applies to every vehicle. */
export const SEED_SERVICE_TYPES = [
  { name: "Oil change", service_frequency_days: 180, service_frequency_miles: 5000 },
  { name: "Tire rotation", service_frequency_days: null, service_frequency_miles: 7500 },
  { name: "Brake inspection", service_frequency_days: 365, service_frequency_miles: 15000 },
  { name: "Annual safety inspection", service_frequency_days: 365, service_frequency_miles: null },
];
const EVERY_SERVICE = SEED_SERVICE_TYPES.map(({ name }) => name);
/** A shop visit does one or the other, so history isn't the same four rows every time. */
const OIL = ["Oil change", "Tire rotation"];
const INSPECTION = ["Annual safety inspection", "Brake inspection"];

/**
 * A default for most types, two areas that do vans their own way, and Truck with only Theatre's (so Vehicle Types
 * warns "No default instructions"). Most use variables, which each trip fills in, in short Pickup and Return blocks
 * that read right whether a trip has one vehicle of the type or several.
 */
export const SEED_VEHICLE_TYPE_INSTRUCTIONS = [
  {
    type: "Car",
    area: null,
    content: [
      "Hi {{driver_first_name}},",
      "",
      "Pickup: {{pickup_time}}",
      "Get the keys for {{vehicle}} from Support Central during office hours.",
      "",
      "Return: {{return_time}}",
      "Leave at least half a tank, and put the keys in the drop box outside Support Central.",
    ].join("\n"),
  },
  {
    type: "SUV",
    area: null,
    content: [
      "Pickup: {{pickup_time}}",
      "Get the keys for {{vehicle}} from Support Central during office hours.",
      "",
      "Return: {{return_time}}",
      "Leave at least half a tank, and put the keys in the drop box outside Support Central.",
    ].join("\n"),
  },
  {
    type: "Van",
    area: null,
    content: [
      "Hi {{driver_first_name}},",
      "",
      "Pickup: {{pickup_time}}",
      "Get the keys from Support Central, then pick up {{vehicle}} from the lot behind Garvey. Check the tires before you leave.",
      "",
      "Return: {{return_time}}",
      "Fill the tank, clean out the van, and leave the keys in the drop box outside Support Central.",
      "",
      "Questions? Contact {{area_admins}}.",
    ].join("\n"),
  },
  {
    type: "Van",
    area: "Athletics",
    content: [
      "Athletics vans are kept at the field house.",
      "Van: {{vehicle}}",
      "Pickup: {{pickup_time}}. Get the keys from the equipment room.",
      "Return: {{return_time}}. Bring the keys back to the equipment room, and let a coach know if anything's wrong.",
      "Questions? Ask {{area_admins}}.",
    ].join("\n"),
  },
  {
    // No variables: plain text still works.
    type: "Van",
    area: "Music",
    content: "Music vans are parked behind the fine arts building. Keys are with the department secretary.",
  },
  {
    type: "Bus",
    area: null,
    content: [
      "A driver with a CDL is required. Do a walk-around inspection before leaving.",
      "Bus: {{vehicle}}",
      "Pickup: {{pickup_time}}, from the north lot.",
      "Return: {{return_time}}. Park in the north lot and leave the keys with Facilities.",
    ].join("\n"),
  },
  {
    type: "Golf Cart",
    area: null,
    content: "Campus paths only. Plug {{vehicle}} in at the charging station by {{return_time}}.",
  },
  {
    type: "Truck",
    area: "Theatre",
    content: [
      "Truck: {{vehicle}}, parked behind the theatre.",
      "Pickup: {{pickup_time}}. Strap down every set piece before you leave.",
      "Return: {{return_time}}. Sweep out the box and leave the keys at the theatre office.",
      "Questions? Contact {{area_admins}}.",
    ].join("\n"),
  },
];

/* ------------------------------------------------------------------------------------------------------------------ */
/* Vehicles (Feature 5)                                                                                                */
/* ------------------------------------------------------------------------------------------------------------------ */

const VIN_CHARACTERS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";

/** A made-up 17-character VIN, the same every run. */
const vinFor = (universityId) => {
  let hash = [...universityId].reduce((sum, char) => (Math.imul(sum, 31) + char.charCodeAt(0)) >>> 0, 7);
  const rest = Array.from({ length: 16 }, () => {
    hash = (Math.imul(hash, 1103515245) + 12345) >>> 0;
    return VIN_CHARACTERS[(hash >>> 16) % VIN_CHARACTERS.length];
  });
  return `1${rest.join("")}`;
};

/**
 * `[make, model, seats]`, the year, and the rest of the vehicle. Golf carts have a serial number and no plate.
 * Plates run through next year unless a scenario says otherwise.
 */
const vehicle = (universityId, area, type, [make, model, passengerCapacity], year, color, extra = {}) => {
  const golfCart = type === "Golf Cart";
  return {
    universityId,
    area,
    type,
    make,
    model,
    year,
    passengerCapacity,
    color,
    identifier: golfCart ? `SN-${universityId.replace("-", "")}-${(year * 7) % 100000}` : vinFor(universityId),
    purchasedAt: `${year}-0${(year % 9) + 1}-15`,
    licensePlateExpirationDate: golfCart ? null : isoDay(240 + (year % 5) * 30),
    status: "active",
    ...extra,
  };
};

/**
 * 19 vehicles. Most are fine; these have a story (and history below to match):
 * - ATH-V01 is out of service (brakes) and reserved for a trip in 3 days.
 * - ATH-S01's oil change (every 180 days) comes due in 10 days, before its reserved soccer match in 12.
 * - ATH-C01 is booked for two overlapping trips.
 * - ATH-V03 is retired but still on an upcoming trip. FAC-G02 is retired and off the road.
 * - MUS-B01 is fine, but the choir tour is longer than the miles left before its oil change.
 * - MUS-C01 is overdue for an oil change by miles; STU-B01 is overdue by date (and on a trip today).
 * - FAC-T01 is due soon by miles. THE-T01's plate has expired. STU-V01's plate expires before its airport run.
 * - ADM-S01 was bought this month and has never been serviced.
 */
const FLEET = [
  vehicle("ATH-V01", "Athletics", "Van", ["Ford", "Transit 350", 15], 2021, "White"),
  vehicle("ATH-V02", "Athletics", "Van", ["Ford", "Transit 350", 15], 2022, "Silver"),
  vehicle("ATH-B01", "Athletics", "Bus", ["Blue Bird", "Vision", 48], 2019, "Maroon"),
  vehicle("ATH-C01", "Athletics", "Car", ["Toyota", "Camry", 5], 2020, "Gray"),
  vehicle("ATH-S01", "Athletics", "SUV", ["Chevrolet", "Tahoe", 8], 2021, "Black"),
  vehicle("ATH-V03", "Athletics", "Van", ["Ford", "E-350", 12], 2009, "White", { status: "retired" }),
  vehicle("MUS-B01", "Music", "Bus", ["MCI", "J4500 Coach", 56], 2018, "Maroon"),
  vehicle("MUS-V01", "Music", "Van", ["Mercedes-Benz", "Sprinter 2500", 12], 2023, "White"),
  vehicle("MUS-C01", "Music", "Car", ["Honda", "Accord", 5], 2019, "Blue"),
  vehicle("THE-T01", "Theatre", "Truck", ["Isuzu", "NPR Box Truck", 3], 2016, "White", { licensePlateExpirationDate: isoDay(-20) }),
  vehicle("THE-V01", "Theatre", "Van", ["Ford", "Transit 150", 12], 2020, "Gray"),
  vehicle("STU-V01", "Student Life", "Van", ["Ford", "Transit 350", 15], 2022, "Blue", { licensePlateExpirationDate: isoDay(6) }),
  vehicle("STU-B01", "Student Life", "Bus", ["Thomas", "Saf-T-Liner C2", 40], 2017, "Yellow"),
  vehicle("STU-G01", "Student Life", "Golf Cart", ["Club Car", "Onward", 4], 2023, "White"),
  vehicle("ADM-C01", "Admissions", "Car", ["Toyota", "Camry", 5], 2022, "Maroon"),
  vehicle("ADM-S01", "Admissions", "SUV", ["Honda", "Pilot", 8], new Date().getFullYear(), "Silver", {
    purchasedAt: isoDay(-20),
    licensePlateExpirationDate: isoDay(365),
  }),
  vehicle("FAC-T01", "Facilities", "Truck", ["Ford", "F-150", 5], 2018, "White"),
  vehicle("FAC-G01", "Facilities", "Golf Cart", ["E-Z-GO", "Express S2", 2], 2021, "Green"),
  vehicle("FAC-G02", "Facilities", "Golf Cart", ["Club Car", "Carryall 502", 2], 2012, "Green", { status: "retired" }),
];

/** Plates in order (OC1037, OC1074, …), so no two match. Golf carts have none. */
export const SEED_VEHICLES = FLEET.map((row, i) => ({ ...row, licensePlate: row.type === "Golf Cart" ? null : `OC${1000 + (i + 1) * 37}` }));

/* ------------------------------------------------------------------------------------------------------------------ */
/* Drivers (Feature 7)                                                                                                 */
/* ------------------------------------------------------------------------------------------------------------------ */

/** `account` is the seeded user the driver is linked to; without one, the driver has a personal email. */
const driver = (firstName, lastName, account, phoneNumber, licenseExpirationDate, status, licenseState = "OK") => ({
  firstName,
  lastName,
  account,
  email: account ?? `${firstName}.${lastName}@example.com`.toLowerCase(),
  phoneNumber,
  licenseState,
  licenseExpirationDate,
  status,
});

/** Every status, a license that expired, one that expires in 12 days, and two drivers without an account. */
export const SEED_DRIVERS = [
  driver("Riley", "Requester", "requester@oc.edu", "405-555-0101", "2029-03-15", "approved"),
  driver("Taylor", "Athletics", "areaadmin@oc.edu", "405-555-0102", "2031-01-31", "approved"),
  driver("Marcus", "Bell", "marcus.bell@oc.edu", "405-555-0103", "2028-09-30", "approved"),
  driver("Tom", "Garrison", "tom.garrison@oc.edu", "405-555-0104", "2030-12-31", "approved"),
  driver("Noah", "Patel", "noah.patel@oc.edu", "918-555-0105", "2032-04-30", "approved"),
  driver("Grace", "Kim", "grace.kim@oc.edu", "214-555-0106", "2031-07-31", "approved", "TX"),
  driver("Laura", "Simmons", "laura.simmons@oc.edu", "405-555-0107", isoDay(12), "approved"),
  driver("Hannah", "Lee", "hannah.lee@oc.edu", "405-555-0108", isoDay(-34), "approved"),
  driver("Jacob", "Miller", "jacob.miller@oc.edu", "580-555-0109", "2029-05-01", "pending"),
  driver("Ethan", "Brooks", "ethan.brooks@oc.edu", "405-555-0110", "2030-01-01", "denied"),
  driver("Sophia", "Nguyen", "sophia.nguyen@oc.edu", "405-555-0111", "2029-08-01", "revoked", "KS"),
  driver("Frank", "Delgado", null, "405-555-0112", "2029-10-31", "approved"),
  driver("Wes", "Hart", null, "405-555-0113", "2030-03-31", "former"),
];

/* ------------------------------------------------------------------------------------------------------------------ */
/* Destinations (Feature 6)                                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/** Oklahoma Christian University, where every trip starts and ends. */
const CAMPUS = { lat: 35.6411, lng: -97.4515 };
/** Roads aren't straight: driving miles ≈ straight-line miles × this. */
const ROAD_FACTOR = 1.25;

const straightMiles = (a, b) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
};

const legMiles = (a, b) => Math.round(straightMiles(a, b) * ROAD_FACTOR);

const place = (name, addressLine1, city, state, zipCode, lat, lng, isSaved = true) => ({
  name,
  addressLine1,
  city,
  state,
  zipCode,
  isSaved,
  // A custom stop typed on a request has no distance until an admin fills one in.
  milesFromCampus: isSaved ? legMiles(CAMPUS, { lat, lng }) : null,
  coordinates: { lat, lng },
});

/** Saved places, then three custom stops that requests added. Coordinates are approximate. */
const PLACES = [
  place("Oklahoma State University", "401 Whitehurst Hall", "Stillwater", "OK", "74078", 36.1257, -97.07),
  place("University of Oklahoma", "660 Parrington Oval", "Norman", "OK", "73019", 35.2059, -97.4457),
  place("Oral Roberts University", "7777 S Lewis Ave", "Tulsa", "OK", "74171", 36.0505, -95.954),
  place("Southern Nazarene University", "6729 NW 39th Expy", "Bethany", "OK", "73008", 35.5066, -97.65),
  place("University of Central Oklahoma", "100 N University Dr", "Edmond", "OK", "73034", 35.6565, -97.472),
  place("Abilene Christian University", "1600 Campus Ct", "Abilene", "TX", "79601", 32.4687, -99.709),
  place("Lubbock Christian University", "5601 19th St", "Lubbock", "TX", "79407", 33.577, -101.942),
  place("Will Rogers World Airport", "7100 Terminal Dr", "Oklahoma City", "OK", "73159", 35.3931, -97.6007),
  place("DFW International Airport", "2400 Aviation Dr", "DFW Airport", "TX", "75261", 32.8998, -97.0403),
  place("Civic Center Music Hall", "201 N Walker Ave", "Oklahoma City", "OK", "73102", 35.4693, -97.5197),
  place("Tulsa Performing Arts Center", "110 E 2nd St", "Tulsa", "OK", "74103", 36.155, -95.9915),
  place("Falls Creek Camp", "3770 Falls Creek Rd", "Davis", "OK", "73030", 34.45, -97.13),
  place("Oklahoma City Zoo", "2000 Remington Pl", "Oklahoma City", "OK", "73111", 35.5236, -97.4723),
  place("Lowe's Home Improvement", "1700 E 2nd St", "Edmond", "OK", "73034", 35.653, -97.45),
  place("Grainger Industrial Supply", "1201 S Rockwell Ave", "Oklahoma City", "OK", "73128", 35.451, -97.638),
  place("Regional Food Bank of Oklahoma", "3355 S Purdue Ave", "Oklahoma City", "OK", "73179", 35.433, -97.606),
  place("Hampton Inn Stillwater", "717 E Hall of Fame Ave", "Stillwater", "OK", "74075", 36.134, -97.051, false),
  place("First Baptist Church Guthrie", "202 E Oklahoma Ave", "Guthrie", "OK", "73044", 35.879, -97.425, false),
  place("Smith Family Farm", "22150 E Waterloo Rd", "Arcadia", "OK", "73007", 35.695, -97.33, false),
];

export const SEED_DESTINATIONS = PLACES.map(({ coordinates, ...fields }) => fields);

const placesByName = Object.fromEntries(PLACES.map((destination) => [destination.name, destination]));

/** Estimated round-trip miles from campus through the named stops, in order (seed data only; the app uses Google). */
export const seedTripMiles = (names) => {
  const points = [CAMPUS, ...names.map((name) => placesByName[name].coordinates), CAMPUS];
  return points.slice(1).reduce((total, point, i) => total + legMiles(points[i], point), 0);
};

/* ------------------------------------------------------------------------------------------------------------------ */
/* Vehicle requests (Feature 8)                                                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

const APPROVED_STATUSES = ["awaiting_vehicle", "reserved", "returned"];

/**
 * 31 trips from about six weeks ago to six weeks out, in every area and status. `start`/`end` are day offsets;
 * `time` is [startHour, endHour] for a timed trip (omit it for all day). `requester@oc.edu` has one of each status
 * but denied, and a few trips have stories (see SEED_VEHICLES and SEED_PROBLEM_REQUESTS).
 */
export const SEED_REQUESTS = [
  // Athletics
  {
    area: "Athletics", requester: "tom.garrison@oc.edu", purpose: "Track meet at Oklahoma State",
    start: 3, end: 3, people: 12, drivers: ["Riley Requester"], destinations: ["Oklahoma State University"],
    status: "reserved", approver: "marcus.bell@oc.edu", vehicles: ["ATH-V01"],
  },
  {
    area: "Athletics", requester: "laura.simmons@oc.edu", purpose: "Basketball tournament at Oral Roberts",
    start: 6, end: 6, people: 14, drivers: ["Tom Garrison", "Noah Patel"], destinations: ["Oral Roberts University"], status: "pending",
  },
  {
    area: "Athletics", requester: "marcus.bell@oc.edu", purpose: "Soccer match at Southern Nazarene",
    start: 12, end: 12, time: [13, 20], people: 8, drivers: ["Taylor Athletics"], destinations: ["Southern Nazarene University"],
    status: "reserved", approver: "areaadmin@oc.edu", vehicles: ["ATH-S01"],
  },
  {
    area: "Athletics", requester: "marcus.bell@oc.edu", purpose: "Recruiting dinner in Norman",
    start: 15, end: 15, time: [16, 22], people: 4, drivers: ["Taylor Athletics"], destinations: ["University of Oklahoma"],
    status: "reserved", approver: "areaadmin@oc.edu", vehicles: ["ATH-C01"],
  },
  {
    // Its dates moved after the car was assigned, so it went back to pending and now overlaps the dinner.
    area: "Athletics", requester: "tom.garrison@oc.edu", purpose: "Coaching clinic at Oklahoma State",
    start: 15, end: 15, time: [13, 20], people: 3, drivers: ["Tom Garrison"], destinations: ["Oklahoma State University"],
    status: "pending", vehicles: ["ATH-C01"],
  },
  {
    area: "Athletics", requester: "kendra.wallace@oc.edu", purpose: "Cross country meet at UCO",
    start: 25, end: 25, time: [7, 15], people: 12, drivers: ["Marcus Bell"], destinations: ["University of Central Oklahoma"],
    status: "reserved", approver: "marcus.bell@oc.edu", vehicles: ["ATH-V03"],
  },
  {
    area: "Athletics", requester: "kendra.wallace@oc.edu", purpose: "Conference tournament at Abilene Christian",
    start: 20, end: 22, people: 40, drivers: ["Tom Garrison", "Noah Patel"], destinations: ["Abilene Christian University"],
    status: "awaiting_vehicle", approver: "areaadmin@oc.edu",
  },
  {
    area: "Athletics", requester: "kendra.wallace@oc.edu", purpose: "Wrestling duals in Stillwater",
    start: 30, end: 31, people: 12, drivers: ["Marcus Bell"], destinations: ["Hampton Inn Stillwater", "Oklahoma State University"],
    status: "pending",
  },
  {
    area: "Athletics", requester: "grace.kim@oc.edu", purpose: "Volleyball at the University of Oklahoma",
    start: -10, end: -10, time: [14, 21], people: 10, drivers: ["Noah Patel"], destinations: ["University of Oklahoma"],
    status: "returned", approver: "marcus.bell@oc.edu", vehicles: ["ATH-V02"],
  },
  {
    area: "Athletics", requester: "laura.simmons@oc.edu", purpose: "Softball doubleheader at UCO",
    start: -24, end: -24, time: [12, 19], people: 14, drivers: ["Taylor Athletics"], destinations: ["University of Central Oklahoma"],
    status: "returned", approver: "areaadmin@oc.edu", vehicles: ["ATH-V02"],
  },
  {
    area: "Athletics", requester: "requester@oc.edu", purpose: "Baseball series at Oral Roberts",
    start: -3, end: -2, people: 6, drivers: ["Riley Requester"], destinations: ["Oral Roberts University"], status: "cancelled",
  },
  {
    area: "Athletics", requester: "kendra.wallace@oc.edu", purpose: "Recruit pickup at Will Rogers",
    start: 5, end: 5, time: [9, 12], people: 2, drivers: ["Taylor Athletics"], destinations: ["Will Rogers World Airport"],
    status: "denied",
  },

  // Music
  {
    area: "Music", requester: "beth.calloway@oc.edu", purpose: "Choir tour: Abilene and Lubbock",
    start: 18, end: 21, people: 48, drivers: ["Frank Delgado", "Marcus Bell"],
    destinations: ["Abilene Christian University", "Lubbock Christian University"],
    status: "reserved", approver: "elena.ruiz@oc.edu", vehicles: ["MUS-B01"],
  },
  {
    // Laura Simmons's license expires before the trip ends.
    area: "Music", requester: "elena.ruiz@oc.edu", purpose: "Honor choir clinic in Tulsa",
    start: 14, end: 15, people: 10, drivers: ["Laura Simmons"], destinations: ["Tulsa Performing Arts Center"],
    status: "reserved", approver: "elena.ruiz@oc.edu", vehicles: ["MUS-V01"],
  },
  {
    area: "Music", requester: "beth.calloway@oc.edu", purpose: "Jazz band at the Civic Center",
    start: 9, end: 9, time: [17, 23], people: 10, drivers: ["Grace Kim"], destinations: ["Civic Center Music Hall"], status: "pending",
  },
  {
    area: "Music", requester: "beth.calloway@oc.edu", purpose: "Christmas concert at the Civic Center",
    start: -17, end: -17, time: [15, 22], people: 12, drivers: ["Grace Kim"], destinations: ["Civic Center Music Hall"],
    status: "returned", approver: "multirole@oc.edu", vehicles: ["MUS-V01"],
  },

  // Theatre
  {
    area: "Theatre", requester: "abigail.reed@oc.edu", purpose: "Theatre festival in Norman",
    start: 16, end: 17, people: 9, drivers: ["Noah Patel"], destinations: ["University of Oklahoma"],
    status: "awaiting_vehicle", approver: "grant.holloway@oc.edu",
  },
  {
    area: "Theatre", requester: "levi.johnson@oc.edu", purpose: "Pick up set pieces from Lowe's",
    start: 4, end: 4, time: [9, 12], people: 2, drivers: ["Tom Garrison"], destinations: ["Lowe's Home Improvement"], status: "denied",
  },
  {
    area: "Theatre", requester: "levi.johnson@oc.edu", purpose: "Lumber run to Lowe's",
    start: -6, end: -6, time: [9, 11], people: 2, drivers: ["Tom Garrison"], destinations: ["Lowe's Home Improvement"],
    status: "returned", approver: "grant.holloway@oc.edu", vehicles: ["THE-V01"],
  },

  // Student Life
  {
    // STU-V01's plate expires two days before this.
    area: "Student Life", requester: "hannah.lee@oc.edu", purpose: "International student airport run",
    start: 8, end: 8, time: [6, 14], people: 14, drivers: ["Noah Patel"], destinations: ["DFW International Airport"],
    status: "reserved", approver: "jasmine.ortiz@oc.edu", vehicles: ["STU-V01"],
  },
  {
    // Happening today, on a bus that's overdue for service.
    area: "Student Life", requester: "sophia.nguyen@oc.edu", purpose: "Outing to the Oklahoma City Zoo",
    start: 0, end: 0, time: [10, 16], people: 30, drivers: ["Frank Delgado"], destinations: ["Oklahoma City Zoo"],
    status: "reserved", approver: "jasmine.ortiz@oc.edu", vehicles: ["STU-B01"],
  },
  {
    area: "Student Life", requester: "requester@oc.edu", purpose: "Fall retreat at Falls Creek",
    start: 27, end: 29, people: 38, drivers: ["Frank Delgado", "Grace Kim"], destinations: ["Falls Creek Camp"], status: "pending",
  },
  {
    area: "Student Life", requester: "requester@oc.edu", purpose: "Intramural game at Southern Nazarene",
    start: 11, end: 11, time: [17, 22], people: 9, drivers: ["Riley Requester"], destinations: ["Southern Nazarene University"],
    status: "awaiting_vehicle", approver: "jasmine.ortiz@oc.edu",
  },
  {
    area: "Student Life", requester: "requester@oc.edu", purpose: "Service project in Guthrie",
    start: -17, end: -17, time: [8, 15], people: 13, drivers: ["Riley Requester"], destinations: ["First Baptist Church Guthrie"],
    status: "returned", approver: "jasmine.ortiz@oc.edu", vehicles: ["STU-V01"],
  },
  {
    area: "Student Life", requester: "jasmine.ortiz@oc.edu", purpose: "Harvest day at Smith Family Farm",
    start: -40, end: -40, time: [8, 16], people: 11, drivers: ["Marcus Bell"], destinations: ["Smith Family Farm"],
    status: "returned", approver: "jasmine.ortiz@oc.edu", vehicles: ["STU-V01"],
  },

  // Admissions
  {
    area: "Admissions", requester: "requester@oc.edu", purpose: "Pick up visiting families at the airport",
    start: 1, end: 1, time: [10, 13], people: 5, drivers: ["Riley Requester"], destinations: ["Will Rogers World Airport"],
    status: "reserved", approver: "priya.natarajan@oc.edu", vehicles: ["ADM-C01"],
  },
  {
    area: "Admissions", requester: "priya.natarajan@oc.edu", purpose: "College fair at UCO",
    start: 8, end: 8, time: [7, 12], people: 4, drivers: ["Grace Kim"], destinations: ["University of Central Oklahoma"], status: "pending",
  },
  {
    area: "Admissions", requester: "priya.natarajan@oc.edu", purpose: "Campus visit pickup at DFW",
    start: -31, end: -31, people: 5, drivers: ["Frank Delgado"], destinations: ["DFW International Airport"],
    status: "returned", approver: "priya.natarajan@oc.edu", vehicles: ["ADM-C01"],
  },

  // Facilities
  {
    area: "Facilities", requester: "hector.alvarez@oc.edu", purpose: "Equipment pickup at Grainger",
    start: 2, end: 2, time: [8, 12], people: 2, drivers: ["Tom Garrison"], destinations: ["Grainger Industrial Supply"], status: "pending",
  },
  {
    area: "Facilities", requester: "wendy.okafor@oc.edu", purpose: "Deliver tables to the Regional Food Bank",
    start: -38, end: -38, time: [8, 14], people: 3, drivers: ["Tom Garrison"], destinations: ["Regional Food Bank of Oklahoma"],
    status: "returned", approver: "wendy.okafor@oc.edu", vehicles: ["FAC-T01"],
  },
  {
    area: "Facilities", requester: "wendy.okafor@oc.edu", purpose: "Supply run to Lowe's",
    start: 10, end: 10, time: [13, 15], people: 2, drivers: ["Frank Delgado"], destinations: ["Lowe's Home Improvement"], status: "cancelled",
  },
];

/**
 * Feature 18 (US-18.9): requests that break Feature 8's rules on purpose, the way real ones do after approval: a
 * double-booked car, a pending request that kept its vehicle after its dates moved, and a driver whose license lapses.
 */
export const SEED_PROBLEM_REQUESTS = ["Recruiting dinner in Norman", "Coaching clinic at Oklahoma State", "Honor choir clinic in Tulsa"];

/* ------------------------------------------------------------------------------------------------------------------ */
/* Issue reports and maintenance needs (Features 10, 11, and 14)                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * Every type and status. `request` links the trip the report came from; `daysAgo` is when it was reported. Four are
 * pending, so admins and area admins have a badge to clear.
 */
export const SEED_ISSUE_REPORTS = [
  {
    vehicle: "ATH-V01", author: "areaadmin@oc.edu", assignee: "maintenance@oc.edu", type: "maintenance", daysAgo: 6,
    description: "Brakes grind when stopping, worst going downhill. Pulled it from practice runs.",
    status: "moved_to_maintenance", resolvedAt: isoDay(-5),
  },
  {
    vehicle: "ATH-V02", request: "Volleyball at the University of Oklahoma", author: "grace.kim@oc.edu", type: "low_gas", daysAgo: 9,
    description: "Returned with the fuel light on. Sorry, the station by the arena was closed.", status: "pending",
  },
  {
    vehicle: "STU-V01", request: "Service project in Guthrie", author: "requester@oc.edu", assignee: "hector.alvarez@oc.edu",
    type: "dirty", daysAgo: 16, description: "Mud on the floor mats and seats after the service project.",
    status: "resolved", resolvedAt: isoDay(-15),
  },
  {
    vehicle: "MUS-C01", author: "elena.ruiz@oc.edu", assignee: "maintenance@oc.edu", type: "maintenance", daysAgo: 3,
    description: "Check-engine light came on during the drive back from the bank.", status: "pending",
  },
  {
    vehicle: "THE-T01", author: "grant.holloway@oc.edu", type: "other", daysAgo: 2,
    description: "The spare key is missing from the lockbox.", status: "pending",
  },
  {
    vehicle: "ADM-C01", request: "Campus visit pickup at DFW", author: "priya.natarajan@oc.edu", type: "low_gas", daysAgo: 30,
    description: "Tank was below a quarter after the DFW pickup.", status: "cancelled",
  },
  {
    vehicle: "FAC-T01", author: "wendy.okafor@oc.edu", assignee: "hector.alvarez@oc.edu", type: "maintenance", daysAgo: 9,
    description: "The tailgate latch sticks and has to be forced open.", status: "moved_to_maintenance", resolvedAt: isoDay(-8),
  },
  {
    vehicle: "STU-B01", author: "jasmine.ortiz@oc.edu", assignee: "maintenance@oc.edu", type: "other", daysAgo: 1,
    description: "A seat belt in row 6 won't retract.", status: "pending",
  },
];

/**
 * Every status and priority. `report` is the index of the issue report it came from (its author is an admin or area
 * admin, like the API requires). ATH-V01's takes it out of service; THE-V01's was closed out by a service visit.
 */
export const SEED_MAINTENANCE_NEEDS = [
  {
    issueReportIndex: 0, vehicle: "ATH-V01", author: "areaadmin@oc.edu", assignee: "maintenance@oc.edu", daysAgo: 5,
    title: "Brakes grinding", description: "Grinding from the front brakes. Likely pads and rotors.",
    outOfService: true, priority: "High", status: "In Progress",
  },
  {
    issueReportIndex: 6, vehicle: "FAC-T01", author: "wendy.okafor@oc.edu", assignee: "hector.alvarez@oc.edu", daysAgo: 8,
    title: "Tailgate latch sticks", description: "The latch needs to be forced open. Truck is still usable.",
    outOfService: false, priority: "Medium", status: "In Progress",
  },
  {
    issueReportIndex: null, vehicle: "MUS-C01", author: "maintenance@oc.edu", daysAgo: 2,
    title: "Schedule an oil change", description: "Past due by miles. Book it before its next trip.",
    outOfService: false, priority: "Low", status: "Open",
  },
  {
    issueReportIndex: null, vehicle: "STU-B01", author: "jasmine.ortiz@oc.edu", assignee: "maintenance@oc.edu", daysAgo: 4,
    title: "Cracked side mirror", description: "Driver's side mirror is cracked but still usable.",
    outOfService: false, priority: "None", status: "Open",
  },
  {
    issueReportIndex: null, vehicle: "THE-V01", author: "multirole@oc.edu", assignee: "multirole@oc.edu", daysAgo: 15,
    title: "Brake pedal feels soft", description: "Pedal sinks further than it should.",
    outOfService: true, priority: "High", status: "Completed", resolvedAt: isoDay(-12),
  },
  {
    issueReportIndex: null, vehicle: "ATH-C01", author: "marcus.bell@oc.edu", daysAgo: 25,
    title: "Rattle in the dashboard", description: "Turned out to be a loose phone mount.",
    outOfService: false, priority: "Low", status: "Canceled", resolvedAt: isoDay(-20),
  },
];

/* ------------------------------------------------------------------------------------------------------------------ */
/* Mileage and service history (Features 9, 13, and 18)                                                                */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The choir tour's round trip, which MUS-B01's next oil change falls inside. */
const CHOIR_TOUR_MILES = seedTripMiles(["Abilene Christian University", "Lubbock Christian University"]);
/** More than 500 miles left (so MUS-B01 shows Available), but fewer than the choir tour's round trip. */
const CHOIR_BUS_MILES_LEFT = Math.max(550, CHOIR_TOUR_MILES - 150);
const CHOIR_BUS_VISIT = 96400;

/**
 * Each vehicle's service visits `[daysAgo, odometer, services, need]` and odometer readings without a service
 * `[daysAgo, odometer]`. A visit's service logs share one mileage log (Feature 13). Most vehicles have an oil visit and
 * an inspection visit on different days, and several were in the last few weeks so this month's calendar has some;
 * what's due follows from these (see SEED_VEHICLES for the stories).
 */
const HISTORY_PLAN = {
  "ATH-V01": { visits: [[300, 31000, INSPECTION], [60, 38200, OIL]], readings: [[2, 40150]] },
  // Its last reading is older than the volleyball trip, so that trip's miles count toward its estimate (FR-003).
  "ATH-V02": { visits: [[130, 22600, INSPECTION], [45, 24800, OIL]], readings: [[20, 26100]] },
  "ATH-B01": { visits: [[280, 55900, OIL], [200, 58000, INSPECTION], [100, 61000, OIL]], readings: [[5, 63400]] },
  "ATH-C01": { visits: [[150, 38900, INSPECTION], [9, 42100, OIL]], readings: [[3, 42300]] },
  "ATH-S01": { visits: [[170, 30100, OIL], [120, 31000, INSPECTION]], readings: [[4, 33000]] },
  "ATH-V03": { visits: [[400, 142000, EVERY_SERVICE]], readings: [[380, 143100]] },
  "MUS-B01": {
    visits: [[220, CHOIR_BUS_VISIT - 4600, OIL], [150, CHOIR_BUS_VISIT - 3000, INSPECTION], [40, CHOIR_BUS_VISIT, OIL]],
    readings: [[1, CHOIR_BUS_VISIT + 5000 - CHOIR_BUS_MILES_LEFT]],
  },
  "MUS-V01": { visits: [[200, 14900, OIL], [18, 18300, EVERY_SERVICE]], readings: [[2, 19050]] },
  "MUS-C01": { visits: [[300, 47000, INSPECTION], [120, 52000, OIL]], readings: [[3, 57600]] },
  "THE-T01": { visits: [[80, 88000, EVERY_SERVICE]], readings: [[6, 89200]] },
  "THE-V01": {
    visits: [[140, 33900, OIL], [50, 35500, INSPECTION], [12, 36050, ["Brake inspection"], 4]],
    readings: [[4, 36300]],
  },
  "STU-V01": { visits: [[210, 17600, OIL], [90, 19800, INSPECTION], [16, 21600, OIL]], readings: [[1, 22100]] },
  "STU-B01": { visits: [[250, 67000, INSPECTION], [200, 70500, OIL]], readings: [[2, 73000]] },
  "STU-G01": { visits: [[90, 410, EVERY_SERVICE]], readings: [[7, 520]] },
  "ADM-C01": { visits: [[230, 22900, INSPECTION], [27, 28900, OIL]], readings: [[1, 29600]] },
  "ADM-S01": { visits: [], readings: [[20, 12], [2, 350]] },
  "FAC-T01": { visits: [[200, 61000, INSPECTION], [75, 64000, OIL]], readings: [[3, 68700]] },
  "FAC-G01": { visits: [[5, 1230, EVERY_SERVICE]], readings: [[60, 1150], [2, 1240]] },
  "FAC-G02": { visits: [[500, 3800, EVERY_SERVICE]], readings: [[480, 3850]] },
};

/** Who does the work: maintenance users only, like the service log form. */
const TECHS = ["maintenance@oc.edu", "hector.alvarez@oc.edu", "multirole@oc.edu", "wendy.okafor@oc.edu"];
/** Who writes down odometer readings between visits. */
const READERS = ["maintenance@oc.edu", "areaadmin@oc.edu", "hector.alvarez@oc.edu", "jasmine.ortiz@oc.edu"];

const buildHistory = () => {
  const mileageLogs = [];
  const serviceLogs = [];
  let turn = 0;

  for (const [universityId, { visits, readings }] of Object.entries(HISTORY_PLAN)) {
    const entries = [
      ...visits.map(([daysAgo, odometerReading, services, need = null]) => ({ daysAgo, odometerReading, services, need })),
      ...readings.map(([daysAgo, odometerReading]) => ({ daysAgo, odometerReading, services: [] })),
    ].sort((a, b) => b.daysAgo - a.daysAgo);

    for (const { daysAgo, odometerReading, services, need } of entries) {
      turn += 1;
      const visit = services.length > 0;
      const user = visit ? TECHS[turn % TECHS.length] : READERS[turn % READERS.length];
      const key = `${universityId}@${daysAgo}`;
      mileageLogs.push({ key, vehicle: universityId, user, odometerReading, recordedAt: isoDay(-daysAgo) });
      services.forEach((serviceType) =>
        serviceLogs.push({
          vehicle: universityId,
          serviceType,
          mileageKey: key,
          user,
          servicedAt: isoDay(-daysAgo),
          maintenanceNeedIndex: need,
        }),
      );
    }
  }

  return { mileageLogs, serviceLogs };
};

const HISTORY = buildHistory();

export const SEED_MILEAGE_LOGS = HISTORY.mileageLogs;
export const SEED_SERVICE_LOGS = HISTORY.serviceLogs;

/* ------------------------------------------------------------------------------------------------------------------ */
/* Notes (Feature 14)                                                                                                  */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * Short threads, oldest first. `parent` is a request purpose, or `report`/`need` index. `visible: false` notes are
 * staff only. Riley Requester's question on the Falls Creek retreat has no reply, so they can still delete it.
 */
const THREADS = [
  {
    request: "Pick up visiting families at the airport", daysAgo: 3,
    notes: [
      ["requester@oc.edu", "Can we leave 30 minutes earlier? One flight lands at 10."],
      ["priya.natarajan@oc.edu", "That works. I moved the pickup to 9:30."],
    ],
  },
  {
    request: "Fall retreat at Falls Creek", daysAgo: 1,
    notes: [["requester@oc.edu", "We may have two more people joining. Is there room?"]],
  },
  {
    request: "Choir tour: Abilene and Lubbock", daysAgo: 8,
    notes: [
      ["elena.ruiz@oc.edu", "Waiting on the department budget code before I approve this.", false],
      ["multirole@oc.edu", "Budget code confirmed with the department.", false],
      ["elena.ruiz@oc.edu", "Approved. A CDL driver is on the bus both days."],
    ],
  },
  {
    request: "Track meet at Oklahoma State", daysAgo: 2,
    notes: [["admin@oc.edu", "ATH-V01 is in the shop for its brakes. We'll swap in another van before the meet."]],
  },
  {
    request: "Conference tournament at Abilene Christian", daysAgo: 4,
    notes: [["areaadmin@oc.edu", "Checking whether ATH-B01 is free that weekend before assigning it.", false]],
  },
  {
    request: "Service project in Guthrie", daysAgo: 18,
    notes: [
      ["jasmine.ortiz@oc.edu", "Please bring the van back with a full tank."],
      ["requester@oc.edu", "Will do, thanks!"],
    ],
  },
  {
    report: 0, daysAgo: 6,
    notes: [
      ["areaadmin@oc.edu", "Noticed it right after practice. It's parked at the field house."],
      ["maintenance@oc.edu", "Thanks. I'll take a look this week."],
    ],
  },
  { report: 3, daysAgo: 3, notes: [["maintenance@oc.edu", "Code reader says it's an O2 sensor. Part is ordered.", false]] },
  {
    need: 0, daysAgo: 5,
    notes: [
      ["maintenance@oc.edu", "Pads and rotors are worn through. Quote from the shop is $240.", false],
      ["admin@oc.edu", "Approved.", false],
      ["maintenance@oc.edu", "Booked with the brake shop. It stays out of service until then."],
    ],
  },
  { need: 1, daysAgo: 7, notes: [["hector.alvarez@oc.edu", "Waiting on a replacement latch.", false]] },
  { need: 4, daysAgo: 12, notes: [["multirole@oc.edu", "Bled the brake lines and replaced the fluid. Back in service."]] },
];

export const SEED_NOTES = THREADS.flatMap(({ request, report, need, daysAgo, notes }) =>
  notes.map(([author, content, isVisible = true], position) => ({
    ...(request !== undefined && { parentKey: "vehicleRequestId", parent: request }),
    ...(report !== undefined && { parentKey: "issueReportId", parent: report }),
    ...(need !== undefined && { parentKey: "maintenanceNeedId", parent: need }),
    author,
    content,
    isVisible,
    daysAgo,
    hoursLater: position * 3,
  })),
);

/* ------------------------------------------------------------------------------------------------------------------ */
/* Writing it all                                                                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

const byKey = (rows, key) => Object.fromEntries(rows.map((row) => [key(row), row]));

/** Records that point at vehicles, requests, or users go before those rows are replaced. */
const clearSampleTables = async (transaction) => {
  for (const model of [
    db.note,
    db.serviceLog,
    db.maintenanceNeed,
    db.issueReport,
    db.mileageLog,
    db.vehicleRequest,
    db.vehicle,
    db.vehicleTypeInstruction,
    db.vehicleType,
    db.serviceType,
    db.driver,
    db.destination,
  ]) {
    await model.destroy({ where: {}, transaction });
  }
};

const seedFleet = async ({ areaIds, transaction }) => {
  const types = await db.vehicleType.bulkCreate(SEED_VEHICLE_TYPES, { transaction });
  const typeIds = Object.fromEntries(types.map((type) => [type.name, type.id]));

  await db.vehicle.bulkCreate(
    SEED_VEHICLES.map(({ area, type, ...fields }) => ({ ...fields, areaId: areaIds[area], vehicleTypeId: typeIds[type] })),
    { transaction },
  );
  await db.serviceType.bulkCreate(SEED_SERVICE_TYPES, { transaction });
  await db.vehicleTypeInstruction.bulkCreate(
    SEED_VEHICLE_TYPE_INSTRUCTIONS.map(({ type, area, content }) => ({
      vehicleTypeId: typeIds[type],
      areaId: area ? areaIds[area] : null,
      content,
    })),
    { transaction },
  );

  const users = await db.user.findAll({ where: { email: SEED_DRIVERS.map(({ account }) => account).filter(Boolean) }, transaction });
  const userIds = Object.fromEntries(users.map((user) => [user.email, user.id]));
  await db.driver.bulkCreate(
    SEED_DRIVERS.map(({ account, ...fields }) => ({
      ...fields,
      userId: userIds[account] ?? null,
      approvedAt: fields.status === "approved" ? ago(200) : null,
    })),
    { transaction },
  );

  await db.destination.bulkCreate(SEED_DESTINATIONS, { transaction });
};

/** Feature 8: each request with its drivers, ordered stops, and vehicles. Returns ids by purpose. */
const seedRequests = async ({ areaIds, google, transaction }) => {
  const users = byKey(await db.user.findAll({ transaction }), (user) => user.email);
  const drivers = byKey(await db.driver.findAll({ transaction }), (row) => `${row.firstName} ${row.lastName}`);
  const destinations = byKey(await db.destination.findAll({ transaction }), (row) => row.name);
  const vehicles = byKey(await db.vehicle.findAll({ transaction }), (row) => row.universityId);
  const ids = {};

  for (const [index, row] of SEED_REQUESTS.entries()) {
    const { area, requester, purpose, start, end, time, people, status, approver } = row;
    const stops = row.destinations.map((name) => destinations[name]);
    const startAt = tripDate(start, time?.[0]);
    const approved = APPROVED_STATUSES.includes(status);
    // Made a couple of weeks before the trip (or in the last few days, for trips coming up), approved a few days later.
    const createdAt = start > 0 ? ago((index % 6) + 2) : ago(-start + 14);
    const request = await db.vehicleRequest.create(
      {
        userId: users[requester].id,
        areaId: areaIds[area],
        purpose,
        startAt,
        endAt: tripDate(end, time?.[1]),
        allDay: !time,
        numberOfPeople: people,
        estimatedMiles: google ? await estimateMiles(stops) : seedTripMiles(row.destinations),
        status,
        approverId: approved ? users[approver].id : null,
        approvedAt: approved ? new Date(Math.min(Date.now(), createdAt.getTime() + DAY_MS)) : null,
        createdAt,
        updatedAt: createdAt,
      },
      { transaction },
    );
    ids[purpose] = request.id;

    await db.vehicleRequestDriver.bulkCreate(
      row.drivers.map((name) => ({ vehicleRequestId: request.id, driverId: drivers[name].id })),
      { transaction },
    );
    await db.vehicleRequestDestination.bulkCreate(
      stops.map((stop, i) => ({ vehicleRequestId: request.id, destinationId: stop.id, stopOrder: i + 1 })),
      { transaction },
    );
    await db.vehicleRequestVehicle.bulkCreate(
      (row.vehicles ?? []).map((universityId) => ({ vehicleRequestId: request.id, vehicleId: vehicles[universityId].id })),
      { transaction },
    );
  }

  return ids;
};

/** Features 9–13: issue reports, maintenance needs, mileage logs, and service logs. Returns report and need ids in order. */
const seedOperations = async ({ requestIds, transaction }) => {
  const users = Object.fromEntries((await db.user.findAll({ transaction })).map((user) => [user.email, user.id]));
  const vehicles = Object.fromEntries((await db.vehicle.findAll({ transaction })).map((row) => [row.universityId, row.id]));

  const reportIds = [];
  for (const report of SEED_ISSUE_REPORTS) {
    const createdAt = ago(report.daysAgo);
    const created = await db.issueReport.create(
      {
        vehicleId: vehicles[report.vehicle],
        vehicleRequestId: report.request ? requestIds[report.request] : null,
        authorId: users[report.author],
        assigneeId: report.assignee ? users[report.assignee] : null,
        type: report.type,
        description: report.description,
        status: report.status,
        resolvedAt: report.resolvedAt ?? null,
        createdAt,
        updatedAt: createdAt,
      },
      { transaction },
    );
    reportIds.push(created.id);
  }

  const needIds = [];
  for (const need of SEED_MAINTENANCE_NEEDS) {
    const createdAt = ago(need.daysAgo);
    const created = await db.maintenanceNeed.create(
      {
        issueReportId: need.issueReportIndex == null ? null : reportIds[need.issueReportIndex],
        authorId: users[need.author],
        vehicleId: vehicles[need.vehicle],
        assigneeId: need.assignee ? users[need.assignee] : null,
        title: need.title,
        description: need.description,
        outOfService: need.outOfService,
        priority: need.priority,
        status: need.status,
        resolvedAt: need.resolvedAt ?? null,
        createdAt,
        updatedAt: createdAt,
      },
      { transaction },
    );
    needIds.push(created.id);
  }

  const mileageLogs = await db.mileageLog.bulkCreate(
    SEED_MILEAGE_LOGS.map((log) => ({
      vehicleId: vehicles[log.vehicle],
      userId: users[log.user],
      odometerReading: log.odometerReading,
      recordedAt: log.recordedAt,
    })),
    { transaction },
  );
  const visitLogIds = Object.fromEntries(SEED_MILEAGE_LOGS.map(({ key }, i) => [key, mileageLogs[i].id]));

  const serviceTypes = Object.fromEntries((await db.serviceType.findAll({ transaction })).map((type) => [type.name, type.id]));
  await db.serviceLog.bulkCreate(
    SEED_SERVICE_LOGS.map((log) => ({
      vehicleId: vehicles[log.vehicle],
      userId: users[log.user],
      serviceTypeId: serviceTypes[log.serviceType],
      mileageLogId: visitLogIds[log.mileageKey],
      maintenanceNeedId: log.maintenanceNeedIndex == null ? null : needIds[log.maintenanceNeedIndex],
      servicedAt: log.servicedAt,
    })),
    { transaction },
  );

  return { reportIds, needIds };
};

/** Feature 14: note threads, created oldest first so later ids are later replies. */
const seedNotes = async ({ parents, transaction }) => {
  const users = Object.fromEntries((await db.user.findAll({ transaction })).map((user) => [user.email, user.id]));

  for (const note of SEED_NOTES) {
    const createdAt = ago(note.daysAgo, note.hoursLater);
    await db.note.create(
      {
        [note.parentKey]: parents[note.parentKey][note.parent],
        authorId: users[note.author],
        content: note.content,
        isVisible: note.isVisible,
        createdAt,
        updatedAt: createdAt,
      },
      { transaction },
    );
  }
};

/**
 * Replace users, sessions, roles, areas, and the sample tables with the seed data in one transaction.
 * `keep` users survive with their sessions and non-area roles (areas are recreated, so area roles can't survive).
 * `google` estimates request mileage with Google Routes (billed) instead of the seed coordinates.
 * Returns `{ exitCode, message }`.
 */
export const seed = async ({ keep = [], google = false } = {}) => {
  if (process.env.NODE_ENV === "production") {
    return { exitCode: 1, message: "Refusing to seed: NODE_ENV is production." };
  }

  const keepEmails = keep.map((email) => String(email).trim().toLowerCase()).filter(Boolean);

  const kept = await db.sequelize.transaction(async (transaction) => {
    const keptUsers = await db.user.findAll({ where: { email: keepEmails }, transaction });
    const notKept = { [Op.notIn]: keptUsers.map((user) => user.id).concat(0) };

    await clearSampleTables(transaction);

    await db.role.destroy({ where: { [Op.or]: [{ userId: notKept }, { areaId: { [Op.ne]: null } }] }, transaction });
    await db.session.destroy({ where: { userId: notKept }, transaction });
    await db.user.destroy({ where: { id: notKept }, transaction });
    await db.area.destroy({ where: {}, transaction });

    const areas = await db.area.bulkCreate(
      SEED_AREAS.map((name) => ({ name, logo: "" })),
      { transaction },
    );
    const areaIds = Object.fromEntries(areas.map((area) => [area.name, area.id]));

    for (const { roles, ...fields } of SEED_USERS) {
      if (keepEmails.includes(fields.email)) continue;
      const user = await db.user.create(fields, { transaction });
      await db.role.bulkCreate(
        roles.map(({ role, area }) => ({ userId: user.id, role, areaId: area ? areaIds[area] : null })),
        { transaction },
      );
    }

    // A team admin kept with --keep still ends up an admin.
    for (const user of keptUsers.filter(({ email }) => isTeamAdmin(email))) {
      await db.role.findOrCreate({ where: { userId: user.id, role: "admin", areaId: null }, transaction });
    }

    await seedFleet({ areaIds, transaction });
    const requestIds = await seedRequests({ areaIds, google, transaction });
    const { reportIds, needIds } = await seedOperations({ requestIds, transaction });
    await seedNotes({
      parents: { vehicleRequestId: requestIds, issueReportId: reportIds, maintenanceNeedId: needIds },
      transaction,
    });

    return keptUsers.map((user) => user.email);
  });

  const missing = keepEmails.filter((email) => !kept.includes(email));
  return {
    exitCode: 0,
    message: [
      `Seeded ${SEED_AREAS.length} areas and ${SEED_USERS.length} users.`,
      `Added sample data: ${SEED_VEHICLES.length} vehicles, ${SEED_VEHICLE_TYPES.length} vehicle types,`,
      `${SEED_SERVICE_TYPES.length} service types, ${SEED_DRIVERS.length} drivers, ${SEED_DESTINATIONS.length} destinations.`,
      `Added ${SEED_REQUESTS.length} vehicle requests.`,
      `Added ${SEED_ISSUE_REPORTS.length} issue reports, ${SEED_MAINTENANCE_NEEDS.length} maintenance needs, and ${SEED_MILEAGE_LOGS.length} mileage logs.`,
      `Added ${SEED_SERVICE_LOGS.length} service logs and ${SEED_NOTES.length} notes.`,
      kept.length ? `Kept: ${kept.join(", ")}.` : "",
      missing.length ? `Not found (nothing kept): ${missing.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
};

/** `--keep a@x --keep b@y` → ["a@x", "b@y"] */
const parseKeep = (args) => args.flatMap((arg, i) => (arg === "--keep" && args[i + 1] ? [args[i + 1]] : []));

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const args = process.argv.slice(2);
    const { exitCode, message } = await seed({ keep: parseKeep(args), google: args.includes("--google") });
    (exitCode === 0 ? console.log : console.error)(message);
    process.exitCode = exitCode;
  } catch (err) {
    console.error(`seed failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}
