import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import logger from "../config/logger.js";
import { verifyGoogleIdToken } from "../authorization/googleToken.js";
import { rolesInclude, toRolesResponse } from "../helpers/users.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const isOcEmail = (email) => {
  const at = email.lastIndexOf("@");
  if (at < 1) {
    return false;
  }
  const domain = email.slice(at + 1);
  return domain === "oc.edu" || domain.endsWith(".oc.edu");
};

const buildAuthResponse = (user, token) => ({
  userId: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  roles: toRolesResponse(user.roles),
  token,
});

const createOrReuseSession = async (user) => {
  const existingSession = await db.session.findOne({
    where: {
      userId: user.id,
      email: user.email,
      expirationDate: { [Op.gte]: new Date() },
      token: { [Op.ne]: "" },
    },
  });

  if (existingSession) {
    return existingSession.token;
  }

  const expirationDate = new Date(Date.now() + SESSION_TTL_MS);
  const token = jwt.sign({ userId: user.id, email: user.email }, authConfig.secret, { expiresIn: 86400 });

  await db.session.create({
    token,
    email: user.email,
    expirationDate,
    userId: user.id,
  });

  return token;
};

/** Load roles, reuse or create a session, and send the login payload. */
const sendSignedIn = async (res, user) => {
  await user.reload({ include: rolesInclude() });
  const token = await createOrReuseSession(user);
  return res.status(200).send(buildAuthResponse(user, token));
};

const exports = {};

exports.login = async (req, res) => {
  try {
    const payload = await verifyGoogleIdToken(req.body?.googleCredentials);
    const email = String(payload?.email || "").trim().toLowerCase();
    const firstName = String(payload?.given_name || "").trim();
    const lastName = String(payload?.family_name || "").trim();

    if (!payload || !email || !firstName || !lastName) {
      return res.status(401).send({ message: "Bad Credentials." });
    }

    if (!isOcEmail(email)) {
      return res.status(401).send({ message: "Non OC email used." });
    }

    let user = await db.user.findOne({ where: { email } });
    if (!user) {
      user = await db.user.create({
        firstName,
        lastName,
        email,
      });
    } else {
      user.firstName = firstName;
      user.lastName = lastName;
      await user.save();
    }

    return await sendSignedIn(res, user);
  } catch (err) {
    logger.error(`Login failed: ${err.message}`);
    return res.status(500).send({ message: "Login failed." });
  }
};

/** Feature 3 FR-014: development-only sign-in as an existing user (no Google, shared password). */
exports.devLogin = async (req, res) => {
  if (!authConfig.devLogin.enabled()) {
    return res.status(404).send({ message: "Not found." });
  }

  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const user = email ? await db.user.findOne({ where: { email } }) : null;

    if (!user || req.body?.password !== authConfig.devLogin.password()) {
      return res.status(401).send({ message: "Bad Credentials." });
    }

    logger.warn(`Development sign-in as ${email}`);
    return await sendSignedIn(res, user);
  } catch (err) {
    logger.error(`Dev login failed: ${err.message}`);
    return res.status(500).send({ message: "Login failed." });
  }
};

exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (token) {
      await db.session.destroy({ where: { token } });
    }

    return res.status(200).send({ message: "Signed out successfully." });
  } catch (err) {
    logger.error(`Logout failed: ${err.message}`);
    return res.status(500).send({ message: "Logout failed." });
  }
};

export default exports;
