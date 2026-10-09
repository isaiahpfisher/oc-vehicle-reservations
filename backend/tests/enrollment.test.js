/**
 * Feature 6 — Enrollment Management
 * Spec: features/feature-6-enrollment-management.md
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
let studentId;
let catalog;

const createSection = (overrides = {}, token = adminToken) =>
  request(app).post("/api/sections").set(bearer(token)).send(validSection(catalog, overrides));

const enroll = (sectionId, token = studentToken) =>
  request(app).post("/api/enrollments").set(bearer(token)).send({ sectionId });

const listEnrollments = (token = studentToken) =>
  request(app).get("/api/enrollments").set(bearer(token));

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

const createSemester = (name, startDate, endDate) =>
  db.semester.create({ name, startDate, endDate });

beforeEach(async () => {
  await syncTestDatabase();
  adminToken = (await createUserWithRole("admin", { email: "admin@example.com", firstName: "Ada" })).body.token;
  const student = await registerUser({ email: "student@example.com", firstName: "Sam" });
  studentToken = student.body.token;
  studentId = student.body.userId;
  catalog = await seedCatalog();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 6 — Enrollment Management", () => {
  describe("US-6.1 — Create Enrollment", () => {
    it("Student enrolls in section", async () => {
      const section = await createSection();

      const response = await enroll(section.body.id);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        studentId,
        sectionId: section.body.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const list = await listEnrollments();
      expect(list.status).toBe(200);
      expect(list.body).toEqual([
        expect.objectContaining({ studentId, sectionId: section.body.id }),
      ]);
    });

    it("user with no session tries to enroll", async () => {
      const section = await createSection();

      const response = await request(app).post("/api/enrollments").send({ sectionId: section.body.id });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });

  describe("US-6.2 — Delete Enrollment", () => {
    it("Student unenrolls in a section", async () => {
      const section = await createSection();
      await enroll(section.body.id);

      const response = await request(app)
        .delete(`/api/enrollments/${section.body.id}`)
        .set(bearer(studentToken));

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      const list = await listEnrollments();
      expect(list.status).toBe(200);
      expect(list.body).toEqual([]);
    });

    it("user with no session tries to unenroll", async () => {
      const section = await createSection();

      const response = await request(app).delete(`/api/enrollments/${section.body.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });

  describe("US-6.3 — One Enrollment per course per semester", () => {
    it("Student enrolls in a second section of the same course and semester", async () => {
      const first = await createSection({ sectionNumber: "COMP-2100-01" });
      const second = await createSection({ sectionNumber: "COMP-2100-02" });
      await enroll(first.body.id);

      const response = await enroll(second.body.id);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ studentId, sectionId: second.body.id });

      const list = await listEnrollments();
      expect(list.body.map((enrollment) => enrollment.sectionId)).toEqual([second.body.id]);
    });

    it("Student enrolls in the same course in a different semester", async () => {
      const spring = await createSemester("Spring 2027", "2027-01-11", "2027-05-07");
      const fallSection = await createSection({ sectionNumber: "COMP-2100-01" });
      const springSection = await createSection({
        sectionNumber: "COMP-2100-02",
        semesterId: spring.id,
      });
      await enroll(fallSection.body.id);

      const response = await enroll(springSection.body.id);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ studentId, sectionId: springSection.body.id });

      const list = await listEnrollments();
      expect(list.body.map((enrollment) => enrollment.sectionId).sort()).toEqual(
        [fallSection.body.id, springSection.body.id].sort(),
      );
    });
  });

  describe("US-6.4 — Admin users", () => {
    it("Admin tries to call API for enrollment", async () => {
      const section = await createSection();
      await enroll(section.body.id);

      const create = await enroll(section.body.id, adminToken);
      expect(create.status).toBe(404);
      expect(create.body).toEqual({ message: expect.any(String) });

      const remove = await request(app)
        .delete(`/api/enrollments/${section.body.id}`)
        .set(bearer(adminToken));
      expect(remove.status).toBe(404);
      expect(remove.body).toEqual({ message: expect.any(String) });

      const list = await listEnrollments();
      expect(list.body.map((enrollment) => enrollment.sectionId)).toEqual([section.body.id]);
    });
  });

  describe("US-6.5 — Section is removed", () => {
    it("Admin deletes a section", async () => {
      const spring = await createSemester("Spring 2027", "2027-01-11", "2027-05-07");
      const fallSection = await createSection({ sectionNumber: "COMP-2100-01" });
      const springSection = await createSection({
        sectionNumber: "COMP-2100-02",
        semesterId: spring.id,
      });
      await enroll(fallSection.body.id);
      await enroll(springSection.body.id);

      const response = await request(app)
        .delete(`/api/sections/${fallSection.body.id}`)
        .set(bearer(adminToken));

      expect([200, 204]).toContain(response.status);

      const list = await listEnrollments();
      expect(list.body.map((enrollment) => enrollment.sectionId)).toEqual([springSection.body.id]);
    });
  });
});
