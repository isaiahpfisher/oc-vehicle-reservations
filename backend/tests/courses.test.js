/**
 * Feature 3 — Course Management
 * Spec: features/feature-3-course-management.md
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

let adminToken;
let studentToken;

const createCourse = (overrides = {}, token = adminToken) =>
  request(app).post("/api/courses").set(bearer(token)).send(validCourse(overrides));

beforeEach(async () => {
  await syncTestDatabase();
  adminToken = (await createUserWithRole("admin", { email: "admin@example.com", firstName: "Ada" })).body.token;
  studentToken = (await registerUser({ email: "student@example.com", firstName: "Sam" })).body.token;
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 3 — Course Management API", () => {
  describe("US-3.1 — Create courses", () => {
    it("Admin user creates a new course", async () => {
      await createCourse({ name: "Calculus I", number: "MATH-1100" });

      const response = await createCourse({ name: "  Programming II  ", number: " COMP-2100 " });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: "Programming II",
        number: "COMP-2100",
        description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
        semesters: ["Fall"],
        frequency: "Yearly",
        hours: 3,
        department: "Computer Science",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const list = await request(app).get("/api/courses").set(bearer(adminToken));
      expect(list.body.map((course) => course.number)).toEqual(["COMP-2100", "MATH-1100"]);
    });

    it("User creates a course with an empty required field", async () => {
      for (const field of ["name", "number", "description", "frequency", "hours"]) {
        const missing = validCourse();
        delete missing[field];

        const response = await request(app).post("/api/courses").set(bearer(adminToken)).send(missing);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: expect.any(String) });
      }

      const whitespace = await createCourse({ name: "   " });
      expect(whitespace.status).toBe(400);

      expect(await db.course.count()).toBe(0);
    });

    it("User creates a course with invalid formatted fields", async () => {
      const badNumber = await createCourse({ number: "CS210" });
      expect(badNumber.status).toBe(400);
      expect(badNumber.body.message).toMatch(/XXXX-####/);

      const longName = await createCourse({ name: "a".repeat(256) });
      expect(longName.status).toBe(400);

      const badFrequency = await createCourse({ frequency: "Every Other Tuesday" });
      expect(badFrequency.status).toBe(400);

      const fractionalHours = await createCourse({ hours: 2.5 });
      expect(fractionalHours.status).toBe(400);

      expect(await db.course.count()).toBe(0);
    });
  });

  describe("US-3.2 — View courses", () => {
    it("Courses view loads with existing courses", async () => {
      await createCourse({ name: "Calculus I", number: "MATH-1100" });
      await createCourse({ name: "Programming II", number: "COMP-2100" });
      await createCourse({ name: "Composition", number: "ENGL-1010", department: "English" });

      const response = await request(app).get("/api/courses").set(bearer(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.map((course) => course.number)).toEqual(["COMP-2100", "ENGL-1010", "MATH-1100"]);

      const single = await request(app).get(`/api/courses/${response.body[1].id}`).set(bearer(adminToken));
      expect(single.status).toBe(200);
      expect(single.body).toMatchObject({ number: "ENGL-1010", name: "Composition" });

      const missing = await request(app).get("/api/courses/9999").set(bearer(adminToken));
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: expect.any(String) });
    });

    it("Non-admin user views courses", async () => {
      await createCourse();

      const list = await request(app).get("/api/courses").set(bearer(studentToken));
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({ number: "COMP-2100" });

      const create = await createCourse({ number: "COMP-3100" }, studentToken);
      expect(create.status).not.toBe(201);
      expect(await db.course.count()).toBe(1);
    });
  });

  describe("US-3.5 — Edit and delete courses", () => {
    it("Admin edits a course", async () => {
      const { body: created } = await createCourse({ name: "Programming I", number: "COMP-1100" });

      const response = await request(app)
        .put(`/api/courses/${created.id}`)
        .set(bearer(adminToken))
        .send(validCourse({ name: "Programming I", number: "COMP-1100", semesters: ["Winter"] }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.id,
        name: "Programming I",
        number: "COMP-1100",
        semesters: ["Winter"],
      });

      const stored = await db.course.findByPk(created.id);
      expect(stored.semesters).toEqual(["Winter"]);
    });

    it("Admin deletes a course", async () => {
      const { body: created } = await createCourse();

      const response = await request(app).delete(`/api/courses/${created.id}`).set(bearer(adminToken));

      expect([200, 204]).toContain(response.status);
      expect(await db.course.findByPk(created.id)).toBeNull();

      const list = await request(app).get("/api/courses").set(bearer(adminToken));
      expect(list.body).toEqual([]);
    });

    it("Non-admin attempts to edit or delete a course via API", async () => {
      const { body: created } = await createCourse();

      const update = await request(app)
        .put(`/api/courses/${created.id}`)
        .set(bearer(studentToken))
        .send(validCourse({ name: "Hijacked" }));
      expect([401, 404]).toContain(update.status);

      const remove = await request(app).delete(`/api/courses/${created.id}`).set(bearer(studentToken));
      expect([401, 404]).toContain(remove.status);

      const stored = await db.course.findByPk(created.id);
      expect(stored.name).toBe("Programming II");
    });

    it("Unauthenticated API request to courses", async () => {
      const response = await request(app).get("/api/courses");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });
});
