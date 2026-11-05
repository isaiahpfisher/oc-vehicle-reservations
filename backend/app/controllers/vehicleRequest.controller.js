import db from "../models/index.js";
import logger from "../config/logger.js";

const exports = {};

/** INTERIM: remove when Feature 8 serves vehicle requests. */
exports.findAll = async (_req, res) => {
  try {
    const requests = await db.vehicleRequest.findAll({
      attributes: ["id", "purpose"],
      order: [["id", "ASC"]],
    });

    return res.send(requests);
  } catch (err) {
    logger.error(`vehicle request findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch vehicle requests." });
  }
};

export default exports;
