/**
 * UI/UX backlog #15 — Sidebar count badges (GET /api/nav-counts)
 * Spec: docs/ui-ux-backlog.md (no feature spec yet; scratch branch)
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, createUserWithRoles, registerUser } from "./helpers.js";

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const signIn = async (roles, email) => {
  const { body } = await createUserWithRoles(roles, { email });
  return { headers: bearer(body.token), userId: body.userId };
};

const seed = async () => {
  const athletics = await db.area.create({ name: "Athletics", logo: "" });
  const music = await db.area.create({ name: "Music", logo: "" });
  const type = await db.vehicleType.create({ name: "Van", identifier: "VIN" });
  const vehicle = (areaId, universityId) =>
    db.vehicle.create({
      areaId,
      vehicleTypeId: type.id,
      universityId,
      make: "Ford",
      model: "Transit",
      year: 2022,
      identifier: universityId.padEnd(17, "0"),
      purchasedAt: "2022-01-15",
      color: "White",
      passengerCapacity: 12,
      status: "active",
    });
  return { athletics, music, athleticsVan: await vehicle(athletics.id, "A1"), musicVan: await vehicle(music.id, "M1") };
};

const addRequest = (userId, areaId, status) =>
  db.vehicleRequest.create({
    userId,
    areaId,
    status,
    purpose: "Trip",
    numberOfPeople: 2,
    allDay: true,
    startAt: new Date("2030-12-18T00:00:00.000Z"),
    endAt: new Date("2030-12-19T00:00:00.000Z"),
  });

const addNeed = (vehicleId, authorId, overrides = {}) =>
  db.maintenanceNeed.create({
    vehicleId,
    authorId,
    title: "Brakes",
    outOfService: false,
    priority: "None",
    status: "Open",
    ...overrides,
  });

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("UI/UX backlog #15 — Sidebar count badges", () => {
  it("counts what's waiting for an area admin, in their own area only", async () => {
    const fx = await seed();
    const coach = await signIn([{ role: "area_admin", areaId: fx.athletics.id }], "coach@example.com");
    const { body: requester } = await registerUser({ email: "req@example.com" });
    await addRequest(requester.userId, fx.athletics.id, "pending");
    await addRequest(requester.userId, fx.athletics.id, "awaiting_vehicle");
    await addRequest(requester.userId, fx.athletics.id, "reserved");
    await addRequest(requester.userId, fx.music.id, "pending");
    await db.issueReport.create({ vehicleId: fx.athleticsVan.id, authorId: requester.userId, type: "dirty", description: "Mud", status: "pending" });
    await db.issueReport.create({ vehicleId: fx.athleticsVan.id, authorId: requester.userId, type: "dirty", description: "Old", status: "resolved", resolvedAt: "2026-01-02" });
    await db.issueReport.create({ vehicleId: fx.musicVan.id, authorId: requester.userId, type: "dirty", description: "Music", status: "pending" });
    await addNeed(fx.athleticsVan.id, requester.userId);
    await addNeed(fx.athleticsVan.id, requester.userId, { assigneeId: coach.userId });
    await addNeed(fx.musicVan.id, requester.userId);

    const response = await request(app).get("/api/nav-counts").set(coach.headers);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ requests: 2, issueReports: 1, maintenanceNeeds: 2, vehicles: 0, drivers: 0 });
  });

  it("counts every open need for a maintenance user, and nothing they can't open", async () => {
    const fx = await seed();
    const fixer = await signIn(["maintenance"], "fix@example.com");
    const { body: other } = await registerUser({ email: "other@example.com" });
    await addNeed(fx.athleticsVan.id, other.userId, { assigneeId: fixer.userId });
    await addNeed(fx.musicVan.id, other.userId, { assigneeId: fixer.userId, status: "In Progress" });
    await addNeed(fx.musicVan.id, other.userId, { assigneeId: fixer.userId, status: "Completed", resolvedAt: "2026-01-02" });
    await addNeed(fx.musicVan.id, other.userId);

    const response = await request(app).get("/api/nav-counts").set(fixer.headers);

    expect(response.body).toEqual({ requests: null, issueReports: null, maintenanceNeeds: 3, vehicles: 0, drivers: null });
  });

  it("gives a requester no badges, and needs a session", async () => {
    const { body: requester } = await registerUser({ email: "req@example.com" });

    const response = await request(app).get("/api/nav-counts").set(bearer(requester.token));

    expect(response.body).toEqual({ requests: null, issueReports: null, maintenanceNeeds: null, vehicles: null, drivers: null });
    expect((await request(app).get("/api/nav-counts")).status).toBe(401);
  });

  it("counts requests needing action or with a vehicle problem, each once", async () => {
    const fx = await seed();
    const coach = await signIn([{ role: "area_admin", areaId: fx.athletics.id }], "coach@example.com");
    const { body: requester } = await registerUser({ email: "req@example.com" });
    const withVehicle = async (status, vehicleId) => {
      const trip = await addRequest(requester.userId, fx.athletics.id, status);
      await db.vehicleRequestVehicle.create({ vehicleRequestId: trip.id, vehicleId });
      return trip;
    };
    const fine = await db.vehicle.create({
      ...fx.athleticsVan.toJSON(),
      id: undefined,
      universityId: "A2",
      identifier: "A2".padEnd(17, "0"),
    });
    await addNeed(fx.athleticsVan.id, requester.userId, { outOfService: true });
    await withVehicle("reserved", fx.athleticsVan.id); // vehicle problem
    await withVehicle("reserved", fine.id); // nothing wrong
    await withVehicle("awaiting_vehicle", fx.athleticsVan.id); // needs action and has a problem: counted once
    await addRequest(requester.userId, fx.athletics.id, "pending"); // needs action

    const response = await request(app).get("/api/nav-counts").set(coach.headers);

    expect(response.body.requests).toBe(3);
  });

  it("counts the vehicles each user can see that need attention", async () => {
    const fx = await seed();
    const admin = await signIn(["admin"], "admin@example.com");
    const coach = await signIn([{ role: "area_admin", areaId: fx.athletics.id }], "coach@example.com");
    const fixer = await signIn(["maintenance"], "fix@example.com");
    const inDays = (days) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    };
    // Athletics: out of service. Music: plate expiring in 10 days. A retired Music van with an expired plate doesn't count.
    await addNeed(fx.athleticsVan.id, admin.userId, { outOfService: true });
    await fx.musicVan.update({ licensePlateExpirationDate: inDays(10) });
    await db.vehicle.create({
      ...fx.musicVan.toJSON(),
      id: undefined,
      universityId: "M2",
      identifier: "M2".padEnd(17, "0"),
      licensePlateExpirationDate: inDays(-5),
      status: "retired",
    });

    const counts = async (caller) => (await request(app).get("/api/nav-counts").set(caller.headers)).body.vehicles;
    expect(await counts(admin)).toBe(2);
    expect(await counts(fixer)).toBe(2);
    expect(await counts(coach)).toBe(1);
  });

  it("counts drivers whose license has expired or expires within 30 days", async () => {
    const admin = await signIn(["admin"], "admin@example.com");
    const coach = await signIn([{ role: "area_admin", areaId: (await db.area.create({ name: "Athletics" })).id }], "coach@example.com");
    const inDays = (days) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    };
    const addDriver = (n, licenseExpirationDate, status = "approved") =>
      db.driver.create({
        firstName: `Driver${n}`,
        lastName: "Doe",
        email: `driver${n}@example.com`,
        phoneNumber: `405-555-000${n}`,
        licenseState: "OK",
        licenseExpirationDate,
        status,
      });
    await addDriver(1, inDays(-3)); // expired
    await addDriver(2, inDays(30)); // expires on the last day that counts
    await addDriver(3, inDays(5), "pending"); // about to drive, expiring
    await addDriver(4, inDays(31)); // current
    await addDriver(5, inDays(-3), "revoked"); // doesn't drive

    for (const caller of [admin, coach]) {
      const response = await request(app).get("/api/nav-counts").set(caller.headers);
      expect(response.body.drivers).toBe(3);
    }
  });

  it("counts every area for an admin", async () => {
    const fx = await seed();
    const admin = await signIn(["admin"], "admin@example.com");
    await addRequest(admin.userId, fx.athletics.id, "pending");
    await addRequest(admin.userId, fx.music.id, "pending");
    await addNeed(fx.musicVan.id, admin.userId);

    const response = await request(app).get("/api/nav-counts").set(admin.headers);

    expect(response.body).toEqual({ requests: 2, issueReports: 0, maintenanceNeeds: 1, vehicles: 0, drivers: 0 });
  });
});
