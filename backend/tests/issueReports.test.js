/**
 * Feature 10 — Issue Report
 * Spec: features/feature-10-issue-report.md
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
  type: "low_gas",
  description: "Tank is on empty.",
  status: "pending",
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
  await db.vehicle.create({ ...base, areaId: athletics.id, universityId: "V-100", identifier: "ID-3" });
  await db.vehicle.create({ ...base, areaId: music.id, universityId: "V-200", identifier: "ID-4" });

  return { athletics, music };
};

const createReport = (overrides = {}) =>
  db.issueReport.create({
    vehicleId: 3,
    authorId: 1,
    type: "low_gas",
    description: "Tank is on empty.",
    status: "pending",
    ...overrides,
  });

beforeEach(async () => {
  await syncTestDatabase();
});

describe("Feature 10 — Issue Report", () => {
  describe("US-10.1 — Create issue reports", () => {
    it("User saves issue report", async () => {
      await seedFleet();
      const { headers, user } = await signIn(["admin"], {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      });

      const response = await request(app).post("/api/issue-reports").set(headers).send(validBody());

      expect(response.status).toBe(201);
      expect(response.body.authorId).toBe(user.userId);
      expect(response.body.vehicleRequestId).toBeNull();
      expect(response.body.assigneeId).toBeNull();
      expect(response.body.resolvedAt).toBeNull();
      expect(response.body.vehicle).toEqual({ id: 3, universityId: "V-100" });
      expect(response.body.author).toEqual({ id: user.userId, firstName: "Jane", lastName: "Doe" });
    });

    it("User saves issue report with a vehicle request and assignee", async () => {
      const { athletics } = await seedFleet();
      for (let index = 1; index <= 4; index += 1) {
        await registerUser({ email: `pad${index}@example.com`, firstName: "Pad", lastName: String(index) });
      }
      const alex = await registerUser({ email: "alex@example.com", firstName: "Alex", lastName: "Kim" });
      const requestDetails = {
        userId: alex.body.userId,
        areaId: athletics.id,
        startAt: new Date("2030-12-18T00:00:00.000Z"),
        endAt: new Date("2030-12-21T00:00:00.000Z"),
        numberOfPeople: 1,
      };
      for (let index = 0; index < 11; index += 1) {
        await db.vehicleRequest.create({ ...requestDetails, purpose: `Filler ${index}` });
      }
      const campusVisit = await db.vehicleRequest.create({ ...requestDetails, purpose: "Campus visit" });
      const { headers } = await signIn(["admin"], { email: "jane@example.com", firstName: "Jane", lastName: "Doe" });

      expect(campusVisit.id).toBe(12);
      expect(alex.body.userId).toBe(5);

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send(validBody({ vehicleRequestId: 12, assigneeId: 5, type: "dirty", description: "Interior needs cleaning." }));

      expect(response.status).toBe(201);
      expect(response.body.vehicleRequestId).toBe(12);
      expect(response.body.assigneeId).toBe(5);
      expect(response.body.vehicleRequest).toEqual({ id: 12, purpose: "Campus visit" });
      expect(response.body.assignee).toEqual({ id: 5, firstName: "Alex", lastName: "Kim" });
    });

    it("User saves a resolved issue report", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send(validBody({ type: "other", description: "Spare key is missing.", status: "resolved", resolvedAt: "2026-10-23" }));

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("resolved");
      expect(response.body.resolvedAt).toBe("2026-10-23");
    });

    it("User requests to create an issue report with a missing vehicle", async () => {
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send({ type: "low_gas", description: "Tank is on empty.", status: "pending" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing vehicle." });
    });

    it("User requests to create an issue report with a missing type", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send({ vehicleId: 3, description: "Tank is on empty.", status: "pending" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing type." });
    });

    it("User requests to create an issue report with an invalid type", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app).post("/api/issue-reports").set(headers).send(validBody({ type: "broken" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid type." });
    });

    it("User requests to create an issue report with a missing description", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app).post("/api/issue-reports").set(headers).send(validBody({ description: " " }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing description." });
    });

    it("User requests to create an issue report with a missing status", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send({ vehicleId: 3, type: "low_gas", description: "Tank is on empty." });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing status." });
    });

    it("User requests to create an issue report with an invalid status", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app).post("/api/issue-reports").set(headers).send(validBody({ status: "open" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid status." });
    });

    it("User requests to create a resolved issue report with a missing resolved date", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send(validBody({ type: "other", description: "Spare key is missing.", status: "resolved" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing resolved date." });
    });

    it("User requests to create a resolved issue report with an invalid resolved date", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send(validBody({ type: "other", description: "Spare key is missing.", status: "resolved", resolvedAt: "not-a-date" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid resolved date." });
    });

    it("User requests to create a pending issue report with a resolved date", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send(validBody({ resolvedAt: "2026-10-23" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Resolved date must be empty." });
    });

    it("User requests to create an issue report for a vehicle that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app).post("/api/issue-reports").set(headers).send(validBody({ vehicleId: 999 }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle not found." });
    });

    it("User requests to create an issue report for a vehicle request that does not exist", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app)
        .post("/api/issue-reports")
        .set(headers)
        .send(validBody({ vehicleRequestId: 999 }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle request not found." });
    });

    it("User requests to create an issue report with an assignee that does not exist", async () => {
      await seedFleet();
      const { headers } = await signIn();

      const response = await request(app).post("/api/issue-reports").set(headers).send(validBody({ assigneeId: 999 }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Assignee not found." });
    });

    it("User requests to create an issue report with a different authorId", async () => {
      await registerUser({ email: "first@example.com", firstName: "First", lastName: "User" });
      await seedFleet();
      const { headers, user } = await signIn(["admin"], { email: "jane@example.com", firstName: "Jane", lastName: "Doe" });

      expect(user.userId).toBe(2);

      const response = await request(app).post("/api/issue-reports").set(headers).send(validBody({ authorId: 8 }));

      expect(response.status).toBe(201);
      expect(response.body.authorId).toBe(2);
    });
  });

  describe("US-10.2 — View all issue reports", () => {
    it("Admin requests issue reports from a specific user", async () => {
      await registerUser({ email: "first@example.com", firstName: "First", lastName: "User" });
      const jane = await registerUser({ email: "jane@example.com", firstName: "Jane", lastName: "Doe" });
      const other = await registerUser({ email: "other@example.com", firstName: "Other", lastName: "User" });
      await seedFleet();
      const { headers } = await signIn(["admin"], { email: "admin@example.com", firstName: "Ann", lastName: "Admin" });
      await createReport({ authorId: jane.body.userId, vehicleId: 3 });
      await createReport({ authorId: other.body.userId, vehicleId: 4, description: "Music issue." });

      expect(jane.body.userId).toBe(2);

      const response = await request(app).get("/api/issue-reports").query({ userId: 2 }).set(headers);

      expect(response.status).toBe(200);
      expect(response.body.map((report) => report.vehicle.universityId)).toEqual(["V-100"]);
    });

    it("Admin requests issue reports for a specific vehicle", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId, vehicleId: 3 });
      await createReport({ authorId: user.userId, vehicleId: 4, description: "Music issue." });

      const response = await request(app).get("/api/issue-reports").query({ vehicleId: 3 }).set(headers);

      expect(response.status).toBe(200);
      expect(response.body.every((report) => report.vehicleId === 3)).toBe(true);
      expect(response.body.map((report) => report.vehicle.universityId)).not.toContain("V-200");
    });

    it("Admin requests issue reports for a user that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app).get("/api/issue-reports").query({ userId: 999 }).set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "User not found." });
    });

    it("Admin requests issue reports for a vehicle that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app).get("/api/issue-reports").query({ vehicleId: 999 }).set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle not found." });
    });
  });

  describe("US-10.3 — View area issue reports", () => {
    it("Area admin requests issue reports from a specific user", async () => {
      await registerUser({ email: "first@example.com", firstName: "First", lastName: "User" });
      const jane = await registerUser({ email: "jane@example.com", firstName: "Jane", lastName: "Doe" });
      const { athletics } = await seedFleet();
      const { headers } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });
      await createReport({ authorId: jane.body.userId, vehicleId: 3 });
      await createReport({ authorId: jane.body.userId, vehicleId: 4, description: "Music issue." });

      const response = await request(app).get("/api/issue-reports").query({ userId: 2 }).set(headers);

      expect(response.status).toBe(200);
      expect(response.body.map((report) => report.vehicle.universityId)).toEqual(["V-100"]);
    });

    it("Area admin requests issue reports for a vehicle in their area", async () => {
      const { athletics } = await seedFleet();
      const { headers, user } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });
      await createReport({ authorId: user.userId, vehicleId: 3 });

      const response = await request(app).get("/api/issue-reports").query({ vehicleId: 3 }).set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("Area admin requests issue reports for a vehicle outside their area", async () => {
      const { athletics } = await seedFleet();
      const { headers } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });

      const response = await request(app).get("/api/issue-reports").query({ vehicleId: 4 }).set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });
  });

  describe("US-10.5 — Edit and delete issue reports", () => {
    it("Admin edits an issue report description", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app)
        .put("/api/issue-reports/1")
        .set(headers)
        .send(validBody({ description: "Tank is below a quarter." }));

      expect(response.status).toBe(200);
      expect(response.body.description).toBe("Tank is below a quarter.");
    });

    it("Admin edits an issue report type", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app).put("/api/issue-reports/1").set(headers).send(validBody({ type: "maintenance" }));

      expect(response.status).toBe(200);
      expect(response.body.type).toBe("maintenance");
    });

    it("Admin edits an issue report to resolved", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app)
        .put("/api/issue-reports/1")
        .set(headers)
        .send(validBody({ status: "resolved", resolvedAt: "2026-10-24" }));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("resolved");
      expect(response.body.resolvedAt).toBe("2026-10-24");
    });

    it("Admin clears an issue report assignee", async () => {
      await seedFleet();
      const alex = await registerUser({ email: "alex@example.com", firstName: "Alex", lastName: "Kim" });
      const { headers, user } = await signIn(["admin"], { email: "admin@example.com", firstName: "Ann", lastName: "Admin" });
      await createReport({ authorId: user.userId, assigneeId: alex.body.userId });

      const response = await request(app).put("/api/issue-reports/1").set(headers).send(validBody({ assigneeId: null }));

      expect(response.status).toBe(200);
      expect(response.body.assigneeId).toBeNull();
    });

    it("Admin requests to edit an issue report to have a missing description", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app).put("/api/issue-reports/1").set(headers).send(validBody({ description: " " }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing description." });
    });

    it("Admin requests to edit an issue report to have an invalid type", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app).put("/api/issue-reports/1").set(headers).send(validBody({ type: "broken" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid type." });
    });

    it("Admin requests to edit an issue report to resolved without a resolved date", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app)
        .put("/api/issue-reports/1")
        .set(headers)
        .send(validBody({ type: "other", description: "Spare key is missing.", status: "resolved" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing resolved date." });
    });

    it("Admin requests to edit an issue report to pending with a resolved date", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app)
        .put("/api/issue-reports/1")
        .set(headers)
        .send(validBody({ resolvedAt: "2026-10-23" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Resolved date must be empty." });
    });

    it("Admin requests to edit an issue report to a vehicle that does not exist", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app).put("/api/issue-reports/1").set(headers).send(validBody({ vehicleId: 999 }));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle not found." });
    });

    it("Admin requests to edit an issue report with a different authorId", async () => {
      await registerUser({ email: "first@example.com", firstName: "First", lastName: "User" });
      const jane = await registerUser({ email: "jane@example.com", firstName: "Jane", lastName: "Doe" });
      await seedFleet();
      const { headers } = await signIn(["admin"], { email: "admin@example.com", firstName: "Ann", lastName: "Admin" });
      await createReport({ authorId: jane.body.userId });

      const response = await request(app).put("/api/issue-reports/1").set(headers).send(validBody({ authorId: 8 }));

      expect(response.status).toBe(200);
      expect(response.body.authorId).toBe(2);
    });

    it("Admin deletes an issue report", async () => {
      await seedFleet();
      const { headers, user } = await signIn();
      await createReport({ authorId: user.userId });

      const response = await request(app).delete("/api/issue-reports/1").set(headers);

      expect(response.status).toBe(200);
      expect(await db.issueReport.findByPk(1)).toBeNull();
    });

    it("Admin updates an issue report that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app).put("/api/issue-reports/999").set(headers).send(validBody());

      expect(response.status).toBe(404);
    });

    it("Admin updates an issue report with an invalid issueReportId", async () => {
      const { headers } = await signIn();

      const response = await request(app).put("/api/issue-reports/abc").set(headers).send(validBody());

      expect(response.status).toBe(400);
    });

    it("Admin deletes an issue report that does not exist", async () => {
      const { headers } = await signIn();

      const response = await request(app).delete("/api/issue-reports/999").set(headers);

      expect(response.status).toBe(404);
    });

    it("Admin deletes an issue report with an invalid issueReportId", async () => {
      const { headers } = await signIn();

      const response = await request(app).delete("/api/issue-reports/abc").set(headers);

      expect(response.status).toBe(400);
    });

    it("Area admin edits an issue report in their area", async () => {
      const { athletics } = await seedFleet();
      const { headers, user } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });
      await createReport({ authorId: user.userId });

      const response = await request(app)
        .put("/api/issue-reports/1")
        .set(headers)
        .send(validBody({ description: "Tank is below a quarter." }));

      expect(response.status).toBe(200);
      expect(response.body.description).toBe("Tank is below a quarter.");
    });

    it("Area admin updates an issue report outside their area", async () => {
      const { athletics } = await seedFleet();
      const owner = await registerUser({ email: "owner@example.com", firstName: "Owen", lastName: "Owner" });
      const { headers } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });
      await createReport({ authorId: owner.body.userId, vehicleId: 4 });

      const response = await request(app).put("/api/issue-reports/1").set(headers).send(validBody({ vehicleId: 4 }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Area admin deletes an issue report outside their area", async () => {
      const { athletics } = await seedFleet();
      const owner = await registerUser({ email: "owner@example.com", firstName: "Owen", lastName: "Owner" });
      const { headers } = await signIn([{ role: "area_admin", areaId: athletics.id }], {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Area",
      });
      await createReport({ authorId: owner.body.userId, vehicleId: 4 });

      const response = await request(app).delete("/api/issue-reports/1").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin updates an issue report", async () => {
      await seedFleet();
      const { body } = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "User" });
      await createReport({ authorId: body.userId });

      const response = await request(app).put("/api/issue-reports/1").set(bearer(body.token)).send(validBody());

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin deletes an issue report", async () => {
      await seedFleet();
      const { body } = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "User" });
      await createReport({ authorId: body.userId });

      const response = await request(app).delete("/api/issue-reports/1").set(bearer(body.token));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });
  });

  describe("US-10.6 — Session and role access", () => {
    it("Unauthenticated API request to issue reports", async () => {
      const response = await request(app).get("/api/issue-reports");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to a particular issue report", async () => {
      const response = await request(app).get("/api/issue-reports/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to create an issue report", async () => {
      const response = await request(app).post("/api/issue-reports").send(validBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to update an issue report", async () => {
      const response = await request(app).put("/api/issue-reports/1").send(validBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to delete an issue report", async () => {
      const response = await request(app).delete("/api/issue-reports/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Signed-in user without admin or area admin requests all issue reports", async () => {
      const { body } = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "User" });

      const response = await request(app).get("/api/issue-reports").set(bearer(body.token));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user requests their own issue reports", async () => {
      await registerUser({ email: "first@example.com", firstName: "First", lastName: "User" });
      const jane = await registerUser({ email: "jane@example.com", firstName: "Jane", lastName: "Doe" });
      const other = await registerUser({ email: "other@example.com", firstName: "Other", lastName: "User" });
      await seedFleet();
      await createReport({ authorId: jane.body.userId, vehicleId: 3 });
      await createReport({ authorId: other.body.userId, vehicleId: 4, description: "Music issue." });

      const response = await request(app).get("/api/issue-reports").query({ userId: 2 }).set(bearer(jane.body.token));

      expect(response.status).toBe(200);
      expect(response.body.map((report) => report.vehicle.universityId)).toEqual(["V-100"]);
    });

    it("Signed-in user requests another user's issue reports", async () => {
      await registerUser({ email: "first@example.com", firstName: "First", lastName: "User" });
      const jane = await registerUser({ email: "jane@example.com", firstName: "Jane", lastName: "Doe" });

      expect(jane.body.userId).toBe(2);

      const response = await request(app).get("/api/issue-reports").query({ userId: 8 }).set(bearer(jane.body.token));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin requests issue reports for a vehicle", async () => {
      await seedFleet();
      const { body } = await registerUser({ email: "sam@example.com", firstName: "Sam", lastName: "User" });

      const response = await request(app).get("/api/issue-reports").query({ vehicleId: 3 }).set(bearer(body.token));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });
  });
});
