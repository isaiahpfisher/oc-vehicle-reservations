import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import facultyModel from "./faculty.model.js";
import courseModel from "./course.model.js";
import sectionModel from "./section.model.js"
import semesterModel from "./semester.model.js"
import enrollmentModel from "./enrollment.model.js"
import areaModel from "./area.model.js"
import roleModel from "./role.model.js";
import vehicleTypeModel from "./vehicleType.model.js";
import vehicleModel from "./vehicle.model.js";
import destinationModel from "./destination.model.js";
import driverModel from "./driver.model.js";
import vehicleRequestModel from "./vehicleRequest.model.js";
import vehicleRequestDestinationModel from "./vehicleRequestDestination.model.js";
import vehicleRequestDriverModel from "./vehicleRequestDriver.model.js";
import vehicleRequestVehicleModel from "./vehicleRequestVehicle.model.js";

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
db.area = areaModel(sequelize, Sequelize);
db.role = roleModel(sequelize, Sequelize); // STUB(feature-3)
db.vehicleType = vehicleTypeModel(sequelize, Sequelize); // STUB(feature-4)
db.vehicle = vehicleModel(sequelize, Sequelize); // STUB(feature-5)
db.destination = destinationModel(sequelize, Sequelize); // STUB(feature-6)
db.driver = driverModel(sequelize, Sequelize); // STUB(feature-7)
db.vehicleRequest = vehicleRequestModel(sequelize, Sequelize);
db.vehicleRequestDestination = vehicleRequestDestinationModel(sequelize, Sequelize);
db.vehicleRequestDriver = vehicleRequestDriverModel(sequelize, Sequelize);
db.vehicleRequestVehicle = vehicleRequestVehicleModel(sequelize, Sequelize);

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

// STUB(feature-3): role associations copied from feature/3-user-role-management. Remove when Feature 3 merges.
db.user.hasMany(db.role, {
  foreignKey: "userId",
  as: "roles",
  onDelete: "CASCADE",
});
db.role.belongsTo(db.user, {
  foreignKey: "userId",
  as: "user",
});
db.area.hasMany(db.role, {
  foreignKey: "areaId",
  as: "roles",
  onDelete: "CASCADE",
});
db.role.belongsTo(db.area, {
  foreignKey: "areaId",
  as: "area",
});

// STUB(feature-5): vehicle associations. Remove when Feature 5 merges.
db.area.hasMany(db.vehicle, { foreignKey: "areaId", as: "vehicles" });
db.vehicle.belongsTo(db.area, { foreignKey: "areaId", as: "area" });
db.vehicleType.hasMany(db.vehicle, { foreignKey: "vehicleTypeId", as: "vehicles" });
db.vehicle.belongsTo(db.vehicleType, { foreignKey: "vehicleTypeId", as: "vehicleType" });

// Feature 8 — vehicle requests
db.user.hasMany(db.vehicleRequest, { foreignKey: "user_id", as: "vehicleRequests" });
db.vehicleRequest.belongsTo(db.user, { foreignKey: "user_id", as: "user" });
db.user.hasMany(db.vehicleRequest, { foreignKey: "approver_id", as: "approvedVehicleRequests" });
db.vehicleRequest.belongsTo(db.user, { foreignKey: "approver_id", as: "approver" });
db.area.hasMany(db.vehicleRequest, { foreignKey: "area_id", as: "vehicleRequests" });
db.vehicleRequest.belongsTo(db.area, { foreignKey: "area_id", as: "area" });

db.vehicleRequest.hasMany(db.vehicleRequestDestination, {
  foreignKey: "vehicle_request_id",
  as: "stops",
  onDelete: "CASCADE",
});
db.vehicleRequestDestination.belongsTo(db.vehicleRequest, { foreignKey: "vehicle_request_id", as: "vehicleRequest" });
db.destination.hasMany(db.vehicleRequestDestination, { foreignKey: "destination_id", as: "requestStops" });
db.vehicleRequestDestination.belongsTo(db.destination, { foreignKey: "destination_id", as: "destination" });

db.vehicleRequest.hasMany(db.vehicleRequestVehicle, {
  foreignKey: "vehicle_request_id",
  as: "requestVehicles",
  onDelete: "CASCADE",
});
db.vehicleRequestVehicle.belongsTo(db.vehicleRequest, { foreignKey: "vehicle_request_id", as: "vehicleRequest" });
db.vehicle.hasMany(db.vehicleRequestVehicle, { foreignKey: "vehicle_id", as: "requestVehicles" });
db.vehicleRequestVehicle.belongsTo(db.vehicle, { foreignKey: "vehicle_id", as: "vehicle" });

db.vehicleRequest.hasMany(db.vehicleRequestDriver, {
  foreignKey: "vehicle_request_id",
  as: "requestDrivers",
  onDelete: "CASCADE",
});
db.vehicleRequestDriver.belongsTo(db.vehicleRequest, { foreignKey: "vehicle_request_id", as: "vehicleRequest" });
db.driver.hasMany(db.vehicleRequestDriver, { foreignKey: "driver_id", as: "requestDrivers" });
db.vehicleRequestDriver.belongsTo(db.driver, { foreignKey: "driver_id", as: "driver" });

export default db;
