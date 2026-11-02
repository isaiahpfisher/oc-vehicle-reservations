/**
 * INTERIM(feature-7): `GET /api/drivers/selectable` from Feature 7's spec (FR-015), so the request form can pick drivers.
 * Delete this file and its mount in routes/index.js when Feature 7 merges; the frontend already calls this path.
 */
import { Router } from "express";
import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

/** Approved drivers whose license hasn't expired. */
router.get("/selectable", [authenticate], async (_req, res) => {
  try {
    const drivers = await db.driver.findAll({
      attributes: ["id", "firstName", "lastName"],
      where: {
        status: "approved",
        licenseExpirationDate: { [Op.gte]: new Date().toISOString().slice(0, 10) },
      },
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });
    return res.send(drivers);
  } catch (err) {
    logger.error(`driver selectable failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch drivers." });
  }
});

export default router;
