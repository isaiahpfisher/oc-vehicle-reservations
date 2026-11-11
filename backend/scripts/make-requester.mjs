/**
 * Feature 3 — FR-018: remove every role from an existing user.
 * Usage (from backend/): npm run make-requester -- <email>
 */
import { isDirectRun, makeRequester, runRoleScript } from "./role-scripts.mjs";

if (isDirectRun(import.meta.url)) {
  await runRoleScript("make-requester", () => makeRequester(process.argv[2]));
}
