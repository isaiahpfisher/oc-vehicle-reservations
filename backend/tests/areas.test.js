/**
 * Feature 2 — Area Management
 * Spec: features/feature-2-area-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const tooLong = "a".repeat(256);
const areaBody = (overrides = {}) => ({
  name: "Athletics",
  logo: "https://example.com/logo.png",
  ...overrides,
});

const signIn = async () => {
  const { body } = await registerUser();
  return bearer(body.token);
};

const createArea = (headers, overrides = {}) =>
  request(app).post("/api/areas").set(headers).send(areaBody(overrides));

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 2 — Area Management", () => {
  describe("US-2.1 — Create areas", () => {
    it("User saves area", async () => {
      const headers = await signIn();

      const response = await createArea(headers);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: "Athletics",
        logo: "https://example.com/logo.png",
      });
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));

      const list = await request(app).get("/api/areas").set(headers);
      expect(list.status).toBe(200);
      expect(list.body.map((area) => area.name)).toContain("Athletics");
    });

    it("User creates area with missing logo", async () => {
      const headers = await signIn();

      const response = await request(app).post("/api/areas").set(headers).send({ name: "Athletics" });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: "Athletics", logo: "" });

      const list = await request(app).get("/api/areas").set(headers);
      expect(list.body.map((area) => area.name)).toContain("Athletics");
    });

    it("User requests to create an area with a missing name", async () => {
      const headers = await signIn();

      const response = await request(app).post("/api/areas").set(headers).send({ name: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
      expect(await db.area.count()).toBe(0);
    });

    it("User requests to create an area with a whitespace-only name", async () => {
      const headers = await signIn();

      const response = await request(app).post("/api/areas").set(headers).send({ name: " " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
      expect(await db.area.count()).toBe(0);
    });

    it("User requests to create an area with name longer than 255 characters", async () => {
      const headers = await signIn();

      const response = await createArea(headers, { name: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name too long." });
      expect(await db.area.count()).toBe(0);
    });

    it("User requests to create an area with a non-unique name", async () => {
      const headers = await signIn();
      const existing = await createArea(headers);
      expect(existing.body.id).toBe(1);

      const response = await request(app).post("/api/areas").set(headers).send({ name: "Athletics" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
      expect(await db.area.count()).toBe(1);
    });

    it("User requests to create an area with a bad logo URL", async () => {
      const headers = await signIn();

      const response = await request(app)
        .post("/api/areas")
        .set(headers)
        .send({ name: "Athletics", logo: "logo.png" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid logo URL." });
      expect(await db.area.count()).toBe(0);
    });
  });

  describe("US-2.4 — Edit and delete areas", () => {
    it("User edits an area name", async () => {
      const headers = await signIn();
      const created = await createArea(headers);

      const response = await request(app)
        .put(`/api/areas/${created.body.id}`)
        .set(headers)
        .send({ name: "Athletics A", logo: "https://example.com/logo.png" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Athletics A");

      const list = await request(app).get("/api/areas").set(headers);
      expect(list.body.map((area) => area.name)).toContain("Athletics A");
      expect(list.body.map((area) => area.name)).not.toContain("Athletics");
    });

    it("User edits an area logo", async () => {
      const headers = await signIn();
      const created = await createArea(headers);

      const response = await request(app)
        .put(`/api/areas/${created.body.id}`)
        .set(headers)
        .send({ name: "Athletics", logo: "https://example.com/logo2.png" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: "Athletics",
        logo: "https://example.com/logo2.png",
      });

      const list = await request(app).get("/api/areas").set(headers);
      expect(list.body.map((area) => area.name)).toContain("Athletics");
    });

    it("User edits an area to have a missing logo", async () => {
      const headers = await signIn();
      const created = await createArea(headers);

      const response = await request(app)
        .put(`/api/areas/${created.body.id}`)
        .set(headers)
        .send({ name: "Athletics", logo: "" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ name: "Athletics", logo: "" });

      const list = await request(app).get("/api/areas").set(headers);
      expect(list.body.map((area) => area.name)).toContain("Athletics");
    });

    it("User requests to edit an area to have a missing name", async () => {
      const headers = await signIn();
      await createArea(headers);

      const response = await request(app).put("/api/areas/1").set(headers).send({ name: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
    });

    it("User requests to edit an area to have a whitespace-only name", async () => {
      const headers = await signIn();
      await createArea(headers);

      const response = await request(app).put("/api/areas/1").set(headers).send({ name: " " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing name." });
    });

    it("User requests to edit an area to have a name longer than 255 characters", async () => {
      const headers = await signIn();
      await createArea(headers);

      const response = await request(app).put("/api/areas/1").set(headers).send({ name: tooLong });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name too long." });
    });

    it("User requests to update an area to have a non-unique name", async () => {
      const headers = await signIn();
      const first = await createArea(headers);
      const second = await createArea(headers, { name: "Support Central" });
      expect(first.body.id).toBe(1);
      expect(second.body.id).toBe(2);

      const response = await request(app).put("/api/areas/2").set(headers).send({ name: "Athletics" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Name already taken." });
    });

    it("User requests to update an area to have a bad logo URL", async () => {
      const headers = await signIn();
      await createArea(headers);

      const response = await request(app).put("/api/areas/1").set(headers).send({ logo: "logo.png" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid logo URL." });
    });

    it("User deletes an area", async () => {
      const headers = await signIn();
      const created = await createArea(headers);

      const response = await request(app).delete(`/api/areas/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);

      const list = await request(app).get("/api/areas").set(headers);
      expect(list.body.map((area) => area.name)).not.toContain("Athletics");
    });

    it("User updates an area that does not exist", async () => {
      const headers = await signIn();

      const response = await request(app).put("/api/areas/999").set(headers).send(areaBody());

      expect(response.status).toBe(404);
    });

    it("User updates an area with an invalid areaId", async () => {
      const headers = await signIn();

      const response = await request(app).put("/api/areas/abc").set(headers).send(areaBody());

      expect(response.status).toBe(400);
    });

    it("User deletes an area that does not exist", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/areas/999").set(headers);

      expect(response.status).toBe(404);
    });

    it("User deletes an area with an invalid areaId", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/areas/abc").set(headers);

      expect(response.status).toBe(400);
    });
  });

  describe("US-2.5: Signed-in user access only", () => {
    it("Unauthenticated API request to areas", async () => {
      const response = await request(app).get("/api/areas");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to a particular area", async () => {
      const headers = await signIn();
      await createArea(headers);

      const response = await request(app).get("/api/areas/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to create an area", async () => {
      const response = await request(app).post("/api/areas").send(areaBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to update an area", async () => {
      const headers = await signIn();
      await createArea(headers);

      const response = await request(app).put("/api/areas/1").send(areaBody({ name: "Athletics A" }));

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to delete an area", async () => {
      const headers = await signIn();
      await createArea(headers);

      const response = await request(app).delete("/api/areas/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });
  });
});
