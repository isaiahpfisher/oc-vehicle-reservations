/**
 * Feature 3 — FR-018: replace a user's roles with one development role.
 */
import path from "path";
import { fileURLToPath } from "url";
import db from "../app/models/index.js";

const notFound = (email) => `No account found for ${email}. Sign in with Google first.`;

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

const findUser = async (email, usage) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return { error: { exitCode: 1, message: usage } };

  const user = await db.user.findOne({
    where: { email: normalized },
    include: [{ model: db.role, as: "roles" }],
  });
  if (!user) return { error: { exitCode: 1, message: notFound(normalized) } };

  return { user, normalized };
};

const sameRoles = (roles, expected) =>
  roles.length === expected.length &&
  expected.every((wanted) =>
    roles.some((role) => role.role === wanted.role && (role.areaId ?? null) === (wanted.areaId ?? null)),
  );

const replaceRoles = async (user, next) => {
  await db.sequelize.transaction(async (transaction) => {
    await db.role.destroy({ where: { userId: user.id }, transaction });
    if (next.length) {
      await db.role.bulkCreate(
        next.map((role) => ({ userId: user.id, role: role.role, areaId: role.areaId ?? null })),
        { transaction },
      );
    }
  });
};

const finish = (already, normalized, alreadyMessage, nowMessage) => ({
  exitCode: 0,
  message: already ? `${normalized} ${alreadyMessage}` : `${normalized} ${nowMessage}`,
});

/** Leave only the maintenance role. */
export const makeMaintenance = async (email) => {
  const usage = "Usage: npm run make-maintenance -- <email>";
  const found = await findUser(email, usage);
  if (found.error) return found.error;

  const next = [{ role: "maintenance", areaId: null }];
  const already = sameRoles(found.user.roles, next);
  if (!already) await replaceRoles(found.user, next);
  return finish(already, found.normalized, "is already a maintenance user.", "is now a maintenance user.");
};

/** Remove every role row. A user with no role rows is a requester. */
export const makeRequester = async (email) => {
  const usage = "Usage: npm run make-requester -- <email>";
  const found = await findUser(email, usage);
  if (found.error) return found.error;

  const already = found.user.roles.length === 0;
  if (!already) await replaceRoles(found.user, []);
  return finish(already, found.normalized, "is already a requester.", "is now a requester.");
};

/** A whole number is an area id. Anything else is an area name. */
const findArea = async (area) => {
  const value = String(area ?? "").trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return db.area.findByPk(Number(value));
  return (await db.area.findAll()).find((row) => row.name.toLowerCase() === value.toLowerCase()) ?? null;
};

/** Leave only area admin for one area. The area may be its name or its id. */
export const makeAreaAdmin = async (email, area) => {
  const usage = "Usage: npm run make-area-admin -- <email> <area>";
  const value = String(area ?? "").trim();
  if (!normalizeEmail(email) || !value) return { exitCode: 1, message: usage };

  const found = await findUser(email, usage);
  if (found.error) return found.error;

  const match = await findArea(value);
  if (!match) return { exitCode: 1, message: `No area found for ${value}.` };

  const next = [{ role: "area_admin", areaId: match.id }];
  const already = sameRoles(found.user.roles, next);
  if (!already) await replaceRoles(found.user, next);
  return finish(
    already,
    found.normalized,
    `is already an area admin of ${match.name}.`,
    `is now an area admin of ${match.name}.`,
  );
};

export const runRoleScript = async (name, action) => {
  try {
    const { exitCode, message } = await action();
    (exitCode === 0 ? console.log : console.error)(message);
    process.exitCode = exitCode;
  } catch (err) {
    console.error(`${name} failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
};

export const isDirectRun = (metaUrl) => process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
