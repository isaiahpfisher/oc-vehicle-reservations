/**
 * Feature 7 — Course Listing
 * Spec: features/feature-7-course-listing.md
 *
 * Implemented route is GET /api/course-listings/:semesterId (frontend uses this).
 * Spec writes GET /api/course-listing/:semesterId.
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, createUserWithRole } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const validCourse = (overrides = {}) => ({
  name: "Programming I",
  number: "CMSC-1200",
  description: "Magna tempor ipsum reprehenderit nostrud laboris eu non Lorem.",
  semesters: ["Fall"],
  frequency: "Yearly",
  hours: 3,
  department: "Computer Science",
  ...overrides,
});

const validSection = (catalog, overrides = {}) => ({
  sectionNumber: "CMSC-1200-01",
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
let otherStudentToken;
let catalog;

const createSection = (overrides = {}) =>
  request(app).post("/api/sections").set(bearer(adminToken)).send(validSection(catalog, overrides));

const enroll = (sectionId, token = studentToken) =>
  request(app).post("/api/enrollments").set(bearer(token)).send({ sectionId });

const listCourseListings = (semesterId, token = studentToken) =>
  request(app).get(`/api/course-listings/${semesterId}`).set(bearer(token));

const seedCatalog = async () => {
  const intro = await request(app).post("/api/courses").set(bearer(adminToken)).send(validCourse());
  const software = await request(app)
    .post("/api/courses")
    .set(bearer(adminToken))
    .send(validCourse({ name: "Software Engineering I", number: "CMSC-1234" }));
  const faculty = await request(app)
    .post("/api/faculty")
    .set(bearer(adminToken))
    .send({ firstName: "David", lastName: "North", department: "Computer Science" });
  const fall = await db.semester.create({
    name: "Fall 2026",
    startDate: "2026-08-24",
    endDate: "2026-12-11",
  });

  return {
    introCourseId: intro.body.id,
    softwareCourseId: software.body.id,
    facultyFacultyId: faculty.body.facultyId,
    semesterId: fall.id,
    courseId: intro.body.id,
  };
};

beforeEach(async () => {
  await syncTestDatabase();
  adminToken = (await createUserWithRole("admin", { email: "admin@example.com", firstName: "Ada" })).body.token;
  studentToken = (await registerUser({ email: "student@example.com", firstName: "Sam" })).body.token;
  otherStudentToken = (await registerUser({ email: "other@example.com", firstName: "Riley" })).body.token;
  catalog = await seedCatalog();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 7 — Course Listing", () => {
  describe("US-7.4 — Private courses only", () => {
    it("Course listing API only lists one student's enrollments", async () => {
      const mine = await createSection({
        sectionNumber: "CMSC-1200-01",
        courseId: catalog.introCourseId,
      });
      const theirs = await createSection({
        sectionNumber: "CMSC-1234-01",
        courseId: catalog.softwareCourseId,
      });
      await enroll(mine.body.id);
      await enroll(theirs.body.id, otherStudentToken);

      const response = await listCourseListings(catalog.semesterId);

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).toContain("CMSC-1200");
      expect(JSON.stringify(response.body)).not.toContain("CMSC-1234");
    });

    it("Unauthenticated API request to course listing", async () => {
      const response = await request(app).get(`/api/course-listings/${catalog.semesterId}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("User with admin role cannot fetch courses", async () => {
      const response = await listCourseListings(catalog.semesterId, adminToken);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Student role required." });
    });

    it("Unknown semesterId", async () => {
      const response = await listCourseListings(999);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Semester with id=999 not found." });
    });

    it("Bad semesterId", async () => {
      const response = await listCourseListings("abc");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Semester id is invalid." });
    });
  });
});
