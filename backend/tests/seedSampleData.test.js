/**
 * Feature 8 — Vehicle Request Management (sample data for Features 4–7)
 * Spec: features/feature-8-vehicle-requests.md → Assumptions
 */
import db from "../app/models/index.js";
import request from "supertest";
import app from "../server.js";
import { SEED_DESTINATIONS, SEED_DRIVERS, SEED_ISSUE_REPORTS, SEED_MAINTENANCE_NEEDS, SEED_MILEAGE_LOGS, SEED_NOTES, SEED_SERVICE_LOGS, SEED_SERVICE_TYPES, SEED_VEHICLE_TYPES, SEED_VEHICLES, seed } from "../scripts/seed.mjs";
import { createUserWithRoles, syncTestDatabase } from "./helpers.js";

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 8 — Vehicle Request Management sample data", () => {
  it("Seed adds sample vehicles, service types, drivers, and destinations and replaces old requests", async () => {
    const result = await seed();
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain(`Added sample data: ${SEED_VEHICLES.length} vehicles`);

    expect(await db.vehicle.count()).toBe(SEED_VEHICLES.length);
    expect(await db.vehicleType.count()).toBe(SEED_VEHICLE_TYPES.length);
    expect(await db.serviceType.count()).toBe(SEED_SERVICE_TYPES.length);
    expect(await db.driver.count()).toBe(SEED_DRIVERS.length);
    expect(await db.destination.count()).toBe(SEED_DESTINATIONS.length);
    expect(await db.issueReport.count()).toBe(SEED_ISSUE_REPORTS.length);
    expect(await db.maintenanceNeed.count()).toBe(SEED_MAINTENANCE_NEEDS.length);
    // Feature 13: service logs share their visit's reading in SEED_MILEAGE_LOGS.
    expect(await db.mileageLog.count()).toBe(SEED_MILEAGE_LOGS.length);
    expect(new Set(SEED_ISSUE_REPORTS.map(({ type }) => type))).toEqual(new Set(["low_gas", "dirty", "maintenance", "other"]));
    expect(new Set(SEED_MAINTENANCE_NEEDS.map(({ status }) => status))).toEqual(new Set(["Open", "In Progress", "Completed", "Canceled"]));
    expect(SEED_MAINTENANCE_NEEDS.some(({ issueReportIndex }) => issueReportIndex != null)).toBe(true);
    expect(SEED_MAINTENANCE_NEEDS.some(({ issueReportIndex }) => issueReportIndex == null)).toBe(true);
    // Feature 14: a report that became a maintenance need is closed as moved, with a date.
    for (const { issueReportIndex } of SEED_MAINTENANCE_NEEDS.filter(({ issueReportIndex }) => issueReportIndex != null)) {
      expect(SEED_ISSUE_REPORTS[issueReportIndex]).toMatchObject({ status: "moved_to_maintenance", resolvedAt: expect.any(String) });
    }
    expect(new Set(SEED_ISSUE_REPORTS.map(({ status }) => status))).toEqual(new Set(["pending", "resolved", "cancelled", "moved_to_maintenance"]));

    // Enough rows to page through, and every driver status and both kinds of destination.
    expect(SEED_VEHICLES.length).toBeGreaterThanOrEqual(50);
    expect(SEED_DRIVERS.length).toBeGreaterThanOrEqual(50);
    expect(SEED_DESTINATIONS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(SEED_DRIVERS.map(({ status }) => status))).toEqual(new Set(["pending", "approved", "denied", "revoked", "former"]));
    expect(new Set(SEED_DESTINATIONS.map(({ isSaved }) => isSaved))).toEqual(new Set([true, false]));
    expect(new Set(SEED_VEHICLES.map(({ status }) => status))).toEqual(new Set(["active", "retired"]));
    // Phone numbers, VINs, and plates are unique, like the API requires.
    for (const values of [
      SEED_DRIVERS.map(({ phoneNumber }) => phoneNumber),
      SEED_VEHICLES.map(({ identifier }) => identifier),
      SEED_VEHICLES.map(({ licensePlate }) => licensePlate).filter(Boolean),
      SEED_VEHICLES.map(({ universityId }) => universityId),
    ]) {
      expect(new Set(values).size).toBe(values.length);
    }

    // Vehicles land in their named area; drivers link to seeded accounts by email.
    const bus = await db.vehicle.findOne({ where: { universityId: "ATH-B01" }, include: ["area", "vehicleType"] });
    expect(bus.area.name).toBe("Athletics");
    expect(bus.vehicleType.name).toBe("Bus");
    const marcus = await db.driver.findOne({ where: { lastName: "Bell" } });
    const marcusUser = await db.user.findOne({ where: { email: "marcus.bell@oc.edu" } });
    expect(marcus.userId).toBe(marcusUser.id);
    expect((await db.driver.findOne({ where: { lastName: "Delgado" } })).userId).toBeNull();

    // A request made against the old data is gone after re-seeding, and re-seeding gives the same counts.
    const { body: me } = await createUserWithRoles([], { email: "me@eagles.oc.edu" });
    const area = await db.area.findOne();
    await db.vehicleRequest.create({
      userId: me.userId,
      areaId: area.id,
      purpose: "Old trip",
      startAt: new Date("2030-01-01T00:00:00Z"),
      endAt: new Date("2030-01-02T00:00:00Z"),
      allDay: true,
      numberOfPeople: 3,
    });

    expect((await seed({ keep: ["me@eagles.oc.edu"] })).exitCode).toBe(0);
    expect(await db.vehicleRequest.findOne({ where: { purpose: "Old trip" } })).toBeNull();
    expect(await db.vehicle.count()).toBe(SEED_VEHICLES.length);
    expect(await db.driver.count()).toBe(SEED_DRIVERS.length);
    expect(await db.issueReport.count()).toBe(SEED_ISSUE_REPORTS.length);
    expect(await db.maintenanceNeed.count()).toBe(SEED_MAINTENANCE_NEEDS.length);
    expect(await db.mileageLog.count()).toBe(SEED_MILEAGE_LOGS.length);
  });
});

describe("Feature 13 — Service Log sample data", () => {
  it("Seed adds service logs, each pointing at its visit's mileage log", async () => {
    expect((await seed()).message).toContain(`Added ${SEED_SERVICE_LOGS.length} service logs`);

    const logs = await db.serviceLog.findAll({
      include: [
        "mileageLog",
        "maintenanceNeed",
        { model: db.user, as: "user", include: [{ model: db.role, as: "roles" }] },
      ],
    });
    expect(logs).toHaveLength(SEED_SERVICE_LOGS.length);
    // A visit's service logs share one reading, so no mileage logs are added on top of SEED_MILEAGE_LOGS.
    expect(await db.mileageLog.count()).toBe(SEED_MILEAGE_LOGS.length);
    for (const log of logs) {
      // The same rules as the API: a maintenance user, a mileage log on the service date, a need for the same vehicle.
      expect(log.user.roles.map(({ role }) => role)).toContain("maintenance");
      expect(log.mileageLog.vehicleId).toBe(log.vehicleId);
      expect(log.mileageLog.recordedAt).toBe(log.servicedAt);
      if (log.maintenanceNeed) {
        expect(log.maintenanceNeed.vehicleId).toBe(log.vehicleId);
      }
    }
    expect(logs.some(({ maintenanceNeedId }) => maintenanceNeedId !== null)).toBe(true);
    expect(logs.some(({ maintenanceNeedId }) => maintenanceNeedId === null)).toBe(true);
  });
});

describe("Feature 14 — Notes sample data", () => {
  it("Seed adds note threads on requests, issue reports, and maintenance needs", async () => {
    expect((await seed()).message).toContain(`${SEED_NOTES.length} notes`);

    const notes = await db.note.findAll({ order: [["id", "ASC"]] });
    expect(notes).toHaveLength(SEED_NOTES.length);
    for (const note of notes) {
      const parents = [note.vehicleRequestId, note.issueReportId, note.maintenanceNeedId].filter((id) => id !== null);
      expect(parents).toHaveLength(1);
      expect(note.content.trim()).toBe(note.content);
      expect(note.content).not.toBe("");
    }
    for (const key of ["vehicleRequestId", "issueReportId", "maintenanceNeedId"]) {
      expect(notes.some((note) => note[key] !== null)).toBe(true);
    }
    expect(new Set(notes.map(({ isVisible }) => isVisible))).toEqual(new Set([true, false]));

    // Within a thread, later ids are later notes, so the delete rule (FR-004) reads replies correctly.
    const byParent = new Map();
    for (const note of notes) {
      const key = `${note.vehicleRequestId}-${note.issueReportId}-${note.maintenanceNeedId}`;
      const previous = byParent.get(key);
      if (previous) {
        expect(note.createdAt.getTime()).toBeGreaterThan(previous.createdAt.getTime());
      }
      byParent.set(key, note);
    }

    // The test requester account has notes on their own requests, including one they can still delete.
    const requester = await db.user.findOne({ where: { email: "requester@oc.edu" } });
    const ownRequestIds = (await db.vehicleRequest.findAll({ where: { userId: requester.id } })).map(({ id }) => id);
    const ownNotes = notes.filter((note) => ownRequestIds.includes(note.vehicleRequestId));
    expect(ownNotes.length).toBeGreaterThan(0);
    expect(ownNotes.some((note) => note.authorId === requester.id)).toBe(true);
  });
});

/*
 * Feature 18 — Vehicle Status sample data
 * Spec: features/feature-18-vehicle-status.md
 */
describe("Feature 18 — Vehicle Status sample data", () => {
  it("Seed gives every vehicle status and vehicle problem an example", async () => {
    expect((await seed()).exitCode).toBe(0);
    expect(await db.serviceLog.count()).toBe(SEED_SERVICE_LOGS.length);
    expect(await db.mileageLog.count()).toBe(SEED_MILEAGE_LOGS.length);

    const { body: admin } = await createUserWithRoles(["admin"], { email: "checker@eagles.oc.edu" });
    const headers = { Authorization: `Bearer ${admin.token}` };

    const { body: vehicles } = await request(app).get("/api/vehicles").set(headers);
    const statusOf = Object.fromEntries(vehicles.map((vehicle) => [vehicle.universityId, vehicle.condition]));
    const statuses = vehicles.map(({ condition }) => condition.status);
    for (const status of ["retired", "out_of_service", "service_overdue", "plate_expired", "service_due_soon", "available"]) {
      expect({ status, seeded: statuses.includes(status) }).toEqual({ status, seeded: true });
    }
    // Most of the fleet is usable, so the list isn't a wall of warnings.
    expect(statuses.filter((status) => status === "available").length).toBeGreaterThan(vehicles.length / 2);

    expect(statusOf["ATH-V01"].status).toBe("out_of_service");
    expect(statusOf["ATH-M01"].status).toBe("service_due_soon");
    expect(statusOf["MUS-B01"].status).toBe("available");
    expect(statusOf["MUS-V01"].status).toBe("available");
    expect(statusOf["HON-S01"]).toMatchObject({ status: "available" });
    expect(statusOf["HON-S01"].services.every(({ lastServicedAt }) => lastServicedAt === null)).toBe(true);
    expect(vehicles.some(({ condition }) => condition.mileage.tripCount > 0)).toBe(true);

    const { body: requests } = await request(app).get("/api/requests").set(headers);
    const problemsOn = (purpose) => {
      const found = requests.find((row) => row.purpose === purpose);
      return Object.values(found.vehicleProblems).flat().map(({ type }) => type);
    };
    expect(problemsOn("Track meet at Oklahoma State")).toContain("out_of_service");
    expect(problemsOn("Soccer match at Southern Nazarene")).toContain("service_due");
    expect(problemsOn("Choir tour: Abilene and Lubbock")).toEqual(["service_due"]);
    expect(problemsOn("Cross country meet at UCO")).toContain("retired");
    expect(problemsOn("Recruiting dinner in Norman")).toEqual(["booked"]);
    expect(problemsOn("Coaching clinic at Oklahoma State")).toEqual(["booked"]);
    expect(problemsOn("Honor choir clinic in Tulsa")).toEqual([]);
    const airportRun = requests.find(({ purpose, vehicles: assigned }) =>
      purpose === "International student airport run" && assigned.some(({ universityId }) => universityId === "STU-V01"));
    expect(Object.values(airportRun.vehicleProblems).flat().map(({ type }) => type)).toContain("plate_expires");

    const honor = requests.find(({ purpose }) => purpose === "Honor choir clinic in Tulsa");
    const { body: honorDetail } = await request(app).get(`/api/requests/${honor.id}`).set(headers);
    expect(Object.values(honorDetail.driverProblems).flat().map(({ type }) => type)).toEqual(["license_expires"]);
  });
});
