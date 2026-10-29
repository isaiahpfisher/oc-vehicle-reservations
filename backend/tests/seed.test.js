/**
 * Feature 3 — User Role Management
 * Spec: features/feature-3-user-role-management.md
 */
import db from "../app/models/index.js";
import { SEED_AREAS, SEED_USERS, seed } from "../scripts/seed.mjs";
import { createArea, createUserWithRoles, registerUser, syncTestDatabase } from "./helpers.js";

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

const rolesOf = async (email) => {
  const user = await db.user.findOne({ where: { email }, include: [{ model: db.role, as: "roles", include: [{ model: db.area, as: "area" }] }] });
  return user.roles.map(({ role, area }) => (area ? `${role}:${area.name}` : role)).sort();
};

describe("Feature 3 — User Role Management seed script", () => {
  describe("US-3.9 — Test as other users (development only)", () => {
    it("Seed replaces data and keeps listed accounts", async () => {
      // Existing data: me (admin + an area role), another user, an area, and sessions.
      const oldArea = await createArea("Old Area");
      const me = await createUserWithRoles(["admin", { role: "area_admin", areaId: oldArea.id }], {
        email: "me@eagles.oc.edu",
      });
      await registerUser({ email: "stale@students.oc.edu" });

      const result = await seed({ keep: [" ME@eagles.oc.edu ", "ghost@oc.edu"] });

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain("Kept: me@eagles.oc.edu.");
      expect(result.message).toContain("Not found (nothing kept): ghost@oc.edu.");

      // Everything else is replaced.
      expect(await db.user.findOne({ where: { email: "stale@students.oc.edu" } })).toBeNull();
      expect((await db.area.findAll()).map((area) => area.name).sort()).toEqual([...SEED_AREAS].sort());
      expect(await db.user.count()).toBe(SEED_USERS.length + 1);
      const seededEmails = (await db.user.findAll()).map((user) => user.email).filter((email) => email !== "me@eagles.oc.edu");
      expect(seededEmails.every((email) => email.endsWith("@oc.edu"))).toBe(true);

      // One test account per role.
      expect(await rolesOf("admin@oc.edu")).toEqual(["admin"]);
      expect(await rolesOf("maintenance@oc.edu")).toEqual(["maintenance"]);
      expect(await rolesOf("areaadmin@oc.edu")).toEqual(["area_admin:Athletics"]);
      expect(await rolesOf("multirole@oc.edu")).toEqual(["area_admin:Music", "area_admin:Theatre", "maintenance"]);
      expect(await rolesOf("requester@oc.edu")).toEqual([]);

      // My account, admin role, and session survive; my old-area role can't (areas are recreated).
      expect(await rolesOf("me@eagles.oc.edu")).toEqual(["admin"]);
      expect(await db.session.count({ where: { userId: me.body.userId } })).toBe(1);
      expect(await db.session.count()).toBe(1);

      // Running it again gives the same result.
      expect((await seed({ keep: ["me@eagles.oc.edu"] })).exitCode).toBe(0);
      expect(await db.user.count()).toBe(SEED_USERS.length + 1);
    });

    it("Seed refuses to run in production", async () => {
      await registerUser({ email: "real@oc.edu" });
      const nodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        expect(await seed()).toEqual({ exitCode: 1, message: "Refusing to seed: NODE_ENV is production." });
      } finally {
        process.env.NODE_ENV = nodeEnv;
      }

      expect(await db.user.count()).toBe(1);
      expect(await db.area.count()).toBe(0);
    });
  });
});
