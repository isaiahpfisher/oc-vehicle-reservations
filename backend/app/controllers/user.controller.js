import db from "../models/index.js";
import logger from "../config/logger.js";
import { ROLE_NAMES } from "../models/role.model.js";
import { parseId, requiredInt } from "../helpers/fields.js";
import { rolesInclude, toUserResponse } from "../helpers/users.js";
import { isAdmin } from "../authorization/authorization.js";

const exports = {};

const notFound = (res, userId) => res.status(404).send({ message: `User with id=${userId} not found.` });

/** `:id` as an integer, or `null` after sending a 400. */
const userIdParam = (req, res) => {
  const userId = parseId(req.params.id);
  if (userId === null) {
    res.status(400).send({ message: "Invalid user id." });
  }
  return userId;
};

/**
 * Validate a PUT body's `roles` into unique `{ role, areaId }` rows.
 * Returns `{ rows }` or `{ error }` with a 400 message.
 */
const parseRoles = async (roles) => {
  if (!Array.isArray(roles)) {
    return { error: "Roles must be an array." };
  }
  if (!roles.every((entry) => ROLE_NAMES.includes(entry?.role))) {
    return { error: "Invalid role." };
  }

  const rows = roles.map(({ role, areaId }) => ({ role, areaId: role === "area_admin" ? requiredInt(areaId) : null }));

  const areaIds = new Set(rows.filter(({ role }) => role === "area_admin").map(({ areaId }) => areaId));
  const allAreasExist =
    !areaIds.has(null) && (areaIds.size === 0 || (await db.area.count({ where: { id: [...areaIds] } })) === areaIds.size);
  if (!allAreasExist) {
    return { error: "Area admin role requires a valid area." };
  }

  const unique = new Map(rows.map((row) => [`${row.role}:${row.areaId}`, row]));
  return { rows: [...unique.values()] };
};

exports.findAll = async (req, res) => {
  try {
    const users = await db.user.findAll({
      attributes: ["id", "firstName", "lastName", "email", "createdAt"],
      include: rolesInclude(),
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });

    return res.send(users.map(toUserResponse));
  } catch (err) {
    logger.error(`User findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch users." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const userId = userIdParam(req, res);
    if (userId === null) return;

    // Non-admins may only read themselves; anyone else looks like a missing user.
    if (userId !== req.user.id && !isAdmin(req.user)) {
      return notFound(res, userId);
    }

    const user = await db.user.findByPk(userId, { include: rolesInclude() });
    if (!user) {
      return notFound(res, userId);
    }

    return res.send(toUserResponse(user));
  } catch (err) {
    logger.error(`User findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch user." });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = userIdParam(req, res);
    if (userId === null) return;

    const user = await db.user.findByPk(userId);
    if (!user) {
      return notFound(res, userId);
    }

    const { rows, error } = await parseRoles(req.body?.roles);
    if (error) {
      return res.status(400).send({ message: error });
    }

    if (userId === req.user.id && !rows.some(({ role }) => role === "admin")) {
      return res.status(400).send({ message: "You cannot remove your own admin role." });
    }

    // Name and email come from Google (Feature 1 FR-006); only roles change here.
    await db.sequelize.transaction(async (transaction) => {
      await db.role.destroy({ where: { userId }, transaction });
      await db.role.bulkCreate(
        rows.map((row) => ({ ...row, userId })),
        { transaction },
      );
    });

    await user.reload({ include: rolesInclude() });
    return res.send(toUserResponse(user));
  } catch (err) {
    logger.error(`User update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update user." });
  }
};

exports.remove = async (req, res) => {
  try {
    const userId = userIdParam(req, res);
    if (userId === null) return;

    if (userId === req.user.id) {
      return res.status(400).send({ message: "You cannot delete your own account." });
    }

    const user = await db.user.findByPk(userId);
    if (!user) {
      return notFound(res, userId);
    }

    await user.destroy();
    return res.status(204).send();
  } catch (err) {
    logger.error(`User delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete user." });
  }
};

export default exports;
