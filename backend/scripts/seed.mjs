/**
 * Feature 3 — FR-016: replace users, sessions, roles, and areas with development seed data.
 * The project team (TEAM_ADMINS) is always seeded as admins, so signing in with Google after a seed needs no make-admin.
 * Feature 8 adds vehicle types, vehicles, service types, drivers, destinations, and vehicle requests, so every table has
 * enough rows to try searching, filtering, paging, and the calendar.
 * Feature 9, 10, and 11 add mileage logs, issue reports, and maintenance needs.
 * Usage (from backend/): npm run seed [-- --keep you@eagles.oc.edu ...] [-- --google]
 *
 * The data is generated from a fixed random seed, so every run produces the same rows (dates move with the day you seed).
 * Mileage is estimated from each destination's coordinates; `--google` uses Google Routes instead (one billed call per
 * request).
 */
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import db from "../app/models/index.js";
import { estimateMiles } from "../app/helpers/mileage.js";
import { TEAM_ADMINS, isTeamAdmin } from "../app/config/teamAdmins.js";

/* ------------------------------------------------------------------------------------------------------------------ */
/* Deterministic randomness                                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/** mulberry32: a small seeded generator, so the seed data is the same on every run. */
const seededRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const random = seededRandom(2026);
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[Math.floor(random() * list.length)];
const chance = (probability) => random() < probability;
const shuffled = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
/** Pick by weight: `[[value, weight], ...]`. */
const weighted = (entries) => {
  let roll = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries.at(-1)[0];
};

const pad = (value, length = 2) => String(value).padStart(length, "0");

/** `YYYY-MM-DD` for `offset` days from today (local time). */
const isoDay = (offset = 0) => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
};

/* ------------------------------------------------------------------------------------------------------------------ */
/* Areas, users, and roles (Features 2 and 3)                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

export const SEED_AREAS = [
  "Admissions",
  "Athletics",
  "Campus Ministry",
  "Facilities",
  "Global Studies",
  "Honors College",
  "Intramurals",
  "Music",
  "Student Life",
  "Theatre",
];

const areaAdmin = (...areas) => areas.map((area) => ({ role: "area_admin", area }));
const person = (firstName, lastName, roles = []) => ({
  firstName,
  lastName,
  email: `${firstName}.${lastName}@oc.edu`.toLowerCase().replace(/[^a-z.@]/g, ""),
  roles,
});

/** Test accounts (sign in with DEV_LOGIN — see README), one per role. */
const TEST_ACCOUNTS = [
  { firstName: "Avery", lastName: "Admin", email: "admin@oc.edu", roles: [{ role: "admin" }] },
  { firstName: "Morgan", lastName: "Maintenance", email: "maintenance@oc.edu", roles: [{ role: "maintenance" }] },
  { firstName: "Taylor", lastName: "Athletics", email: "areaadmin@oc.edu", roles: areaAdmin("Athletics") },
  {
    firstName: "Casey",
    lastName: "Multirole",
    email: "multirole@oc.edu",
    roles: [{ role: "maintenance" }, ...areaAdmin("Music", "Theatre")],
  },
  { firstName: "Riley", lastName: "Requester", email: "requester@oc.edu", roles: [] },
];

/** Staff: every area has at least one area admin; a few people hold several roles. */
const STAFF = [
  person("Dana", "Whitfield", [{ role: "admin" }]),
  person("Robert", "Haines", [{ role: "admin" }]),
  person("Marcus", "Bell", areaAdmin("Athletics")),
  person("Kendra", "Wallace", areaAdmin("Athletics", "Intramurals")),
  person("Elena", "Ruiz", areaAdmin("Music")),
  person("Grant", "Holloway", areaAdmin("Theatre")),
  person("Priya", "Natarajan", areaAdmin("Admissions")),
  person("Kyle", "Brennan", areaAdmin("Admissions")),
  person("Caleb", "Turner", areaAdmin("Student Life")),
  person("Jasmine", "Ortiz", areaAdmin("Student Life")),
  person("Wendy", "Okafor", [{ role: "maintenance" }, ...areaAdmin("Facilities")]),
  person("Nathan", "Price", areaAdmin("Campus Ministry")),
  person("Margaret", "Ellis", areaAdmin("Honors College")),
  person("Derek", "Chu", areaAdmin("Intramurals")),
  person("Fatima", "Hassan", areaAdmin("Global Studies")),
  person("Owen", "Fletcher", areaAdmin("Global Studies", "Honors College")),
  person("Hector", "Alvarez", [{ role: "maintenance" }]),
  person("Brian", "Kessler", [{ role: "maintenance" }]),
  person("Victor", "Ramos", [{ role: "maintenance" }]),
  person("Laura", "Simmons"),
  person("Tom", "Garrison"),
  person("Beth", "Calloway"),
  person("Samuel", "Ward"),
  person("Rachel", "Gibbs"),
  person("Paul", "Mendez"),
  person("Monica", "Shaw"),
  person("Greg", "Lindsey"),
];

/** Students named in the hand-written requests and drivers below. */
const NAMED_STUDENTS = [
  person("Jacob", "Miller"),
  person("Hannah", "Lee"),
  person("Ethan", "Brooks"),
  person("Sophia", "Nguyen"),
  person("Noah", "Patel"),
  person("Olivia", "Carter"),
  person("Isaiah", "Thompson"),
  person("Grace", "Kim"),
  person("Levi", "Johnson"),
  person("Abigail", "Reed"),
];

const FIRST_NAMES = [
  "Aaron", "Addison", "Aiden", "Alexis", "Andrew", "Anna", "Ava", "Benjamin", "Brooke", "Caleb", "Camila", "Carson",
  "Chloe", "Christian", "Claire", "Daniel", "David", "Elijah", "Ella", "Emily", "Emma", "Evan", "Gabriel", "Gavin",
  "Hailey", "Henry", "Ian", "Isabella", "Jack", "James", "Jenna", "John", "Jonah", "Josiah", "Julia", "Kaitlyn", "Kate",
  "Landon", "Leah", "Lily", "Logan", "Lucas", "Luke", "Madison", "Mason", "Mia", "Micah", "Natalie", "Nathaniel",
  "Paige", "Parker", "Rebecca", "Ruth", "Ryan", "Samuel", "Sarah", "Seth", "Tyler", "Victoria", "Zoe",
];

const LAST_NAMES = [
  "Adams", "Allen", "Baker", "Barnes", "Bennett", "Brown", "Bryant", "Campbell", "Clark", "Coleman", "Collins", "Cook",
  "Cooper", "Davis", "Diaz", "Edwards", "Evans", "Fisher", "Foster", "Garcia", "Gray", "Green", "Griffin", "Hall",
  "Harris", "Hayes", "Hill", "Howard", "Hughes", "Jackson", "Jenkins", "Jones", "King", "Lewis", "Long", "Lopez",
  "Martin", "Martinez", "Mitchell", "Moore", "Morgan", "Murphy", "Nelson", "Parker", "Perry", "Phillips", "Powell",
  "Ramirez", "Richardson", "Roberts", "Rogers", "Ross", "Russell", "Sanders", "Scott", "Stewart", "Sullivan",
  "Taylor", "Walker", "Watson", "White", "Williams", "Wilson", "Wood", "Young",
];

const STUDENT_COUNT = 110;

const generatedStudents = () => {
  const taken = new Set([...TEST_ACCOUNTS, ...STAFF, ...NAMED_STUDENTS].map(({ email }) => email));
  const students = [];
  while (students.length < STUDENT_COUNT) {
    const student = person(pick(FIRST_NAMES), pick(LAST_NAMES));
    if (taken.has(student.email)) continue;
    taken.add(student.email);
    students.push(student);
  }
  return students;
};

/** Every sample email ends in @oc.edu. The team admins stay out of these, so they don't change the generated data. */
const SAMPLE_USERS = [...TEST_ACCOUNTS, ...STAFF, ...NAMED_STUDENTS, ...generatedStudents()];

export const SEED_USERS = [...TEAM_ADMINS, ...SAMPLE_USERS];

const STUDENTS = SAMPLE_USERS.slice(TEST_ACCOUNTS.length + STAFF.length);
const ADMINS = SAMPLE_USERS.filter(({ roles }) => roles.some(({ role }) => role === "admin")).map(({ email }) => email);
const areaAdminsOf = (area) =>
  SAMPLE_USERS.filter(({ roles }) => roles.some((role) => role.area === area)).map(({ email }) => email);

/* ------------------------------------------------------------------------------------------------------------------ */
/* Vehicle types, vehicles, and service types (Features 4, 5, and 12)                                                  */
/* ------------------------------------------------------------------------------------------------------------------ */

export const SEED_VEHICLE_TYPES = [
  { name: "Car", identifier: "VIN" },
  { name: "SUV", identifier: "VIN" },
  { name: "Truck", identifier: "VIN" },
  { name: "Van", identifier: "VIN" },
  { name: "Minibus", identifier: "VIN" },
  { name: "Bus", identifier: "VIN" },
  { name: "Golf Cart", identifier: "Serial" },
];

/** Make, model, and seats for each type. */
const MODELS = {
  Car: [["Toyota", "Camry", 5], ["Honda", "Accord", 5], ["Chevrolet", "Malibu", 5], ["Ford", "Fusion", 5]],
  SUV: [["Toyota", "Highlander", 7], ["Chevrolet", "Tahoe", 8], ["Ford", "Explorer", 7], ["Honda", "Pilot", 8]],
  Truck: [["Ford", "F-150", 5], ["Chevrolet", "Silverado 1500", 5], ["Ram", "1500", 5], ["Isuzu", "NPR Box Truck", 3]],
  Van: [
    ["Ford", "Transit 350", 15],
    ["Ford", "Transit 350", 12],
    ["Chevrolet", "Express 3500", 12],
    ["Mercedes-Benz", "Sprinter 2500", 12],
    ["Honda", "Odyssey", 7],
  ],
  Minibus: [["Ford", "E-450 Starcraft", 14], ["Chevrolet", "Starcraft Allstar", 14], ["Ford", "E-450 Champion", 20]],
  Bus: [["Blue Bird", "Vision", 48], ["Thomas", "Saf-T-Liner C2", 40], ["MCI", "J4500 Coach", 56], ["Prevost", "H3-45", 56]],
  "Golf Cart": [["Club Car", "Onward", 4], ["E-Z-GO", "Express S2", 2], ["Club Car", "Carryall 502", 2], ["E-Z-GO", "TXT", 2]],
};

const TYPE_LETTERS = { Car: "C", SUV: "S", Truck: "T", Van: "V", Minibus: "M", Bus: "B", "Golf Cart": "G" };

const AREA_CODES = {
  Admissions: "ADM",
  Athletics: "ATH",
  "Campus Ministry": "MIN",
  Facilities: "FAC",
  "Global Studies": "GLO",
  "Honors College": "HON",
  Intramurals: "INT",
  Music: "MUS",
  "Student Life": "STU",
  Theatre: "THE",
};

/**
 * Each area's fleet: `[type, count, retired, firstModel]`. The last `retired` of a type are older and retired;
 * `firstModel` pins the first one (the hand-written requests below count on those seats).
 */
const FLEETS = {
  Athletics: [
    ["Van", 6, 1, ["Ford", "Transit 350", 15]],
    ["Minibus", 3, 0, ["Ford", "E-450 Starcraft", 14]],
    ["Bus", 3, 1, ["Blue Bird", "Vision", 48]],
    ["Car", 2],
    ["SUV", 2],
  ],
  Music: [["Van", 3, 0, ["Ford", "Transit 350", 12]], ["Minibus", 2], ["Bus", 2, 0, ["MCI", "J4500 Coach", 56]], ["Car", 1]],
  Theatre: [["Van", 2, 0, ["Ford", "Transit 150", 12]], ["Truck", 2, 0, ["Isuzu", "NPR Box Truck", 3]], ["Car", 1], ["SUV", 1]],
  Admissions: [["Car", 4, 1, ["Toyota", "Camry", 5]], ["SUV", 3], ["Van", 2]],
  "Student Life": [["Van", 4, 0, ["Ford", "Transit 350", 15]], ["Bus", 2], ["Minibus", 1], ["Golf Cart", 3]],
  Facilities: [["Truck", 6, 1], ["Van", 2], ["Car", 1], ["Golf Cart", 6, 1]],
  "Campus Ministry": [["Van", 3], ["Minibus", 1], ["SUV", 1]],
  "Honors College": [["Van", 1], ["SUV", 1]],
  Intramurals: [["Van", 2], ["Golf Cart", 2]],
  "Global Studies": [["Van", 2], ["Minibus", 1], ["SUV", 1]],
};

const COLORS = ["White", "Silver", "Black", "Blue", "Maroon", "Gray", "Red"];
const VIN_CHARACTERS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";

const generatedVehicles = () => {
  const vehicles = [];
  let plate = 1000;

  for (const [area, fleet] of Object.entries(FLEETS)) {
    for (const [type, count, retired = 0, firstModel] of fleet) {
      for (let n = 1; n <= count; n += 1) {
        const isRetired = n > count - retired;
        const [make, model, passengerCapacity] = n === 1 && firstModel ? firstModel : pick(MODELS[type]);
        const year = isRetired ? between(2006, 2013) : between(2015, 2025);
        const universityId = `${AREA_CODES[area]}-${TYPE_LETTERS[type]}${pad(n)}`;
        const isGolfCart = type === "Golf Cart";
        plate += between(3, 40);

        vehicles.push({
          area,
          universityId,
          type,
          make,
          model,
          year,
          passengerCapacity,
          status: isRetired ? "retired" : "active",
          identifier: isGolfCart
            ? `SN-${universityId.replace("-", "")}-${between(10000, 99999)}`
            : `1${Array.from({ length: 16 }, () => pick([...VIN_CHARACTERS])).join("")}`,
          purchasedAt: `${year}-${pad(between(1, 12))}-${pad(between(1, 28))}`,
          color: pick(COLORS),
          licensePlate: isGolfCart ? null : `OC${plate}`,
          // A few plates are already expired, so that shows up too.
          licensePlateExpirationDate: isGolfCart ? null : isoDay(chance(0.08) ? -between(5, 90) : between(30, 720)),
        });
      }
    }
  }

  return vehicles;
};

export const SEED_VEHICLES = generatedVehicles();

/** Feature 12: how often each service is due, by days, miles, or both. */
export const SEED_SERVICE_TYPES = [
  { name: "Oil change", service_frequency_days: 180, service_frequency_miles: 5000 },
  { name: "Tire rotation", service_frequency_days: null, service_frequency_miles: 7500 },
  { name: "Brake inspection", service_frequency_days: 365, service_frequency_miles: 15000 },
  { name: "Annual safety inspection", service_frequency_days: 365, service_frequency_miles: null },
  { name: "DOT bus inspection", service_frequency_days: 90, service_frequency_miles: null },
  { name: "Engine air filter", service_frequency_days: null, service_frequency_miles: 15000 },
  { name: "Cabin air filter", service_frequency_days: 365, service_frequency_miles: 15000 },
  { name: "Transmission service", service_frequency_days: null, service_frequency_miles: 60000 },
  { name: "Coolant flush", service_frequency_days: 730, service_frequency_miles: 30000 },
  { name: "Battery check", service_frequency_days: 180, service_frequency_miles: null },
  { name: "Wiper blades", service_frequency_days: 365, service_frequency_miles: null },
  { name: "Wheel alignment", service_frequency_days: 365, service_frequency_miles: 20000 },
  { name: "Spark plugs", service_frequency_days: null, service_frequency_miles: 100000 },
  { name: "Golf cart battery service", service_frequency_days: 90, service_frequency_miles: null },
];

/* ------------------------------------------------------------------------------------------------------------------ */
/* Drivers (Feature 7)                                                                                                 */
/* ------------------------------------------------------------------------------------------------------------------ */

const driver = (firstName, lastName, email, phoneNumber, licenseExpirationDate, status, licenseState = "OK") => ({
  firstName,
  lastName,
  email,
  phoneNumber,
  licenseState,
  licenseExpirationDate,
  status,
});

/** Drivers named in the hand-written requests, plus every status, an expired license, and one expiring soon. */
const NAMED_DRIVERS = [
  driver("Riley", "Requester", "requester@oc.edu", "405-555-0001", "2029-03-15", "approved"),
  driver("Taylor", "Athletics", "areaadmin@oc.edu", "405-555-0002", "2031-01-31", "approved"),
  driver("Marcus", "Bell", "marcus.bell@oc.edu", "405-555-0003", "2028-09-30", "approved"),
  driver("Elena", "Ruiz", "elena.ruiz@oc.edu", "405-555-0004", "2028-02-28", "approved"),
  driver("Tom", "Garrison", "tom.garrison@oc.edu", "405-555-0005", "2030-12-31", "approved"),
  driver("Noah", "Patel", "noah.patel@oc.edu", "405-555-0006", "2032-04-30", "approved"),
  driver("Grace", "Kim", "grace.kim@oc.edu", "405-555-0007", "2031-07-31", "approved"),
  driver("Laura", "Simmons", "laura.simmons@oc.edu", "405-555-0008", isoDay(12), "approved"),
  driver("Hannah", "Lee", "hannah.lee@oc.edu", "405-555-0009", isoDay(-34), "approved"),
  driver("Jacob", "Miller", "jacob.miller@oc.edu", "405-555-0010", "2029-05-01", "pending"),
  driver("Ethan", "Brooks", "ethan.brooks@oc.edu", "405-555-0011", "2030-01-01", "denied"),
  driver("Sophia", "Nguyen", "sophia.nguyen@oc.edu", "405-555-0012", "2029-08-01", "revoked"),
  driver("Frank", "Delgado", null, "405-555-0013", "2029-10-31", "approved"),
  driver("Wes", "Hart", null, "405-555-0014", "2030-03-31", "former"),
];

const LICENSE_STATES = [["OK", 85], ["TX", 6], ["KS", 3], ["AR", 3], ["MO", 2], ["CO", 1]];
const PHONE_AREA_CODES = ["405", "405", "405", "918", "580"];

const generatedDrivers = () => {
  const named = new Set(NAMED_DRIVERS.map(({ firstName, lastName }) => `${firstName} ${lastName}`));
  const withAccounts = shuffled([...STAFF, ...STUDENTS].filter(({ firstName, lastName }) => !named.has(`${firstName} ${lastName}`)))
    .slice(0, 52)
    .map(({ firstName, lastName, email }) => ({ firstName, lastName, email }));
  const withoutAccounts = [];
  while (withoutAccounts.length < 8) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    if (named.has(name) || [...withAccounts, ...withoutAccounts].some((other) => `${other.firstName} ${other.lastName}` === name)) {
      continue;
    }
    withoutAccounts.push({ firstName, lastName, email: null });
  }

  return [...withAccounts, ...withoutAccounts].map(({ firstName, lastName, email }, i) => {
    const status = weighted([["approved", 72], ["pending", 10], ["former", 8], ["denied", 5], ["revoked", 5]]);
    const license = weighted([["valid", 85], ["expired", 8], ["expiring", 7]]);
    const expiresIn = { valid: between(200, 1800), expired: -between(5, 200), expiring: between(3, 30) }[license];
    return driver(
      firstName,
      lastName,
      email,
      `${pick(PHONE_AREA_CODES)}-555-${pad(100 + i, 4)}`,
      isoDay(expiresIn),
      status,
      weighted(LICENSE_STATES),
    );
  });
};

export const SEED_DRIVERS = [...NAMED_DRIVERS, ...generatedDrivers()];

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
  // Custom stops entered on a request don't have a distance until an admin fills one in.
  milesFromCampus: isSaved ? legMiles(CAMPUS, { lat, lng }) : null,
  coordinates: { lat, lng },
});

/** Official places, then a few custom (unofficial) stops that requests added. Coordinates are approximate. */
const PLACES = [
  // Oklahoma City metro
  place("Oklahoma State Capitol", "2300 N Lincoln Blvd", "Oklahoma City", "OK", "73105", 35.4922, -97.5033),
  place("Paycom Center", "100 W Reno Ave", "Oklahoma City", "OK", "73102", 35.4634, -97.5151),
  place("Chickasaw Bricktown Ballpark", "2 S Mickey Mantle Dr", "Oklahoma City", "OK", "73104", 35.4651, -97.5078),
  place("Civic Center Music Hall", "201 N Walker Ave", "Oklahoma City", "OK", "73102", 35.4693, -97.5197),
  place("Myriad Botanical Gardens", "301 W Reno Ave", "Oklahoma City", "OK", "73102", 35.4651, -97.518),
  place("Oklahoma City National Memorial", "620 N Harvey Ave", "Oklahoma City", "OK", "73102", 35.4731, -97.5171),
  place("Oklahoma City Zoo", "2000 Remington Pl", "Oklahoma City", "OK", "73111", 35.5236, -97.4723),
  place("Science Museum Oklahoma", "2020 Remington Pl", "Oklahoma City", "OK", "73111", 35.5236, -97.48),
  place("Oklahoma State Fair Park", "3001 General Pershing Blvd", "Oklahoma City", "OK", "73107", 35.474, -97.565),
  place("Penn Square Mall", "1901 Northwest Expy", "Oklahoma City", "OK", "73118", 35.524, -97.544),
  place("Will Rogers World Airport", "7100 Terminal Dr", "Oklahoma City", "OK", "73159", 35.3931, -97.6007),
  place("Regional Food Bank of Oklahoma", "3355 S Purdue Ave", "Oklahoma City", "OK", "73179", 35.433, -97.606),
  place("City Rescue Mission", "800 W California Ave", "Oklahoma City", "OK", "73106", 35.47, -97.526),
  place("Central Oklahoma Habitat for Humanity", "6100 N Robinson Ave", "Oklahoma City", "OK", "73118", 35.528, -97.516),
  place("Integris Baptist Medical Center", "3300 NW Expressway", "Oklahoma City", "OK", "73112", 35.53, -97.565),
  place("Oklahoma City University", "2501 N Blackwelder Ave", "Oklahoma City", "OK", "73106", 35.4935, -97.5303),
  place("Southern Nazarene University", "6729 NW 39th Expy", "Bethany", "OK", "73008", 35.5066, -97.65),
  place("Southwestern Christian University", "7210 NW 39th Expy", "Bethany", "OK", "73008", 35.5065, -97.657),
  place("University of Central Oklahoma", "100 N University Dr", "Edmond", "OK", "73034", 35.6565, -97.472),
  place("Rose State College", "6420 SE 15th St", "Midwest City", "OK", "73110", 35.4497, -97.3897),
  place("Edmond North High School", "215 W Danforth Rd", "Edmond", "OK", "73003", 35.67, -97.485),
  place("Deer Creek High School", "6101 NW 234th St", "Edmond", "OK", "73025", 35.695, -97.61),
  place("Heritage Hall School", "1800 NW 122nd St", "Oklahoma City", "OK", "73120", 35.596, -97.554),
  place("Bishop McGuinness High School", "801 NW 50th St", "Oklahoma City", "OK", "73118", 35.517, -97.526),
  place("Lowe's Home Improvement", "1700 E 2nd St", "Edmond", "OK", "73034", 35.653, -97.45),
  place("Grainger Industrial Supply", "1201 S Rockwell Ave", "Oklahoma City", "OK", "73128", 35.451, -97.638),
  // Elsewhere in Oklahoma
  place("University of Oklahoma", "660 Parrington Oval", "Norman", "OK", "73019", 35.2059, -97.4457),
  place("Norman North High School", "1809 Stubbeman Ave", "Norman", "OK", "73069", 35.237, -97.464),
  place("Lake Thunderbird State Park", "13101 Alameda Dr", "Norman", "OK", "73026", 35.228, -97.246),
  place("Oklahoma Baptist University", "500 W University St", "Shawnee", "OK", "74804", 35.35, -96.938),
  place("Oklahoma State University", "401 Whitehurst Hall", "Stillwater", "OK", "74078", 36.1257, -97.07),
  place("Falls Creek Camp", "3770 Falls Creek Rd", "Davis", "OK", "73030", 34.45, -97.13),
  place("Turner Falls Park", "7 Turner Falls Rd", "Davis", "OK", "73030", 34.425, -97.146),
  place("Chickasaw National Recreation Area", "901 W 1st St", "Sulphur", "OK", "73086", 34.505, -96.977),
  place("Lake Murray State Park", "13528 Scenic State Hwy 77", "Ardmore", "OK", "73401", 34.0726, -97.0697),
  place("Lake Texoma State Park", "18400 Lake Texoma State Park Rd", "Kingston", "OK", "73439", 33.997, -96.642),
  place("Wichita Mountains Wildlife Refuge", "32 Refuge Headquarters", "Indiahoma", "OK", "73552", 34.733, -98.713),
  place("Beavers Bend State Park", "4350 S Hwy 259A", "Broken Bow", "OK", "74728", 34.133, -94.689),
  place("BOK Center", "200 S Denver Ave", "Tulsa", "OK", "74103", 36.1525, -95.9965),
  place("Tulsa Performing Arts Center", "110 E 2nd St", "Tulsa", "OK", "74103", 36.155, -95.9915),
  place("Gathering Place", "2650 S John Williams Way E", "Tulsa", "OK", "74114", 36.124, -95.983),
  place("Philbrook Museum of Art", "2727 S Rockford Rd", "Tulsa", "OK", "74114", 36.124, -95.969),
  place("Oral Roberts University", "7777 S Lewis Ave", "Tulsa", "OK", "74171", 36.0505, -95.954),
  place("Tulsa International Airport", "7777 E Apache St", "Tulsa", "OK", "74115", 36.1984, -95.8881),
  place("Jenks High School", "205 E B St", "Jenks", "OK", "74037", 36.023, -95.969),
  place("Owasso High School", "12901 E 86th St N", "Owasso", "OK", "74055", 36.285, -95.83),
  // Out of state
  place("DFW International Airport", "2400 Aviation Dr", "DFW Airport", "TX", "75261", 32.8998, -97.0403),
  place("Dallas Love Field", "8008 Herb Kelleher Way", "Dallas", "TX", "75235", 32.8471, -96.8518),
  place("AT&T Stadium", "1 AT&T Way", "Arlington", "TX", "76011", 32.7473, -97.0945),
  place("Abilene Christian University", "1600 Campus Ct", "Abilene", "TX", "79601", 32.4687, -99.709),
  place("Lubbock Christian University", "5601 19th St", "Lubbock", "TX", "79407", 33.577, -101.942),
  place("Harding University", "915 E Market Ave", "Searcy", "AR", "72149", 35.249, -91.724),
  place("University of Arkansas", "1 University of Arkansas", "Fayetteville", "AR", "72701", 36.068, -94.174),
  place("Wichita State University", "1845 Fairmount St", "Wichita", "KS", "67260", 37.719, -97.293),
  place("Kansas City International Airport", "1 International Sq", "Kansas City", "MO", "64153", 39.2976, -94.7139),
  // Custom stops added on requests
  place("First Baptist Church Guthrie", "202 E Oklahoma Ave", "Guthrie", "OK", "73044", 35.879, -97.425, false),
  place("Smith Family Farm", "22150 E Waterloo Rd", "Arcadia", "OK", "73007", 35.695, -97.33, false),
  place("Embassy Suites Norman", "2501 Conference Dr", "Norman", "OK", "73069", 35.253, -97.48, false),
  place("Hampton Inn Stillwater", "717 E Hall of Fame Ave", "Stillwater", "OK", "74075", 36.134, -97.051, false),
  place("Grace Community Church", "9001 N Pennsylvania Ave", "Oklahoma City", "OK", "73120", 35.567, -97.543, false),
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

/*
 * Hand-written requests that the README, tests, and demos point at. Days are offsets from the day you seed;
 * `time` is [startHour, endHour] for a timed trip; omit it for all-day.
 */
const NAMED_REQUESTS = [
  // Athletics — area admins Taylor Athletics, Marcus Bell, and Kendra Wallace
  {
    area: "Athletics", requester: "laura.simmons@oc.edu", purpose: "Basketball away game at Oral Roberts",
    start: 6, end: 6, people: 14, drivers: ["Tom Garrison", "Noah Patel"], destinations: ["Oral Roberts University"], status: "pending",
  },
  {
    area: "Athletics", requester: "tom.garrison@oc.edu", purpose: "Track meet at Oklahoma State",
    start: 3, end: 3, people: 12, drivers: ["Riley Requester"], destinations: ["Oklahoma State University"],
    status: "reserved", approver: "marcus.bell@oc.edu", vehicles: ["ATH-V01"],
  },
  {
    area: "Athletics", requester: "tom.garrison@oc.edu", purpose: "Baseball tournament in Dallas",
    start: 12, end: 14, people: 40, drivers: ["Frank Delgado"], destinations: ["Dallas Love Field"],
    status: "awaiting_vehicle", approver: "areaadmin@oc.edu",
  },
  {
    area: "Athletics", requester: "marcus.bell@oc.edu", purpose: "Soccer match at Southern Nazarene",
    start: 10, end: 10, time: [13, 20], people: 14, drivers: ["Taylor Athletics"], destinations: ["Southern Nazarene University"],
    status: "reserved", approver: "areaadmin@oc.edu", vehicles: ["ATH-M01"],
  },
  {
    area: "Athletics", requester: "grace.kim@oc.edu", purpose: "Volleyball at the University of Oklahoma",
    start: -10, end: -10, time: [14, 21], people: 10, drivers: ["Noah Patel"], destinations: ["University of Oklahoma"],
    status: "returned", approver: "marcus.bell@oc.edu", vehicles: ["ATH-V02"],
  },
  {
    area: "Athletics", requester: "requester@oc.edu", purpose: "Golf invitational",
    start: -3, end: -2, people: 6, drivers: ["Riley Requester"], destinations: ["Lake Murray State Park"], status: "cancelled",
  },
  {
    area: "Athletics", requester: "kendra.wallace@oc.edu", purpose: "Wrestling duals in Stillwater",
    start: 18, end: 19, people: 12, drivers: ["Marcus Bell"], destinations: ["Hampton Inn Stillwater", "Oklahoma State University"],
    status: "pending",
  },

  // Music — area admins Elena Ruiz and Casey Multirole
  {
    area: "Music", requester: "laura.simmons@oc.edu", purpose: "Choir tour: Abilene and Lubbock",
    start: 20, end: 23, people: 48, drivers: ["Frank Delgado", "Marcus Bell"],
    destinations: ["Abilene Christian University", "Lubbock Christian University"],
    status: "reserved", approver: "elena.ruiz@oc.edu", vehicles: ["MUS-B01"],
  },
  {
    area: "Music", requester: "isaiah.thompson@oc.edu", purpose: "Jazz band performance at Paycom Center",
    start: 9, end: 9, time: [17, 23], people: 10, drivers: ["Grace Kim"], destinations: ["Paycom Center"], status: "pending",
  },

  // Theatre — area admins Grant Holloway and Casey Multirole
  {
    area: "Theatre", requester: "abigail.reed@oc.edu", purpose: "Theatre festival in Norman",
    start: 16, end: 17, people: 9, drivers: ["Noah Patel"], destinations: ["University of Oklahoma"],
    status: "awaiting_vehicle", approver: "grant.holloway@oc.edu",
  },
  {
    area: "Theatre", requester: "levi.johnson@oc.edu", purpose: "Pick up set pieces from the Capitol",
    start: 4, end: 4, time: [9, 12], people: 2, drivers: ["Tom Garrison"], destinations: ["Oklahoma State Capitol"], status: "denied",
  },

  // Admissions — area admins Priya Natarajan and Kyle Brennan
  {
    area: "Admissions", requester: "requester@oc.edu", purpose: "Pick up visiting families at the airport",
    start: 1, end: 1, time: [10, 13], people: 5, drivers: ["Riley Requester"], destinations: ["Will Rogers World Airport"],
    status: "reserved", approver: "priya.natarajan@oc.edu", vehicles: ["ADM-C01"],
  },
  {
    area: "Admissions", requester: "priya.natarajan@oc.edu", purpose: "College fair at Tulsa",
    start: 8, end: 8, time: [7, 18], people: 4, drivers: ["Grace Kim"],
    destinations: ["Jenks High School", "Owasso High School"], status: "pending",
  },

  // Student Life — area admins Caleb Turner and Jasmine Ortiz
  {
    area: "Student Life", requester: "requester@oc.edu", purpose: "Fall retreat at Falls Creek",
    start: 27, end: 29, people: 38, drivers: ["Frank Delgado", "Grace Kim"], destinations: ["Falls Creek Camp"], status: "pending",
  },
  {
    area: "Student Life", requester: "requester@oc.edu", purpose: "Service project in Guthrie",
    start: -17, end: -17, time: [8, 15], people: 13, drivers: ["Riley Requester"], destinations: ["First Baptist Church Guthrie"],
    status: "returned", approver: "caleb.turner@oc.edu", vehicles: ["STU-V01"],
  },
  {
    area: "Student Life", requester: "hannah.lee@oc.edu", purpose: "International student airport run",
    start: 7, end: 7, time: [6, 14], people: 14, drivers: ["Noah Patel"], destinations: ["DFW International Airport"],
    status: "reserved", approver: "caleb.turner@oc.edu", vehicles: ["STU-V01"],
  },

  // Facilities — area admin Wendy Okafor
  {
    area: "Facilities", requester: "brian.kessler@oc.edu", purpose: "Equipment pickup in Oklahoma City",
    start: 2, end: 2, time: [8, 12], people: 2, drivers: ["Tom Garrison"], destinations: ["Grainger Industrial Supply"], status: "pending",
  },

  // The rest of the custom stops
  {
    area: "Campus Ministry", requester: "nathan.price@oc.edu", purpose: "Harvest day at Smith Family Farm",
    start: -24, end: -24, time: [8, 16], people: 11, drivers: ["Marcus Bell"], destinations: ["Smith Family Farm"],
    status: "returned", approver: "nathan.price@oc.edu", vehicles: ["MIN-V01"],
  },
  {
    area: "Honors College", requester: "margaret.ellis@oc.edu", purpose: "Research symposium in Norman",
    start: 34, end: 35, people: 8, drivers: ["Elena Ruiz"], destinations: ["Embassy Suites Norman", "University of Oklahoma"],
    status: "awaiting_vehicle", approver: "owen.fletcher@oc.edu",
  },
  {
    area: "Campus Ministry", requester: "requester@oc.edu", purpose: "Worship night at Grace Community Church",
    start: 5, end: 5, time: [18, 22], people: 9, drivers: ["Riley Requester"], destinations: ["Grace Community Church"],
    status: "pending",
  },
];

const PASSENGER_TYPES = ["Car", "SUV", "Van", "Minibus", "Bus"];
const CARGO_TYPES = ["Truck", "Van"];

/** One kind of trip an area takes: `{to}` and `{city}` in a purpose become the first stop's name and city. */
const trip = (purposes, routes, people, { days = [0, 0], timed = 0.8, types = PASSENGER_TYPES } = {}) => ({
  purposes,
  routes: routes.map((route) => [route].flat()),
  people,
  days,
  timed,
  types,
});

const COLLEGES = [
  "Oral Roberts University", "University of Central Oklahoma", "Oklahoma Baptist University", "Southern Nazarene University",
  "Southwestern Christian University", "Oklahoma City University", "Rose State College", "University of Oklahoma",
  "Oklahoma State University",
];
const FAR_COLLEGES = [
  "Wichita State University", "Harding University", "Lubbock Christian University", "Abilene Christian University",
  "University of Arkansas",
];
const AIRPORTS = ["Will Rogers World Airport", "Tulsa International Airport", "DFW International Airport", "Dallas Love Field"];
const OUTDOORS = [
  "Falls Creek Camp", "Turner Falls Park", "Beavers Bend State Park", "Lake Thunderbird State Park",
  "Chickasaw National Recreation Area", "Lake Texoma State Park",
];
const OUTINGS = [
  "Oklahoma City Zoo", "Science Museum Oklahoma", "Myriad Botanical Gardens", "Gathering Place", "Penn Square Mall",
  "Chickasaw Bricktown Ballpark", "Paycom Center",
];

const TRIPS = {
  Athletics: [
    trip(
      ["Basketball away game at {to}", "Baseball series at {to}", "Softball doubleheader at {to}", "Soccer match at {to}",
        "Volleyball match at {to}", "Track meet at {to}", "Cross country invitational at {to}", "Tennis match at {to}"],
      COLLEGES, [10, 45], { days: [0, 1] },
    ),
    trip(["Conference tournament at {to}", "Road trip to {to}"], FAR_COLLEGES, [12, 45], { days: [1, 3], timed: 0.2 }),
    trip(["Recruit pickup at {to}"], AIRPORTS, [1, 4], { types: ["Car", "SUV"] }),
    trip(["Golf tournament at {to}"], ["Lake Murray State Park", "Lake Texoma State Park"], [5, 8], { days: [1, 2], timed: 0 }),
  ],
  Music: [
    trip(
      ["Choir performance at {to}", "Concert band performance at {to}", "Jazz band gig at {to}", "Recital at {to}"],
      ["Civic Center Music Hall", "Tulsa Performing Arts Center", "Paycom Center", "Oklahoma City University",
        "Oklahoma Baptist University", "Southern Nazarene University"],
      [6, 50], { days: [0, 1] },
    ),
    trip(
      ["Spring choir tour", "Chorale tour", "Band tour"],
      [["Harding University", "University of Arkansas"],
        ["Oklahoma Baptist University", "Oral Roberts University", "Tulsa Performing Arts Center"],
        ["Abilene Christian University", "Lubbock Christian University"]],
      [30, 50], { days: [2, 4], timed: 0 },
    ),
  ],
  Theatre: [
    trip(
      ["Theatre festival at {to}", "Touring show at {to}", "See a show at {to}"],
      ["Civic Center Music Hall", "Tulsa Performing Arts Center", "University of Oklahoma", "Oklahoma City University",
        "University of Central Oklahoma"],
      [6, 20], { days: [0, 2] },
    ),
    trip(["Pick up set pieces in {city}", "Lumber run in {city}"], ["Lowe's Home Improvement", "Oklahoma State Fair Park"], [1, 3], {
      types: CARGO_TYPES,
    }),
  ],
  Admissions: [
    trip(["Campus visit pickup at {to}", "Visiting family pickup at {to}"], AIRPORTS, [2, 6], { types: ["Car", "SUV", "Van"] }),
    trip(
      ["College fair at {to}", "Recruiting visit to {to}"],
      ["Edmond North High School", "Deer Creek High School", "Heritage Hall School", "Bishop McGuinness High School",
        "Norman North High School", ["Jenks High School", "Owasso High School"], ["Edmond North High School", "Deer Creek High School"]],
      [1, 4], { types: ["Car", "SUV"] },
    ),
  ],
  "Student Life": [
    trip(["Freshman retreat at {to}", "Leadership retreat at {to}", "Club retreat at {to}"], OUTDOORS, [12, 45], {
      days: [1, 3], timed: 0,
    }),
    trip(["Outing to {to}", "Movie and dinner night", "Late-night trip to {to}"], OUTINGS, [6, 30], {}),
    trip(["International student airport run"], AIRPORTS, [4, 14], {}),
  ],
  Facilities: [
    trip(["Equipment pickup in {city}", "Supply run to {to}", "Parts pickup in {city}"],
      ["Grainger Industrial Supply", "Lowe's Home Improvement"], [1, 3], { types: CARGO_TYPES }),
    trip(["Move furniture to {to}"], ["Regional Food Bank of Oklahoma", "Central Oklahoma Habitat for Humanity"], [2, 4], {
      types: CARGO_TYPES,
    }),
  ],
  "Campus Ministry": [
    trip(["Service project at {to}", "Volunteer shift at {to}"],
      ["Regional Food Bank of Oklahoma", "City Rescue Mission", "Central Oklahoma Habitat for Humanity",
        "Integris Baptist Medical Center"], [6, 20], {}),
    trip(["Weekend retreat at {to}"], ["Falls Creek Camp", "Turner Falls Park", "Lake Texoma State Park"], [10, 30], {
      days: [1, 2], timed: 0,
    }),
  ],
  "Honors College": [
    trip(["Museum visit at {to}", "Lecture at {to}", "Research symposium at {to}"],
      ["Philbrook Museum of Art", "Oklahoma City National Memorial", "Science Museum Oklahoma", "University of Oklahoma",
        "Oklahoma State University", "Oklahoma State Capitol"], [4, 12], {}),
  ],
  Intramurals: [
    trip(["Intramural tournament at {to}", "Rec league game at {to}"],
      ["University of Central Oklahoma", "Southern Nazarene University", "Oklahoma City University", "Rose State College"],
      [6, 14], { timed: 1 }),
  ],
  "Global Studies": [
    trip(["International student pickup at {to}"], [...AIRPORTS, "Kansas City International Airport"], [3, 12], {}),
    trip(["Cultural trip to {to}"],
      ["Wichita Mountains Wildlife Refuge", "Oklahoma City National Memorial", "Philbrook Museum of Art", "Gathering Place"],
      [6, 20], { days: [0, 1] }),
    trip(["Texas cultural weekend"], [["Dallas Love Field", "AT&T Stadium"]], [8, 20], { days: [1, 2], timed: 0 }),
  ],
};

const AREA_WEIGHTS = [
  ["Athletics", 5], ["Music", 3], ["Student Life", 3], ["Admissions", 3], ["Theatre", 2], ["Facilities", 2],
  ["Campus Ministry", 2], ["Honors College", 1], ["Intramurals", 1], ["Global Studies", 2],
];

const GENERATED_REQUEST_COUNT = 280;
const DAY_MS = 24 * 60 * 60 * 1000;
const APPROVED_SEED_STATUSES = ["awaiting_vehicle", "reserved", "returned"];

/** Midnight local time `offset` days from today, or `hour` o'clock that day. All-day dates are stored at UTC midnight. */
const tripDate = (offset, hour) => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  if (hour !== undefined) {
    day.setHours(hour, 0, 0, 0);
    return day;
  }
  return new Date(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T00:00:00.000Z`);
};

/** When a request's trip starts and ends (an all-day trip runs through its last day). */
const tripSpan = ({ start, end, time }) => {
  const startAt = tripDate(start, time?.[0]);
  const endAt = tripDate(end, time?.[1]);
  return { startAt, endAt, from: startAt.getTime(), to: endAt.getTime() + (time ? 0 : DAY_MS) };
};

const statusFor = ({ from, to }) => {
  const now = Date.now();
  if (to < now) return weighted([["returned", 78], ["cancelled", 10], ["denied", 12]]);
  if (from <= now) return "reserved";
  if (from - now < 21 * DAY_MS) {
    return weighted([["reserved", 50], ["awaiting_vehicle", 15], ["pending", 25], ["cancelled", 5], ["denied", 5]]);
  }
  return weighted([["pending", 45], ["awaiting_vehicle", 20], ["reserved", 25], ["cancelled", 5], ["denied", 5]]);
};

/**
 * Generated requests follow the API's rules: approved drivers licensed through the trip, vehicles from the request's
 * area, and no vehicle on two overlapping trips that still hold it. Drivers try not to double up, either.
 */
const generatedRequests = () => {
  const vehicleTrips = new Map();
  const driverTrips = new Map();
  const isFree = (bookings, key, span) => !(bookings.get(key) ?? []).some(({ from, to }) => span.from < to && from < span.to);
  const book = (bookings, key, span) => bookings.set(key, [...(bookings.get(key) ?? []), span]);
  const holds = (status) => !["cancelled", "denied"].includes(status);

  for (const request of NAMED_REQUESTS) {
    const span = tripSpan(request);
    if (holds(request.status)) (request.vehicles ?? []).forEach((id) => book(vehicleTrips, id, span));
    request.drivers.forEach((name) => book(driverTrips, name, span));
  }

  const approvedDrivers = SEED_DRIVERS.filter(({ status }) => status === "approved");
  const requesters = SAMPLE_USERS.filter(({ email }) => !TEST_ACCOUNTS.some((account) => account.email === email));

  /** Fewest vehicles that seat everyone: the smallest one that fits, else the biggest few (a shortfall is allowed, FR-004). */
  const chooseVehicles = (area, types, people, span) => {
    const free = SEED_VEHICLES.filter(
      (vehicle) => vehicle.area === area && vehicle.status === "active" && types.includes(vehicle.type) &&
        isFree(vehicleTrips, vehicle.universityId, span),
    );
    const fits = free.filter(({ passengerCapacity }) => passengerCapacity >= people);
    if (fits.length) {
      const smallest = Math.min(...fits.map(({ passengerCapacity }) => passengerCapacity));
      return [pick(fits.filter(({ passengerCapacity }) => passengerCapacity === smallest))];
    }
    const chosen = [];
    for (const vehicle of [...free].sort((a, b) => b.passengerCapacity - a.passengerCapacity)) {
      if (chosen.length === 3 || chosen.reduce((seats, { passengerCapacity }) => seats + passengerCapacity, 0) >= people) break;
      chosen.push(vehicle);
    }
    return chosen;
  };

  const chooseDrivers = (count, lastDay, span) => {
    const licensed = shuffled(approvedDrivers.filter(({ licenseExpirationDate }) => licenseExpirationDate >= lastDay));
    const names = licensed.map(({ firstName, lastName }) => `${firstName} ${lastName}`);
    const free = names.filter((name) => isFree(driverTrips, name, span));
    return [...free, ...names.filter((name) => !free.includes(name))].slice(0, count);
  };

  const requests = [];
  for (let i = 0; i < GENERATED_REQUEST_COUNT; i += 1) {
    const area = weighted(AREA_WEIGHTS);
    const kind = pick(TRIPS[area]);
    const destinations = pick(kind.routes);
    const first = placesByName[destinations[0]];
    const purpose = pick(kind.purposes).replace("{to}", first.name).replace("{city}", first.city);

    const start = between(-120, 120);
    const end = start + between(...kind.days);
    const startHour = between(6, 15);
    const time = chance(kind.timed) ? [startHour, Math.min(23, startHour + between(2, 8))] : undefined;
    const people = between(...kind.people);
    const span = tripSpan({ start, end, time });
    const lastDay = span.endAt.toISOString().slice(0, 10);

    let status = statusFor(span);
    let vehicles = [];
    if (["reserved", "returned"].includes(status)) {
      vehicles = chooseVehicles(area, kind.types, people, span).map(({ universityId }) => universityId);
      if (!vehicles.length) {
        status = status === "returned" ? "cancelled" : "awaiting_vehicle";
      }
    }

    const drivers = chooseDrivers(Math.max(1, vehicles.length, people > 15 ? 2 : 1), lastDay, span);
    const areaAdmins = areaAdminsOf(area);
    // The requester test account gets a steady share, so it always has history and upcoming trips to look at.
    const requester =
      i % 30 === 0
        ? "requester@oc.edu"
        : chance(0.3) && areaAdmins.length
          ? pick(areaAdmins)
          : pick(requesters).email;

    const request = {
      area,
      requester,
      purpose,
      start,
      end,
      ...(time && { time }),
      people,
      drivers,
      destinations,
      status,
      ...(APPROVED_SEED_STATUSES.includes(status) && { approver: pick([...areaAdmins, ...ADMINS]) }),
      ...(vehicles.length && { vehicles }),
    };

    if (holds(status)) vehicles.forEach((id) => book(vehicleTrips, id, span));
    drivers.forEach((name) => book(driverTrips, name, span));
    requests.push(request);
  }

  return requests;
};

export const SEED_REQUESTS = [...NAMED_REQUESTS, ...generatedRequests()];

/* ------------------------------------------------------------------------------------------------------------------ */
/* Issue reports, maintenance needs, and mileage logs (Features 9, 10, and 11)                                         */
/* ------------------------------------------------------------------------------------------------------------------ */

const MAINTENANCE_EMAILS = [
  "maintenance@oc.edu",
  "multirole@oc.edu",
  "hector.alvarez@oc.edu",
  "brian.kessler@oc.edu",
  "victor.ramos@oc.edu",
  "wendy.okafor@oc.edu",
];
const REPORT_AUTHORS = ["admin@oc.edu", "areaadmin@oc.edu", ...MAINTENANCE_EMAILS];

const ISSUE_COPY = {
  low_gas: ["Fuel light is on.", "Tank is below a quarter.", "The van was returned almost empty."],
  dirty: ["Mud on the floor mats.", "Trash left in the back seat.", "The cargo area needs to be swept."],
  maintenance: ["Brakes squeak at low speed.", "Oil change is due.", "The check-engine light came on.", "A headlight is out."],
  other: ["Spare key is missing.", "The key fob battery is dead.", "A seat belt will not retract."],
};

const NEED_TITLES = ["Oil change", "Brake noise", "Headlight out", "Tire wear", "Battery check", "Wiper blades", "Coolant leak"];

const activeVehicles = () => SEED_VEHICLES.filter((vehicle) => vehicle.status === "active");

const generatedIssueReports = () => {
  const vehicles = activeVehicles();
  const types = ["maintenance", "maintenance", "low_gas", "dirty", "other"];
  return Array.from({ length: 32 }, (_, index) => {
    const type = types[index % types.length];
    const status = ["pending", "resolved", "cancelled"][index % 3];
    const vehicle = vehicles[index % vehicles.length].universityId;
    return {
      vehicle,
      linkRequest: type === "maintenance" && index % 2 === 0,
      author: REPORT_AUTHORS[index % REPORT_AUTHORS.length],
      assignee: type === "maintenance" || index % 4 === 0 ? MAINTENANCE_EMAILS[index % MAINTENANCE_EMAILS.length] : null,
      type,
      description: ISSUE_COPY[type][index % ISSUE_COPY[type].length],
      status,
      resolvedAt: status === "resolved" ? isoDay(-((index % 20) + 1)) : null,
    };
  });
};

export const SEED_ISSUE_REPORTS = generatedIssueReports();

const maintenanceStatus = (index) => ["Open", "In Progress", "Completed", "Canceled"][index % 4];

const generatedMaintenanceNeeds = () => {
  const fromReports = SEED_ISSUE_REPORTS.flatMap((report, issueReportIndex) => {
    if (report.type !== "maintenance" || issueReportIndex % 2 !== 0) return [];
    const status = maintenanceStatus(issueReportIndex);
    return [
      {
        issueReportIndex,
        vehicle: report.vehicle,
        author: report.author,
        assignee: report.assignee,
        title: "Maintenance Needed",
        description: report.description,
        outOfService: true,
        priority: "None",
        status,
        resolvedAt: status === "Open" || status === "In Progress" ? null : isoDay(-((issueReportIndex % 15) + 1)),
      },
    ];
  });

  const vehicles = activeVehicles();
  const standalone = Array.from({ length: 8 }, (_, index) => {
    const status = maintenanceStatus(index);
    return {
      issueReportIndex: null,
      vehicle: vehicles[index % vehicles.length].universityId,
      author: MAINTENANCE_EMAILS[index % MAINTENANCE_EMAILS.length],
      assignee: index % 5 === 0 ? null : MAINTENANCE_EMAILS[(index + 1) % MAINTENANCE_EMAILS.length],
      title: NEED_TITLES[index % NEED_TITLES.length],
      description: ISSUE_COPY.maintenance[index % ISSUE_COPY.maintenance.length],
      outOfService: index % 2 === 0,
      priority: ["High", "Medium", "Low", "None"][index % 4],
      status,
      resolvedAt: status === "Open" || status === "In Progress" ? null : isoDay(-((index % 10) + 1)),
    };
  });

  return [...fromReports, ...standalone];
};

export const SEED_MAINTENANCE_NEEDS = generatedMaintenanceNeeds();

const generatedMileageLogs = () => {
  const vehicles = activeVehicles().slice(0, 20);
  return vehicles.flatMap((vehicle, vehicleIndex) => {
    let reading = 8000 + vehicleIndex * 500;
    return [0, 1, 2].map((step) => {
      reading += 120 + vehicleIndex * 10 + step * 40;
      return {
        vehicle: vehicle.universityId,
        user: MAINTENANCE_EMAILS[(vehicleIndex + step) % MAINTENANCE_EMAILS.length],
        odometerReading: reading,
        recordedAt: isoDay(-((3 - step) * 30 + vehicleIndex)),
      };
    });
  });
};

export const SEED_MILEAGE_LOGS = generatedMileageLogs();

/* ------------------------------------------------------------------------------------------------------------------ */
/* Writing it all                                                                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

/** Records that point at vehicles, requests, or users go before those rows are replaced. */
const clearSampleTables = async (transaction) => {
  for (const model of [
    db.maintenanceNeed,
    db.serviceLog,
    db.issueReport,
    db.mileageLog,
    db.vehicleRequest,
    db.vehicle,
    db.vehicleType,
    db.serviceType,
    db.driver,
    db.destination,
  ]) {
    await model.destroy({ where: {}, transaction });
  }
};

const seedSampleTables = async ({ areaIds, transaction }) => {
  const types = await db.vehicleType.bulkCreate(SEED_VEHICLE_TYPES, { transaction });
  const typeIds = Object.fromEntries(types.map((type) => [type.name, type.id]));

  await db.vehicle.bulkCreate(
    SEED_VEHICLES.map(({ area, type, ...fields }) => ({ ...fields, areaId: areaIds[area], vehicleTypeId: typeIds[type] })),
    { transaction },
  );

  await db.serviceType.bulkCreate(SEED_SERVICE_TYPES, { transaction });

  const users = await db.user.findAll({ where: { email: SEED_DRIVERS.map(({ email }) => email).filter(Boolean) }, transaction });
  const userIds = Object.fromEntries(users.map((user) => [user.email, user.id]));
  await db.driver.bulkCreate(
    SEED_DRIVERS.map(({ email, ...fields }) => ({
      ...fields,
      userId: userIds[email] ?? null,
      approvedAt: fields.status === "approved" ? new Date() : null,
    })),
    { transaction },
  );

  await db.destination.bulkCreate(SEED_DESTINATIONS, { transaction });
};

/** Feature 8: create SEED_REQUESTS with their drivers, ordered stops, and vehicles. */
const seedRequests = async ({ areaIds, google, transaction }) => {
  const byKey = (rows, key) => Object.fromEntries(rows.map((row) => [key(row), row]));
  const users = byKey(await db.user.findAll({ transaction }), (user) => user.email);
  const drivers = byKey(await db.driver.findAll({ transaction }), (row) => `${row.firstName} ${row.lastName}`);
  const destinations = byKey(await db.destination.findAll({ transaction }), (row) => row.name);
  const vehicles = byKey(await db.vehicle.findAll({ transaction }), (row) => row.universityId);

  for (const { area, requester, purpose, start, end, time, people, status, approver, ...links } of SEED_REQUESTS) {
    const stops = links.destinations.map((name) => destinations[name]);
    const approved = APPROVED_SEED_STATUSES.includes(status);
    const request = await db.vehicleRequest.create(
      {
        userId: users[requester].id,
        areaId: areaIds[area],
        purpose,
        startAt: tripDate(start, time?.[0]),
        endAt: tripDate(end, time?.[1]),
        allDay: !time,
        numberOfPeople: people,
        estimatedMiles: google ? await estimateMiles(stops) : seedTripMiles(links.destinations),
        status,
        approverId: approved ? users[approver].id : null,
        approvedAt: approved ? new Date() : null,
      },
      { transaction },
    );

    await db.vehicleRequestDriver.bulkCreate(
      links.drivers.map((name) => ({ vehicleRequestId: request.id, driverId: drivers[name].id })),
      { transaction },
    );
    await db.vehicleRequestDestination.bulkCreate(
      stops.map((stop, i) => ({ vehicleRequestId: request.id, destinationId: stop.id, stopOrder: i + 1 })),
      { transaction },
    );
    await db.vehicleRequestVehicle.bulkCreate(
      (links.vehicles ?? []).map((universityId) => ({ vehicleRequestId: request.id, vehicleId: vehicles[universityId].id })),
      { transaction },
    );
  }
};

/** Features 9–11: mileage logs, issue reports, and maintenance needs for the seeded fleet. */
const seedOperations = async ({ transaction }) => {
  const users = Object.fromEntries((await db.user.findAll({ transaction })).map((user) => [user.email, user.id]));
  const vehicles = Object.fromEntries((await db.vehicle.findAll({ transaction })).map((vehicle) => [vehicle.universityId, vehicle.id]));
  const requestByVehicle = new Map();
  for (const link of await db.vehicleRequestVehicle.findAll({ transaction })) {
    if (!requestByVehicle.has(link.vehicleId)) requestByVehicle.set(link.vehicleId, link.vehicleRequestId);
  }

  const reports = [];
  for (const report of SEED_ISSUE_REPORTS) {
    const vehicleId = vehicles[report.vehicle];
    reports.push(
      await db.issueReport.create(
        {
          vehicleId,
          vehicleRequestId: report.linkRequest ? (requestByVehicle.get(vehicleId) ?? null) : null,
          authorId: users[report.author],
          assigneeId: report.assignee ? users[report.assignee] : null,
          type: report.type,
          description: report.description,
          status: report.status,
          resolvedAt: report.resolvedAt,
        },
        { transaction },
      ),
    );
  }

  await db.maintenanceNeed.bulkCreate(
    SEED_MAINTENANCE_NEEDS.map((need) => ({
      issueReportId: need.issueReportIndex == null ? null : reports[need.issueReportIndex].id,
      authorId: users[need.author],
      vehicleId: vehicles[need.vehicle],
      assigneeId: need.assignee ? users[need.assignee] : null,
      title: need.title,
      description: need.description,
      outOfService: need.outOfService,
      priority: need.priority,
      status: need.status,
      resolvedAt: need.resolvedAt,
    })),
    { transaction },
  );

  await db.mileageLog.bulkCreate(
    SEED_MILEAGE_LOGS.map((log) => ({
      vehicleId: vehicles[log.vehicle],
      userId: users[log.user],
      odometerReading: log.odometerReading,
      recordedAt: log.recordedAt,
    })),
    { transaction },
  );
};

/**
 * Replace users, sessions, roles, areas, and the sample tables with seed data in one transaction.
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

    await seedSampleTables({ areaIds, transaction });
    await seedRequests({ areaIds, google, transaction });
    await seedOperations({ transaction });

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
