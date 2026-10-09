import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import facultyModel from "./faculty.model.js";
import courseModel from "./course.model.js";
import sectionModel from "./section.model.js"
import semesterModel from "./semester.model.js"
import enrollmentModel from "./enrollment.model.js"

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Register models and associations here as features define them, e.g.:
db.user = userModel(sequelize, Sequelize);
db.session = sessionModel(sequelize, Sequelize);
db.faculty = facultyModel(sequelize, Sequelize);
db.course = courseModel(sequelize, Sequelize);
db.section = sectionModel(sequelize, Sequelize);
db.semester = semesterModel(sequelize, Sequelize);
db.enrollment = enrollmentModel(sequelize, Sequelize);

db.user.hasMany(db.session, {
  foreignKey: "userId",
  as: "sessions",
  onDelete: "CASCADE",
});

db.session.belongsTo(db.user, {
  foreignKey: "userId",
  as: "user",
});
db.course.hasMany(
	db.section,
	{as: "sections"},
	{foreignKey: {allowNull: true}}
)
db.section.belongsTo(
	db.semester,
	{as: "semester"},
	{foreignKey: {allowNull: false}, onDelete: "CASCADE"}
)
db.section.belongsTo(
	db.course,
	{as: "course"},
	{foreignKey: {allowNull: false}, onDelete: "CASCADE"}
)
db.section.belongsTo(
	db.faculty,
	{as: "faculty"},
	{foreignKey: {allowNull: false}, onDelete: "CASCADE"}
)
db.user.hasMany(db.enrollment, {
  foreignKey: "studentId",
  as: "enrollments",
  onDelete: "CASCADE",
});
db.enrollment.belongsTo(db.user, {
  foreignKey: "studentId",
  as: "user",
});
db.section.hasMany(db.enrollment, {
  foreignKey: "sectionId",
  as: "enrollments",
  onDelete: "CASCADE",
});
db.enrollment.belongsTo(db.section, {
  foreignKey: "sectionId",
  as: "section",
});
export default db;
