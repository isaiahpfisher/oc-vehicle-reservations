/**
 * Feature 3 — User Role Management
 * Spec: features/feature-3-user-role-management.md
 */
import express from "express";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  authenticate,
  authenticateAdmin,
  authenticateAreaAdmin,
  authenticateMaintenance,
  authorizeRoles,
  canAccessArea,
} from "../app/authorization/authorization.js";
import { createArea, createUserWithRoles, registerUser, syncTestDatabase } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const reached = (_req, res) => res.send({ reached: true });

/** Stand-in routes guarded by each middleware, as later features will mount them. */
const probe = express();
probe.get("/authenticate", [authenticate], (req, res) => res.send(req.user));
probe.get("/admin", [authenticateAdmin], reached);
probe.get("/maintenance", [authenticateMaintenance], reached);
probe.get("/area-admin", [authenticateAreaAdmin], reached);
probe.get("/area-admin-or-maintenance", [authorizeRoles("area_admin", "maintenance")], reached);
probe.get("/areas/:areaId/resource", [authenticateAreaAdmin], (req, res) => {
  if (!canAccessArea(req.user, parseInt(req.params.areaId, 10))) {
    return res.status(403).send({ message: "Area admin role required for this area." });
  }
  return reached(req, res);
});

const get = (path, user) => {
  const call = request(probe).get(path);
  return user ? call.set(bearer(user.body.token)) : call;
};

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 3 — User Role Management API", () => {
  describe("US-3.6 — Roles are enforced", () => {
    it("Admin can access everything", async () => {
      const admin = await createUserWithRoles(["admin"], { email: "ada@eagles.oc.edu" });
      const bob = await registerUser({ email: "bob@eagles.oc.edu" });
      const auth = bearer(admin.body.token);

      const responses = [
        await request(app).get("/api/users").set(auth),
        await request(app).get(`/api/users/${bob.body.userId}`).set(auth),
        await request(app).put(`/api/users/${bob.body.userId}`).set(auth).send({ roles: [] }),
        await request(app).get("/api/areas").set(auth),
        await request(app).delete(`/api/users/${bob.body.userId}`).set(auth),
        ...(await Promise.all(
          ["/admin", "/maintenance", "/area-admin", "/area-admin-or-maintenance", "/areas/1/resource"].map((path) =>
            get(path, admin),
          ),
        )),
      ];

      for (const response of responses) {
        expect(response.status).not.toBe(403);
        expect(response.status).toBeLessThan(300);
      }
    });
  });

  describe("US-3.7 — Reusable Authorization Middleware and Hooks", () => {
    it("authenticate attaches the user's roles", async () => {
      const athletics = await createArea("Athletics");
      const user = await createUserWithRoles(["maintenance", { role: "area_admin", areaId: athletics.id }]);

      const response = await get("/authenticate", user);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.body.userId);
      expect(response.body.roles).toHaveLength(2);
      expect(response.body.roles).toEqual(
        expect.arrayContaining([
          { id: expect.any(Number), role: "maintenance", areaId: null },
          { id: expect.any(Number), role: "area_admin", areaId: athletics.id },
        ]),
      );
    });

    it("authenticate rejects a missing token", async () => {
      for (const headers of [{}, { Authorization: "Token abc" }, { Authorization: "Bearer " }]) {
        const response = await request(probe).get("/authenticate").set(headers);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
      }
    });

    it("authenticate rejects an expired token", async () => {
      const user = await registerUser();

      const unknown = await request(probe).get("/authenticate").set(bearer("not-a-real-token"));
      expect(unknown.status).toBe(401);
      expect(unknown.body).toEqual({ message: "Unauthorized! Invalid or expired token." });

      await db.session.update({ expirationDate: new Date(Date.now() - 1000) }, { where: { userId: user.body.userId } });
      const expired = await get("/authenticate", user);
      expect(expired.status).toBe(401);
      expect(expired.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
    });

    it("authenticateAdmin allows admins", async () => {
      const admin = await createUserWithRoles(["admin"]);

      const response = await get("/admin", admin);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ reached: true });
    });

    it("authenticateAdmin rejects non-admins", async () => {
      const athletics = await createArea("Athletics");
      const users = [
        await createUserWithRoles([], { email: "none@eagles.oc.edu" }),
        await createUserWithRoles(["maintenance", { role: "area_admin", areaId: athletics.id }], {
          email: "both@eagles.oc.edu",
        }),
      ];

      for (const user of users) {
        const response = await get("/admin", user);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "Admin role required." });
      }
      expect((await get("/admin")).status).toBe(401);
    });

    it("authenticateMaintenance allows maintenance users", async () => {
      const user = await createUserWithRoles(["maintenance"]);

      const response = await get("/maintenance", user);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ reached: true });
    });

    it("authenticateMaintenance rejects other users", async () => {
      const athletics = await createArea("Athletics");
      const users = [
        await createUserWithRoles([], { email: "none@eagles.oc.edu" }),
        await createUserWithRoles([{ role: "area_admin", areaId: athletics.id }], { email: "aa@eagles.oc.edu" }),
      ];

      for (const user of users) {
        const response = await get("/maintenance", user);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "Maintenance role required." });
      }
    });

    it("authenticateAreaAdmin allows area admins of any area", async () => {
      const athletics = await createArea("Athletics");
      const music = await createArea("Music");

      for (const [email, area] of [
        ["athletics@eagles.oc.edu", athletics],
        ["music@eagles.oc.edu", music],
      ]) {
        const user = await createUserWithRoles([{ role: "area_admin", areaId: area.id }], { email });

        const response = await get("/area-admin", user);

        expect(response.status).toBe(200);
      }
    });

    it("authenticateAreaAdmin rejects other users", async () => {
      const users = [
        await createUserWithRoles([], { email: "none@eagles.oc.edu" }),
        await createUserWithRoles(["maintenance"], { email: "mo@eagles.oc.edu" }),
      ];

      for (const user of users) {
        const response = await get("/area-admin", user);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: "Area admin role required." });
      }
    });

    it("authorizeRoles allows any listed role", async () => {
      const athletics = await createArea("Athletics");
      const maintenance = await createUserWithRoles(["maintenance"], { email: "mo@eagles.oc.edu" });
      const areaAdmin = await createUserWithRoles([{ role: "area_admin", areaId: athletics.id }], {
        email: "aa@eagles.oc.edu",
      });

      expect((await get("/area-admin-or-maintenance", maintenance)).status).toBe(200);
      expect((await get("/area-admin-or-maintenance", areaAdmin)).status).toBe(200);
    });

    it("authorizeRoles rejects users with none of the listed roles", async () => {
      const user = await createUserWithRoles([]);

      const response = await get("/area-admin-or-maintenance", user);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "One of these roles is required: area_admin, maintenance." });
    });

    it("Admin passes every role middleware", async () => {
      const admin = await createUserWithRoles(["admin"]);

      for (const path of ["/maintenance", "/area-admin", "/area-admin-or-maintenance"]) {
        const response = await get(path, admin);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ reached: true });
      }
    });

    it("Area admin controllers scope by req.user areas", async () => {
      const athletics = await createArea("Athletics");
      const music = await createArea("Music");
      const user = await createUserWithRoles([{ role: "area_admin", areaId: athletics.id }]);

      const own = await get(`/areas/${athletics.id}/resource`, user);
      expect(own.status).toBe(200);

      const other = await get(`/areas/${music.id}/resource`, user);
      expect(other.status).toBe(403);
    });
  });
});
