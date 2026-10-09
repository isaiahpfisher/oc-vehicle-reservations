import db from "../models/index.js";
import logger from "../config/logger.js";
import { requiredInt } from "../helpers/fields.js";

const Op = db.Sequelize.Op;
const exports = {};

exports.findAll = async (req, res) => {
  if (req.user.role === "admin") {
    return res.status(404).send({ message: "Enrollment not found." });
  }

  try {
    const enrollments = await db.enrollment.findAll({
      where: { studentId: req.user.id },
      order: [["id", "ASC"]],
    });

    return res.send(enrollments);
  } catch (err) {
    logger.error(`enrollment findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch enrollments." });
  }
};

exports.create = async (req, res) => {
  if (req.user.role === "admin") {
    return res.status(404).send({ message: "Enrollment not found." });
  }

  const sectionId = requiredInt(req.body.sectionId);
  if (!sectionId) {
    return res.status(400).send({ message: "sectionId cannot be empty for enrollment!" });
  }

  try {
    const section = await db.section.findByPk(sectionId);
    if (!section) {
      return res.status(404).send({ message: `Section with id=${sectionId} not found.` });
    }

    const sameTermSections = await db.section.findAll({
      where: {
        courseId: section.courseId,
        semesterId: section.semesterId,
      },
    });
    const sameTermIds = sameTermSections.map((row) => row.id).filter((id) => id !== sectionId);

    if (sameTermIds.length > 0) {
      await db.enrollment.destroy({
        where: {
          studentId: req.user.id,
          sectionId: { [Op.in]: sameTermIds },
        },
      });
    }

    const existing = await db.enrollment.findOne({
      where: { studentId: req.user.id, sectionId },
    });
    if (existing) {
      return res.status(201).send(existing);
    }

    const enrollment = await db.enrollment.create({
      studentId: req.user.id,
      sectionId,
    });

    return res.status(201).send(enrollment);
  } catch (err) {
    logger.error(`enrollment create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create enrollment." });
  }
};

exports.delete = async (req, res) => {
  if (req.user.role === "admin") {
    return res.status(404).send({ message: "Enrollment not found." });
  }

  const sectionId = requiredInt(req.params.sectionId);
  if (!sectionId) {
    return res.status(400).send({ message: "Invalid section id." });
  }

  try {
    const existing = await db.enrollment.findOne({
      where: { studentId: req.user.id, sectionId },
    });
    if (!existing) {
      return res.status(404).send({ message: `Enrollment for section id=${sectionId} not found.` });
    }

    await db.enrollment.destroy({ where: { id: existing.id } });
    return res.status(204).send();
  } catch (err) {
    logger.error(`enrollment delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete enrollment." });
  }
};

export default exports;
