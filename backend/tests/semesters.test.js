/**
 * Feature 2 — Semester Management
 * Spec: features/feature-2-semester-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, createUserWithRole } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const tooLong = "a".repeat(256);
const semesterBody = (overrides = {}) => ({
  name: "Fall 2026",
  startDate: "2026-08-24",
  endDate: "2026-12-18",
  ...overrides,
});

const asAdmin = async () => {
  const { body } = await createUserWithRole("admin", { email: "admin@example.com", firstName: "Ada" });
  return bearer(body.token);
};

const asStudent = async () => {
  const { body } = await registerUser();
  return bearer(body.token);
};

const createSemester = (headers, overrides = {}) =>
  request(app).post("/api/semesters").set(headers).send(semesterBody(overrides));

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 2 — Semester Management", () => {
  describe("US-2.1 — Create semesters", () => {
    it("Admin saves semester", async () => {
      const headers = await asAdmin();

      const response = await createSemester(headers);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: "Fall 2026",
        startDate: "2026-08-24",
        endDate: "2026-12-18",
      });
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));
      expect(await db.semester.count()).toBe(1);
    });

    it("Semester name is trimmed before save", async () => {
      const headers = await asAdmin();

      const response = await createSemester(headers, { name: "  Fall 2026  " });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Fall 2026");
      const stored = await db.semester.findByPk(response.body.id);
      expect(stored.name).toBe("Fall 2026");
    });

    it("User creates semester with missing fields", async () => {
      const headers = await asAdmin();

      const response = await createSemester(headers, { name: "   " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Required" });
      expect(await db.semester.count()).toBe(0);
    });

    it("Admin creates a semester with a name that is too long", async () => {
      const headers = await asAdmin();

      const response = await createSemester(headers, { name: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Semester name cannot be longer than 255 characters.",
      });
      expect(await db.semester.count()).toBe(0);
    });

    it("Admin creates a semester with a missing date", async () => {
      const headers = await asAdmin();

      const response = await createSemester(headers, { endDate: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Required" });
      expect(await db.semester.count()).toBe(0);
    });

    it("User creates a semester with an end date before the start date", async () => {
      const headers = await asAdmin();

      const response = await createSemester(headers, {
        startDate: "2026-12-18",
        endDate: "2026-08-24",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "End date must be on or after the start date." });
      expect(await db.semester.count()).toBe(0);
    });
  });

  describe("US-2.2 — View semesters", () => {
    it("Semesters API returns semesters ordered by start date", async () => {
      const headers = await asAdmin();
      await createSemester(headers, {
        name: "Spring 2027",
        startDate: "2027-01-11",
        endDate: "2027-05-07",
      });
      await createSemester(headers);

      const response = await request(app).get("/api/semesters").set(headers);

      expect(response.status).toBe(200);
      expect(response.body.map((semester) => semester.name)).toEqual(["Fall 2026", "Spring 2027"]);
    });

    it("Signed-in student can list semesters", async () => {
      const admin = await asAdmin();
      await createSemester(admin);
      const student = await asStudent();

      const response = await request(app).get("/api/semesters").set(student);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Fall 2026");
    });
  });

  describe("US-2.4 — Edit and delete semesters", () => {
    it("Admin edits a semester", async () => {
      const headers = await asAdmin();
      const created = await createSemester(headers);

      const response = await request(app)
        .put(`/api/semesters/${created.body.id}`)
        .set(headers)
        .send(semesterBody({ name: "Fall 2026 Term" }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        name: "Fall 2026 Term",
        startDate: "2026-08-24",
        endDate: "2026-12-18",
      });
      const stored = await db.semester.findByPk(created.body.id);
      expect(stored.name).toBe("Fall 2026 Term");
    });

    it("Admin deletes a semester", async () => {
      const headers = await asAdmin();
      const created = await createSemester(headers);

      const response = await request(app).delete(`/api/semesters/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(await db.semester.count()).toBe(0);
    });

    it("Admin updates a semester that does not exist", async () => {
      const headers = await asAdmin();

      const response = await request(app).put("/api/semesters/999").set(headers).send(semesterBody());

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Semester with id=999 not found." });
    });

    it("Admin deletes a semester that does not exist", async () => {
      const headers = await asAdmin();

      const response = await request(app).delete("/api/semesters/999").set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Semester with id=999 not found." });
    });

    it("Non-admin attempts to edit or delete a semester via API", async () => {
      const admin = await asAdmin();
      const created = await createSemester(admin);
      const student = await asStudent();

      const updateResponse = await request(app)
        .put(`/api/semesters/${created.body.id}`)
        .set(student)
        .send(semesterBody({ name: "Fall 2026 Term" }));
      const deleteResponse = await request(app).delete(`/api/semesters/${created.body.id}`).set(student);

      expect(updateResponse.status).toBe(401);
      expect(deleteResponse.status).toBe(401);
      const stored = await db.semester.findByPk(created.body.id);
      expect(stored.name).toBe("Fall 2026");
    });

    it("Unauthenticated API request to semesters", async () => {
      const response = await request(app).get("/api/semesters");

      expect(response.status).toBe(401);
      expect(response.body.message).toEqual(expect.any(String));
    });
  });
});
