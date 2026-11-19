/**
 * Feature 2 — Area Management
 * Spec: features/feature-2-area-management.md
 */
import { jest } from "@jest/globals";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { storage } from "../app/services/areaLogoStorage.js";
import { syncTestDatabase, createUserWithRoles } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const tooLong = "a".repeat(256);
const areaBody = (overrides = {}) => ({
  name: "Athletics",
  logo: "https://example.com/logo.png",
  ...overrides,
});

// Managing areas is admin-only since Feature 3 (US-3.6), so Feature 2 scenarios run as an admin.
const signIn = async (roles = ["admin"], overrides = {}) => {
  const { body } = await createUserWithRoles(roles, overrides);
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

describe("Feature 3 — User Role Management API", () => {
  describe("US-3.6 — Roles are enforced", () => {
    it("Admins can manage Areas", async () => {
      const admin = await signIn();

      const created = await createArea(admin);
      expect(created.status).toBe(201);

      const updated = await request(app)
        .put(`/api/areas/${created.body.id}`)
        .set(admin)
        .send({ name: "Athletics A" });
      expect(updated.status).toBe(200);
      expect(updated.body.name).toBe("Athletics A");

      const removed = await request(app).delete(`/api/areas/${created.body.id}`).set(admin);
      expect(removed.status).toBe(200);
      expect(await db.area.count()).toBe(0);
    });

    it("Non-admins cannot manage Areas", async () => {
      const admin = await signIn();
      const { body: area } = await createArea(admin);
      const nonAdmins = [
        await signIn([], { email: "requester@oc.edu" }),
        await signIn(["maintenance"], { email: "maintenance@oc.edu" }),
        await signIn([{ role: "area_admin", areaId: area.id }], { email: "areaadmin@oc.edu" }),
      ];

      for (const headers of nonAdmins) {
        const attempts = await Promise.all([
          createArea(headers, { name: "Music" }),
          request(app).put(`/api/areas/${area.id}`).set(headers).send({ name: "Renamed" }),
          request(app).delete(`/api/areas/${area.id}`).set(headers),
        ]);
        for (const response of attempts) {
          expect(response.status).toBe(403);
          expect(response.body).toEqual({ message: "Admin role required." });
        }

        // Listing areas is still open to every signed-in user.
        expect((await request(app).get("/api/areas").set(headers)).status).toBe(200);
        expect((await request(app).get(`/api/areas/${area.id}`).set(headers)).status).toBe(200);
      }

      expect((await db.area.findAll()).map(({ name }) => name)).toEqual(["Athletics"]);
    });

    it("Deleting an area removes its area admin roles", async () => {
      const admin = await signIn();
      const { body: area } = await createArea(admin);
      await createUserWithRoles([{ role: "area_admin", areaId: area.id }, "maintenance"], { email: "areaadmin@oc.edu" });

      await request(app).delete(`/api/areas/${area.id}`).set(admin);

      expect(await db.role.count({ where: { role: "area_admin" } })).toBe(0);
      expect(await db.role.count({ where: { role: "maintenance" } })).toBe(1);
    });
  });
});

describe("Feature 5 — areas with vehicles", () => {
  it("Signed-in user API request to delete an area that has a vehicle", async () => {
    const headers = await signIn();
    const { body: area } = await createArea(headers);
    const type = await db.vehicleType.create({ name: "Car", identifier: "VIN" });
    await db.vehicle.create({
      areaId: area.id,
      vehicleTypeId: type.id,
      universityId: "ABCD12345EFG",
      make: "Toyota",
      model: "Sienna",
      year: 2015,
      identifier: "1HGCM82633A004352",
      purchasedAt: "2018-01-01",
      color: "gray",
      passengerCapacity: 8,
      status: "active",
    });

    const response = await request(app).delete(`/api/areas/${area.id}`).set(headers);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Area has vehicles. Delete vehicles or reassign them to a different area first.",
    });
    expect(await db.area.count({ where: { id: area.id } })).toBe(1);
  });
});

const publicLogo = (areaId, filename) =>
  `https://vehicle-registration.supabase.co/storage/v1/object/public/area-logos/${areaId}/${filename}`;

const pngFile = {
  buffer: Buffer.from("png"),
  filename: "example.png",
  contentType: "image/png",
};

const stubStorage = ({ files = [], url = publicLogo(1, "example.png") } = {}) => {
  jest.spyOn(storage, "enabled").mockReturnValue(true);
  jest.spyOn(storage, "upload").mockResolvedValue(undefined);
  jest.spyOn(storage, "list").mockResolvedValue(files);
  jest.spyOn(storage, "remove").mockResolvedValue(undefined);
  jest.spyOn(storage, "publicUrl").mockReturnValue(url);
};

describe("Feature 17 — Area logo", () => {
  beforeEach(() => {
    process.env.AREA_LOGO_PREFIX = "test";
  });

  afterEach(() => {
    delete process.env.AREA_LOGO_PREFIX;
    jest.restoreAllMocks();
  });

  describe("US-17.1 — Upload area logo", () => {
    it("User uploads logo", async () => {
      const headers = await signIn();
      const url = publicLogo(1, "example.png");
      stubStorage({ files: [{ id: "file", name: "example.png" }], url });

      const response = await request(app)
        .post("/api/areas")
        .set(headers)
        .field("name", "Athletics")
        .attach("logo", pngFile.buffer, { filename: pngFile.filename, contentType: pngFile.contentType });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: "Athletics", logo: url });
      expect(storage.upload).toHaveBeenCalledWith("test/1/example.png", expect.any(Buffer), "image/png");

      const stored = await db.area.findByPk(response.body.id);
      expect(stored.logo).toBe(url);
    });
  });

  describe("US-17.2 — Edit area logo", () => {
    it("User uploads logo on edit", async () => {
      const headers = await signIn();
      const created = await createArea(headers, { logo: publicLogo(1, "old.png") });
      const url = publicLogo(1, "example.png");
      stubStorage({
        files: [
          { id: "old", name: "old.png" },
          { id: "next", name: "example.png" },
        ],
        url,
      });

      const response = await request(app)
        .put(`/api/areas/${created.body.id}`)
        .set(headers)
        .field("name", "Athletics")
        .attach("logo", pngFile.buffer, { filename: pngFile.filename, contentType: pngFile.contentType });

      expect(response.status).toBe(200);
      expect(response.body.logo).toBe(url);
      expect(storage.upload).toHaveBeenCalledWith("test/1/example.png", expect.any(Buffer), "image/png");
      expect(storage.remove).toHaveBeenCalledWith(["test/1/old.png"]);
      expect(await db.area.findByPk(created.body.id)).toMatchObject({ logo: url });
    });

    it("User removes logo", async () => {
      const headers = await signIn();
      const created = await createArea(headers, { logo: publicLogo(1, "example.png") });
      stubStorage({ files: [{ id: "file", name: "example.png" }] });

      const response = await request(app)
        .put(`/api/areas/${created.body.id}`)
        .set(headers)
        .field("name", "Athletics")
        .field("removeLogo", "true");

      expect(response.status).toBe(200);
      expect(response.body.logo).toBe("");
      expect(storage.remove).toHaveBeenCalledWith(["test/1/example.png"]);
      expect(storage.upload).toHaveBeenCalledWith("test/.keep.png", expect.any(Buffer), "image/png");
      expect(await db.area.findByPk(created.body.id)).toMatchObject({ logo: "" });
    });
  });

  describe("US-17.3 — Delete area with logo", () => {
    it("User deletes an area with a logo", async () => {
      const headers = await signIn();
      const created = await createArea(headers, { logo: publicLogo(1, "example.png") });
      stubStorage({ files: [{ id: "file", name: "example.png" }] });

      const response = await request(app).delete(`/api/areas/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(storage.remove).toHaveBeenCalledWith(["test/1/example.png"]);
      expect(storage.upload).toHaveBeenCalledWith("test/.keep.png", expect.any(Buffer), "image/png");
      expect(await db.area.count({ where: { id: created.body.id } })).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("rejects an unsupported logo file", async () => {
      const headers = await signIn();

      const response = await request(app)
        .post("/api/areas")
        .set(headers)
        .field("name", "Athletics")
        .attach("logo", Buffer.from("gif"), { filename: "logo.gif", contentType: "image/gif" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Unsupported file type." });
      expect(await db.area.count()).toBe(0);
    });

    it("rejects a logo over 2 MB", async () => {
      const headers = await signIn();

      const response = await request(app)
        .post("/api/areas")
        .set(headers)
        .field("name", "Athletics")
        .attach("logo", Buffer.alloc(2 * 1024 * 1024 + 1), { filename: "big.png", contentType: "image/png" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "File must be under 2 MB." });
      expect(await db.area.count()).toBe(0);
    });

    it("keeps the saved area when the logo upload fails", async () => {
      const headers = await signIn();
      stubStorage();
      storage.upload.mockRejectedValue(new Error("storage down"));

      const response = await request(app)
        .post("/api/areas")
        .set(headers)
        .field("name", "Athletics")
        .attach("logo", pngFile.buffer, { filename: pngFile.filename, contentType: pngFile.contentType });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: "Failed to upload logo." });
      expect(await db.area.findOne()).toMatchObject({ name: "Athletics", logo: "" });
    });
  });
});
