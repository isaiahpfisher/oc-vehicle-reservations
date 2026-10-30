/**
 * Feature 3 — FR-008: give an existing user the admin role.
 * Usage (from backend/): npm run make-admin -- <email>
 */
import path from "path";
import { fileURLToPath } from "url";
import db from "../app/models/index.js";

const USAGE = "Usage: npm run make-admin -- <email>";

/** Returns `{ exitCode, message }`; never creates users, never duplicates the admin role. */
export const makeAdmin = async (email) => {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) {
    return { exitCode: 1, message: USAGE };
  }

  const user = await db.user.findOne({ where: { email: normalized } });
  if (!user) {
    return { exitCode: 1, message: `No account found for ${normalized}. Sign in with Google first.` };
  }

  const [, created] = await db.role.findOrCreate({
    where: { userId: user.id, role: "admin", areaId: null },
  });

  return {
    exitCode: 0,
    message: created ? `${normalized} is now an admin.` : `${normalized} is already an admin.`,
  };
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const { exitCode, message } = await makeAdmin(process.argv[2]);
    (exitCode === 0 ? console.log : console.error)(message);
    process.exitCode = exitCode;
  } catch (err) {
    console.error(`make-admin failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}
