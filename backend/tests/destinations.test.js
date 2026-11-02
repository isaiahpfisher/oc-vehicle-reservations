/**
 * Feature 6 — Destinations
 * Spec: features/feature-6-destinations.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles, createArea } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const tooLong = "a".repeat(256);

const signIn = async (roles = ["admin"], overrides = {}) => {
  const { body } = await createUserWithRoles(roles, overrides);
  return bearer(body.token);
};

const signInAreaAdmin = async () => {
  const area = await createArea("Athletics");
  return signIn([{ role: "area_admin", areaId: area.id }], { email: "area@oc.edu" });
};

const validDestination = (overrides = {}) => ({
  name: "Pops",
  address_line_1: "660 OK-66",
  address_line_2: null,
  city: "Arcadia",
  state: "OK",
  zip_code: "73007",
  is_saved: true,
  miles_from_campus: 22,
  ...overrides,
});

const createDestination = (headers, overrides = {}) =>
  request(app).post("/api/destinations").set(headers).send(validDestination(overrides));

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 6 — Destinations", () => {
  describe("US-6.1 — Create destinations", () => {
    it("Admin user saves an official destination", async () => {
      const headers = await signIn();
      const response = await createDestination(headers);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: "Pops",
        address_line_1: "660 OK-66",
        city: "Arcadia",
        state: "OK",
        zip_code: "73007",
        is_saved: true,
        miles_from_campus: 22,
      });
      expect(response.body).not.toHaveProperty("area_id");
      expect(response.body.createdAt).toEqual(expect.any(String));
    });

    it("Area admin user saves an official destination", async () => {
      const headers = await signInAreaAdmin();
      const response = await createDestination(headers);

      expect(response.status).toBe(201);
      expect(response.body.is_saved).toBe(true);
    });

    it("Admin user saves a destination with empty optional fields", async () => {
      const headers = await signIn();
      const response = await createDestination(headers, {
        address_line_2: "",
        zip_code: "",
        miles_from_campus: "",
      });

      expect(response.status).toBe(201);
      expect(response.body.address_line_2).toBeNull();
      expect(response.body.zip_code).toBeNull();
      expect(response.body.miles_from_campus).toBeNull();
    });

    it("Admin user requests to create a destination with empty optional fields", async () => {
      const headers = await signIn();
      const response = await createDestination(headers, {
        address_line_2: null,
        zip_code: null,
        miles_from_campus: null,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        address_line_2: null,
        zip_code: null,
        miles_from_campus: null,
      });
    });

    it("Admin user requests to create a destination with whitespace-only optional fields", async () => {
      const headers = await signIn();
      const response = await createDestination(headers, { address_line_2: " ", zip_code: " " });

      expect(response.status).toBe(201);
      expect(response.body.address_line_2).toBeNull();
      expect(response.body.zip_code).toBeNull();
    });

    it("Admin user requests to create a destination with a name that is trimmed", async () => {
      const headers = await signIn();
      const response = await createDestination(headers, { name: " Pops " });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Pops");
    });

    it("Admin user creates a destination with a name that already exists", async () => {
      const headers = await signIn();
      await createDestination(headers);

      const response = await createDestination(headers, { address_line_1: "100 Main St" });

      expect(response.status).toBe(201);
      expect(await db.destination.count()).toBe(2);
    });

    it.each([
      ["Admin user requests to create a destination with a missing name", "name", "", "Missing name."],
      ["Admin user requests to create a destination with a missing address line 1", "address_line_1", "", "Missing address line 1."],
      ["Admin user requests to create a destination with a missing city", "city", "", "Missing city."],
      ["Admin user requests to create a destination with a missing state", "state", "", "Missing state."],
      ["Admin user requests to create a destination with a whitespace-only name", "name", " ", "Missing name."],
      ["Admin user requests to create a destination with a whitespace-only address line 1", "address_line_1", " ", "Missing address line 1."],
      ["Admin user requests to create a destination with a whitespace-only city", "city", " ", "Missing city."],
      ["Admin user requests to create a destination with a whitespace-only state", "state", " ", "Missing state."],
    ])("%s", async (_title, field, value, message) => {
      const headers = await signIn();
      const response = await createDestination(headers, { [field]: value });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message });
    });

    it.each([
      ["Admin user requests to create a destination with a name longer than 255 characters", "name", "Name too long."],
      [
        "Admin user requests to create a destination with an address line 1 longer than 255 characters",
        "address_line_1",
        "Address line 1 too long.",
      ],
      [
        "Admin user requests to create a destination with an address line 2 longer than 255 characters",
        "address_line_2",
        "Address line 2 too long.",
      ],
      ["Admin user requests to create a destination with a city longer than 255 characters", "city", "City too long."],
      ["Admin user requests to create a destination with a state longer than 255 characters", "state", "State too long."],
      [
        "Admin user requests to create a destination with a ZIP code longer than 255 characters",
        "zip_code",
        "ZIP code too long.",
      ],
    ])("%s", async (_title, field, message) => {
      const headers = await signIn();
      const response = await createDestination(headers, { [field]: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message });
    });

    it("Admin user requests to create a destination with a missing is_saved", async () => {
      const headers = await signIn();
      const body = validDestination();
      delete body.is_saved;

      const response = await request(app).post("/api/destinations").set(headers).send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing is_saved." });
    });

    it("Admin user requests to create a destination with an is_saved other than true or false", async () => {
      const headers = await signIn();
      const response = await createDestination(headers, { is_saved: "yes" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "is_saved must be true or false." });
    });

    it("Admin user requests to create a destination with miles from campus less than 0", async () => {
      const headers = await signIn();
      const response = await createDestination(headers, { miles_from_campus: -1 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Miles from campus must be a whole number of 0 or more." });
    });

    it("Admin user requests to create a destination with a non-integer miles from campus", async () => {
      const headers = await signIn();
      const response = await createDestination(headers, { miles_from_campus: 12.5 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Miles from campus must be a whole number of 0 or more." });
    });
  });

  describe("US-6.2 — View destinations", () => {
    it("Admin user requests the destination list", async () => {
      const headers = await signIn();
      await createDestination(headers);
      await createDestination(headers, { name: "Lake" });

      const response = await request(app).get("/api/destinations").set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it("Area admin user requests the destination list", async () => {
      const admin = await signIn();
      await createDestination(admin, { name: "Campus" });
      const headers = await signInAreaAdmin();

      const response = await request(app).get("/api/destinations").set(headers);

      expect(response.status).toBe(200);
      expect(response.body.map((row) => row.name)).toContain("Campus");
    });

    it("Admin user requests one destination", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);

      const response = await request(app).get(`/api/destinations/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.body.id);
    });
  });

  describe("US-6.4 — Edit and delete destinations", () => {
    it("Admin user edits a destination name", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);

      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ name: "Arcadia Lake" }));

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Arcadia Lake");
    });

    it("Admin user makes an unofficial destination official", async () => {
      const headers = await signIn();
      const created = await createDestination(headers, { is_saved: false });

      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ is_saved: true }));

      expect(response.status).toBe(200);
      expect(response.body.is_saved).toBe(true);
    });

    it("Area admin user makes an unofficial destination official", async () => {
      const admin = await signIn();
      const created = await createDestination(admin, { is_saved: false });
      const headers = await signInAreaAdmin();

      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ is_saved: true }));

      expect(response.status).toBe(200);
      expect(response.body.is_saved).toBe(true);
    });

    it("Admin user turns Official off", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);

      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ is_saved: false }));

      expect(response.status).toBe(200);
      expect(response.body.is_saved).toBe(false);
    });

    it.each([
      ["Admin user requests to edit a destination to have a missing name", "name", "", "Missing name."],
      [
        "Admin user requests to edit a destination to have a missing address line 1",
        "address_line_1",
        "",
        "Missing address line 1.",
      ],
      ["Admin user requests to edit a destination to have a missing city", "city", "", "Missing city."],
      ["Admin user requests to edit a destination to have a missing state", "state", "", "Missing state."],
      ["Admin user requests to edit a destination to have a whitespace-only name", "name", " ", "Missing name."],
      ["Admin user requests to edit a destination to have a name longer than 255 characters", "name", tooLong, "Name too long."],
      [
        "Admin user requests to edit a destination to have an address line 1 longer than 255 characters",
        "address_line_1",
        tooLong,
        "Address line 1 too long.",
      ],
      [
        "Admin user requests to edit a destination to have an address line 2 longer than 255 characters",
        "address_line_2",
        tooLong,
        "Address line 2 too long.",
      ],
      ["Admin user requests to edit a destination to have a city longer than 255 characters", "city", tooLong, "City too long."],
      [
        "Admin user requests to edit a destination to have a state longer than 255 characters",
        "state",
        tooLong,
        "State too long.",
      ],
      [
        "Admin user requests to edit a destination to have a ZIP code longer than 255 characters",
        "zip_code",
        tooLong,
        "ZIP code too long.",
      ],
    ])("%s", async (_title, field, value, message) => {
      const headers = await signIn();
      const created = await createDestination(headers);

      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ [field]: value }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message });
    });

    it("Admin user requests to edit a destination to have a missing is_saved", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);
      const body = validDestination();
      delete body.is_saved;

      const response = await request(app).put(`/api/destinations/${created.body.id}`).set(headers).send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing is_saved." });
    });

    it("Admin user requests to edit a destination to have an is_saved other than true or false", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);

      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ is_saved: "yes" }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "is_saved must be true or false." });
    });

    it("Admin user requests to edit a destination to have miles from campus less than 0", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);

      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ miles_from_campus: -1 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Miles from campus must be a whole number of 0 or more." });
    });

    it("Admin user requests to edit a destination to have a non-integer miles from campus", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);

      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ miles_from_campus: 12.5 }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Miles from campus must be a whole number of 0 or more." });
    });

    it("Admin user deletes a destination", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);

      const response = await request(app).delete(`/api/destinations/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(await db.destination.count()).toBe(0);
    });

    it("Area admin user deletes a destination", async () => {
      const admin = await signIn();
      const created = await createDestination(admin);
      const headers = await signInAreaAdmin();

      const response = await request(app).delete(`/api/destinations/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(await db.destination.count()).toBe(0);
    });

    it("Admin user updates a destination that does not exist", async () => {
      const headers = await signIn();
      const response = await request(app).put("/api/destinations/999").set(headers).send(validDestination());

      expect(response.status).toBe(404);
    });

    it("Admin user updates a destination with an invalid destinationId", async () => {
      const headers = await signIn();
      const response = await request(app).put("/api/destinations/abc").set(headers).send(validDestination());

      expect(response.status).toBe(400);
    });

    it("Admin user deletes a destination that does not exist", async () => {
      const headers = await signIn();
      const response = await request(app).delete("/api/destinations/999").set(headers);

      expect(response.status).toBe(404);
    });

    it("Admin user deletes a destination with an invalid destinationId", async () => {
      const headers = await signIn();
      const response = await request(app).delete("/api/destinations/abc").set(headers);

      expect(response.status).toBe(400);
    });

    it("Admin user requests a destination that does not exist", async () => {
      const headers = await signIn();
      const response = await request(app).get("/api/destinations/999").set(headers);

      expect(response.status).toBe(404);
    });
  });

  describe("US-6.5 — Signed-in admin or area admin access only", () => {
    const forbidden = { message: "Admin or area admin role required." };
    const unauthorized = { message: "Unauthorized! No token provided." };

    it("Unauthenticated API request to destinations", async () => {
      const response = await request(app).get("/api/destinations");
      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to a particular destination", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);
      const response = await request(app).get(`/api/destinations/${created.body.id}`);
      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to create a destination", async () => {
      const response = await request(app).post("/api/destinations").send(validDestination());
      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to update a destination", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);
      const response = await request(app).put(`/api/destinations/${created.body.id}`).send(validDestination());
      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Unauthenticated API request to delete a destination", async () => {
      const headers = await signIn();
      const created = await createDestination(headers);
      const response = await request(app).delete(`/api/destinations/${created.body.id}`);
      expect(response.status).toBe(401);
      expect(response.body).toEqual(unauthorized);
    });

    it("Signed-in user without admin or area admin role API request to destinations", async () => {
      const headers = await signIn(["maintenance"], { email: "maint@oc.edu" });
      const response = await request(app).get("/api/destinations").set(headers);
      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin role API request to a particular destination", async () => {
      const admin = await signIn();
      const created = await createDestination(admin);
      const headers = await signIn(["maintenance"], { email: "maint@oc.edu" });
      const response = await request(app).get(`/api/destinations/${created.body.id}`).set(headers);
      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin role API request to create a destination", async () => {
      const headers = await signIn(["maintenance"], { email: "maint@oc.edu" });
      const response = await createDestination(headers);
      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin role API request to update a destination", async () => {
      const admin = await signIn();
      const created = await createDestination(admin);
      const headers = await signIn(["maintenance"], { email: "maint@oc.edu" });
      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination());
      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Signed-in user without admin or area admin role API request to delete a destination", async () => {
      const admin = await signIn();
      const created = await createDestination(admin);
      const headers = await signIn(["maintenance"], { email: "maint@oc.edu" });
      const response = await request(app).delete(`/api/destinations/${created.body.id}`).set(headers);
      expect(response.status).toBe(403);
      expect(response.body).toEqual(forbidden);
    });

    it("Area admin user requests one destination", async () => {
      const admin = await signIn();
      const created = await createDestination(admin);
      const headers = await signInAreaAdmin();
      const response = await request(app).get(`/api/destinations/${created.body.id}`).set(headers);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Pops");
    });

    it("Area admin user updates any destination", async () => {
      const admin = await signIn();
      const created = await createDestination(admin);
      const headers = await signInAreaAdmin();
      const response = await request(app)
        .put(`/api/destinations/${created.body.id}`)
        .set(headers)
        .send(validDestination({ name: "Updated" }));
      expect(response.status).toBe(200);
    });

    it("Area admin user deletes any destination", async () => {
      const admin = await signIn();
      const created = await createDestination(admin);
      const headers = await signInAreaAdmin();
      const response = await request(app).delete(`/api/destinations/${created.body.id}`).set(headers);
      expect(response.status).toBe(200);
    });
  });
});
