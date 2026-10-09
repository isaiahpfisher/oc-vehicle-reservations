import db from "../models/index.js";
import logger from "../config/logger.js";
import { parseId } from "../helpers/fields.js";

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const studentId = parseId(req.user.id);
    const semesterId = parseId(req.params.semesterId);


    if (semesterId === null) {
      return res.status(400).send({ message: "Semester id is invalid." });
    }

    const semesterExists = await db.semester.findByPk(semesterId);

    if (semesterExists === null) {
      return res.status(404).send({ message: `Semester with id=${semesterId} not found.` });
    }

    const courseListingData = await db.enrollment.findAll({
      where: {
        studentId: studentId,  
      },
      order: [["id", "ASC"]],
      include: [
        {
          model: db.section,
          as: 'section',
          where: {
            semesterId: req.params.semesterId,
          },
          include: [
            {
              model: db.course,
              as: 'course',
            },
          ],
        },
      ],
    });

    const courseListings = courseListingData.map((enrollment) => {
      return {
        enrollmentId: enrollment.id,
        sectionId: enrollment.section.sectionNumber,
        courseName: enrollment.section.course.name,
        creditHours: enrollment.section.course.hours,
        frequency: enrollment.section.daysOfWeek,
        startTime: enrollment.section.startTime,
        endTime: enrollment.section.endTime,
      };
    });

    return res.send(courseListings);
  } catch (err) {
    logger.error(`courseListing findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch course listings." });
  }
};

exports.removeEnrollment = async (req, res) => {
  try {
    const enrollmentId = parseId(req.params.enrollmentId);
    if (enrollmentId === null) {
      return res.status(400).send({ message: "Invalid enrollment id." });
    }

    await db.enrollment.destroy({ where: { id: enrollmentId } });

    return res.status(200).send({ message: "Enrollment deleted successfully." });
  } catch (err) {
    logger.error(`enrollment delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete enrollment." });
  }
};

export default exports;
