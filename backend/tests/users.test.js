/**
 * Feature 3 — User Role Management
 * Spec: features/feature-3-user-role-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { createArea, createUserWithRoles, registerUser, syncTestDatabase } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const signInAdmin = () =>
  createUserWithRoles(["admin"], { firstName: "Ada", lastName: "Admin", email: "ada@eagles.oc.edu" });

const putRoles = (admin, userId, roles) =>
  request(app).put(`/api/users/${userId}`).set(bearer(admin.body.token)).send({ roles });

const storedRoles = async (userId) =>
  (await db.role.findAll({ where: { userId }, order: [["role", "ASC"], ["areaId", "ASC"]] })).map(
    ({ role, areaId }) => ({ role, areaId }),
  );

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 3 — User Role Management API", () => {
  describe("US-3.1 — View users", () => {
    it("Admin views users list", async () => {
      const admin = await signInAdmin();
      const athletics = await createArea("Athletics");
      const jane = await createUserWithRoles(["maintenance", { role: "area_admin", areaId: athletics.id }], {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@eagles.oc.edu",
      });
      await registerUser({ firstName: "Bob", lastName: "Jones", email: "bob@eagles.oc.edu" });

      const response = await request(app).get("/api/users").set(bearer(admin.body.token));

      expect(response.status).toBe(200);
      expect(response.body.map((user) => user.email)).toEqual([
        "ada@eagles.oc.edu",
        "bob@eagles.oc.edu",
        "jane@eagles.oc.edu",
      ]);
      expect(response.body[2]).toEqual({
        id: jane.body.userId,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@eagles.oc.edu",
        createdAt: expect.any(String),
        roles: [
          { id: expect.any(Number), role: "area_admin", areaId: athletics.id, area: { id: athletics.id, name: "Athletics" } },
          { id: expect.any(Number), role: "maintenance", areaId: null, area: null },
        ],
      });
      expect(response.body[1].roles).toEqual([]);
    });

    it("Non-admin requests all users via API", async () => {
      const music = await createArea("Music");
      const nonAdmins = [
        await createUserWithRoles([], { email: "none@eagles.oc.edu" }),
        await createUserWithRoles(["maintenance"], { email: "mo@eagles.oc.edu" }),
        await createUserWithRoles([{ role: "area_admin", areaId: music.id }], { email: "aa@eagles.oc.edu" }),
      ];

      for (const user of nonAdmins) {
        const response = await request(app).get("/api/users").set(bearer(user.body.token));

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "Admin role required." });
      }
    });

    it("rejects listing users without a session", async () => {
      const response = await request(app).get("/api/users");

      expect(response.status).toBe(401);
    });

    it("lets a non-admin read only their own user", async () => {
      const jane = await createUserWithRoles(["maintenance"], { email: "jane@eagles.oc.edu" });
      const bob = await registerUser({ email: "bob@eagles.oc.edu" });

      const own = await request(app).get(`/api/users/${jane.body.userId}`).set(bearer(jane.body.token));
      expect(own.status).toBe(200);
      expect(own.body.roles).toEqual([{ id: expect.any(Number), role: "maintenance", areaId: null, area: null }]);

      const other = await request(app).get(`/api/users/${bob.body.userId}`).set(bearer(jane.body.token));
      expect(other.status).toBe(404);
    });

    it("lets an admin read any user and rejects bad ids", async () => {
      const admin = await signInAdmin();
      const bob = await registerUser({ email: "bob@eagles.oc.edu" });

      const found = await request(app).get(`/api/users/${bob.body.userId}`).set(bearer(admin.body.token));
      expect(found.status).toBe(200);
      expect(found.body.email).toBe("bob@eagles.oc.edu");

      const missing = await request(app).get("/api/users/9999").set(bearer(admin.body.token));
      expect(missing.status).toBe(404);

      const invalid = await request(app).get("/api/users/abc").set(bearer(admin.body.token));
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({ message: "Invalid user id." });
    });
  });

  describe("US-3.4 — User details", () => {
    it("User details page loads the user's current data", async () => {
      const admin = await signInAdmin();
      const athletics = await createArea("Athletics");
      const jane = await createUserWithRoles(["maintenance", { role: "area_admin", areaId: athletics.id }], {
        email: "jane@eagles.oc.edu",
      });

      const response = await request(app).get(`/api/users/${jane.body.userId}`).set(bearer(admin.body.token));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: jane.body.userId, firstName: "Jane", email: "jane@eagles.oc.edu" });
      expect(new Date(response.body.createdAt).toString()).not.toBe("Invalid Date");
      expect(response.body.roles.map(({ role, area }) => [role, area?.name ?? null])).toEqual([
        ["area_admin", "Athletics"],
        ["maintenance", null],
      ]);
    });

    it("Admin adds a role", async () => {
      const admin = await signInAdmin();
      const bob = await registerUser({ email: "bob@eagles.oc.edu" });

      const response = await putRoles(admin, bob.body.userId, [{ role: "maintenance" }]);

      expect(response.status).toBe(200);
      expect(response.body.roles).toEqual([{ id: expect.any(Number), role: "maintenance", areaId: null, area: null }]);
      expect(await storedRoles(bob.body.userId)).toEqual([{ role: "maintenance", areaId: null }]);
    });

    it("Admin removes a role", async () => {
      const admin = await signInAdmin();
      const bob = await createUserWithRoles(["admin", "maintenance"], { email: "bob@eagles.oc.edu" });

      const response = await putRoles(admin, bob.body.userId, [{ role: "maintenance" }]);

      expect(response.status).toBe(200);
      expect(response.body.roles.map(({ role }) => role)).toEqual(["maintenance"]);
      expect(await storedRoles(bob.body.userId)).toEqual([{ role: "maintenance", areaId: null }]);
    });

    it("Admin assigns area admin for multiple areas", async () => {
      const admin = await signInAdmin();
      const athletics = await createArea("Athletics");
      const music = await createArea("Music");
      const bob = await registerUser({ email: "bob@eagles.oc.edu" });

      const response = await putRoles(admin, bob.body.userId, [
        { role: "area_admin", areaId: athletics.id },
        { role: "area_admin", areaId: music.id },
      ]);

      expect(response.status).toBe(200);
      expect(response.body.roles.map(({ area }) => area.name)).toEqual(["Athletics", "Music"]);
      expect(await storedRoles(bob.body.userId)).toEqual([
        { role: "area_admin", areaId: athletics.id },
        { role: "area_admin", areaId: music.id },
      ]);
    });

    it("Admin removes their own admin role", async () => {
      const admin = await createUserWithRoles(["admin", "maintenance"]);

      const response = await putRoles(admin, admin.body.userId, [{ role: "maintenance" }]);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "You cannot remove your own admin role." });
      expect(await storedRoles(admin.body.userId)).toEqual([
        { role: "admin", areaId: null },
        { role: "maintenance", areaId: null },
      ]);
    });

    it("rejects invalid role payloads without changing roles", async () => {
      const admin = await signInAdmin();
      const bob = await createUserWithRoles(["maintenance"], { email: "bob@eagles.oc.edu" });
      const cases = [
        [undefined, "Roles must be an array."],
        ["admin", "Roles must be an array."],
        [[{ role: "student" }], "Invalid role."],
        [[{ role: "maintenance" }, {}], "Invalid role."],
        [[{ role: "area_admin" }], "Area admin role requires a valid area."],
        [[{ role: "area_admin", areaId: "abc" }], "Area admin role requires a valid area."],
        [[{ role: "area_admin", areaId: 9999 }], "Area admin role requires a valid area."],
      ];

      for (const [roles, message] of cases) {
        const response = await putRoles(admin, bob.body.userId, roles);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message });
      }
      expect(await storedRoles(bob.body.userId)).toEqual([{ role: "maintenance", areaId: null }]);
    });

    it("saves duplicate roles once and ignores areaId on non-area roles", async () => {
      const admin = await signInAdmin();
      const athletics = await createArea("Athletics");
      const bob = await registerUser({ email: "bob@eagles.oc.edu" });

      const response = await putRoles(admin, bob.body.userId, [
        { role: "maintenance", areaId: athletics.id },
        { role: "maintenance" },
        { role: "area_admin", areaId: athletics.id },
        { role: "area_admin", areaId: String(athletics.id) },
      ]);

      expect(response.status).toBe(200);
      expect(await storedRoles(bob.body.userId)).toEqual([
        { role: "area_admin", areaId: athletics.id },
        { role: "maintenance", areaId: null },
      ]);
    });

    it("rejects role updates from non-admins, without a session, and for unknown users", async () => {
      const admin = await signInAdmin();
      const maintenance = await createUserWithRoles(["maintenance"], { email: "mo@eagles.oc.edu" });

      const forbidden = await putRoles(maintenance, maintenance.body.userId, [{ role: "admin" }]);
      expect(forbidden.status).toBe(403);
      expect(await storedRoles(maintenance.body.userId)).toEqual([{ role: "maintenance", areaId: null }]);

      const anonymous = await request(app).put(`/api/users/${maintenance.body.userId}`).send({ roles: [] });
      expect(anonymous.status).toBe(401);

      expect((await putRoles(admin, 9999, [])).status).toBe(404);
      expect((await putRoles(admin, "abc", [])).status).toBe(400);
    });
  });

  describe("US-3.5 — Delete user", () => {
    it("Admin deletes a user via API", async () => {
      const admin = await signInAdmin();
      const bob = await createUserWithRoles(["maintenance"], { firstName: "Bob", lastName: "Jones", email: "bob@eagles.oc.edu" });

      const response = await request(app).delete(`/api/users/${bob.body.userId}`).set(bearer(admin.body.token));

      expect(response.status).toBe(204);
      expect(await db.user.findByPk(bob.body.userId)).toBeNull();
      expect(await db.role.count({ where: { userId: bob.body.userId } })).toBe(0);
      expect(await db.session.count({ where: { userId: bob.body.userId } })).toBe(0);
    });

    it("rejects deleting yourself, unknown users, and bad ids", async () => {
      const admin = await signInAdmin();
      const del = (id) => request(app).delete(`/api/users/${id}`).set(bearer(admin.body.token));

      const self = await del(admin.body.userId);
      expect(self.status).toBe(400);
      expect(self.body).toEqual({ message: "You cannot delete your own account." });
      expect(await db.user.findByPk(admin.body.userId)).not.toBeNull();

      expect((await del(9999)).status).toBe(404);
      expect((await del("abc")).status).toBe(400);
    });

    it("only pure admins can delete users", async () => {
      const athletics = await createArea("Athletics");
      const bob = await registerUser({ email: "bob@eagles.oc.edu" });
      const nonAdmins = [
        await createUserWithRoles([], { email: "none@eagles.oc.edu" }),
        await createUserWithRoles(["maintenance"], { email: "mo@eagles.oc.edu" }),
        await createUserWithRoles([{ role: "area_admin", areaId: athletics.id }], { email: "aa@eagles.oc.edu" }),
      ];

      for (const user of nonAdmins) {
        const response = await request(app).delete(`/api/users/${bob.body.userId}`).set(bearer(user.body.token));
        expect(response.status).toBe(403);
      }
      expect(await db.user.findByPk(bob.body.userId)).not.toBeNull();

      const anonymous = await request(app).delete(`/api/users/${bob.body.userId}`);
      expect(anonymous.status).toBe(401);
    });
  });

  describe("Interim Feature 2 stand-in — GET /api/areas", () => {
    it("lists areas by name for any signed-in user", async () => {
      const user = await registerUser();
      await createArea("Music");
      await createArea("Athletics");

      const response = await request(app).get("/api/areas").set(bearer(user.body.token));
      expect(response.status).toBe(200);
      expect(response.body.map(({ name }) => name)).toEqual(["Athletics", "Music"]);

      expect((await request(app).get("/api/areas")).status).toBe(401);
    });
  });
});
