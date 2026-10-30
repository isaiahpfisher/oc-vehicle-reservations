import { Op } from "sequelize";
import db from "../models/index.js";

const ROLE_REQUIRED_MESSAGES = {
  admin: "Admin role required.",
  maintenance: "Maintenance role required.",
  area_admin: "Area admin role required.",
};

/** True if the user holds any of `roles`. Admins hold every role. */
export const holdsAnyRole = (user, roles) =>
  user.roles.some(({ role }) => role === "admin" || roles.includes(role));

export const isAdmin = (user) => holdsAnyRole(user, []);

/** True if the user may act on resources in `areaId`: admins, or area admins of that area. */
export const canAccessArea = (user, areaId) =>
  user.roles.some(({ role, areaId: roleAreaId }) => role === "admin" || (role === "area_admin" && roleAreaId === areaId));

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized! No token provided." });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).send({ message: "Unauthorized! No token provided." });
  }

  const session = await db.session.findOne({
    where: {
      token,
      expirationDate: { [Op.gte]: new Date() },
    },
    include: [
      {
        model: db.user,
        as: "user",
        include: [{ model: db.role, as: "roles", attributes: ["id", "role", "areaId"] }],
      },
    ],
  });

  if (!session || !session.user) {
    return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
  }

  req.user = {
    id: session.user.id,
    roles: session.user.roles.map(({ id, role, areaId }) => ({ id, role, areaId })),
  };

  next();
};

/** Authenticate, then pass if the user holds any listed role (admin always passes); otherwise 403. */
export const authorizeRoles = (...roles) => {
  const message =
    roles.length === 1 && ROLE_REQUIRED_MESSAGES[roles[0]]
      ? ROLE_REQUIRED_MESSAGES[roles[0]]
      : `One of these roles is required: ${roles.join(", ")}.`;

  return (req, res, next) =>
    authenticate(req, res, () => {
      if (!holdsAnyRole(req.user, roles)) {
        return res.status(403).send({ message });
      }

      next();
    });
};

export const authenticateAdmin = authorizeRoles("admin");
export const authenticateMaintenance = authorizeRoles("maintenance");
export const authenticateAreaAdmin = authorizeRoles("area_admin");
