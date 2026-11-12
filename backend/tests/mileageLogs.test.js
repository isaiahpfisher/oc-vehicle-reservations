/**
 * Feature 9 — Mileage Log
 * Spec: features/feature-9-mileage-log.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles, registerUser } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const unauthorized = { message: "Unauthorized." };
const forbidden = { message: "Forbidden." };

const validBody = (overrides = {}) => ({
  vehicleId: 3,
  odometerReading: 12050,
  recordedAt: "2026-10-23",
  ...overrides,
});

const signIn = async (roles = ["admin"], overrides = {}) => {
  const { body } = await createUserWithRoles(roles, overrides);
  return { headers: bearer(body.token), user: body };
};

const seedFleet = async () => {
  const athletics = await db.area.create({ name: "Athletics", logo: "" });
  const music = await db.area.create({ name: "Music", logo: "" });
  const type = await db.vehicleType.create({ name: "Car", identifier: "VIN" });
  const base = {
    vehicleTypeId: type.id,
    make: "Toyota",
    model: "Sienna",
    year: 2015,
    purchasedAt: "2018-01-01",
    color: "gray",
    passengerCapacity: 8,
    status: "active",
  };

  await db.vehicle.create({ ...base, areaId: athletics.id, universityId: "V-001", identifier: "ID-1" });
  await db.vehicle.create({ ...base, areaId: athletics.id, universityId: "V-002", identifier: "ID-2" });
  const vehicle3 = await db.vehicle.create({
    ...base,
    areaId: athletics.id,
    universityId: "V-100",
    identifier: "ID-3",
  });
  const vehicle4 = await db.vehicle.create({
    ...base,
    areaId: music.id,
    universityId: "V-200",
    identifier: "ID-4",
  });

  return { athletics, music, vehicle3, vehicle4 };
};

const createLog = (overrides = {}) =>
  db.mileageLog.create({
    vehicleId: 3,
    userId: 1,
    odometerReading: 12050,
    recordedAt: "2026-10-23",
    ...overrides,
  });

beforeEach(async () => {
  await syncTestDatabase();
});

describe("Feature 9 — Mileage Log", () => {
  describe("US-9.1 — Create mileage logs", () => {
    it("Admin saves mileage log", async () => {
      await seedFleet();
      const { headers, user } = await signIn(["admin"], {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      });

      const response = await request(app).post("/api/mileage-logs").set(headers).send(validBody());

      expect(response.status).toBe(201);
      expect(response.body.vehicleId).toBe(3);
      expect(response.body.odometerReading).toBe(12050);
      expect(response.body.recordedAt).toBe("2026-10-23");
      expect(response.body.userId).toBe(user.userId);
      expect(response.body.user).toEqual({ id: user.userId, firstName: "Jane", lastName: "Doe" });
      expect(response.body.vehicle).toEqual({ id: 3, universityId: "V-100" });
    });

    it("Maintenance user saves mileage log", async () => {
      // Feature 13: maintenance records mileage for a vehicle without editing the vehicle.
      await seedFleet();
      const { headers, user } = await signIn(["maintenance"], {
        firstName: "Mo",
        lastName: "Maint",
        email: "maint@example.com",
      });

      const response = await request(app).post("/api/mileage-logs").set(headers).send(validBody());

      expect(response.status).toBe(201);
      expect(response.body.vehicleId).toBe(3);
      expect(response.body.userId).toBe(user.userId);
    });

    it("Area admin saves mileage log for a vehicle in their area", async () => {
      const { athletics } = await seedFleet();
      const { headers } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });

      const response = await request(app).post("/api/mileage-logs").set(headers).send(validBody());

      expect(response.status).toBe(201);
      expect(response.body.vehicleId).toBe(3);
    });

    it("Admin saves mileage log with an odometer reading of zero", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send(validBody({ odometerReading: 0 }));

      expect(response.status).toBe(201);
      expect(response.body.odometerReading).toBe(0);
    });

    it("Admin requests to create a mileage log with a missing vehicle", async () => {
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send({ odometerReading: 12050, recordedAt: "2026-10-23" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing vehicle." });
    });

    it("Admin requests to create a mileage log with a missing odometer reading", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send({ vehicleId: 3, recordedAt: "2026-10-23" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing odometer reading." });
    });

    it("Admin requests to create a mileage log with a missing recorded date", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send({ vehicleId: 3, odometerReading: 12050 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing recorded date." });
    });

    it("Admin requests to create a mileage log with a non-whole-number odometer reading", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send(validBody({ odometerReading: 12050.5 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Odometer reading must be a whole number." });
    });

    it("Admin requests to create a mileage log with a negative odometer reading", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send(validBody({ odometerReading: -1 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Odometer reading must be zero or greater." });
    });

    it("Admin requests to create a mileage log with an invalid recorded date", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send(validBody({ recordedAt: "not-a-date" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid recorded date." });
    });

    it("Admin requests to create a mileage log for a vehicle that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send(validBody({ vehicleId: 999 }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle not found." });
    });

    it("Admin requests to create a mileage log with a different userId", async () => {
      await registerUser({ email: "first@example.com", firstName: "First", lastName: "User" });
      await seedFleet();
      const { headers, user } = await signIn(["admin"], {
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(user.userId).toBe(2);

      const response = await request(app)
        .post("/api/mileage-logs")
        .set(headers)
        .send(validBody({ userId: 8 }));

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(2);
    });
  });

  describe("US-9.2 — View mileage logs", () => {
    it("Area admin views mileage logs for a vehicle in their area", async () => {
      const { athletics } = await seedFleet();
      const { headers, user } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });
      await createLog({ userId: user.userId, odometerReading: 12050 });
      await createLog({ vehicleId: 4, userId: user.userId, odometerReading: 800 });

      const response = await request(app).get("/api/mileage-logs").query({ vehicleId: 3 }).set(headers);

      expect(response.status).toBe(200);
      expect(response.body.map((log) => log.odometerReading)).toEqual([12050]);
    });
  });

  describe("US-9.4 — Edit and delete mileage logs", () => {
    it("Admin edits a mileage log odometer reading", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ odometerReading: 12100 }));

      expect(response.status).toBe(200);
      expect(response.body.odometerReading).toBe(12100);
      expect(response.body.vehicleId).toBe(3);
    });

    it("Admin edits a mileage log recorded date", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ recordedAt: "2026-10-24" }));

      expect(response.status).toBe(200);
      expect(response.body.recordedAt).toBe("2026-10-24");
    });

    it("Admin requests to edit a mileage log to have a missing vehicle", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ vehicleId: null }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing vehicle." });
    });

    it("Admin requests to edit a mileage log to have a missing odometer reading", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send({ vehicleId: 3, recordedAt: "2026-10-23" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing odometer reading." });
    });

    it("Admin requests to edit a mileage log to have a missing recorded date", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send({ vehicleId: 3, odometerReading: 12050 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing recorded date." });
    });

    it("Admin requests to edit a mileage log to have a non-whole-number odometer reading", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ odometerReading: 12050.5 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Odometer reading must be a whole number." });
    });

    it("Admin requests to edit a mileage log to have a negative odometer reading", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ odometerReading: -1 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Odometer reading must be zero or greater." });
    });

    it("Admin requests to edit a mileage log to have an invalid recorded date", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ recordedAt: "not-a-date" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid recorded date." });
    });

    it("Admin requests to edit a mileage log to a different vehicle", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ vehicleId: 4 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Vehicle cannot be changed." });
    });

    it("Admin requests to edit a mileage log to a vehicle that does not exist", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ vehicleId: 999 }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle not found." });
    });

    it("Admin requests to edit a mileage log with a different userId", async () => {
      await registerUser({ email: "first@example.com", firstName: "First", lastName: "User" });
      const adder = await registerUser({ email: "jane@example.com", firstName: "Jane", lastName: "Doe" });
      await seedFleet();
      const { headers } = await signIn(["admin"], { email: "admin@example.com", firstName: "Ann", lastName: "Admin" });
      await createLog({ userId: adder.body.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ userId: 8, odometerReading: 12100 }));

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(2);
      expect(adder.body.userId).toBe(2);
    });

    it("Admin deletes a mileage log", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createLog({ userId: user.userId });

      const response = await request(app).delete("/api/mileage-logs/1").set(headers);

      expect(response.status).toBe(200);
      expect(await db.mileageLog.findByPk(1)).toBeNull();
    });

    it("Area admin edits a mileage log in their area", async () => {
      const { athletics } = await seedFleet();
      const { headers, user } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });
      await createLog({ userId: user.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ odometerReading: 12100 }));

      expect(response.status).toBe(200);
      expect(response.body.odometerReading).toBe(12100);
    });

    it("Admin updates a mileage log that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app).put("/api/mileage-logs/999").set(headers).send(validBody());

      expect(response.status).toBe(404);
    });

    it("Admin updates a mileage log with an invalid mileageLogId", async () => {
      const { headers } = await signIn();

      const response = await request(app).put("/api/mileage-logs/abc").set(headers).send(validBody());

      expect(response.status).toBe(400);
    });

    it("Admin deletes a mileage log that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app).delete("/api/mileage-logs/999").set(headers);

      expect(response.status).toBe(404);
    });

    it("Admin deletes a mileage log with an invalid mileageLogId", async () => {
      const { headers } = await signIn();

      const response = await request(app).delete("/api/mileage-logs/abc").set(headers);

      expect(response.status).toBe(400);
    });
  });

  describe("US-9.5 — Session and role access", () => {
    it("Unauthenticated API request to mileage logs for a vehicle", async () => {
      const response = await request(app).get("/api/mileage-logs").query({ vehicleId: 3 });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to a particular mileage log", async () => {
      const response = await request(app).get("/api/mileage-logs/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to create a mileage log", async () => {
      const response = await request(app).post("/api/mileage-logs").send(validBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to update a mileage log", async () => {
      const response = await request(app).put("/api/mileage-logs/1").send(validBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to delete a mileage log", async () => {
      const response = await request(app).delete("/api/mileage-logs/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Regular user requests mileage logs for a vehicle", async () => {
      await seedFleet();
      const { body } = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "User" });

      const response = await request(app)
        .get("/api/mileage-logs")
        .query({ vehicleId: 3 })
        .set(bearer(body.token));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Regular user creates a mileage log", async () => {
      await seedFleet();
      const { body } = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "User" });

      const response = await request(app).post("/api/mileage-logs").set(bearer(body.token)).send(validBody());

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Regular user updates a mileage log", async () => {
      await seedFleet();
      const { body } = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "User" });
      await createLog({ userId: body.userId });

      const response = await request(app).put("/api/mileage-logs/1").set(bearer(body.token)).send(validBody());

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Regular user deletes a mileage log", async () => {
      await seedFleet();
      const { body } = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "User" });
      await createLog({ userId: body.userId });

      const response = await request(app).delete("/api/mileage-logs/1").set(bearer(body.token));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Area admin requests mileage logs for a vehicle outside their area", async () => {
      const { athletics } = await seedFleet();
      const { headers } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });

      const response = await request(app).get("/api/mileage-logs").query({ vehicleId: 4 }).set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Area admin updates a mileage log outside their area", async () => {
      const { athletics } = await seedFleet();
      const owner = await registerUser({ email: "owner@example.com", firstName: "Owen", lastName: "Owner" });
      const { headers } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });
      await createLog({ vehicleId: 4, userId: owner.body.userId });

      const response = await request(app)
        .put("/api/mileage-logs/1")
        .set(headers)
        .send(validBody({ vehicleId: 4, odometerReading: 12100 }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });
  });
});
