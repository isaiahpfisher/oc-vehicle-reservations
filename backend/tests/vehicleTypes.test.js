/**
 * Feature 4 — Vehicle Type Management
 * Spec: features/feature-4-vehicle-types.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const tooLong = "a".repeat(256);

const signIn = async (roles = ["admin"], overrides = {}) => {
  const { body } = await createUserWithRoles(roles, overrides);
  return bearer(body.token);
};

const createType = (headers, overrides = {}) =>
  request(app)
    .post("/api/vehicle-types")
    .set(headers)
    .send({ name: "Bus", identifier: "VIN", ...overrides });

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 4 — Vehicle Type Management", () => {
  describe("US-4.1 — Create vehicle types", () => {
    it("Admin user saves vehicle type", async () => {
      const headers = await signIn();

      const response = await createType(headers);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: "Bus",
        identifier: "VIN",
      });
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));

      const list = await request(app).get("/api/vehicle-types").set(headers);
      expect(list.status).toBe(200);
      expect(list.body.map((type) => type.name)).toContain("Bus");
    });

    it("Admin user requests to create a vehicle type with a missing name", async () => {
      const headers = await signIn();

      const response = await request(app).post("/api/vehicle-types").set(headers).send({ name: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
      expect(await db.vehicleType.count()).toBe(0);
    });

    it("Admin user requests to create a vehicle type with a missing identifier", async () => {
      const headers = await signIn();

      const response = await request(app).post("/api/vehicle-types").set(headers).send({ identifier: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing identifier." });
      expect(await db.vehicleType.count()).toBe(0);
    });

    it("Admin user requests to create a vehicle type with a whitespace-only name", async () => {
      const headers = await signIn();

      const response = await request(app).post("/api/vehicle-types").set(headers).send({ name: " " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
    });

    it("Admin user requests to create a vehicle type with an identifier other than VIN or Serial", async () => {
      const headers = await signIn();

      const response = await request(app)
        .post("/api/vehicle-types")
        .set(headers)
        .send({ identifier: " asdflje" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Unknown identifier." });
    });

    it("Admin user requests to create a vehicle type with name longer than 255 characters", async () => {
      const headers = await signIn();

      const response = await createType(headers, { name: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name too long." });
    });

    it("Admin user requests to create a vehicle type with a non-unique name", async () => {
      const headers = await signIn();
      await createType(headers);

      const response = await createType(headers, { name: "Bus" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
    });

    it("Admin user requests to create a vehicle type with a non-unique name that is not case-sensitive", async () => {
      const headers = await signIn();
      await createType(headers);

      const response = await createType(headers, { name: "bus" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
    });
  });

  describe("US-4.4 — Edit and delete vehicle types", () => {
    it("Admin user edits a vehicle type name", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .set(headers)
        .send({ name: "Golf Cart" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ name: "Golf Cart", identifier: "VIN" });

      const list = await request(app).get("/api/vehicle-types").set(headers);
      expect(list.body.map((type) => type.name)).toContain("Golf Cart");
      expect(list.body.map((type) => type.name)).not.toContain("Bus");
    });

    it("Admin user edits a vehicle type identifier", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .set(headers)
        .send({ identifier: "Serial" });

      expect(response.status).toBe(200);
      expect(response.body.identifier).toBe("Serial");
    });

    it("Admin user requests to edit a vehicle type to have a missing name", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .set(headers)
        .send({ name: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
    });

    it("Admin user requests to edit a vehicle type to have a missing identifier", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .set(headers)
        .send({ identifier: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing identifier." });
    });

    it("Admin user requests to edit a vehicle type to have a whitespace-only name", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .set(headers)
        .send({ name: " " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
    });

    it("Admin user requests to edit a vehicle type to have an identifier other than VIN or Serial", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .set(headers)
        .send({ identifier: " adsf " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Unknown identifier." });
    });

    it("Admin user requests to edit a vehicle type to have a name longer than 255 characters", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .set(headers)
        .send({ name: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name too long." });
    });

    it("Admin user requests to update a vehicle type to have a non-unique name", async () => {
      const headers = await signIn();
      await createType(headers);
      const golfCart = await createType(headers, { name: "Golf Cart", identifier: "Serial" });

      const response = await request(app)
        .put(`/api/vehicle-types/${golfCart.body.id}`)
        .set(headers)
        .send({ name: "Bus" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
    });

    it("Admin user requests to edit a vehicle type to have a non-unique name that is not case-sensitive", async () => {
      const headers = await signIn();
      await createType(headers);
      const golfCart = await createType(headers, { name: "Golf Cart", identifier: "Serial" });

      const response = await request(app)
        .put(`/api/vehicle-types/${golfCart.body.id}`)
        .set(headers)
        .send({ name: "bus" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
    });

    it("Admin user deletes a vehicle type", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app).delete(`/api/vehicle-types/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(await db.vehicleType.count()).toBe(0);

      const list = await request(app).get("/api/vehicle-types").set(headers);
      expect(list.body.map((type) => type.name)).not.toContain("Bus");
    });

    it("Admin user updates a vehicle type that does not exist", async () => {
      const headers = await signIn();

      const response = await request(app)
        .put("/api/vehicle-types/999")
        .set(headers)
        .send({ name: "Bus", identifier: "VIN" });

      expect(response.status).toBe(404);
    });

    it("Admin user updates a vehicle type with an invalid vehicleTypeId", async () => {
      const headers = await signIn();

      const response = await request(app)
        .put("/api/vehicle-types/abc")
        .set(headers)
        .send({ name: "Bus", identifier: "VIN" });

      expect(response.status).toBe(400);
    });

    it("Admin user deletes a vehicle type that does not exist", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/vehicle-types/999").set(headers);

      expect(response.status).toBe(404);
    });

    it("Admin user deletes a vehicle type with an invalid vehicleTypeId", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/vehicle-types/abc").set(headers);

      expect(response.status).toBe(400);
    });
  });

  describe("US-4.5: Signed-in admin user access only", () => {
    it("Unauthenticated API request to vehicle types", async () => {
      const response = await request(app).get("/api/vehicle-types");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to a particular vehicle type", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app).get(`/api/vehicle-types/${created.body.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to create a vehicle type", async () => {
      const response = await request(app).post("/api/vehicle-types").send({ name: "Bus", identifier: "VIN" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to update a vehicle type", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .send({ name: "Golf Cart" });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to delete a vehicle type", async () => {
      const headers = await signIn();
      const created = await createType(headers);

      const response = await request(app).delete(`/api/vehicle-types/${created.body.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Signed-in user without admin role API request to vehicle types", async () => {
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await request(app).get("/api/vehicle-types").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin role required." });
    });

    it("Signed-in user without admin role API request to a particular vehicle type", async () => {
      const admin = await signIn();
      const created = await createType(admin);
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await request(app).get(`/api/vehicle-types/${created.body.id}`).set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin role required." });
    });

    it("Signed-in user without admin role API request to create a vehicle type", async () => {
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await createType(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin role required." });
    });

    it("Signed-in user without admin role API request to update a vehicle type", async () => {
      const admin = await signIn();
      const created = await createType(admin);
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await request(app)
        .put(`/api/vehicle-types/${created.body.id}`)
        .set(headers)
        .send({ name: "Golf Cart" });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin role required." });
    });

    it("Signed-in user without admin role API request to delete a vehicle type", async () => {
      const admin = await signIn();
      const created = await createType(admin);
      const headers = await signIn(["maintenance"], { email: "maint@eagles.oc.edu" });

      const response = await request(app).delete(`/api/vehicle-types/${created.body.id}`).set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin role required." });
    });
  });
});

describe("Feature 5 — vehicle types with vehicles", () => {
  it("Signed-in user API request to delete a vehicle type that has a vehicle", async () => {
    const headers = await signIn();
    const created = await createType(headers);
    const area = await db.area.create({ name: "Athletics", logo: "" });
    await db.vehicle.create({
      areaId: area.id,
      vehicleTypeId: created.body.id,
      universityId: "ABCD12345EFG",
      make: "Toyota",
      model: "Sienna",
      year: 2015,
      identifier: "1HGCM82633A004352",
      purchasedAt: "2018-01-01",
      color: "gray",
      passengerCapacity: 8,
      status: "active",
    });

    const response = await request(app).delete(`/api/vehicle-types/${created.body.id}`).set(headers);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Vehicle type has vehicles. Delete vehicles or reassign them to a different vehicle type first.",
    });
    expect(await db.vehicleType.count({ where: { id: created.body.id } })).toBe(1);
  });
});
