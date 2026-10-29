/**
 * INTERIM(features 6, 7): read-only pickers for the vehicle request form.
 * Delete this file and its mount in routes/index.js when Destinations (6) and Drivers (7) merge,
 * then point frontend/src/services/requestServices.js getDrivers/getDestinations at their endpoints.
 */
import { Router } from "express";
import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

/** Approved drivers whose license hasn't expired. */
router.get("/drivers", [authenticate], async (_req, res) => {
  try {
    const drivers = await db.driver.findAll({
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
    logger.error(`driver findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch drivers." });
  }
});

/** Saved ("official") destinations. */
router.get("/destinations", [authenticate], async (_req, res) => {
  try {
    const destinations = await db.destination.findAll({ where: { isSaved: true }, order: [["name", "ASC"]] });
    return res.send(destinations);
  } catch (err) {
    logger.error(`destination findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch destinations." });
  }
});

export default router;
