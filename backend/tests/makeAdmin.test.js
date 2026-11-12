/**
 * Feature 3 — User Role Management
 * Spec: features/feature-3-user-role-management.md
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import db from "../app/models/index.js";
import { makeAdmin } from "../scripts/make-admin.mjs";
import { registerUser, syncTestDatabase } from "./helpers.js";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "make-admin.mjs");

/** Run the real CLI against the test database. */
const runCli = (...args) => spawnSync(process.execPath, [scriptPath, ...args], { env: process.env, encoding: "utf8" });

const adminRoles = (userId) => db.role.findAll({ where: { userId, role: "admin" } });

beforeEach(async () => {
  await syncTestDatabase();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 3 — User Role Management make-admin script", () => {
  describe("US-3.8 — Bootstrap the first admin", () => {
    it("Script makes an existing user an admin", async () => {
      const jane = await registerUser({ email: "jane@example.com" });

      const result = await makeAdmin("jane@example.com");

      expect(result.exitCode).toBe(0);
      expect(await adminRoles(jane.body.userId)).toHaveLength(1);
    });

    it("Script matching ignores case and spaces", async () => {
      const jane = await registerUser({ email: "jane@example.com" });

      const result = await makeAdmin(" Jane@Example.com ");

      expect(result.exitCode).toBe(0);
      expect(await adminRoles(jane.body.userId)).toHaveLength(1);
    });

    it("Script with an unknown email", async () => {
      await registerUser({ email: "jane@example.com" });

      const result = await makeAdmin("sam@example.com");
      expect(result).toEqual({ exitCode: 1, message: "No account found for sam@example.com. Sign in with Google first." });

      const cli = runCli("sam@example.com");
      expect(cli.status).toBe(1);
      expect(cli.stderr).toContain("No account found for sam@example.com. Sign in with Google first.");

      expect(await db.user.count()).toBe(1);
      expect(await db.role.count()).toBe(0);
    });

    it("Script on an existing admin", async () => {
      const jane = await registerUser({ email: "jane@example.com" });
      await makeAdmin("jane@example.com");

      const result = await makeAdmin("jane@example.com");

      expect(result.exitCode).toBe(0);
      expect(await adminRoles(jane.body.userId)).toHaveLength(1);
    });

    it("Script without an email", async () => {
      for (const email of [undefined, "", "   "]) {
        expect(await makeAdmin(email)).toEqual({ exitCode: 1, message: "Usage: npm run make-admin -- <email>" });
      }

      const cli = runCli();
      expect(cli.status).toBe(1);
      expect(cli.stderr).toContain("Usage: npm run make-admin -- <email>");
      expect(await db.role.count()).toBe(0);
    });
  });
});
