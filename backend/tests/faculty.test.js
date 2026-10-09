/**
 * Feature 4 — Faculty Management
 * Spec: features/feature-4-faculty-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, createUserWithRole } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const tooLong = "a".repeat(256);
const facultyBody = (overrides = {}) => ({
  firstName: "David",
  lastName: "North",
  department: "Computer Science",
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

const createFaculty = (headers, overrides = {}) =>
  request(app).post("/api/faculty").set(headers).send(facultyBody(overrides));

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 4 — Faculty Management API", () => {
  describe("US-4.1 — Create faculty", () => {
    it("Admin user creates a new faculty", async () => {
      const headers = await asAdmin();

      const response = await createFaculty(headers);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        facultyId: expect.any(Number),
        firstName: "David",
        lastName: "North",
        department: "Computer Science",
      });
      expect(await db.faculty.count()).toBe(1);
    });

    it("Faculty first name is trimmed before save", async () => {
      const headers = await asAdmin();

      const response = await createFaculty(headers, { firstName: "  David  " });

      expect(response.status).toBe(201);
      expect(response.body.firstName).toBe("David");
      const stored = await db.faculty.findByPk(response.body.facultyId);
      expect(stored.firstName).toBe("David");
    });

    it("Faculty last name is trimmed before save", async () => {
      const headers = await asAdmin();

      const response = await createFaculty(headers, { lastName: "  North  " });

      expect(response.status).toBe(201);
      expect(response.body.lastName).toBe("North");
      const stored = await db.faculty.findByPk(response.body.facultyId);
      expect(stored.lastName).toBe("North");
    });

    it("Faculty department is trimmed before save", async () => {
      const headers = await asAdmin();

      const response = await createFaculty(headers, { department: "  Computer Science  " });

      expect(response.status).toBe(201);
      expect(response.body.department).toBe("Computer Science");
      const stored = await db.faculty.findByPk(response.body.facultyId);
      expect(stored.department).toBe("Computer Science");
    });

    it("Admin user creates a faculty with a first name that is too long", async () => {
      const headers = await asAdmin();

      const response = await createFaculty(headers, { firstName: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Faculty first name cannot be longer than 255 characters." });
      expect(await db.faculty.count()).toBe(0);
    });

    it("Admin user creates a faculty with a last name that is too long", async () => {
      const headers = await asAdmin();

      const response = await createFaculty(headers, { lastName: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Faculty last name cannot be longer than 255 characters." });
      expect(await db.faculty.count()).toBe(0);
    });

    it("Admin user creates a faculty with a department that is too long", async () => {
      const headers = await asAdmin();

      const response = await createFaculty(headers, { department: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Department must be one of Computer Science, Engineering, English, Business, Art.",
      });
      expect(await db.faculty.count()).toBe(0);
    });

    it("Admin user creates a faculty identical to an existing faculty", async () => {
      const headers = await asAdmin();
      await createFaculty(headers);

      const response = await createFaculty(headers);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        facultyId: expect.any(Number),
        firstName: "David",
        lastName: "North",
        department: "Computer Science",
      });
      expect(await db.faculty.count()).toBe(2);
    });
  });

  describe("US-4.2 — View faculty", () => {
    it("Faculty API returns faculty ordered by first name", async () => {
      const headers = await asAdmin();
      await createFaculty(headers, { firstName: "Glen", lastName: "Davis" });
      await createFaculty(headers, { firstName: "David", lastName: "North" });

      const response = await request(app).get("/api/faculty").set(headers);

      expect(response.status).toBe(200);
      expect(response.body.map((faculty) => `${faculty.firstName} ${faculty.lastName}`)).toEqual([
        "David North",
        "Glen Davis",
      ]);
    });
  });

  describe("US-4.4 — Update and delete faculty", () => {
    it("Admin user edits faculty first name", async () => {
      const headers = await asAdmin();
      const created = await createFaculty(headers);

      const response = await request(app)
        .put(`/api/faculty/${created.body.facultyId}`)
        .set(headers)
        .send(facultyBody({ firstName: "Bob" }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        facultyId: created.body.facultyId,
        firstName: "Bob",
        lastName: "North",
        department: "Computer Science",
      });
      const stored = await db.faculty.findByPk(created.body.facultyId);
      expect(stored.firstName).toBe("Bob");
    });

    it("Admin user edits faculty last name", async () => {
      const headers = await asAdmin();
      const created = await createFaculty(headers);

      const response = await request(app)
        .put(`/api/faculty/${created.body.facultyId}`)
        .set(headers)
        .send(facultyBody({ lastName: "South" }));

      expect(response.status).toBe(200);
      expect(response.body.lastName).toBe("South");
      const stored = await db.faculty.findByPk(created.body.facultyId);
      expect(stored.lastName).toBe("South");
    });

    it("Admin user edits faculty department", async () => {
      const headers = await asAdmin();
      const created = await createFaculty(headers);

      const response = await request(app)
        .put(`/api/faculty/${created.body.facultyId}`)
        .set(headers)
        .send(facultyBody({ department: "Engineering" }));

      expect(response.status).toBe(200);
      expect(response.body.department).toBe("Engineering");
      const stored = await db.faculty.findByPk(created.body.facultyId);
      expect(stored.department).toBe("Engineering");
    });

    it("Admin user updates a faculty to have a first name that is too long", async () => {
      const headers = await asAdmin();
      const created = await createFaculty(headers);

      const response = await request(app)
        .put(`/api/faculty/${created.body.facultyId}`)
        .set(headers)
        .send(facultyBody({ firstName: tooLong }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Faculty first name cannot be longer than 255 characters." });
      const stored = await db.faculty.findByPk(created.body.facultyId);
      expect(stored.firstName).toBe("David");
    });

    it("Admin user updates a faculty to have a last name that is too long", async () => {
      const headers = await asAdmin();
      const created = await createFaculty(headers);

      const response = await request(app)
        .put(`/api/faculty/${created.body.facultyId}`)
        .set(headers)
        .send(facultyBody({ lastName: tooLong }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Faculty last name cannot be longer than 255 characters." });
      const stored = await db.faculty.findByPk(created.body.facultyId);
      expect(stored.lastName).toBe("North");
    });

    it("Admin user updates a faculty to have a department that is too long", async () => {
      const headers = await asAdmin();
      const created = await createFaculty(headers);

      const response = await request(app)
        .put(`/api/faculty/${created.body.facultyId}`)
        .set(headers)
        .send(facultyBody({ department: tooLong }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Department must be one of Computer Science, Engineering, English, Business, Art.",
      });
      const stored = await db.faculty.findByPk(created.body.facultyId);
      expect(stored.department).toBe("Computer Science");
    });

    it("Admin user deletes a faculty", async () => {
      const headers = await asAdmin();
      const created = await createFaculty(headers);

      const response = await request(app).delete(`/api/faculty/${created.body.facultyId}`).set(headers);

      expect([200, 204]).toContain(response.status);
      expect(await db.faculty.count()).toBe(0);
    });

    it("Admin user updates a faculty that does not exist", async () => {
      const headers = await asAdmin();

      const response = await request(app).put("/api/faculty/999").set(headers).send(facultyBody());

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Faculty with id=999 not found." });
    });

    it("Admin user updates faculty with an invalid facultyId", async () => {
      const headers = await asAdmin();

      const response = await request(app).put("/api/faculty/abc").set(headers).send(facultyBody());

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid faculty id." });
    });

    it("Admin user deletes a faculty that does not exist", async () => {
      const headers = await asAdmin();

      const response = await request(app).delete("/api/faculty/999").set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Faculty with id=999 not found." });
    });

    it("Admin user deletes faculty with an invalid facultyId", async () => {
      const headers = await asAdmin();

      const response = await request(app).delete("/api/faculty/abc").set(headers);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid faculty id." });
    });
  });

  describe("US-4.5 — Admin-only faculty", () => {
    it("User with student role cannot see faculty", async () => {
      const admin = await asAdmin();
      await createFaculty(admin);
      const student = await asStudent();

      const response = await request(app).get("/api/faculty").set(student);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Admin role required." });
      expect(JSON.stringify(response.body)).not.toContain("David");
    });

    it("User with student role cannot create faculty", async () => {
      const student = await asStudent();

      const response = await createFaculty(student);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Admin role required." });
      expect(await db.faculty.count()).toBe(0);
    });

    it("User with student role cannot update faculty", async () => {
      const admin = await asAdmin();
      const created = await createFaculty(admin);
      const student = await asStudent();

      const response = await request(app)
        .put(`/api/faculty/${created.body.facultyId}`)
        .set(student)
        .send(facultyBody({ firstName: "Bob" }));

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Admin role required." });
      const stored = await db.faculty.findByPk(created.body.facultyId);
      expect(stored.firstName).toBe("David");
    });

    it("User with student role cannot delete faculty", async () => {
      const admin = await asAdmin();
      const created = await createFaculty(admin);
      const student = await asStudent();

      const response = await request(app).delete(`/api/faculty/${created.body.facultyId}`).set(student);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Admin role required." });
      expect(await db.faculty.count()).toBe(1);
    });

    it("Unauthenticated API request to faculty", async () => {
      const response = await request(app).get("/api/faculty");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });
});
