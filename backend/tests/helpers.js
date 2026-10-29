import jwt from "jsonwebtoken";
import db from "../app/models/index.js";
import authConfig from "../app/config/auth.config.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

let schemaReady = false;

/**
 * STUB(feature-3): copied from feature/3-user-role-management. Remove this line when Feature 3 merges.
 * Start each test from an empty database.
 * The first call in a test file drops every table (not just current models, so stale tables from removed
 * features can't block FK drops) and recreates the schema. Later calls only truncate, which is several
 * times faster and still resets auto-increment ids.
 */
export const syncTestDatabase = async () => {
  // Last line of defense: this wipes every table, so only ever run it against a *-test database.
  const name = db.sequelize.config.database;
  if (!name.endsWith("-test")) {
    throw new Error(`Refusing to reset "${name}": test databases must be named *-test.`);
  }

  if (!schemaReady) {
    await db.sequelize.getQueryInterface().dropAllTables();
    await db.sequelize.sync({ force: true });
    schemaReady = true;
    return;
  }

  // FOREIGN_KEY_CHECKS is per connection, so the transaction keeps every statement on one pooled connection.
  await db.sequelize.transaction(async (transaction) => {
    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0", { transaction });
    try {
      for (const model of Object.values(db.sequelize.models)) {
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
    role: data.role || "student",
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
      role: user.role,
      token,
    },
  };
};

/** Create a user, then set their stored role directly (there is no API to create an admin). */
export const createUserWithRole = async (role, overrides = {}) => {
  const response = await registerUser(overrides);
  await db.user.update({ role }, { where: { id: response.body.userId } });
  response.body.role = role;
  return response;
};

/**
 * STUB(feature-3): copied from feature/3-user-role-management. Remove when Feature 3 merges.
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
