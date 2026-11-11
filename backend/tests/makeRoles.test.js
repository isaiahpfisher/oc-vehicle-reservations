/**
 * Feature 3 — User Role Management
 * Spec: features/feature-3-user-role-management.md
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import db from "../app/models/index.js";
import { makeAreaAdmin, makeMaintenance, makeRequester } from "../scripts/role-scripts.mjs";
import { createArea, createUserWithRoles, registerUser, syncTestDatabase } from "./helpers.js";

const scriptsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");

const runCli = (script, ...args) =>
  spawnSync(process.execPath, [path.join(scriptsDir, script), ...args], { env: process.env, encoding: "utf8" });

const rolesOf = async (userId) => {
  const roles = await db.role.findAll({ where: { userId }, include: [{ model: db.area, as: "area" }] });
  return roles.map(({ role, area }) => (area ? `${role}:${area.name}` : role)).sort();
};

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 3 — role replacement scripts", () => {
  describe("US-3.8 — make-maintenance", () => {
    it("Script leaves only the maintenance role", async () => {
      const area = await createArea("Athletics");
      const jane = await createUserWithRoles(["admin", { role: "area_admin", areaId: area.id }], { email: "jane@example.com" });

      const result = await makeMaintenance(" Jane@Example.com ");

      expect(result).toEqual({ exitCode: 0, message: "jane@example.com is now a maintenance user." });
      expect(await rolesOf(jane.body.userId)).toEqual(["maintenance"]);
    });

    it("Script on an existing maintenance user", async () => {
      const jane = await createUserWithRoles(["maintenance"], { email: "jane@example.com" });

      expect(await makeMaintenance("jane@example.com")).toEqual({
        exitCode: 0,
        message: "jane@example.com is already a maintenance user.",
      });
      expect(await rolesOf(jane.body.userId)).toEqual(["maintenance"]);
    });

    it("Script without an email or for an unknown email changes nothing", async () => {
      await registerUser({ email: "jane@example.com" });

      expect(await makeMaintenance("")).toEqual({ exitCode: 1, message: "Usage: npm run make-maintenance -- <email>" });
      expect(await makeMaintenance("sam@example.com")).toEqual({
        exitCode: 1,
        message: "No account found for sam@example.com. Sign in with Google first.",
      });

      const cli = runCli("make-maintenance.mjs");
      expect(cli.status).toBe(1);
      expect(cli.stderr).toContain("Usage: npm run make-maintenance -- <email>");
      expect(await db.role.count()).toBe(0);
    });
  });

  describe("US-3.8 — make-requester", () => {
    it("Script removes every role", async () => {
      const area = await createArea("Music");
      const jane = await createUserWithRoles(["admin", "maintenance", { role: "area_admin", areaId: area.id }], {
        email: "jane@example.com",
      });

      const result = await makeRequester("jane@example.com");

      expect(result).toEqual({ exitCode: 0, message: "jane@example.com is now a requester." });
      expect(await rolesOf(jane.body.userId)).toEqual([]);
    });

    it("Script on an existing requester", async () => {
      const jane = await registerUser({ email: "jane@example.com" });

      expect(await makeRequester("jane@example.com")).toEqual({
        exitCode: 0,
        message: "jane@example.com is already a requester.",
      });
      expect(await rolesOf(jane.body.userId)).toEqual([]);
    });
  });

  describe("US-3.8 — make-area-admin", () => {
    it("Script leaves only area admin for the named area", async () => {
      const athletics = await createArea("Athletics");
      const music = await createArea("Music");
      const jane = await createUserWithRoles(["admin", { role: "area_admin", areaId: music.id }, "maintenance"], {
        email: "jane@example.com",
      });

      const result = await makeAreaAdmin("jane@example.com", " athletics ");

      expect(result).toEqual({ exitCode: 0, message: "jane@example.com is now an area admin of Athletics." });
      expect(await rolesOf(jane.body.userId)).toEqual([`area_admin:${athletics.name}`]);
    });

    it("Script leaves only area admin for the area id", async () => {
      const athletics = await createArea("Athletics");
      const jane = await createUserWithRoles(["maintenance"], { email: "jane@example.com" });

      const result = await makeAreaAdmin("jane@example.com", String(athletics.id));

      expect(result).toEqual({ exitCode: 0, message: "jane@example.com is now an area admin of Athletics." });
      expect(await rolesOf(jane.body.userId)).toEqual(["area_admin:Athletics"]);
    });

    it("Script on an existing area admin of that area", async () => {
      const athletics = await createArea("Athletics");
      const jane = await createUserWithRoles([{ role: "area_admin", areaId: athletics.id }], { email: "jane@example.com" });

      expect(await makeAreaAdmin("jane@example.com", "Athletics")).toEqual({
        exitCode: 0,
        message: "jane@example.com is already an area admin of Athletics.",
      });
      expect(await rolesOf(jane.body.userId)).toEqual(["area_admin:Athletics"]);
    });

    it("Script with an unknown area changes nothing", async () => {
      const jane = await createUserWithRoles(["admin"], { email: "jane@example.com" });

      expect(await makeAreaAdmin("jane@example.com", "Theatre")).toEqual({ exitCode: 1, message: "No area found for Theatre." });
      expect(await makeAreaAdmin("jane@example.com", "99999")).toEqual({ exitCode: 1, message: "No area found for 99999." });
      expect(await rolesOf(jane.body.userId)).toEqual(["admin"]);
    });

    it("Script without an email or area", async () => {
      await createArea("Student Life");
      await registerUser({ email: "jane@example.com" });

      expect(await makeAreaAdmin("jane@example.com", " ")).toEqual({
        exitCode: 1,
        message: "Usage: npm run make-area-admin -- <email> <area>",
      });
      expect(await makeAreaAdmin("", "Student Life")).toEqual({
        exitCode: 1,
        message: "Usage: npm run make-area-admin -- <email> <area>",
      });

      const cli = runCli("make-area-admin.mjs", "jane@example.com", "Student", "Life");
      expect(cli.status).toBe(0);
      expect(cli.stdout).toContain("jane@example.com is now an area admin of Student Life.");
      expect(await rolesOf((await db.user.findOne({ where: { email: "jane@example.com" } })).id)).toEqual([
        "area_admin:Student Life",
      ]);
    });
  });
});
