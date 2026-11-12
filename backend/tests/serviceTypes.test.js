/**
 * Feature 12 — Service Type Management
 * Spec: features/feature-12-service-types.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles, createArea } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const tooLong = "a".repeat(256);
const serviceTypeBody = (overrides = {}) => ({
  name: "Oil Change",
  service_frequency_days: 500,
  service_frequency_miles: 5000,
  ...overrides,
});

const signIn = async (roles = ["admin"], overrides = {}) => {
  const { body } = await createUserWithRoles(roles, overrides);
  return bearer(body.token);
};

const createServiceType = (headers, overrides = {}) =>
  request(app).post("/api/service-types").set(headers).send(serviceTypeBody(overrides));

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 12 — Service Type Management", () => {
  describe("US-12.1 — Create service types", () => {
    it("Admin user saves service type", async () => {
      const variants = ["admin", "maintenance", "area_admin"];

      for (const variant of variants) {
        await syncTestDatabase();
        const area = await createArea("Athletics");
        const roles = variant === "area_admin" ? [{ role: "area_admin", areaId: area.id }] : [variant];
        const headers = await signIn(roles, { email: `${variant}@oc.edu` });

        const response = await createServiceType(headers, { name: " Oil Change " });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          id: expect.any(Number),
          name: "Oil Change",
          service_frequency_days: 500,
          service_frequency_miles: 5000,
        });
        expect(response.body.createdAt).toEqual(expect.any(String));
        expect(response.body.updatedAt).toEqual(expect.any(String));

        const list = await request(app).get("/api/service-types").set(headers);
        expect(list.status).toBe(200);
        expect(list.body.map((serviceType) => serviceType.name)).toContain("Oil Change");
      }
    });

    it("Admin user requests to create a service type with a missing name", async () => {
      const headers = await signIn();
      const cases = [
        {
          body: { service_frequency_days: 500, service_frequency_miles: 5000 },
          message: "Missing name.",
        },
        {
          body: { name: "Oil Change" },
          message: "Missing service_frequency_days or service_frequency_miles.",
        },
        {
          body: { name: "Oil Change", service_frequency_days: 0, service_frequency_miles: 5000 },
          message: "Invalid service_frequency_days.",
        },
        {
          body: { name: "Oil Change", service_frequency_days: 500, service_frequency_miles: -1 },
          message: "Invalid service_frequency_miles.",
        },
      ];

      for (const { body, message } of cases) {
        const response = await request(app).post("/api/service-types").set(headers).send(body);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message });
      }

      expect(await db.serviceType.count()).toBe(0);
    });

    it("Admin user creates a service type with only one frequency", async () => {
      const headers = await signIn();

      const daysOnly = await createServiceType(headers, { service_frequency_miles: null });
      expect(daysOnly.status).toBe(201);
      expect(daysOnly.body).toMatchObject({
        name: "Oil Change",
        service_frequency_days: 500,
        service_frequency_miles: null,
      });

      const milesOnly = await createServiceType(headers, {
        name: "Tire Rotation",
        service_frequency_days: null,
        service_frequency_miles: 6000,
      });
      expect(milesOnly.status).toBe(201);
      expect(milesOnly.body).toMatchObject({
        name: "Tire Rotation",
        service_frequency_days: null,
        service_frequency_miles: 6000,
      });

      const list = await request(app).get("/api/service-types").set(headers);
      expect(list.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Oil Change", service_frequency_miles: null }),
          expect.objectContaining({ name: "Tire Rotation", service_frequency_days: null }),
        ]),
      );
    });

    it("Admin user creates service type with a whitespace-only name", async () => {
      const headers = await signIn();

      const response = await createServiceType(headers, { name: " " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
      expect(await db.serviceType.count()).toBe(0);
    });

    it("Admin user creates service type with name longer than 255 characters", async () => {
      const headers = await signIn();

      const response = await createServiceType(headers, { name: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name too long." });
      expect(await db.serviceType.count()).toBe(0);
    });

    it("Admin user creates a service type with a non-unique name", async () => {
      const headers = await signIn();
      const existing = await createServiceType(headers);
      expect(existing.body.id).toBe(1);

      const response = await createServiceType(headers);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
      expect(await db.serviceType.count()).toBe(1);
    });

    it("Admin user creates a service type with a non-unique name that is not case-sensitive", async () => {
      const headers = await signIn();
      await createServiceType(headers);

      const response = await createServiceType(headers, { name: "oil change" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
      expect(await db.serviceType.count()).toBe(1);
    });
  });

  describe("US-12.4 — Edit and delete service types", () => {
    it("Admin user edits a service type name", async () => {
      const headers = await signIn();
      const created = await createServiceType(headers);

      const response = await request(app)
        .put(`/api/service-types/${created.body.id}`)
        .set(headers)
        .send(serviceTypeBody({ name: "Tire Rotation" }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: "Tire Rotation",
        service_frequency_days: 500,
        service_frequency_miles: 5000,
      });

      const list = await request(app).get("/api/service-types").set(headers);
      expect(list.body.map((serviceType) => serviceType.name)).toContain("Tire Rotation");
      expect(list.body.map((serviceType) => serviceType.name)).not.toContain("Oil Change");
    });

    it("Admin user edits a service type to have a missing name", async () => {
      const headers = await signIn();
      await createServiceType(headers);

      const response = await request(app).put("/api/service-types/1").set(headers).send(serviceTypeBody({ name: "" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
    });

    it("Admin user edits a service type to have a whitespace-only name", async () => {
      const headers = await signIn();
      await createServiceType(headers);

      const response = await request(app).put("/api/service-types/1").set(headers).send(serviceTypeBody({ name: " " }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
    });

    it("Admin user updates a service type to have a non-unique name", async () => {
      const headers = await signIn();
      await createServiceType(headers);
      await createServiceType(headers, { name: "Tire Rotation" });

      const response = await request(app)
        .put("/api/service-types/2")
        .set(headers)
        .send(serviceTypeBody({ name: "Oil Change" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
    });

    it("Admin user edits a service type to have a non-unique name that is not case-sensitive", async () => {
      const headers = await signIn();
      await createServiceType(headers);
      await createServiceType(headers, { name: "Tire Rotation" });

      const response = await request(app)
        .put("/api/service-types/2")
        .set(headers)
        .send(serviceTypeBody({ name: "oil change" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
    });

    it("Admin user deletes a service type", async () => {
      const headers = await signIn();
      const created = await createServiceType(headers);

      const response = await request(app).delete(`/api/service-types/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);

      const list = await request(app).get("/api/service-types").set(headers);
      expect(list.body.map((serviceType) => serviceType.name)).not.toContain("Oil Change");
    });

    it("Admin user updates a service type that does not exist", async () => {
      const headers = await signIn();

      const response = await request(app).put("/api/service-types/999").set(headers).send(serviceTypeBody());

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Service type with id=999 not found." });
    });

    it("Admin user updates a service type with an invalid serviceTypeId", async () => {
      const headers = await signIn();

      const response = await request(app).put("/api/service-types/abc").set(headers).send(serviceTypeBody());

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid service type id." });
    });

    it("Admin user deletes a service type that does not exist", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/service-types/999").set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Service type with id=999 not found." });
    });

    it("Admin user deletes a service type with an invalid serviceTypeId", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/service-types/abc").set(headers);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid service type id." });
    });
  });

  describe("US-12.5: Signed-in admin , area admin, or maintenance user access only", () => {
    it("Unauthenticated API request to service types", async () => {
      const response = await request(app).get("/api/service-types");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to a particular service type", async () => {
      const headers = await signIn();
      await createServiceType(headers);

      const response = await request(app).get("/api/service-types/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to create a service type", async () => {
      const response = await request(app).post("/api/service-types").send(serviceTypeBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to update a service type", async () => {
      const headers = await signIn();
      await createServiceType(headers);

      const response = await request(app).put("/api/service-types/1").send(serviceTypeBody({ name: "Tire Rotation" }));

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to delete a service type", async () => {
      const headers = await signIn();
      await createServiceType(headers);

      const response = await request(app).delete("/api/service-types/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    const forbidden = { message: "One of these roles is required: admin, area_admin, maintenance." };

    it("Signed-in user without admin , area admin, or maintenance role API request to service types", async () => {
      const headers = await signIn([]);

      const response = await request(app).get("/api/service-types").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin , area admin, or maintenance role API request to a particular service type", async () => {
      const admin = await signIn();
      await createServiceType(admin);
      const headers = await signIn([], { email: "requester@oc.edu" });

      const response = await request(app).get("/api/service-types/1").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin , area admin, or maintenance role API request to create a service type", async () => {
      const headers = await signIn([]);

      const response = await createServiceType(headers, { name: "Tire Rotation" });

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin , area admin, or maintenance role API request to update a service type", async () => {
      const admin = await signIn();
      await createServiceType(admin);
      const headers = await signIn([], { email: "requester@oc.edu" });

      const response = await request(app)
        .put("/api/service-types/1")
        .set(headers)
        .send(serviceTypeBody({ name: "Tire Rotation" }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin , area admin, or maintenance role API request to delete a service type", async () => {
      const admin = await signIn();
      await createServiceType(admin);
      const headers = await signIn([], { email: "requester@oc.edu" });

      const response = await request(app).delete("/api/service-types/1").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
      expect(await db.serviceType.count()).toBe(1);
    });
  });
});
