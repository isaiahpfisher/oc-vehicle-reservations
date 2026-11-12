/**
 * Feature 1 — User Authentication and Session Management
 * Spec: features/feature-1-user-authentication-session-management.md
 * Also: features/feature-3-user-role-management.md (US-3.7 "Stored user includes roles")
 */
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import authConfig from "../app/config/auth.config.js";
import { syncTestDatabase } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const googleCredential = (overrides = {}) =>
  jwt.sign(
    {
      email: "jane@eagles.oc.edu",
      given_name: "Jane",
      family_name: "Doe",
      ...overrides,
    },
    authConfig.secret,
    { expiresIn: "1h" },
  );

const loginWithGoogle = (overrides) =>
  request(app).post("/api/login").send({ googleCredentials: googleCredential(overrides) });

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 1 — User Authentication and Session Management API", () => {
  describe("US-1.1 — Create account", () => {
    it("User registers with valid information", async () => {
      const response = await loginWithGoogle();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: expect.any(Number),
        email: "jane@eagles.oc.edu",
        firstName: "Jane",
        lastName: "Doe",
        roles: [],
        token: expect.any(String),
      });
      expect(response.body).not.toHaveProperty("password");

      const stored = await db.user.findByPk(response.body.userId);
      expect(stored.email).toBe("jane@eagles.oc.edu");
      expect(stored.firstName).toBe("Jane");
      expect(stored.lastName).toBe("Doe");

      const sessions = await db.session.findAll({ where: { userId: response.body.userId } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].token).toBe(response.body.token);
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("Returning User Signs in", async () => {
      const first = await loginWithGoogle();
      const response = await loginWithGoogle({ given_name: "Janet", family_name: "Smith" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: first.body.userId,
        email: "jane@eagles.oc.edu",
        firstName: "Janet",
        lastName: "Smith",
        roles: [],
        token: first.body.token,
      });
      const stored = await db.user.findByPk(first.body.userId);
      expect(stored.firstName).toBe("Janet");
      expect(stored.lastName).toBe("Smith");
      expect(await db.user.count({ where: { email: "jane@eagles.oc.edu" } })).toBe(1);
      expect(await db.session.count({ where: { userId: first.body.userId } })).toBe(1);
    });

    it("User cannot change name or email", async () => {
      const { body } = await loginWithGoogle();
      const changes = { firstName: "Janet", lastName: "Smith", email: "janet@eagles.oc.edu" };

      // Without the admin role, PUT is refused outright.
      const asSelf = await request(app).put(`/api/users/${body.userId}`).set(bearer(body.token)).send(changes);
      expect(asSelf.status).toBe(403);

      // Even an admin's PUT only changes roles; name and email come from Google.
      await db.role.create({ userId: body.userId, role: "admin" });
      const asAdmin = await request(app)
        .put(`/api/users/${body.userId}`)
        .set(bearer(body.token))
        .send({ ...changes, roles: [{ role: "admin" }] });

      expect(asAdmin.status).toBe(200);
      expect(asAdmin.body).toMatchObject({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@eagles.oc.edu",
      });

      const stored = await db.user.findByPk(body.userId);
      expect(stored.firstName).toBe("Jane");
      expect(stored.lastName).toBe("Doe");
      expect(stored.email).toBe("jane@eagles.oc.edu");
    });

    it("rejects a Google credential that cannot be verified", async () => {
      const response = await request(app).post("/api/login").send({ googleCredentials: "not-a-token" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Bad Credentials." });
      expect(await db.user.count()).toBe(0);
      expect(await db.session.count()).toBe(0);
    });

    it("accepts an oc.edu email", async () => {
      const response = await loginWithGoogle({ email: "jane@oc.edu" });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe("jane@oc.edu");
      expect(await db.user.count({ where: { email: "jane@oc.edu" } })).toBe(1);
    });

    it("rejects a non-OC email", async () => {
      for (const email of ["jane@gmail.com", "jane@notoc.edu"]) {
        const response = await loginWithGoogle({ email });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Non OC email used." });
      }
      expect(await db.user.count()).toBe(0);
      expect(await db.session.count()).toBe(0);
    });
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Protected API request succeeds with a valid session", async () => {
      const userA = await loginWithGoogle();
      await loginWithGoogle({ email: "bob@eagles.oc.edu", given_name: "Bob", family_name: "Smith" });

      const response = await request(app).get(`/api/users/${userA.body.userId}`).set(bearer(userA.body.token));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: userA.body.userId,
        email: "jane@eagles.oc.edu",
        firstName: "Jane",
        lastName: "Doe",
      });
      expect(response.body.email).not.toBe("bob@eagles.oc.edu");
      expect(response.body).not.toHaveProperty("password");
    });

    it("Expired or invalid session token", async () => {
      const { body } = await loginWithGoogle();
      const url = `/api/users/${body.userId}`;

      const garbage = await request(app).get(url).set(bearer("not-a-real-token"));
      expect(garbage.status).toBe(401);
      expect(garbage.body).toEqual({ message: "Unauthorized! Invalid or expired token." });

      await db.session.update({ expirationDate: new Date(Date.now() - 1000) }, { where: { userId: body.userId } });

      const expired = await request(app).get(url).set(bearer(body.token));
      expect(expired.status).toBe(401);
      expect(expired.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });
  });

  describe("US-1.4 — Sign out", () => {
    it("User logs out", async () => {
      const { body } = await loginWithGoogle();

      const response = await request(app).post("/api/logout").set(bearer(body.token));

      expect(response.status).toBe(200);
      expect(await db.session.count({ where: { token: body.token } })).toBe(0);

      const reused = await request(app).get(`/api/users/${body.userId}`).set(bearer(body.token));
      expect(reused.status).toBe(401);
    });
  });

  describe("US-1.5 — Protect authenticated APIs and signed-in UI", () => {
    it("Protected API is called without a token", async () => {
      await loginWithGoogle();

      const response = await request(app).get("/api/users/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });
});

describe("Feature 3 — User Role Management API", () => {
  describe("US-3.7 — Reusable Authorization Middleware and Hooks", () => {
    it("Stored user includes roles", async () => {
      const first = await loginWithGoogle();
      const athletics = await db.area.create({ name: "Athletics" });
      await db.role.bulkCreate([
        { userId: first.body.userId, role: "maintenance" },
        { userId: first.body.userId, role: "area_admin", areaId: athletics.id },
      ]);

      const response = await loginWithGoogle();

      expect(response.status).toBe(200);
      expect(response.body.roles).toEqual([
        { id: expect.any(Number), role: "area_admin", areaId: athletics.id, area: { id: athletics.id, name: "Athletics" } },
        { id: expect.any(Number), role: "maintenance", areaId: null, area: null },
      ]);
    });
  });
});
