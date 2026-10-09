import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";

/** Drop and recreate all tables so each test starts from an empty database. */
export const syncTestDatabase = async () => {
  await db.sequelize.sync({ force: true });
};

export const validRegistration = (overrides = {}) => ({
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  password: "password1",
  ...overrides,
});

/** Register through the API; returns the supertest response. */
export const registerUser = (overrides = {}) => request(app).post("/api/register").send(validRegistration(overrides));

/** Log in through the API; returns the supertest response. */
export const loginUser = (email, password) => request(app).post("/api/login").send({ email, password });

/** Register a user, then set their stored role directly (there is no API to create an admin). */
export const createUserWithRole = async (role, overrides = {}) => {
  const response = await registerUser(overrides);
  await db.user.update({ role }, { where: { id: response.body.userId } });
  return response;
};
