/**
 * Feature 3 — FR-018: leave an existing user with only the maintenance role.
 * Usage (from backend/): npm run make-maintenance -- <email>
 */
import { isDirectRun, makeMaintenance, runRoleScript } from "./role-scripts.mjs";

if (isDirectRun(import.meta.url)) {
  await runRoleScript("make-maintenance", () => makeMaintenance(process.argv[2]));
}
