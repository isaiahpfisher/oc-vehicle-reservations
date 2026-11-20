import jwt from "jsonwebtoken";
import db from "../app/models/index.js";
import authConfig from "../app/config/auth.config.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

let liveTableStats;

/**
 * The models whose table has been written to since its last truncate. Truncating is DDL and costs a few
 * milliseconds a table, so truncating all of them before every test was most of the backend suite's run time.
 *
 * A truncated table's AUTO_INCREMENT is 1, and any insert moves it on (even if the row is deleted again), so a table
 * whose AUTO_INCREMENT isn't 1 needs resetting. Tables without one are always treated as dirty. MySQL 8 caches
 * information_schema stats, so there the cache is turned off for this connection; MariaDB's are always live.
 */
const dirtyTables = async (transaction) => {
  if (liveTableStats === undefined) {
    const [[{ version }]] = await db.sequelize.query("SELECT VERSION() AS version", { transaction });
    liveTableStats = /mariadb/i.test(version);
  }
  if (!liveTableStats) {
    await db.sequelize.query("SET SESSION information_schema_stats_expiry = 0", { transaction });
  }

  const [rows] = await db.sequelize.query(
    "SELECT TABLE_NAME AS name, AUTO_INCREMENT AS next FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
    { transaction },
  );
  const nextId = new Map(rows.map(({ name, next }) => [name, next]));

  return Object.values(db.sequelize.models).filter((model) => Number(nextId.get(model.getTableName())) !== 1);
};

/**
 * Start each test from an empty database.
 * Jest's global setup drops and recreates the schema once per run. Each test only truncates,
 * which still resets auto-increment ids.
 */
export const syncTestDatabase = async () => {
  // Last line of defense: this wipes every table, so only ever run it against a *-test database.
  const name = db.sequelize.config.database;
  if (!name.endsWith("-test")) {
    throw new Error(`Refusing to reset "${name}": test databases must be named *-test.`);
  }

  // FOREIGN_KEY_CHECKS is per connection, so the transaction keeps every statement on one pooled connection.
  await db.sequelize.transaction(async (transaction) => {
    const dirty = await dirtyTables(transaction);
    if (!dirty.length) {
      return;
    }

    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0", { transaction });
    try {
      for (const model of dirty) {
        await model.truncate({ transaction });
      }
    } finally {
      await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1", { transaction });
    }
  });
};

export const validRegistration = (overrides = {}) => ({
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  ...overrides,
});

/**
 * Create a user and session directly.
 * Other features still authenticate this way. Google sign-in is covered in auth.test.js.
 */
export const registerUser = async (overrides = {}) => {
  const data = validRegistration(overrides);
  const user = await db.user.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
  });

  const token = jwt.sign({ userId: user.id, email: user.email }, authConfig.secret, { expiresIn: 86400 });
  await db.session.create({
    token,
    email: user.email,
    expirationDate: new Date(Date.now() + SESSION_TTL_MS),
    userId: user.id,
  });

  return {
    status: 201,
    body: {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [],
      token,
    },
  };
};

/**
 * Create a user holding `roles` (there is no API that grants the first admin).
 * Each role is a name (`"admin"`) or a row (`{ role: "area_admin", areaId }`).
 */
export const createUserWithRoles = async (roles, overrides = {}) => {
  const response = await registerUser(overrides);
  const rows = roles.map((role) => (typeof role === "string" ? { role } : role));
  await db.role.bulkCreate(rows.map((row) => ({ ...row, userId: response.body.userId })));
  response.body.roles = rows;
  return response;
};

/** Create an area row directly (Feature 2's API needs an admin session; see areas.test.js for that path). */
export const createArea = (name) => db.area.create({ name });
