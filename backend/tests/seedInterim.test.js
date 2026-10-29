/**
 * Feature 8 — Vehicle Request Management (INTERIM seed data)
 * Spec: features/feature-8-vehicle-requests.md → Assumptions
 * INTERIM(features 4–7): delete this file when those features replace the interim seed blocks.
 */
import db from "../app/models/index.js";
import { INTERIM_DESTINATIONS, INTERIM_DRIVERS, INTERIM_VEHICLES, seed } from "../scripts/seed.mjs";
import { createUserWithRoles, syncTestDatabase } from "./helpers.js";

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 8 — Vehicle Request Management seed data (INTERIM)", () => {
  it("Seed adds sample vehicles, drivers, and destinations and replaces old requests", async () => {
    const result = await seed();
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain(`Added interim sample data: ${INTERIM_VEHICLES.length} vehicles`);

    expect(await db.vehicle.count()).toBe(INTERIM_VEHICLES.length);
    expect(await db.driver.count()).toBe(INTERIM_DRIVERS.length);
    expect(await db.destination.count()).toBe(INTERIM_DESTINATIONS.length);

    // Vehicles land in their named area; drivers link to seeded accounts by email.
    const bus = await db.vehicle.findOne({ where: { universityId: "ATH-B01" }, include: ["area", "vehicleType"] });
    expect(bus.area.name).toBe("Athletics");
    expect(bus.vehicleType.requiresCdl).toBe(true);
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
    expect(await db.vehicle.count()).toBe(INTERIM_VEHICLES.length);
    expect(await db.driver.count()).toBe(INTERIM_DRIVERS.length);
  });
});
