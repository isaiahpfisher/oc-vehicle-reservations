/**
 * Feature 8 — Vehicle Request Management (sample data for Features 4–7)
 * Spec: features/feature-8-vehicle-requests.md → Assumptions
 */
import db from "../app/models/index.js";
import { SEED_DESTINATIONS, SEED_DRIVERS, SEED_SERVICE_TYPES, SEED_VEHICLE_TYPES, SEED_VEHICLES, seed } from "../scripts/seed.mjs";
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
  });
});
