/**
 * Feature 3 — User Role Management
 * Spec: features/feature-3-user-role-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { createUserWithRoles, syncTestDatabase } from "./helpers.js";

const ENV_KEYS = ["DEV_LOGIN", "DEV_LOGIN_PASSWORD", "NODE_ENV"];
let savedEnv;

const devLogin = (email, password = "password") => request(app).post("/api/dev-login").send({ email, password });

beforeEach(async () => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.DEV_LOGIN = "true";
  delete process.env.DEV_LOGIN_PASSWORD;
  await syncTestDatabase();
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 3 — User Role Management API", () => {
  describe("US-3.9 — Test as other users (development only)", () => {
    it("Developer signs in as a seeded user", async () => {
      const maintenance = await createUserWithRoles(["maintenance"], { email: "maintenance@oc.edu" });
      await db.session.destroy({ where: { userId: maintenance.body.userId } });

      const response = await devLogin(" Maintenance@OC.edu ");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: maintenance.body.userId,
        email: "maintenance@oc.edu",
        firstName: "Jane",
        lastName: "Doe",
        roles: [{ id: expect.any(Number), role: "maintenance", areaId: null, area: null }],
        token: expect.any(String),
      });

      // The token works like a Google session.
      const me = await request(app)
        .get(`/api/users/${maintenance.body.userId}`)
        .set({ Authorization: `Bearer ${response.body.token}` });
      expect(me.status).toBe(200);
    });

    it("Developer sign-in with a wrong password", async () => {
      const maintenance = await createUserWithRoles(["maintenance"], { email: "maintenance@oc.edu" });
      await db.session.destroy({ where: { userId: maintenance.body.userId } });

      const attempts = [
        ...["wrong", "", null, "PASSWORD"].map((password) => devLogin("maintenance@oc.edu", password)),
        request(app).post("/api/dev-login").send({ email: "maintenance@oc.edu" }), // no password at all
      ];
      for (const response of await Promise.all(attempts)) {
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Bad Credentials." });
      }
      expect(await db.session.count()).toBe(0);

      // A custom shared password replaces the default.
      process.env.DEV_LOGIN_PASSWORD = "s3cret";
      expect((await devLogin("maintenance@oc.edu", "password")).status).toBe(401);
      expect((await devLogin("maintenance@oc.edu", "s3cret")).status).toBe(200);
    });

    it("Developer sign-in for an unknown email", async () => {
      for (const email of ["nobody@oc.edu", "", undefined]) {
        const response = await devLogin(email);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Bad Credentials." });
      }
      expect(await db.user.count()).toBe(0);
    });

    it("Developer sign-in is off unless enabled", async () => {
      await createUserWithRoles(["admin"], { email: "admin@oc.edu" });

      for (const value of [undefined, "false", "1", "TRUE"]) {
        if (value === undefined) delete process.env.DEV_LOGIN;
        else process.env.DEV_LOGIN = value;

        const response = await devLogin("admin@oc.edu");
        expect(response.status).toBe(404);
      }
    });

    it("Developer sign-in is never available in production", async () => {
      await createUserWithRoles(["admin"], { email: "admin@oc.edu" });
      process.env.NODE_ENV = "production";

      const response = await devLogin("admin@oc.edu");

      expect(response.status).toBe(404);
    });
  });
});
