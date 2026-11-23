/**
 * Feature 15 — Vehicle Type Instructions
 * Spec: features/feature-15-vehicle-type-instructions.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles, createArea } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const message = "Keys are in the office. On return, fill with gas, clean up, and put the keys back.";
const athleticsMessage = "Park in the Athletics lot. Keys are in the Athletics office.";

const signIn = async (roles = ["admin"], overrides = {}) => {
  const { body } = await createUserWithRoles(roles, overrides);
  return bearer(body.token);
};

const createVan = () => db.vehicleType.create({ name: "Van", identifier: "VIN" });

const instructionBody = (overrides = {}) => ({
  vehicleTypeId: 1,
  content: message,
  ...overrides,
});

const createInstruction = (headers, overrides = {}) =>
  request(app).post("/api/vehicle-type-instructions").set(headers).send(instructionBody(overrides));

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 15 — Vehicle Type Instructions", () => {
  describe("US-15.1 — Create vehicle type instructions", () => {
    it("Admin user saves a default vehicle type instruction", async () => {
      const headers = await signIn();
      const van = await createVan();

      const response = await createInstruction(headers, { vehicleTypeId: van.id, content: ` ${message} ` });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        vehicleTypeId: van.id,
        areaId: null,
        content: message,
        vehicleType: { id: van.id, name: "Van" },
        area: null,
      });
      expect(response.body.createdAt).toEqual(expect.any(String));
      expect(response.body.updatedAt).toEqual(expect.any(String));
    });

    it("Area admin user saves an area vehicle type instruction", async () => {
      const athletics = await createArea("Athletics");
      const music = await createArea("Music");
      const van = await createVan();
      const headers = await signIn([{ role: "area_admin", areaId: athletics.id }], { email: "area@oc.edu" });

      const response = await createInstruction(headers, {
        vehicleTypeId: van.id,
        areaId: athletics.id,
        content: athleticsMessage,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        vehicleTypeId: van.id,
        areaId: athletics.id,
        content: athleticsMessage,
        vehicleType: { id: van.id, name: "Van" },
        area: { id: athletics.id, name: "Athletics" },
      });

      await db.vehicleTypeInstruction.create({ vehicleTypeId: van.id, areaId: null, content: "Default keys." });
      await db.vehicleTypeInstruction.create({ vehicleTypeId: van.id, areaId: music.id, content: "Music lot." });

      // UI/UX backlog #9: their areas' instructions plus the default they override (read-only), not other areas'.
      const list = await request(app).get("/api/vehicle-type-instructions").set(headers);
      expect(list.status).toBe(200);
      expect(list.body.map((row) => row.area?.name ?? "Default")).toEqual(["Default", "Athletics"]);
      const fallback = list.body.find((row) => row.areaId === null);
      expect((await request(app).get(`/api/vehicle-type-instructions/${fallback.id}`).set(headers)).status).toBe(200);
      const edit = await request(app)
        .put(`/api/vehicle-type-instructions/${fallback.id}`)
        .set(headers)
        .send({ vehicleTypeId: van.id, areaId: null, content: "Mine now." });
      expect(edit.status).toBe(403);
    });

    // UI/UX backlog #9: the vehicle type page asks for one type's instructions.
    it("lists one vehicle type's instructions with ?vehicleTypeId", async () => {
      const van = await createVan();
      const bus = await db.vehicleType.create({ name: "Bus", identifier: "VIN" });
      await db.vehicleTypeInstruction.create({ vehicleTypeId: van.id, areaId: null, content: "Van keys." });
      await db.vehicleTypeInstruction.create({ vehicleTypeId: bus.id, areaId: null, content: "Bus keys." });
      const headers = await signIn();

      const list = await request(app).get("/api/vehicle-type-instructions").query({ vehicleTypeId: bus.id }).set(headers);
      expect(list.body.map(({ content }) => content)).toEqual(["Bus keys."]);
      const bad = await request(app).get("/api/vehicle-type-instructions").query({ vehicleTypeId: "bus" }).set(headers);
      expect(bad.status).toBe(400);
      expect(bad.body).toEqual({ message: "Invalid vehicle type id." });
    });

    it("Admin user requests to create a vehicle type instruction with a missing vehicle type", async () => {
      const headers = await signIn();

      const response = await request(app)
        .post("/api/vehicle-type-instructions")
        .set(headers)
        .send({ content: message });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing vehicle type." });
    });

    it("Admin user requests to create a vehicle type instruction with a missing instruction message", async () => {
      const headers = await signIn();
      const van = await createVan();

      const response = await createInstruction(headers, { vehicleTypeId: van.id, content: undefined });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing instruction message." });
    });

    it("Admin user requests to create a vehicle type instruction with a whitespace-only instruction message", async () => {
      const headers = await signIn();
      const van = await createVan();

      const response = await createInstruction(headers, { vehicleTypeId: van.id, content: " " });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing instruction message." });
    });

    // Variables are filled in from each trip, so a misspelled one is refused instead of reaching drivers.
    it("Instructions can use variables, but not unknown ones", async () => {
      const headers = await signIn();
      const van = await createVan();
      const withVariables = "Pick up {{ vehicle }} by {{pickup_time}}. Questions? Ask {{area_admins}}.";

      const created = await createInstruction(headers, { vehicleTypeId: van.id, content: withVariables });
      expect(created.status).toBe(201);
      expect(created.body.content).toBe(withVariables);

      for (const [content, unknown] of [
        ["Pick up {{vehical}}.", "vehical"],
        ["Bring {{ }} with you.", ""],
        ["{{vehicle}} leaves at {{pickup_time}} from {{Lot}}.", "Lot"],
        // Variables there used to be: nobody needed them in pickup instructions.
        ["Plate {{license_plate}}.", "license_plate"],
        ["{{people}} people are going.", "people"],
      ]) {
        const rejected = await request(app).put(`/api/vehicle-type-instructions/${created.body.id}`).set(headers).send({ vehicleTypeId: van.id, content });
        expect(rejected.status).toBe(400);
        expect(rejected.body).toEqual({ message: `Unknown variable {{${unknown}}}.` });
      }
      // Single braces are just text.
      const plain = await request(app).put(`/api/vehicle-type-instructions/${created.body.id}`).set(headers).send({ vehicleTypeId: van.id, content: "Use the {north} lot." });
      expect(plain.status).toBe(200);
    });

    it("Admin user requests to create a vehicle type instruction for a vehicle type that does not exist", async () => {
      const headers = await signIn();

      const response = await createInstruction(headers, { vehicleTypeId: 999 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle type not found." });
    });

    it("Admin user requests to create a vehicle type instruction for an area that does not exist", async () => {
      const headers = await signIn();
      const van = await createVan();

      const response = await createInstruction(headers, { vehicleTypeId: van.id, areaId: 999 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Area not found." });
    });

    it("Admin user requests to create a default vehicle type instruction that already exists", async () => {
      const headers = await signIn();
      const van = await createVan();
      await db.vehicleTypeInstruction.create({ vehicleTypeId: van.id, areaId: null, content: message });

      const response = await createInstruction(headers, { vehicleTypeId: van.id });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "An instruction for this vehicle type and area already exists." });
    });

    it("Admin user requests to create an area vehicle type instruction that already exists", async () => {
      const headers = await signIn();
      const van = await createVan();
      const athletics = await createArea("Athletics");
      await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: athletics.id,
        content: athleticsMessage,
      });

      const response = await createInstruction(headers, { vehicleTypeId: van.id, areaId: athletics.id });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "An instruction for this vehicle type and area already exists." });
    });

    it("Area admin user requests to create a default vehicle type instruction", async () => {
      const athletics = await createArea("Athletics");
      const van = await createVan();
      const headers = await signIn([{ role: "area_admin", areaId: athletics.id }]);

      const response = await createInstruction(headers, { vehicleTypeId: van.id });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing area." });
    });

    it("Area admin user requests to create a vehicle type instruction for an area they do not administer", async () => {
      const athletics = await createArea("Athletics");
      const music = await createArea("Music");
      const van = await createVan();
      const headers = await signIn([{ role: "area_admin", areaId: athletics.id }]);

      const response = await createInstruction(headers, { vehicleTypeId: van.id, areaId: music.id });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Forbidden." });
    });
  });

  describe("US-15.4 — Edit and delete vehicle type instructions", () => {
    it("Admin edits a vehicle type instruction message", async () => {
      const headers = await signIn();
      const van = await createVan();
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: null,
        content: "Keys are in the office.",
      });

      const response = await request(app)
        .put(`/api/vehicle-type-instructions/${instruction.id}`)
        .set(headers)
        .send({ vehicleTypeId: van.id, areaId: null, content: "Keys are in the lockbox." });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe("Keys are in the lockbox.");
    });

    it("Area admin edits a vehicle type instruction in their area", async () => {
      const athletics = await createArea("Athletics");
      const van = await createVan();
      const headers = await signIn([{ role: "area_admin", areaId: athletics.id }]);
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: athletics.id,
        content: "Old message.",
      });

      const response = await request(app)
        .put(`/api/vehicle-type-instructions/${instruction.id}`)
        .set(headers)
        .send({ vehicleTypeId: van.id, areaId: athletics.id, content: "Park in the Athletics lot." });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe("Park in the Athletics lot.");
    });

    it("Admin deletes a vehicle type instruction", async () => {
      const headers = await signIn();
      const van = await createVan();
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: null,
        content: message,
      });

      const response = await request(app).delete(`/api/vehicle-type-instructions/${instruction.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Vehicle type instruction deleted successfully." });
      expect(await db.vehicleTypeInstruction.count()).toBe(0);
    });

    it("Admin updates a vehicle type instruction that does not exist", async () => {
      const headers = await signIn();
      const van = await createVan();

      const response = await request(app)
        .put("/api/vehicle-type-instructions/999")
        .set(headers)
        .send({ vehicleTypeId: van.id, content: message });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle type instruction with id=999 not found." });
    });

    it("Admin updates a vehicle type instruction with an invalid id", async () => {
      const headers = await signIn();
      const van = await createVan();

      const response = await request(app)
        .put("/api/vehicle-type-instructions/abc")
        .set(headers)
        .send({ vehicleTypeId: van.id, content: message });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid vehicle type instruction id." });
    });

    it("Admin deletes a vehicle type instruction that does not exist", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/vehicle-type-instructions/999").set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Vehicle type instruction with id=999 not found." });
    });

    it("Admin deletes a vehicle type instruction with an invalid id", async () => {
      const headers = await signIn();

      const response = await request(app).delete("/api/vehicle-type-instructions/abc").set(headers);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Invalid vehicle type instruction id." });
    });

    it("Area admin updates a vehicle type instruction outside their area", async () => {
      const athletics = await createArea("Athletics");
      const music = await createArea("Music");
      const van = await createVan();
      const headers = await signIn([{ role: "area_admin", areaId: athletics.id }]);
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: music.id,
        content: message,
      });

      const response = await request(app)
        .put(`/api/vehicle-type-instructions/${instruction.id}`)
        .set(headers)
        .send({ vehicleTypeId: van.id, areaId: music.id, content: "Changed." });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Forbidden." });
    });

    it("Area admin deletes a vehicle type instruction outside their area", async () => {
      const athletics = await createArea("Athletics");
      const music = await createArea("Music");
      const van = await createVan();
      const headers = await signIn([{ role: "area_admin", areaId: athletics.id }]);
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: music.id,
        content: message,
      });

      const response = await request(app).delete(`/api/vehicle-type-instructions/${instruction.id}`).set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Forbidden." });
    });

    it("Area admin updates a default vehicle type instruction", async () => {
      const athletics = await createArea("Athletics");
      const van = await createVan();
      const headers = await signIn([{ role: "area_admin", areaId: athletics.id }]);
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: null,
        content: message,
      });

      const response = await request(app)
        .put(`/api/vehicle-type-instructions/${instruction.id}`)
        .set(headers)
        .send({ vehicleTypeId: van.id, areaId: athletics.id, content: "Changed." });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Forbidden." });
    });
  });

  describe("US-15.5 — Signed-in admin or area admin access only", () => {
    it("Unauthenticated API request to vehicle type instructions", async () => {
      const response = await request(app).get("/api/vehicle-type-instructions");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to a particular vehicle type instruction", async () => {
      const van = await createVan();
      await db.vehicleTypeInstruction.create({ vehicleTypeId: van.id, areaId: null, content: message });

      const response = await request(app).get("/api/vehicle-type-instructions/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to create a vehicle type instruction", async () => {
      const response = await request(app).post("/api/vehicle-type-instructions").send(instructionBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to update a vehicle type instruction", async () => {
      const van = await createVan();
      await db.vehicleTypeInstruction.create({ vehicleTypeId: van.id, areaId: null, content: message });

      const response = await request(app).put("/api/vehicle-type-instructions/1").send(instructionBody());

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Unauthenticated API request to delete a vehicle type instruction", async () => {
      const van = await createVan();
      await db.vehicleTypeInstruction.create({ vehicleTypeId: van.id, areaId: null, content: message });

      const response = await request(app).delete("/api/vehicle-type-instructions/1");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized! No token provided." });
    });

    it("Signed-in user without admin or area admin role API request to vehicle type instructions", async () => {
      const headers = await signIn(["maintenance"]);

      const response = await request(app).get("/api/vehicle-type-instructions").set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin or area admin role required." });
    });

    it("Signed-in user without admin or area admin role API request to a particular vehicle type instruction", async () => {
      const headers = await signIn(["maintenance"]);
      const van = await createVan();
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: null,
        content: message,
      });

      const response = await request(app).get(`/api/vehicle-type-instructions/${instruction.id}`).set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin or area admin role required." });
    });

    it("Signed-in user without admin or area admin role API request to create a vehicle type instruction", async () => {
      const headers = await signIn(["maintenance"]);

      const response = await createInstruction(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin or area admin role required." });
    });

    it("Signed-in user without admin or area admin role API request to update a vehicle type instruction", async () => {
      const headers = await signIn(["maintenance"]);
      const van = await createVan();
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: null,
        content: message,
      });

      const response = await request(app)
        .put(`/api/vehicle-type-instructions/${instruction.id}`)
        .set(headers)
        .send(instructionBody({ vehicleTypeId: van.id }));

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin or area admin role required." });
    });

    it("Signed-in user without admin or area admin role API request to delete a vehicle type instruction", async () => {
      const headers = await signIn(["maintenance"]);
      const van = await createVan();
      const instruction = await db.vehicleTypeInstruction.create({
        vehicleTypeId: van.id,
        areaId: null,
        content: message,
      });

      const response = await request(app).delete(`/api/vehicle-type-instructions/${instruction.id}`).set(headers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Admin or area admin role required." });
    });
  });
});
