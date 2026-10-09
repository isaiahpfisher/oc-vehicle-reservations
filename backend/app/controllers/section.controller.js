import db from "../models/index.js";
import { requiredText, requiredInt } from "../helpers/fields.js";
const Section = db.section;
const Op = db.Sequelize.Op;
const SECTION_NUMBER_REGEX = /^[A-Z]{4}-\d{4}-\d{2}$/;
const DAYS_OF_WEEK = /^(M|T|W|TH|F)(,(M|T|W|TH|F))*$/;
const exports = {};
// Create and Save a section
exports.create = async (req, res) => {
  // Validate request
  const sectionNumber = requiredText(req.body.sectionNumber);
  const semesterId = requiredInt(req.body.semesterId);
  const courseId = requiredInt(req.body.courseId);
  const startTime = requiredText(req.body.startTime);
  const endTime = requiredText(req.body.endTime);
  const facultyFacultyId = requiredInt(req.body.facultyFacultyId);
  const daysOfWeek = requiredText(req.body.daysOfWeek);

  if (!sectionNumber) {
    return res.status(400).send({
      message: "Section Number cannot be empty for section!",
    });
  }
  if (!semesterId) {
    return res.status(400).send({
      message: "semester cannot be empty for section!",
    });
  }
  if (!courseId) {
    return res.status(400).send({
      message: "courseId cannot be empty for section!",
    });
  }
  if (!facultyFacultyId) {
    return res.status(400).send({
      message: "facultyId cannot be empty for section!",
    });
  }
  if (!daysOfWeek) {
    return res.status(400).send({
      message: "daysOfWeek cannot be empty for section!",
    });
  }
  if (!startTime) {
    return res.status(400).send({
      message: "startTime cannot be empty for section!",
    });
  }
  if (!endTime) {
    return res.status(400).send({
      message: "daysOfWeek cannot be empty for section!",
    });
  }

  if (!SECTION_NUMBER_REGEX.test(sectionNumber)) {
    return res.status(400).send({
      message: "Section number must be one in the form XXXX-####-## (ex. COMP-1234-01)",
    });
  }
  if (!DAYS_OF_WEEK.test(daysOfWeek)) {
    return res.status(400).send({
      message: "Days of week must be one or more of M, T, W, TH, F (ex. M,T,W,TH,F)",
    });
  }

  // Create a section
  const section = {
    sectionNumber: sectionNumber,
    semesterId: semesterId,
    courseId: courseId,
    facultyFacultyId: facultyFacultyId,
    daysOfWeek: daysOfWeek,
    startTime: startTime,
    endTime: endTime,
  };

  try {
    const data = await Section.create(section);
    res.status(201).send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while creating the section.",
    });
  }
};

// Retrieve all sectiones
exports.findAll = async (req, res) => {
  try {
    const data = await Section.findAll({ order: [["sectionNumber", "ASC"]] });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving sections.",
    });
  }
};
// Retrieve all sectiones for a project
exports.findAllForCourse = async (req, res) => {
  const courseId = req.params.id;
  try {
    const data = await Section.findAll({
      where: {
        courseId: courseId,
      },
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving sections.",
    });
  }
};

// Find a single section with an id
exports.findOne = async (req, res) => {
  const id = req.params.id;

  try {
    const data = await Section.findByPk(id, {
      include: [
        {
          model: db.faculty,
          as: "faculty",
        },
        {
          model: db.enrollment,
          as: "enrollments",
          include: [
            {
              model: db.user,
              as: "user",
            },
          ],
        },
      ],
    });
    if (!data) {
      return res.status(404).send({ message: `section with id=${id} not found.` });
    }
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving section with id=" + id,
    });
  }
};

// Update a section by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  let section = await Section.findByPk(id);

  try {
    const num = await Section.update(req.body, {
      where: { id: id },
    });
    if (num == 1) {
      section = await Section.findByPk(id);
      res.status(200).send(section);
    } else {
      res.send({
        message: `Cannot update section with id=${id}. Maybe section was not found or req.body is empty!`,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error updating section with id=" + id,
    });
  }
};

// Delete a section with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;

  try {
    const sectionId = id;
    if (sectionId === null) {
      return res.status(400).send({ message: "Invalid section id." });
    }

    const existing = await db.section.findByPk(sectionId);
    if (!existing) {
      return res.status(404).send({
        message: `Section with id=${sectionId} not found.`,
      });
    }

    await db.section.destroy({ where: { id: sectionId } });

    return res.status(200).send({ message: "section deleted successfully." });
  } catch (err) {
    return res.status(500).send({ message: "Failed to delete section." });
  }
};

// Delete all sectiones from the database.
exports.deleteAll = async (req, res) => {
  try {
    const number = await Section.destroy({
      where: {},
      truncate: false,
    });
    res.send({ message: `${number} sections were deleted successfully!` });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while removing all sections.",
    });
  }
};

export default exports;
