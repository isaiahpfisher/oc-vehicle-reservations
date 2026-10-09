/**
 * Feature 8 — Section Student Listing
 * Spec: features/feature-8-section-student-listing.md
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
let catalog;

const createSection = (overrides = {}) =>
  request(app).post("/api/sections").set(bearer(adminToken)).send(validSection(catalog, overrides));

const getSection = (sectionId, token = adminToken) =>
  request(app).get(`/api/sections/${sectionId}`).set(bearer(token));

/** Register a student and enroll them in the section through the API. */
const enrollStudent = async (sectionId, overrides) => {
  const student = await registerUser(overrides);
  const response = await request(app)
    .post("/api/enrollments")
    .set(bearer(student.body.token))
    .send({ sectionId });
  expect(response.status).toBe(201);
  return student.body;
};

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
  catalog = await seedCatalog();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 8 — Section Student Listing API", () => {
  describe("US-8.1 — See Students in Sections", () => {
    it("Admin Student Sections list loads", async () => {
      const section = await createSection();
      const other = await createSection({ sectionNumber: "COMP-2100-02" });
      await enrollStudent(section.body.id, { firstName: "Sam", lastName: "Stone", email: "sam@example.com" });
      await enrollStudent(section.body.id, { firstName: "Riley", lastName: "Reed", email: "riley@example.com" });
      await enrollStudent(other.body.id, { firstName: "Olive", lastName: "Other", email: "olive@example.com" });

      const response = await getSection(section.body.id);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: section.body.id,
        sectionNumber: "COMP-2100-01",
        faculty: { firstName: "David", lastName: "North" },
      });

      const students = response.body.enrollments.map(({ user }) => ({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }));
      expect(students).toHaveLength(2);
      expect(students).toEqual(
        expect.arrayContaining([
          { firstName: "Sam", lastName: "Stone", email: "sam@example.com" },
          { firstName: "Riley", lastName: "Reed", email: "riley@example.com" },
        ]),
      );
      for (const { user } of response.body.enrollments) {
        expect(user).not.toHaveProperty("password");
      }

      // FR-001: section endpoints require a valid session.
      const noToken = await request(app).get(`/api/sections/${section.body.id}`);
      expect(noToken.status).toBe(401);
      expect(noToken.body).toEqual({ message: "Unauthorized! No token provided." });

      const badToken = await getSection(section.body.id, "not-a-real-token");
      expect(badToken.status).toBe(401);
      expect(badToken.body).toEqual({ message: expect.any(String) });

      const missing = await getSection(999999);
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: expect.any(String) });
    });

    it("Admin Student Sections list empty", async () => {
      const section = await createSection();
      const other = await createSection({ sectionNumber: "COMP-2100-02" });
      await enrollStudent(other.body.id, { firstName: "Olive", lastName: "Other", email: "olive@example.com" });

      const response = await getSection(section.body.id);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: section.body.id, sectionNumber: "COMP-2100-01" });
      expect(response.body.enrollments).toEqual([]);
    });
  });
});
