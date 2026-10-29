/**
 * Feature 8 — Vehicle Request Management (seed data)
 * Spec: features/feature-8-vehicle-requests.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { REQUEST_STATUSES } from "../app/models/vehicleRequest.model.js";
import { SEED_REQUESTS, seed } from "../scripts/seed.mjs";
import { requestInclude } from "../app/helpers/vehicleRequests.js";
import { savedMiles } from "../app/helpers/mileage.js";
import { createUserWithRoles, syncTestDatabase } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const tripEnd = ({ endAt, allDay }) => new Date(endAt.getTime() + (allDay ? DAY_MS : 0));

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 8 — Vehicle Request Management seed data", () => {
  it("Seed adds vehicle requests covering every status and area", async () => {
    const result = await seed();

    expect(result.exitCode).toBe(0);
    expect(result.message).toContain(`Added ${SEED_REQUESTS.length} vehicle requests.`);
    const requests = await db.vehicleRequest.findAll({ include: requestInclude() });
    expect(requests).toHaveLength(SEED_REQUESTS.length);
    expect(new Set(requests.map(({ status }) => status))).toEqual(new Set(REQUEST_STATUSES));
    expect(new Set(requests.map(({ area }) => area.name)).size).toBe(6);

    // The requester test account has requests to look at.
    expect(requests.filter(({ user }) => user.email === "requester@oc.edu").length).toBeGreaterThanOrEqual(3);
  });

  it("Seeded requests follow the same rules as the API", async () => {
    await seed();
    const requests = await db.vehicleRequest.findAll({ include: requestInclude() });

    for (const row of requests) {
      const label = row.purpose;
      expect([label, row.endAt >= row.startAt]).toEqual([label, true]);
      expect([label, row.stops.length > 0, row.requestDrivers.length > 0]).toEqual([label, true, true]);

      // Drivers are approved and licensed through the last day of the trip.
      const lastDay = new Date(row.endAt).toISOString().slice(0, 10);
      for (const { driver } of row.requestDrivers) {
        expect([label, driver.status, driver.licenseExpirationDate >= lastDay]).toEqual([label, "approved", true]);
      }

      // No destination twice in a row; estimated miles are filled in where saved distances allow (no Google key in tests).
      const stops = [...row.stops].sort((a, b) => a.stopOrder - b.stopOrder).map(({ destination }) => destination);
      const stopIds = stops.map(({ id }) => id);
      expect([label, stopIds.some((id, i) => i > 0 && id === stopIds[i - 1])]).toEqual([label, false]);
      expect([label, row.estimatedMiles]).toEqual([label, savedMiles(stops)]);

      // Approval matches status (FR-005), and vehicles match FR-006 and belong to the request's area.
      const approved = ["awaiting_vehicle", "reserved", "returned"].includes(row.status);
      expect([label, row.approverId !== null, row.approvedAt !== null]).toEqual([label, approved, approved]);
      expect([label, row.requestVehicles.length > 0]).toEqual([label, ["reserved", "returned"].includes(row.status)]);
      for (const { vehicle } of row.requestVehicles) {
        expect([label, vehicle.areaId]).toEqual([label, row.areaId]);
        if (vehicle.vehicleType.requiresCdl) {
          expect([label, row.requestDrivers.some(({ driver }) => driver.hasCdl)]).toEqual([label, true]);
        }
      }
    }

    // No vehicle is on two overlapping trips that still hold it.
    const holding = requests.filter(({ status }) => !["cancelled", "denied"].includes(status));
    for (const a of holding) {
      for (const b of holding) {
        if (a.id >= b.id || a.startAt >= tripEnd(b) || b.startAt >= tripEnd(a)) continue;
        const shared = a.requestVehicles.filter(({ vehicleId }) => b.requestVehicles.some((other) => other.vehicleId === vehicleId));
        expect([a.purpose, b.purpose, shared.length]).toEqual([a.purpose, b.purpose, 0]);
      }
    }
  });

  it("Seeded requests show up for the right people", async () => {
    await seed();
    const { body: admin } = await createUserWithRoles(["admin"], { email: "me@eagles.oc.edu" });
    const bearer = { Authorization: `Bearer ${admin.token}` };

    const response = await request(app).get("/api/requests").set(bearer);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(SEED_REQUESTS.length);
    const choir = response.body.find(({ purpose }) => purpose.startsWith("Choir tour"));
    expect(choir.destinations.map(({ name }) => name)).toEqual(["Abilene Christian University", "Lubbock Christian University"]);
    expect(choir.vehicles.map(({ universityId }) => universityId)).toEqual(["MUS-B01"]);
    expect(choir.allDay).toBe(true);
    expect(choir.startAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
