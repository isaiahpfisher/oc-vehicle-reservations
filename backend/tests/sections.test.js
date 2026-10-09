/**
 * Feature 5 — Section Management
 * Spec: features/feature-5-section-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, createUserWithRole } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const validCourse = (overrides = {}) => ({
  name: "Programming II",
  number: "COMP-2100",
  description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
  semesters: ["Fall"],
  frequency: "Yearly",
  hours: 3,
  department: "Computer Science",
  ...overrides,
});

const validSection = (catalog, overrides = {}) => ({
  sectionNumber: "COMP-2100-01",
  semesterId: catalog.semesterId,
  courseId: catalog.courseId,
  facultyFacultyId: catalog.facultyFacultyId,
  daysOfWeek: "M,W,F",
  startTime: "14:30:00",
  endTime: "15:30:00",
  ...overrides,
});

let adminToken;
let studentToken;
let catalog;

const createSection = (overrides = {}, token = adminToken) =>
  request(app).post("/api/sections").set(bearer(token)).send(validSection(catalog, overrides));

const seedCatalog = async () => {
  const course = await request(app).post("/api/courses").set(bearer(adminToken)).send(validCourse());
  const faculty = await request(app)
    .post("/api/faculty")
    .set(bearer(adminToken))
    .send({ firstName: "David", lastName: "North", department: "Computer Science" });
  const semester = await db.semester.create({
    name: "Fall 2026",
    startDate: "2026-08-24",
    endDate: "2026-12-11",
  });

  return {
    courseId: course.body.id,
    facultyFacultyId: faculty.body.facultyId,
    semesterId: semester.id,
  };
};

beforeEach(async () => {
  await syncTestDatabase();
  adminToken = (await createUserWithRole("admin", { email: "admin@example.com", firstName: "Ada" })).body.token;
  studentToken = (await registerUser({ email: "student@example.com", firstName: "Sam" })).body.token;
  catalog = await seedCatalog();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 5 — Section Management API", () => {
  describe("US-5.1 — Create sections", () => {
    it("Admin saves section", async () => {
      await createSection({ sectionNumber: "MATH-1100-01" });

      const response = await createSection({
        sectionNumber: "  COMP-2100-01  ",
        daysOfWeek: " M,W,F ",
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        sectionNumber: "COMP-2100-01",
        semesterId: catalog.semesterId,
        courseId: catalog.courseId,
        facultyFacultyId: catalog.facultyFacultyId,
        daysOfWeek: "M,W,F",
        startTime: "14:30:00",
        endTime: "15:30:00",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const list = await request(app).get("/api/sections").set(bearer(adminToken));
      expect(list.body.map((section) => section.sectionNumber)).toEqual(["COMP-2100-01", "MATH-1100-01"]);
    });

    it("User creates section with missing fields", async () => {
      const missing = validSection(catalog);
      delete missing.semesterId;

      const response = await request(app).post("/api/sections").set(bearer(adminToken)).send(missing);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: expect.any(String) });
      expect(response.body.message).toMatch(/semester/i);
      expect(await db.section.count()).toBe(0);

      const whitespace = await createSection({ sectionNumber: "   " });
      expect(whitespace.status).toBe(400);
      expect(await db.section.count()).toBe(0);
    });

    it("User creates a section with invalid fields", async () => {
      const badNumber = await createSection({ sectionNumber: "CS210432" });
      expect(badNumber.status).toBe(400);
      expect(badNumber.body.message).toMatch(/XXXX-####-##/);

      const badDays = await createSection({ daysOfWeek: "Mon,Wed" });
      expect(badDays.status).toBe(400);

      const longNumber = await createSection({ sectionNumber: `COMP-2100-01${"a".repeat(256)}` });
      expect(longNumber.status).toBe(400);

      expect(await db.section.count()).toBe(0);
    });
  });

  describe("US-5.2 — View sections", () => {
    it("Sections view lists sections", async () => {
      await createSection({ sectionNumber: "MATH-1100-01" });
      await createSection({ sectionNumber: "COMP-2100-01" });

      const response = await request(app).get("/api/sections").set(bearer(studentToken));

      expect(response.status).toBe(200);
      expect(response.body.map((section) => section.sectionNumber)).toEqual(["COMP-2100-01", "MATH-1100-01"]);

      const single = await request(app).get(`/api/sections/${response.body[0].id}`).set(bearer(adminToken));
      expect(single.status).toBe(200);
      expect(single.body).toMatchObject({ sectionNumber: "COMP-2100-01" });

      const missing = await request(app).get("/api/sections/9999").set(bearer(adminToken));
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: expect.any(String) });
    });
  });

  describe("US-5.4 — Edit and delete sections", () => {
    it("Admin edits a section", async () => {
      const { body: created } = await createSection({ sectionNumber: "CSMC-3012-01" });

      const response = await request(app)
        .put(`/api/sections/${created.id}`)
        .set(bearer(adminToken))
        .send(validSection(catalog, { sectionNumber: "CSMC-3012-02" }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.id,
        sectionNumber: "CSMC-3012-02",
      });

      const stored = await db.section.findByPk(created.id);
      expect(stored.sectionNumber).toBe("CSMC-3012-02");
    });

    it("Admin deletes a section", async () => {
      const { body: created } = await createSection({ sectionNumber: "CSMC-3012-01" });

      const response = await request(app).delete(`/api/sections/${created.id}`).set(bearer(adminToken));

      expect([200, 204]).toContain(response.status);
      expect(await db.section.findByPk(created.id)).toBeNull();

      const list = await request(app).get("/api/sections").set(bearer(adminToken));
      expect(list.body).toEqual([]);
    });

    it("Non-admin attempts to edit or delete a section via API", async () => {
      const { body: created } = await createSection({ sectionNumber: "CSMC-3012-01" });

      const update = await request(app)
        .put(`/api/sections/${created.id}`)
        .set(bearer(studentToken))
        .send(validSection(catalog, { sectionNumber: "CSMC-3012-02" }));
      expect([401, 404]).toContain(update.status);

      const remove = await request(app).delete(`/api/sections/${created.id}`).set(bearer(studentToken));
      expect([401, 404]).toContain(remove.status);

      const stored = await db.section.findByPk(created.id);
      expect(stored.sectionNumber).toBe("CSMC-3012-01");
    });

    it("Unauthenticated API request to sections", async () => {
      const response = await request(app).get("/api/sections");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });
});
