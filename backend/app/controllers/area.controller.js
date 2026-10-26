/**
 * INTERIM stand-in for Feature 2 (Area Management): read-only list so the Edit User page can offer
 * area admin roles. Replace with Feature 2's area controller once it is merged.
 */
import db from "../models/index.js";
import logger from "../config/logger.js";

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const areas = await db.area.findAll({
      attributes: ["id", "name", "logo"],
      order: [["name", "ASC"]],
    });

    return res.send(areas);
  } catch (err) {
    logger.error(`Area findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch areas." });
  }
};

export default exports;
