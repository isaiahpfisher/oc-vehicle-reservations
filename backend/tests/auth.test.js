/**
 * Feature 1 — User Authentication and Session Management
 * Spec: features/feature-1-user-authentication-session-management.md
 */
import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, loginUser, createUserWithRole, validRegistration } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 1 — User Authentication and Session Management API", () => {
  describe("US-1.1 — Create account", () => {
    it("User registers with valid information", async () => {
      const response = await registerUser();

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        userId: expect.any(Number),
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
        role: "student",
        token: expect.any(String),
      });
      expect(response.body).not.toHaveProperty("password");

      const stored = await db.user.unscoped().findByPk(response.body.userId);
      expect(stored.password).not.toBe("password1");
      expect(stored.password).toMatch(/^\$2[aby]\$/);
      expect(await bcrypt.compare("password1", stored.password)).toBe(true);

      const sessions = await db.session.findAll({ where: { userId: response.body.userId } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].token).toBe(response.body.token);
    });

    it("User registers with a duplicate email", async () => {
      await registerUser();

      const response = await registerUser({ firstName: "Other" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Email is already registered." });
      expect(await db.user.count()).toBe(1);
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("User logs in with valid credentials", async () => {
      const registered = await registerUser();

      const response = await loginUser("jane@example.com", "password1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: registered.body.userId,
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
        role: "student",
        token: expect.any(String),
      });
      expect(response.body).not.toHaveProperty("password");

      // The unexpired session from registration is reused, not duplicated.
      expect(response.body.token).toBe(registered.body.token);
      expect(await db.session.count({ where: { userId: registered.body.userId } })).toBe(1);
    });

    it("User logs in with an unknown email", async () => {
      const response = await loginUser("nobody@example.com", "password1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Invalid email or password." });
    });

    it("User logs in with an invalid password", async () => {
      await registerUser();

      const response = await loginUser("jane@example.com", "wrong-password");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Invalid email or password." });
    });
  });

  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Protected API request succeeds with a valid session", async () => {
      const userA = await registerUser();
      await registerUser({ email: "bob@example.com", firstName: "Bob" });

      const response = await request(app).get(`/api/users/${userA.body.userId}`).set(bearer(userA.body.token));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: userA.body.userId,
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
        role: "student",
      });
      expect(response.body).not.toHaveProperty("password");
    });

    it("Expired or invalid session token", async () => {
      const { body } = await registerUser();
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
      const { body } = await registerUser();

      const response = await request(app).post("/api/logout").set(bearer(body.token));

      expect(response.status).toBe(200);

      const reused = await request(app).get(`/api/users/${body.userId}`).set(bearer(body.token));
      expect(reused.status).toBe(401);
    });
  });

  describe("US-1.5 — Protect authenticated APIs and signed-in UI", () => {
    it("Protected API is called without a token", async () => {
      await registerUser();

      const response = await request(app).get("/api/users/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });

  describe("US-1.6 — Ensure user roles stay separate", () => {
    it("Registration stores the student role", async () => {
      const response = await registerUser({ role: "admin" });

      expect(response.status).toBe(201);
      expect(response.body.role).toBe("student");

      const stored = await db.user.findByPk(response.body.userId);
      expect(stored.role).toBe("student");
    });

    it("Admin logs in with the admin role", async () => {
      await createUserWithRole("admin", { email: "admin@example.com", firstName: "Ada" });

      const response = await loginUser("admin@example.com", "password1");

      expect(response.status).toBe(200);
      expect(response.body.role).toBe("admin");
      expect(response.body.email).toBe("admin@example.com");
    });
  });

  describe("Edge cases", () => {
    it.each(["firstName", "lastName", "email", "password"])(
      "Register without %s returns 400",
      async (field) => {
        const payload = validRegistration();
        delete payload[field];

        const response = await request(app).post("/api/register").send(payload);

        expect(response.status).toBe(400);
        expect(await db.user.count()).toBe(0);
      },
    );
  });
});
