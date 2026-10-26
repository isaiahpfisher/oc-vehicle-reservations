import jwt from "jsonwebtoken";
import db from "../app/models/index.js";
import authConfig from "../app/config/auth.config.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Drop and recreate all tables so each test starts from an empty database.
 * Drops every table (not just current models) so stale tables from removed features can't block FK drops.
 */
export const syncTestDatabase = async () => {
  // Last line of defense: this drops every table, so only ever run it against a *-test database.
  const name = db.sequelize.config.database;
  if (!name.endsWith("-test")) {
    throw new Error(`Refusing to reset "${name}": test databases must be named *-test.`);
  }

  await db.sequelize.getQueryInterface().dropAllTables();
  await db.sequelize.sync({ force: true });
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

/** INTERIM: areas come from Feature 2's API once it is merged; until then tests create rows directly. */
export const createArea = (name) => db.area.create({ name });
