/**
 * Feature 8 — Vehicle Request Management
 * Spec: features/feature-8-vehicle-requests.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, registerUser, createUserWithRoles } from "./helpers.js";

// Mileage falls back to saved distances so estimates are deterministic.
delete process.env.GOOGLE_MAPS_API_KEY;

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

let fx;

/** Areas, drivers, destinations, and vehicles. Their features (2, 5–7) have no create API this suite can use yet. */
const seed = async () => {
  const athletics = await db.area.create({ name: "Athletics" });
  const music = await db.area.create({ name: "Music" });
  const dana = await db.driver.create({
    firstName: "Dana",
    lastName: "Driver",
    licenseExpirationDate: "2035-01-01",
    status: "approved",
  });
  const sam = await db.driver.create({
    firstName: "Sam",
    lastName: "Wheel",
    licenseExpirationDate: "2035-01-01",
    status: "approved",
    hasCdl: true,
  });
  const okc = await db.destination.create({ name: "OKC Arena", city: "Oklahoma City", state: "OK", isSaved: true, milesFromCampus: 15 });
  const tulsa = await db.destination.create({ name: "Tulsa Center", city: "Tulsa", state: "OK", isSaved: true, milesFromCampus: 100 });
  const van = await db.vehicleType.create({ name: "Van", identifier: "VIN" });
  const bus = await db.vehicleType.create({ name: "Bus", identifier: "VIN", requiresCdl: true });
  const vehicle = (overrides) =>
    db.vehicle.create({ areaId: athletics.id, vehicleTypeId: van.id, make: "Ford", model: "Transit", year: 2022, passengerCapacity: 12, ...overrides });

  return {
    athletics,
    music,
    dana,
    sam,
    okc,
    tulsa,
    van1: await vehicle({ universityId: "V-1" }),
    van2: await vehicle({ universityId: "V-2" }),
    bus1: await vehicle({ universityId: "B-1", vehicleTypeId: bus.id, passengerCapacity: 40 }),
    musicVan: await vehicle({ universityId: "M-1", areaId: music.id }),
  };
};

const body = (overrides = {}) => ({
  area_id: fx.athletics.id,
  purpose: "Away game",
  start_at: "2030-12-18",
  end_at: "2030-12-21",
  all_day: true,
  number_of_people: 9,
  drivers: [fx.dana.id],
  destinations: [{ id: fx.tulsa.id }],
  ...overrides,
});

const signIn = async (email = "jane@example.com") => {
  const { body: user } = await registerUser({ email });
  return { headers: bearer(user.token), userId: user.userId };
};

const signInWithRoles = async (roles, email) => {
  const { body: user } = await createUserWithRoles(roles, { email });
  return { headers: bearer(user.token), userId: user.userId };
};

const create = (headers, overrides) => request(app).post("/api/requests").set(headers).send(body(overrides));
const update = (headers, id, payload) => request(app).put(`/api/requests/${id}`).set(headers).send(payload);

beforeEach(async () => {
  await syncTestDatabase();
  fx = await seed();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 8 — Vehicle Request Management", () => {
  describe("US-8.1 — Create vehicle request", () => {
    it("Unauthenticated user cannot create a request", async () => {
      const response = await request(app).post("/api/requests").send(body());

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/);
      expect(await db.vehicleRequest.count()).toBe(0);
    });

    it("Authenticated user creates a request", async () => {
      const { headers, userId } = await signIn();

      const response = await create(headers);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        user_id: userId,
        area_id: fx.athletics.id,
        purpose: "Away game",
        start_at: "2030-12-18",
        end_at: "2030-12-21",
        all_day: true,
        number_of_people: 9,
        estimated_miles: 200,
        status: "pending",
        approver_id: null,
        vehicles: [],
      });
      expect(response.body.drivers.map(({ id }) => id)).toEqual([fx.dana.id]);
      expect(response.body.destinations.map(({ id }) => id)).toEqual([fx.tulsa.id]);
      expect(response.body.createdAt).toEqual(expect.any(String));

      const mine = await request(app).get("/api/me/requests").set(headers);
      expect(mine.status).toBe(200);
      expect(mine.body.map(({ id }) => id)).toEqual([response.body.id]);
    });

    it("User adds drivers to a new request", async () => {
      const { headers } = await signIn();

      const response = await create(headers, { drivers: [fx.dana.id, fx.sam.id] });

      expect(response.status).toBe(201);
      expect(response.body.drivers.map(({ id }) => id).sort()).toEqual([fx.dana.id, fx.sam.id].sort());
      expect(await db.vehicleRequestDriver.count({ where: { vehicle_request_id: response.body.id } })).toBe(2);
    });

    it("User adds destinations to a new request", async () => {
      const { headers } = await signIn();
      const custom = { name: "Grandma's House", addressLine1: "1 Main St", city: "Guthrie", state: "OK" };

      const response = await create(headers, { destinations: [{ id: fx.okc.id }, custom, { id: fx.tulsa.id }] });

      expect(response.status).toBe(201);
      expect(response.body.destinations.map(({ name }) => name)).toEqual(["OKC Arena", "Grandma's House", "Tulsa Center"]);
      const created = await db.destination.findOne({ where: { name: "Grandma's House" } });
      expect(created.isSaved).toBe(false);
    });

    it("User reorders destinations on a new request", async () => {
      const { headers } = await signIn();

      const response = await create(headers, { destinations: [{ id: fx.tulsa.id }, { id: fx.okc.id }] });

      expect(response.status).toBe(201);
      expect(response.body.destinations.map(({ id }) => id)).toEqual([fx.tulsa.id, fx.okc.id]);
      const stops = await db.vehicleRequestDestination.findAll({
        where: { vehicle_request_id: response.body.id },
        order: [["stop_order", "ASC"]],
      });
      expect(stops.map(({ destination_id }) => destination_id)).toEqual([fx.tulsa.id, fx.okc.id]);
    });

    it("User submits a request with missing required fields", async () => {
      const { headers } = await signIn();

      for (const field of ["area_id", "purpose", "start_at", "end_at", "number_of_people"]) {
        const response = await create(headers, { [field]: undefined });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: `Missing ${field}.` });
      }

      expect((await create(headers, { purpose: "   " })).body).toEqual({ message: "Missing purpose." });
      expect((await create(headers, { drivers: [] })).body).toEqual({ message: "Missing drivers." });
      expect((await create(headers, { destinations: [] })).body).toEqual({ message: "Missing destinations." });
      expect(await db.vehicleRequest.count()).toBe(0);
    });

    it("rejects a number of people that is not a non-negative integer", async () => {
      const { headers } = await signIn();

      for (const value of [-1, 2.5, "nine"]) {
        const response = await create(headers, { number_of_people: value });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: "number_of_people must be a non-negative integer." });
      }

      expect((await create(headers, { number_of_people: 0 })).status).toBe(201);
    });

    it("rejects an end date before the start date", async () => {
      const { headers } = await signIn();

      const response = await create(headers, { start_at: "2030-12-21", end_at: "2030-12-18" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "end_at cannot be before start_at." });
    });

    it("rejects invalid dates and unknown areas", async () => {
      const { headers } = await signIn();

      expect((await create(headers, { start_at: "not a date" })).body).toEqual({ message: "Invalid start_at." });
      expect((await create(headers, { area_id: 999 })).body).toEqual({ message: "Invalid area_id." });
      expect((await create(headers, { all_day: "yes" })).body).toEqual({ message: "Invalid all_day." });
    });

    it("rejects a destination listed twice in a row but allows it later in the trip", async () => {
      const { headers } = await signIn();

      const twice = await create(headers, { destinations: [{ id: fx.okc.id }, { id: fx.okc.id }] });
      expect(twice.status).toBe(400);
      expect(twice.body).toEqual({ message: "A destination is listed twice in a row." });

      const revisit = await create(headers, { destinations: [{ id: fx.okc.id }, { id: fx.tulsa.id }, { id: fx.okc.id }] });
      expect(revisit.status).toBe(201);
    });

    it("rejects a new destination missing its city", async () => {
      const { headers } = await signIn();

      const response = await create(headers, { destinations: [{ name: "Somewhere", state: "OK" }] });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Destination 1 is missing city." });
      expect(await db.destination.count()).toBe(2);
    });

    it("rejects drivers who are not approved or whose license expires", async () => {
      const { headers } = await signIn();
      const pending = await db.driver.create({ firstName: "Pat", lastName: "Pending", licenseExpirationDate: "2035-01-01" });
      const expired = await db.driver.create({ firstName: "Ex", lastName: "Pired", licenseExpirationDate: "2020-01-01", status: "approved" });
      const midTrip = await db.driver.create({ firstName: "Mid", lastName: "Trip", licenseExpirationDate: "2030-12-19", status: "approved" });

      expect((await create(headers, { drivers: [pending.id] })).body).toEqual({ message: "Pat Pending is not an approved driver." });
      expect((await create(headers, { drivers: [expired.id] })).body).toEqual({ message: "Ex Pired's license has expired." });
      expect((await create(headers, { drivers: [midTrip.id] })).body).toEqual({
        message: "Mid Trip's license expires before the trip ends.",
      });
      expect((await create(headers, { drivers: [fx.dana.id, fx.dana.id] })).body).toEqual({
        message: "A driver is listed more than once.",
      });
      expect(await db.vehicleRequest.count()).toBe(0);
    });

    it("stores timed trips with their times", async () => {
      const { headers } = await signIn();

      const response = await create(headers, {
        all_day: false,
        start_at: "2030-12-18T14:00:00.000Z",
        end_at: "2030-12-18T22:30:00.000Z",
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ start_at: "2030-12-18T14:00:00.000Z", end_at: "2030-12-18T22:30:00.000Z" });
    });
  });

  describe("US-8.2 — View list of my vehicle requests", () => {
    it("Unauthenticated user cannot view requests", async () => {
      for (const path of ["/api/me/requests", "/api/requests"]) {
        const response = await request(app).get(path);
        expect(response.status).toBe(401);
        expect(response.body.message).toMatch(/Unauthorized/);
      }
    });

    it("Regular user only sees their own requests", async () => {
      const jane = await signIn("jane@example.com");
      const other = await signIn("other@example.com");
      const mine = await create(jane.headers);
      await create(other.headers, { purpose: "Someone else's trip" });

      const response = await request(app).get("/api/me/requests").set(jane.headers);

      expect(response.status).toBe(200);
      expect(response.body.map(({ id }) => id)).toEqual([mine.body.id]);

      const adminList = await request(app).get("/api/requests").set(jane.headers);
      expect(adminList.status).toBe(403);
    });
  });

  describe("US-8.3 — View my single vehicle request", () => {
    it("User views the details of their own request", async () => {
      const { headers } = await signIn();
      const created = await create(headers, { drivers: [fx.dana.id, fx.sam.id] });

      const response = await request(app).get(`/api/requests/${created.body.id}`).set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: created.body.id, purpose: "Away game", area: { name: "Athletics" } });
      expect(response.body.drivers).toHaveLength(2);
      expect(response.body.destinations).toHaveLength(1);
    });

    it("User cannot view another user's request", async () => {
      const owner = await signIn("owner@example.com");
      const stranger = await signIn("stranger@example.com");
      const created = await create(owner.headers);

      const response = await request(app).get(`/api/requests/${created.body.id}`).set(stranger.headers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: `Vehicle request with id=${created.body.id} not found.` });
    });

    it("returns 404 for a missing request and 400 for a bad id", async () => {
      const { headers } = await signIn();

      expect((await request(app).get("/api/requests/999").set(headers)).status).toBe(404);
      expect((await request(app).get("/api/requests/abc").set(headers)).body).toEqual({ message: "Invalid request id." });
    });
  });

  describe("US-8.4 — List vehicle requests for admins", () => {
    it("Admin sees all requests", async () => {
      const requester = await signIn();
      const admin = await signInWithRoles(["admin"], "admin@example.com");
      await create(requester.headers);
      await create(requester.headers, { area_id: fx.music.id });

      const response = await request(app).get("/api/requests").set(admin.headers);

      expect(response.status).toBe(200);
      expect(response.body.map(({ area }) => area.name).sort()).toEqual(["Athletics", "Music"]);
    });

    it("Area admin sees requests from the areas they manage", async () => {
      const requester = await signIn();
      const areaAdmin = await signInWithRoles([{ role: "area_admin", areaId: fx.athletics.id }], "aa@example.com");
      const athletics = await create(requester.headers);
      const music = await create(requester.headers, { area_id: fx.music.id });

      const response = await request(app).get("/api/requests").set(areaAdmin.headers);

      expect(response.status).toBe(200);
      expect(response.body.map(({ id }) => id)).toEqual([athletics.body.id]);
      expect((await request(app).get(`/api/requests/${music.body.id}`).set(areaAdmin.headers)).status).toBe(404);
    });
  });

  describe("US-8.6 — Admin views single vehicle request", () => {
    it("Admin views the details of a request", async () => {
      const requester = await signIn();
      const areaAdmin = await signInWithRoles([{ role: "area_admin", areaId: fx.athletics.id }], "aa@example.com");
      const created = await create(requester.headers);

      const response = await request(app).get(`/api/requests/${created.body.id}`).set(areaAdmin.headers);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: created.body.id, user: { email: "jane@example.com" } });
    });
  });

  describe("US-8.7 — Admin edits vehicle request", () => {
    it("Admin changes a request's status", async () => {
      const requester = await signIn();
      const admin = await signInWithRoles(["admin"], "admin@example.com");
      const created = await create(requester.headers);

      const response = await update(admin.headers, created.body.id, { status: "awaiting_vehicle" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: "awaiting_vehicle", approver_id: admin.userId });
      expect(response.body.approved_at).toEqual(expect.any(String));

      const denied = await update(admin.headers, created.body.id, { status: "denied" });
      expect(denied.body.status).toBe("denied");
    });

    it("Changing an approval-affecting field resets status", async () => {
      const requester = await signIn();
      const admin = await signInWithRoles(["admin"], "admin@example.com");
      const created = await create(requester.headers);
      await update(admin.headers, created.body.id, { status: "awaiting_vehicle" });

      const response = await update(admin.headers, created.body.id, { number_of_people: 14 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: "pending", number_of_people: 14, approver_id: null, approved_at: null });
    });

    it("Updating a request with missing required fields", async () => {
      const { headers } = await signIn();
      const created = await create(headers);

      const response = await update(headers, created.body.id, { purpose: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Missing purpose." });
      expect((await db.vehicleRequest.findByPk(created.body.id)).purpose).toBe("Away game");
    });

    it("lets a requester edit their pending request but not change its status", async () => {
      const { headers } = await signIn();
      const created = await create(headers);

      const edited = await update(headers, created.body.id, { purpose: "Conference" });
      expect(edited.status).toBe(200);
      expect(edited.body.purpose).toBe("Conference");

      const approve = await update(headers, created.body.id, { status: "awaiting_vehicle" });
      expect(approve.status).toBe(403);
      expect(approve.body).toEqual({ message: "Only admins can change a request's status." });
    });

    it("stops a requester from editing an approved request but lets them cancel it", async () => {
      const requester = await signIn();
      const admin = await signInWithRoles(["admin"], "admin@example.com");
      const created = await create(requester.headers);
      await update(admin.headers, created.body.id, { status: "awaiting_vehicle" });

      const edit = await update(requester.headers, created.body.id, { purpose: "Changed" });
      expect(edit.status).toBe(403);
      expect(edit.body).toEqual({ message: "This request can no longer be edited." });

      const cancel = await update(requester.headers, created.body.id, { status: "cancelled" });
      expect(cancel.status).toBe(200);
      expect(cancel.body.status).toBe("cancelled");
    });

    it("hides requests outside an area admin's areas and rejects unknown statuses", async () => {
      const requester = await signIn();
      const musicAdmin = await signInWithRoles([{ role: "area_admin", areaId: fx.music.id }], "music@example.com");
      const admin = await signInWithRoles(["admin"], "admin@example.com");
      const created = await create(requester.headers);

      expect((await update(musicAdmin.headers, created.body.id, { status: "denied" })).status).toBe(404);
      expect((await update(admin.headers, created.body.id, { status: "lost" })).body).toEqual({ message: "Invalid status." });
    });
  });

  describe("US-8.8 — Assign vehicles to requests", () => {
    it("Admin assigns vehicles to a request", async () => {
      const requester = await signIn();
      const areaAdmin = await signInWithRoles([{ role: "area_admin", areaId: fx.athletics.id }], "aa@example.com");
      const created = await create(requester.headers);

      const response = await update(areaAdmin.headers, created.body.id, { vehicles: [fx.van1.id, fx.van2.id] });

      expect(response.status).toBe(200);
      expect(response.body.vehicles.map(({ universityId }) => universityId).sort()).toEqual(["V-1", "V-2"]);
      expect(response.body).toMatchObject({ status: "reserved", approver_id: areaAdmin.userId });

      const fetched = await request(app).get(`/api/requests/${created.body.id}`).set(requester.headers);
      expect(fetched.body.vehicles).toHaveLength(2);
    });

    it("sets the request back to awaiting vehicle when all vehicles are removed", async () => {
      const requester = await signIn();
      const admin = await signInWithRoles(["admin"], "admin@example.com");
      const created = await create(requester.headers);
      await update(admin.headers, created.body.id, { vehicles: [fx.van1.id] });

      const response = await update(admin.headers, created.body.id, { vehicles: [] });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: "awaiting_vehicle", vehicles: [] });
    });

    it("does not let requesters assign vehicles or see vehicle options", async () => {
      const { headers } = await signIn();
      const created = await create(headers);

      const assign = await update(headers, created.body.id, { vehicles: [fx.van1.id] });
      expect(assign.status).toBe(403);
      expect(await db.vehicleRequestVehicle.count()).toBe(0);

      expect((await request(app).get(`/api/requests/${created.body.id}/vehicle-options`).set(headers)).status).toBe(403);
    });

    it("rejects vehicles from another area", async () => {
      const requester = await signIn();
      const admin = await signInWithRoles(["admin"], "admin@example.com");
      const created = await create(requester.headers);

      const response = await update(admin.headers, created.body.id, { vehicles: [fx.musicVan.id] });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Vehicles must belong to the request's area." });
    });

    it("flags CDL needs and conflicting reservations on vehicle options", async () => {
      const requester = await signIn();
      const admin = await signInWithRoles(["admin"], "admin@example.com");
      const first = await create(requester.headers);
      const overlapping = await create(requester.headers, { start_at: "2030-12-21", end_at: "2030-12-22" });
      const later = await create(requester.headers, { start_at: "2030-12-22", end_at: "2030-12-23" });
      await update(admin.headers, first.body.id, { vehicles: [fx.van1.id] });

      const options = async (id) => (await request(app).get(`/api/requests/${id}/vehicle-options`).set(admin.headers)).body;
      const byId = (list) => Object.fromEntries(list.map((option) => [option.vehicle.universityId, option]));

      const forOverlapping = byId(await options(overlapping.body.id));
      expect(Object.keys(forOverlapping).sort()).toEqual(["B-1", "V-1", "V-2"]);
      expect(forOverlapping["V-1"].conflicting_request_ids).toEqual([first.body.id]);
      expect(forOverlapping["V-2"].conflicting_request_ids).toEqual([]);
      expect(forOverlapping["B-1"]).toMatchObject({ cdl_ok: false, out_of_service: false, miles_until_service: null });
      expect(forOverlapping["V-1"].vehicle.passengerCapacity).toBe(12);

      expect(byId(await options(later.body.id))["V-1"].conflicting_request_ids).toEqual([]);

      await update(requester.headers, later.body.id, { drivers: [fx.sam.id] });
      expect(byId(await options(later.body.id))["B-1"].cdl_ok).toBe(true);
    });
  });

  describe("US-8.9 — View estimated mileage of trip", () => {
    it("Estimated mileage is added when a request is created", async () => {
      const { headers } = await signIn();

      const response = await create(headers, { destinations: [{ id: fx.okc.id }, { id: fx.tulsa.id }] });

      expect(response.status).toBe(201);
      // campus → OKC (15) → Tulsa (85) → campus (100)
      expect(response.body.estimated_miles).toBe(200);
    });

    it("Estimated mileage updates when destinations change", async () => {
      const { headers } = await signIn();
      const created = await create(headers);

      const response = await update(headers, created.body.id, { destinations: [{ id: fx.okc.id }] });

      expect(response.status).toBe(200);
      expect(response.body.estimated_miles).toBe(30);
      expect(response.body.destinations.map(({ id }) => id)).toEqual([fx.okc.id]);
    });
  });
});
