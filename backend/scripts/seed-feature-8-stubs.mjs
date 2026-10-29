/**
 * STUB(features 3–7): sample vehicle types, vehicles, drivers, and destinations so Feature 8 can be tried by hand
 * before those features have their own screens. Delete this file once Features 3–7 merge.
 *
 * Usage (from backend/):  node scripts/seed-feature-8-stubs.mjs [email-to-make-admin]
 * Safe to re-run: rows are matched by name / university id, and existing rows are left as they are.
 * Vehicles are added only for areas that already exist; driver accounts link to users by email when present.
 */
import "dotenv/config";
import db from "../app/models/index.js";

const [adminEmail] = process.argv.slice(2);

await db.sequelize.sync();

const count = { vehicleTypes: 0, vehicles: 0, drivers: 0, destinations: 0 };
const upsert = async (model, key, where, defaults) => {
  const [row, created] = await model.findOrCreate({ where, defaults });
  if (created) count[key] += 1;
  return row;
};

// Vehicle types (Feature 4). Buses need a CDL driver.
const types = {};
for (const [name, identifier, requiresCdl] of [
  ["Car", "VIN", false],
  ["Truck", "VIN", false],
  ["Van", "VIN", false],
  ["Minibus", "VIN", false],
  ["Bus", "VIN", true],
  ["Golf Cart", "serial", false],
]) {
  types[name] = await upsert(db.vehicleType, "vehicleTypes", { name }, { identifier, requiresCdl });
}

// Vehicles (Feature 5), grouped by area name.
const fleet = {
  Athletics: [
    ["ATH-V01", "Van", "Ford", "Transit 350", 2022, 15],
    ["ATH-V02", "Van", "Ford", "Transit 350", 2021, 15],
    ["ATH-V03", "Van", "Chevrolet", "Express 3500", 2012, 12, "retired"],
    ["ATH-M01", "Minibus", "Ford", "E-450 Starcraft", 2020, 14],
    ["ATH-B01", "Bus", "Blue Bird", "Vision", 2019, 48],
    ["ATH-C01", "Car", "Toyota", "Camry", 2023, 5],
  ],
  Music: [
    ["MUS-V01", "Van", "Ford", "Transit 350", 2023, 12],
    ["MUS-M01", "Minibus", "Chevrolet", "Starcraft Allstar", 2018, 14],
    ["MUS-B01", "Bus", "MCI", "J4500 Coach", 2017, 56],
  ],
  Theatre: [
    ["THE-V01", "Van", "Ford", "Transit 150", 2020, 12],
    ["THE-C01", "Car", "Honda", "Odyssey", 2022, 7],
  ],
  Admissions: [
    ["ADM-C01", "Car", "Toyota", "Highlander", 2024, 7],
    ["ADM-C02", "Car", "Toyota", "Camry", 2022, 5],
    ["ADM-V01", "Van", "Ford", "Transit 350", 2021, 12],
  ],
  "Student Life": [
    ["STU-V01", "Van", "Ford", "Transit 350", 2022, 15],
    ["STU-B01", "Bus", "Thomas", "Saf-T-Liner C2", 2016, 40],
    ["STU-G01", "Golf Cart", "Club Car", "Onward", 2021, 4],
  ],
  Facilities: [
    ["FAC-T01", "Truck", "Ford", "F-150", 2020, 5],
    ["FAC-G01", "Golf Cart", "E-Z-GO", "Express S2", 2019, 2],
    ["FAC-G02", "Golf Cart", "Club Car", "Carryall 502", 2022, 2],
  ],
};

const skippedAreas = [];
for (const [areaName, vehicles] of Object.entries(fleet)) {
  const area = await db.area.findOne({ where: { name: areaName } });
  if (!area) {
    skippedAreas.push(areaName);
    continue;
  }

  for (const [universityId, type, make, model, year, passengerCapacity, status = "active"] of vehicles) {
    await upsert(
      db.vehicle,
      "vehicles",
      { universityId },
      { areaId: area.id, vehicleTypeId: types[type].id, make, model, year, passengerCapacity, status },
    );
  }
}

// Drivers (Feature 7). Covers every status, an expired license, one expiring soon, CDL holders, and a non-user driver.
for (const [firstName, lastName, licenseExpirationDate, status, hasCdl, email] of [
  ["Isaiah", "Fisher", "2030-06-30", "approved", false, "isaiah.fisher@eagles.oc.edu"],
  ["Riley", "Requester", "2029-03-15", "approved", false, "requester@oc.edu"],
  ["Taylor", "Athletics", "2031-01-31", "approved", true, "areaadmin@oc.edu"],
  ["Marcus", "Bell", "2028-09-30", "approved", true, "marcus.bell@oc.edu"],
  ["Elena", "Ruiz", "2027-02-28", "approved", false, "elena.ruiz@oc.edu"],
  ["Tom", "Garrison", "2030-12-31", "approved", true, "tom.garrison@oc.edu"],
  ["Noah", "Patel", "2032-04-30", "approved", false, "noah.patel@oc.edu"],
  ["Grace", "Kim", "2031-07-31", "approved", false, "grace.kim@oc.edu"],
  ["Laura", "Simmons", "2026-11-15", "approved", false, "laura.simmons@oc.edu"], // expires soon
  ["Hannah", "Lee", "2026-09-30", "approved", false, "hannah.lee@oc.edu"], // already expired
  ["Jacob", "Miller", "2029-05-01", "pending", false, "jacob.miller@oc.edu"],
  ["Ethan", "Brooks", "2030-01-01", "denied", false, "ethan.brooks@oc.edu"],
  ["Sophia", "Nguyen", "2029-08-01", "revoked", false, "sophia.nguyen@oc.edu"],
  ["Frank", "Delgado", "2029-10-31", "approved", true, null], // contract bus driver, no account
]) {
  const user = email ? await db.user.findOne({ where: { email } }) : null;
  await upsert(
    db.driver,
    "drivers",
    { firstName, lastName },
    { userId: user?.id ?? null, licenseExpirationDate, status, hasCdl },
  );
}

// Destinations (Feature 6). Miles from campus are approximate driving distances; the last one is an unsaved custom stop.
for (const [name, addressLine1, city, state, zipCode, milesFromCampus, isSaved = true] of [
  ["Oklahoma State Capitol", "2300 N Lincoln Blvd", "Oklahoma City", "OK", "73105", 12],
  ["Paycom Center", "100 W Reno Ave", "Oklahoma City", "OK", "73102", 16],
  ["Southern Nazarene University", "6729 NW 39th Expy", "Bethany", "OK", "73008", 18],
  ["Will Rogers World Airport", "7100 Terminal Dr", "Oklahoma City", "OK", "73159", 25],
  ["University of Oklahoma", "660 Parrington Oval", "Norman", "OK", "73019", 35],
  ["Oklahoma State University", "401 Whitehurst Hall", "Stillwater", "OK", "74078", 60],
  ["Falls Creek Camp", "3770 Falls Creek Rd", "Davis", "OK", "73030", 85],
  ["BOK Center", "200 S Denver Ave", "Tulsa", "OK", "74103", 105],
  ["Tulsa International Airport", "7777 E Apache St", "Tulsa", "OK", "74115", 110],
  ["Lake Murray State Park", "13528 Scenic State Hwy 77", "Ardmore", "OK", "73401", 115],
  ["DFW International Airport", "2400 Aviation Dr", "DFW Airport", "TX", "75261", 200],
  ["Dallas Love Field", "8008 Herb Kelleher Way", "Dallas", "TX", "75235", 205],
  ["Abilene Christian University", "1600 Campus Ct", "Abilene", "TX", "79601", 250],
  ["Lubbock Christian University", "5601 19th St", "Lubbock", "TX", "79407", 330],
  ["Harding University", "915 E Market Ave", "Searcy", "AR", "72149", 340],
  ["First Baptist Church Guthrie", "202 E Oklahoma Ave", "Guthrie", "OK", "73044", null, false],
]) {
  await upsert(db.destination, "destinations", { name }, { addressLine1, city, state, zipCode, milesFromCampus, isSaved });
}

if (adminEmail) {
  const user = await db.user.findOne({ where: { email: adminEmail } });
  if (user) {
    await db.role.findOrCreate({ where: { userId: user.id, role: "admin", areaId: null } });
    console.log(`${adminEmail} is an admin. Sign out and back in to pick up the role.`);
  } else {
    console.log(`No user with email ${adminEmail}. Sign in once first, then re-run.`);
  }
}

console.log(
  `Added ${count.vehicleTypes} vehicle types, ${count.vehicles} vehicles, ${count.drivers} drivers, ${count.destinations} destinations.`,
);
if (skippedAreas.length) {
  console.log(`Skipped vehicles for missing areas: ${skippedAreas.join(", ")}.`);
}
await db.sequelize.close();
