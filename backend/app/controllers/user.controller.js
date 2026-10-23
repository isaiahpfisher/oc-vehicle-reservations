import db from "../models/index.js";
import logger from "../config/logger.js";

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const users = await db.user.findAll({
      attributes: ["id", "firstName", "lastName", "email"],
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });

    return res.send(users);
  } catch (err) {
    logger.error(`User findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch users." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).send({ message: "Invalid user id." });
    }

    const user = await db.user.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: `User with id=${userId} not found.` });
    }

    return res.send(user);
  } catch (err) {
    logger.error(`User findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch user profile." });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).send({ message: "Invalid user id." });
    }

    const user = await db.user.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: `User with id=${userId} not found.` });
    }

    const { role } = req.body;

    if (role !== undefined && role !== null && String(role).trim()) {
      user.role = String(role).trim();
      await user.save();
    }

    const updatedUser = await db.user.findByPk(userId);
    return res.send(updatedUser);
  } catch (err) {
    logger.error(`User update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update user profile." });
  }
};

export default exports;
