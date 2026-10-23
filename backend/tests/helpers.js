import jwt from "jsonwebtoken";
import db from "../app/models/index.js";
import authConfig from "../app/config/auth.config.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Drop and recreate all tables so each test starts from an empty database. */
export const syncTestDatabase = async () => {
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
