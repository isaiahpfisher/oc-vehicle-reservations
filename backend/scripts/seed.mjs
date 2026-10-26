/**
 * Feature 3 — FR-016: replace users, sessions, roles, and areas with development seed data.
 * Usage (from backend/): npm run seed [-- --keep you@eagles.oc.edu ...]
 */
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import db from "../app/models/index.js";

// INTERIM: these are Feature 2 areas created directly until Feature 2 is merged.
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

    return keptUsers.map((user) => user.email);
  });

  const missing = keepEmails.filter((email) => !kept.includes(email));
  return {
    exitCode: 0,
    message: [
      `Seeded ${SEED_AREAS.length} areas and ${SEED_USERS.length} users.`,
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
