/**
 * Feature 3 — FR-016: replace users, sessions, roles, and areas with development seed data.
 * Feature 8 adds INTERIM sample vehicles, drivers, and destinations (and clears vehicle requests) until Features 4–7 merge.
 * Usage (from backend/): npm run seed [-- --keep you@eagles.oc.edu ...]
 */
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import db from "../app/models/index.js";

export const SEED_AREAS = ["Admissions", "Athletics", "Facilities", "Music", "Student Life", "Theatre"];

const areaAdmin = (...areas) => areas.map((area) => ({ role: "area_admin", area }));

/** One obvious test account per role, then realistic staff and students. Every email ends in @oc.edu. */
export const SEED_USERS = [
  // Test accounts (sign in with DEV_LOGIN — see README)
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

  // Staff
  { firstName: "Dana", lastName: "Whitfield", email: "dana.whitfield@oc.edu", roles: [{ role: "admin" }] },
  { firstName: "Marcus", lastName: "Bell", email: "marcus.bell@oc.edu", roles: areaAdmin("Athletics") },
  { firstName: "Elena", lastName: "Ruiz", email: "elena.ruiz@oc.edu", roles: areaAdmin("Music") },
  { firstName: "Grant", lastName: "Holloway", email: "grant.holloway@oc.edu", roles: areaAdmin("Theatre") },
  { firstName: "Priya", lastName: "Natarajan", email: "priya.natarajan@oc.edu", roles: areaAdmin("Admissions") },
  { firstName: "Caleb", lastName: "Turner", email: "caleb.turner@oc.edu", roles: areaAdmin("Student Life") },
  {
    firstName: "Wendy",
    lastName: "Okafor",
    email: "wendy.okafor@oc.edu",
    roles: [{ role: "maintenance" }, ...areaAdmin("Facilities")],
  },
  { firstName: "Hector", lastName: "Alvarez", email: "hector.alvarez@oc.edu", roles: [{ role: "maintenance" }] },
  { firstName: "Brian", lastName: "Kessler", email: "brian.kessler@oc.edu", roles: [{ role: "maintenance" }] },
  { firstName: "Laura", lastName: "Simmons", email: "laura.simmons@oc.edu", roles: [] },
  { firstName: "Tom", lastName: "Garrison", email: "tom.garrison@oc.edu", roles: [] },

  // Students
  { firstName: "Jacob", lastName: "Miller", email: "jacob.miller@oc.edu", roles: [] },
  { firstName: "Hannah", lastName: "Lee", email: "hannah.lee@oc.edu", roles: [] },
  { firstName: "Ethan", lastName: "Brooks", email: "ethan.brooks@oc.edu", roles: [] },
  { firstName: "Sophia", lastName: "Nguyen", email: "sophia.nguyen@oc.edu", roles: [] },
  { firstName: "Noah", lastName: "Patel", email: "noah.patel@oc.edu", roles: [] },
  { firstName: "Olivia", lastName: "Carter", email: "olivia.carter@oc.edu", roles: [] },
  { firstName: "Isaiah", lastName: "Thompson", email: "isaiah.thompson@oc.edu", roles: [] },
  { firstName: "Grace", lastName: "Kim", email: "grace.kim@oc.edu", roles: [] },
  { firstName: "Levi", lastName: "Johnson", email: "levi.johnson@oc.edu", roles: [] },
  { firstName: "Abigail", lastName: "Reed", email: "abigail.reed@oc.edu", roles: [] },
];

/*
 * INTERIM(features 4–7): sample vehicle types, vehicles, drivers, and destinations so vehicle requests (Feature 8)
 * can be tried before those features exist. Each feature replaces its block here with its own seed data.
 * Drivers cover every status, an expired license, one expiring soon, CDL holders, and a driver with no account.
 */
export const INTERIM_VEHICLE_TYPES = [
  { name: "Car", identifier: "VIN", requiresCdl: false },
  { name: "Truck", identifier: "VIN", requiresCdl: false },
  { name: "Van", identifier: "VIN", requiresCdl: false },
  { name: "Minibus", identifier: "VIN", requiresCdl: false },
  { name: "Bus", identifier: "VIN", requiresCdl: true },
  { name: "Golf Cart", identifier: "serial", requiresCdl: false },
];

const vehicle = (area, universityId, type, make, model, year, passengerCapacity, status = "active") => ({
  area,
  universityId,
  type,
  make,
  model,
  year,
  passengerCapacity,
  status,
});

export const INTERIM_VEHICLES = [
  vehicle("Athletics", "ATH-V01", "Van", "Ford", "Transit 350", 2022, 15),
  vehicle("Athletics", "ATH-V02", "Van", "Ford", "Transit 350", 2021, 15),
  vehicle("Athletics", "ATH-V03", "Van", "Chevrolet", "Express 3500", 2012, 12, "retired"),
  vehicle("Athletics", "ATH-M01", "Minibus", "Ford", "E-450 Starcraft", 2020, 14),
  vehicle("Athletics", "ATH-B01", "Bus", "Blue Bird", "Vision", 2019, 48),
  vehicle("Athletics", "ATH-C01", "Car", "Toyota", "Camry", 2023, 5),
  vehicle("Music", "MUS-V01", "Van", "Ford", "Transit 350", 2023, 12),
  vehicle("Music", "MUS-M01", "Minibus", "Chevrolet", "Starcraft Allstar", 2018, 14),
  vehicle("Music", "MUS-B01", "Bus", "MCI", "J4500 Coach", 2017, 56),
  vehicle("Theatre", "THE-V01", "Van", "Ford", "Transit 150", 2020, 12),
  vehicle("Theatre", "THE-C01", "Car", "Honda", "Odyssey", 2022, 7),
  vehicle("Admissions", "ADM-C01", "Car", "Toyota", "Highlander", 2024, 7),
  vehicle("Admissions", "ADM-C02", "Car", "Toyota", "Camry", 2022, 5),
  vehicle("Admissions", "ADM-V01", "Van", "Ford", "Transit 350", 2021, 12),
  vehicle("Student Life", "STU-V01", "Van", "Ford", "Transit 350", 2022, 15),
  vehicle("Student Life", "STU-B01", "Bus", "Thomas", "Saf-T-Liner C2", 2016, 40),
  vehicle("Student Life", "STU-G01", "Golf Cart", "Club Car", "Onward", 2021, 4),
  vehicle("Facilities", "FAC-T01", "Truck", "Ford", "F-150", 2020, 5),
  vehicle("Facilities", "FAC-G01", "Golf Cart", "E-Z-GO", "Express S2", 2019, 2),
  vehicle("Facilities", "FAC-G02", "Golf Cart", "Club Car", "Carryall 502", 2022, 2),
];

export const INTERIM_DRIVERS = [
  { firstName: "Riley", lastName: "Requester", email: "requester@oc.edu", licenseExpirationDate: "2029-03-15", status: "approved" },
  { firstName: "Taylor", lastName: "Athletics", email: "areaadmin@oc.edu", licenseExpirationDate: "2031-01-31", status: "approved", hasCdl: true },
  { firstName: "Marcus", lastName: "Bell", email: "marcus.bell@oc.edu", licenseExpirationDate: "2028-09-30", status: "approved", hasCdl: true },
  { firstName: "Elena", lastName: "Ruiz", email: "elena.ruiz@oc.edu", licenseExpirationDate: "2027-02-28", status: "approved" },
  { firstName: "Tom", lastName: "Garrison", email: "tom.garrison@oc.edu", licenseExpirationDate: "2030-12-31", status: "approved", hasCdl: true },
  { firstName: "Noah", lastName: "Patel", email: "noah.patel@oc.edu", licenseExpirationDate: "2032-04-30", status: "approved" },
  { firstName: "Grace", lastName: "Kim", email: "grace.kim@oc.edu", licenseExpirationDate: "2031-07-31", status: "approved" },
  { firstName: "Laura", lastName: "Simmons", email: "laura.simmons@oc.edu", licenseExpirationDate: "2026-11-15", status: "approved" },
  { firstName: "Hannah", lastName: "Lee", email: "hannah.lee@oc.edu", licenseExpirationDate: "2026-09-30", status: "approved" },
  { firstName: "Jacob", lastName: "Miller", email: "jacob.miller@oc.edu", licenseExpirationDate: "2029-05-01", status: "pending" },
  { firstName: "Ethan", lastName: "Brooks", email: "ethan.brooks@oc.edu", licenseExpirationDate: "2030-01-01", status: "denied" },
  { firstName: "Sophia", lastName: "Nguyen", email: "sophia.nguyen@oc.edu", licenseExpirationDate: "2029-08-01", status: "revoked" },
  { firstName: "Frank", lastName: "Delgado", email: null, licenseExpirationDate: "2029-10-31", status: "approved", hasCdl: true },
];

const destination = (name, addressLine1, city, state, zipCode, milesFromCampus, isSaved = true) => ({
  name,
  addressLine1,
  city,
  state,
  zipCode,
  milesFromCampus,
  isSaved,
});

/** Miles from campus are approximate driving distances. The last stop is an unsaved, custom-entered one. */
export const INTERIM_DESTINATIONS = [
  destination("Oklahoma State Capitol", "2300 N Lincoln Blvd", "Oklahoma City", "OK", "73105", 12),
  destination("Paycom Center", "100 W Reno Ave", "Oklahoma City", "OK", "73102", 16),
  destination("Southern Nazarene University", "6729 NW 39th Expy", "Bethany", "OK", "73008", 18),
  destination("Will Rogers World Airport", "7100 Terminal Dr", "Oklahoma City", "OK", "73159", 25),
  destination("University of Oklahoma", "660 Parrington Oval", "Norman", "OK", "73019", 35),
  destination("Oklahoma State University", "401 Whitehurst Hall", "Stillwater", "OK", "74078", 60),
  destination("Falls Creek Camp", "3770 Falls Creek Rd", "Davis", "OK", "73030", 85),
  destination("BOK Center", "200 S Denver Ave", "Tulsa", "OK", "74103", 105),
  destination("Tulsa International Airport", "7777 E Apache St", "Tulsa", "OK", "74115", 110),
  destination("Lake Murray State Park", "13528 Scenic State Hwy 77", "Ardmore", "OK", "73401", 115),
  destination("DFW International Airport", "2400 Aviation Dr", "DFW Airport", "TX", "75261", 200),
  destination("Dallas Love Field", "8008 Herb Kelleher Way", "Dallas", "TX", "75235", 205),
  destination("Abilene Christian University", "1600 Campus Ct", "Abilene", "TX", "79601", 250),
  destination("Lubbock Christian University", "5601 19th St", "Lubbock", "TX", "79407", 330),
  destination("Harding University", "915 E Market Ave", "Searcy", "AR", "72149", 340),
  destination("First Baptist Church Guthrie", "202 E Oklahoma Ave", "Guthrie", "OK", "73044", null, false),
];

/** INTERIM(features 4–7): replace the interim tables with the sample rows above. Requests are already cleared. */
const seedInterimTables = async ({ areaIds, transaction }) => {
  for (const model of [db.vehicle, db.vehicleType, db.driver, db.destination]) {
    await model.destroy({ where: {}, transaction });
  }

  const types = await db.vehicleType.bulkCreate(INTERIM_VEHICLE_TYPES, { transaction });
  const typeIds = Object.fromEntries(types.map((type) => [type.name, type.id]));

  await db.vehicle.bulkCreate(
    INTERIM_VEHICLES.map(({ area, type, ...fields }) => ({ ...fields, areaId: areaIds[area], vehicleTypeId: typeIds[type] })),
    { transaction },
  );

  const users = await db.user.findAll({ where: { email: INTERIM_DRIVERS.map(({ email }) => email).filter(Boolean) }, transaction });
  const userIds = Object.fromEntries(users.map((user) => [user.email, user.id]));
  await db.driver.bulkCreate(
    INTERIM_DRIVERS.map(({ email, ...fields }) => ({ ...fields, userId: userIds[email] ?? null })),
    { transaction },
  );

  await db.destination.bulkCreate(INTERIM_DESTINATIONS, { transaction });
};

/**
 * Replace users, sessions, roles, and areas with seed data in one transaction.
 * `keep` users survive with their sessions and non-area roles (areas are recreated, so area roles can't survive).
 * Returns `{ exitCode, message }`.
 */
export const seed = async ({ keep = [] } = {}) => {
  if (process.env.NODE_ENV === "production") {
    return { exitCode: 1, message: "Refusing to seed: NODE_ENV is production." };
  }

  const keepEmails = keep.map((email) => String(email).trim().toLowerCase()).filter(Boolean);

  const kept = await db.sequelize.transaction(async (transaction) => {
    const keptUsers = await db.user.findAll({ where: { email: keepEmails }, transaction });
    const notKept = { [Op.notIn]: keptUsers.map((user) => user.id).concat(0) };

    // INTERIM(features 4–7): vehicle requests point at the users and areas replaced below, so clear them first.
    await db.vehicleRequest.destroy({ where: {}, transaction });

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

    await seedInterimTables({ areaIds, transaction });

    return keptUsers.map((user) => user.email);
  });

  const missing = keepEmails.filter((email) => !kept.includes(email));
  return {
    exitCode: 0,
    message: [
      `Seeded ${SEED_AREAS.length} areas and ${SEED_USERS.length} users.`,
      // INTERIM(features 4–7)
      `Added interim sample data: ${INTERIM_VEHICLES.length} vehicles, ${INTERIM_DRIVERS.length} drivers, ${INTERIM_DESTINATIONS.length} destinations.`,
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
    const { exitCode, message } = await seed({ keep: parseKeep(process.argv.slice(2)) });
    (exitCode === 0 ? console.log : console.error)(message);
    process.exitCode = exitCode;
  } catch (err) {
    console.error(`seed failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}
