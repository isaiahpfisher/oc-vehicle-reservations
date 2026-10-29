import { Op } from "sequelize";
import db from "../models/index.js";

// STUB(feature-3): role helpers copied from feature/3-user-role-management. Remove when Feature 3 merges.
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
// END STUB(feature-3)

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
        // STUB(feature-3): Feature 3 loads roles here; remove this comment when it merges.
        include: [{ model: db.role, as: "roles", attributes: ["id", "role", "areaId"] }],
      },
    ],
  });

  if (!session || !session.user) {
    return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
  }

  req.user = {
    id: session.user.id,
    role: session.user.role,
    // STUB(feature-3): Feature 3 sets roles here; remove this comment when it merges.
    roles: session.user.roles.map(({ id, role, areaId }) => ({ id, role, areaId })),
  };

  next();
};
export const authenticateAdmin = async (req, res, next) => {
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
    include: [{ model: db.user, as: "user" }],
  });

  if (!session || !session.user) {
    return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
  }

  req.user = {
    id: session.user.id,
    role: session.user.role,
  };

  if (session.user.role !== "admin") {
    return res.status(401).send({ message: "Admin role required." });
  }

  next();
};
export const authenticateStudent = async (req, res, next) => {
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
    include: [{ model: db.user, as: "user" }],
  });

  if (!session || !session.user) {
    return res.status(401).send({ message: "Unauthorized! Invalid or expired token." });
  }

  req.user = {
    id: session.user.id,
    role: session.user.role,
  };

  if (session.user.role !== "student") {
    return res.status(401).send({ message: "Student role required." });
  }

  next();
};
