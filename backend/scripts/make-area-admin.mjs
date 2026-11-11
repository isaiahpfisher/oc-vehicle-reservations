/**
 * Feature 3 — FR-018: leave an existing user as area admin of one area.
 * Usage (from backend/): npm run make-area-admin -- <email> <area name or id>
 */
import { isDirectRun, makeAreaAdmin, runRoleScript } from "./role-scripts.mjs";

if (isDirectRun(import.meta.url)) {
  await runRoleScript("make-area-admin", () => makeAreaAdmin(process.argv[2], process.argv.slice(3).join(" ")));
}
