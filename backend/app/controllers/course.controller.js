import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId, requiredText, requiredInt } from "../helpers/fields.js";

const DEPARTMENTS = ["Computer Science", "Engineering", "English", "Business", "Art"];
const FREQUENCIES = ["Yearly", "Even Years", "Odd Years"];
const SEMESTERS = ["Fall", "Winter", "Spring", "Summer"];
const COURSE_NUMBER_REGEX = /^[A-Z]{4}-\d{4}$/;
const exports = {};

exports.findAll = async (req, res) => {
  try {
    const courses = await db.course.findAll({
      include: {
        model: db.section,
        as: 'sections',
        include: [
          {model: db.faculty, as: "faculty"},
          {model: db.semester, as: "semester"}
        ]
      },
      order: [["number", "ASC"]],
    });

    return res.send(courses);
  } catch (err) {
    logger.error(`course findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch courses." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const courseId = parseId(req.params.id);
    if (courseId === null) {
      return res.status(400).send({ message: "Invalid course id." });
    }

    const course = await db.course.findByPk(courseId);
    if (!course) {
      return res.status(404).send({ message: `Course with id=${courseId} not found.` });
    }

    return res.send(course);
  } catch (err) {
    logger.error(`Course findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch course." });
  }
};

exports.create = async (req, res) => {
  try {
    const name = requiredText(req.body.name);
    const number = requiredText(req.body.number);
    const description = requiredText(req.body.description);
    const semesters = req.body.semesters;
    const frequency = requiredText(req.body.frequency);
    const hours = requiredInt(req.body.hours);
    const department = requiredText(req.body.department);

    if (!name || !number || !description || !semesters || !frequency || !hours || !department) {
      return res.status(400).send({ message: "Required" });
    }

    if (name.length > 255) {
      return res.status(400).send({
        message: "Course name cannot be longer than 255 characters.",
      });
    }

    if (!COURSE_NUMBER_REGEX.test(number)) {
      return res.status(400).send({
        message: "Number must be one in the form XXXX-#### (ex. COMP-1234)",
      });
    }

    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).send({
        message: `Department must be one of ${DEPARTMENTS.join(", ")}.`,
      });
    }

    if (!FREQUENCIES.includes(frequency)) {
      return res.status(400).send({
        message: `Frequency must be one of ${FREQUENCIES.join(", ")}.`,
      });
    }

    if (!semesters.every((semester) => SEMESTERS.includes(semester))) {
      return res.status(400).send({
        message: `Semester must be one or more of ${SEMESTERS.join(", ")}.`,
      });
    }

    const existing = await db.course.findOne({
      where: { number },
    });
    if (existing) {
      return res.status(400).send({ message: "Course number is already taken." });
    }

    const course = await db.course.create({
      name,
      number,
      description,
      semesters,
      frequency,
      hours,
      department,
    });

    return res.status(201).send(course);
  } catch (err) {
    logger.error(`course create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create course." });
  }
};

exports.update = async (req, res) => {
  try {
    const courseId = parseId(req.params.id ?? req.body.id);
    const name = requiredText(req.body.name);
    const number = requiredText(req.body.number);
    const description = requiredText(req.body.description);
    const semesters = req.body.semesters;
    const frequency = requiredText(req.body.frequency);
    const hours = requiredInt(req.body.hours);
    const department = requiredText(req.body.department);

    if (courseId === null) {
      return res.status(400).send({ message: "Invalid course id." });
    }

    const existing = await db.course.findByPk(courseId);
    if (!existing) {
      return res.status(404).send({
        message: `Course with id=${courseId} not found.`,
      });
    }

    if (!name || !number || !description || !semesters || !frequency || !hours || !department) {
      return res.status(400).send({ message: "Required" });
    }

    if (!COURSE_NUMBER_REGEX.test(number)) {
      return res.status(400).send({
        message: "Number must be one in the form XXXX-#### (ex. COMP-1234)",
      });
    }

    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).send({
        message: `Department must be one of ${DEPARTMENTS.join(", ")}.`,
      });
    }

    if (!FREQUENCIES.includes(frequency)) {
      return res.status(400).send({
        message: `Frequency must be one of ${FREQUENCIES.join(", ")}.`,
      });
    }

    if (!semesters.every((semester) => SEMESTERS.includes(semester))) {
      return res.status(400).send({
        message: `Semester must be one or more of ${SEMESTERS.join(", ")}.`,
      });
    }

    const duplicate = await db.course.findOne({
      where: { number },
    });
    if (duplicate && duplicate.id !== courseId) {
      return res.status(400).send({ message: "Course number is already taken." });
    }

    existing.update(
      {
        name,
        number,
        description,
        semesters,
        frequency,
        hours,
        department,
      },
      { where: { id: courseId } },
    );

    return res.status(200).send(existing);
  } catch (err) {
    logger.error(`course update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update course." });
  }
};

exports.remove = async (req, res) => {
  try {
    const courseId = parseId(req.params.id);
    if (courseId === null) {
      return res.status(400).send({ message: "Invalid course id." });
    }

    const existing = await db.course.findByPk(courseId);
    if (!existing) {
      return res.status(404).send({
        message: `Course with id=${courseId} not found.`,
      });
    }

    await db.course.destroy({ where: { id: courseId } });

    return res.status(200).send({ message: "course deleted successfully." });
  } catch (err) {
    logger.error(`course delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete course." });
  }
};

export default exports;
