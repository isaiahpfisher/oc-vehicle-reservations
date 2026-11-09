import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import roleModel from "./role.model.js";
import areaModel from "./area.model.js";
import vehicleTypeModel from "./vehicleType.model.js";
import serviceTypeModel from "./serviceType.model.js";
import destinationModel from "./destination.model.js";
import vehicleModel from "./vehicle.model.js";
import driverModel from "./driver.model.js";
import vehicleRequestModel from "./vehicleRequest.model.js";
import vehicleRequestDestinationModel from "./vehicleRequestDestination.model.js";
import vehicleRequestDriverModel from "./vehicleRequestDriver.model.js";
import vehicleRequestVehicleModel from "./vehicleRequestVehicle.model.js";
import issueReportModel from "./issueReport.model.js";
import mileageLogModel from "./mileageLog.model.js";
import maintenanceNeedModel from "./maintenanceNeed.model.js";

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Register models and associations here as features define them, e.g.:
db.user = userModel(sequelize, Sequelize);
db.session = sessionModel(sequelize, Sequelize);
db.area = areaModel(sequelize, Sequelize);
db.vehicleType = vehicleTypeModel(sequelize, Sequelize);
db.role = roleModel(sequelize, Sequelize);
db.serviceType = serviceTypeModel(sequelize, Sequelize);
db.destination = destinationModel(sequelize, Sequelize);
db.vehicle = vehicleModel(sequelize, Sequelize);
db.driver = driverModel(sequelize, Sequelize);
db.vehicleRequest = vehicleRequestModel(sequelize, Sequelize);
db.vehicleRequestDestination = vehicleRequestDestinationModel(sequelize, Sequelize);
db.vehicleRequestDriver = vehicleRequestDriverModel(sequelize, Sequelize);
db.vehicleRequestVehicle = vehicleRequestVehicleModel(sequelize, Sequelize);
db.issueReport = issueReportModel(sequelize, Sequelize);
db.mileageLog = mileageLogModel(sequelize, Sequelize);
db.maintenanceNeed = maintenanceNeedModel(sequelize, Sequelize);

db.user.hasMany(db.session, {
  foreignKey: "userId",
  as: "sessions",
  onDelete: "CASCADE",
});

db.session.belongsTo(db.user, {
  foreignKey: "userId",
  as: "user",
});

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

db.area.hasMany(db.vehicle, {
  foreignKey: "areaId",
  as: "vehicles",
  onDelete: "RESTRICT",
});

db.vehicle.belongsTo(db.area, {
  foreignKey: "areaId",
  as: "area",
  onDelete: "RESTRICT",
});

db.vehicleType.hasMany(db.vehicle, {
  foreignKey: "vehicleTypeId",
  as: "vehicles",
  onDelete: "RESTRICT",
});

db.vehicle.belongsTo(db.vehicleType, {
  foreignKey: "vehicleTypeId",
  as: "vehicleType",
  onDelete: "RESTRICT",
});

db.user.hasOne(db.driver, {
  foreignKey: "userId",
  as: "driver",
  onDelete: "SET NULL",
});

db.driver.belongsTo(db.user, {
  foreignKey: "userId",
  as: "user",
  onDelete: "SET NULL",
});

// Feature 8: requests are never deleted, so the rows they point at can't be either (controllers answer 400 first).
db.user.hasMany(db.vehicleRequest, { foreignKey: "userId", as: "vehicleRequests", onDelete: "RESTRICT" });
db.vehicleRequest.belongsTo(db.user, { foreignKey: "userId", as: "user", onDelete: "RESTRICT" });
db.user.hasMany(db.vehicleRequest, { foreignKey: "approverId", as: "approvedVehicleRequests", onDelete: "SET NULL" });
db.vehicleRequest.belongsTo(db.user, { foreignKey: "approverId", as: "approver", onDelete: "SET NULL" });
db.area.hasMany(db.vehicleRequest, { foreignKey: "areaId", as: "vehicleRequests", onDelete: "RESTRICT" });
db.vehicleRequest.belongsTo(db.area, { foreignKey: "areaId", as: "area", onDelete: "RESTRICT" });

db.vehicleRequest.hasMany(db.vehicleRequestDestination, {
  foreignKey: "vehicleRequestId",
  as: "stops",
  onDelete: "CASCADE",
});
db.vehicleRequestDestination.belongsTo(db.vehicleRequest, {
  foreignKey: "vehicleRequestId",
  as: "vehicleRequest",
  onDelete: "CASCADE",
});
db.destination.hasMany(db.vehicleRequestDestination, {
  foreignKey: "destinationId",
  as: "requestStops",
  onDelete: "RESTRICT",
});
db.vehicleRequestDestination.belongsTo(db.destination, {
  foreignKey: "destinationId",
  as: "destination",
  onDelete: "RESTRICT",
});

db.vehicleRequest.hasMany(db.vehicleRequestVehicle, {
  foreignKey: "vehicleRequestId",
  as: "requestVehicles",
  onDelete: "CASCADE",
});
db.vehicleRequestVehicle.belongsTo(db.vehicleRequest, {
  foreignKey: "vehicleRequestId",
  as: "vehicleRequest",
  onDelete: "CASCADE",
});
db.vehicle.hasMany(db.vehicleRequestVehicle, { foreignKey: "vehicleId", as: "requestVehicles", onDelete: "RESTRICT" });
db.vehicleRequestVehicle.belongsTo(db.vehicle, { foreignKey: "vehicleId", as: "vehicle", onDelete: "RESTRICT" });

db.vehicleRequest.hasMany(db.vehicleRequestDriver, {
  foreignKey: "vehicleRequestId",
  as: "requestDrivers",
  onDelete: "CASCADE",
});
db.vehicleRequestDriver.belongsTo(db.vehicleRequest, {
  foreignKey: "vehicleRequestId",
  as: "vehicleRequest",
  onDelete: "CASCADE",
});
db.driver.hasMany(db.vehicleRequestDriver, { foreignKey: "driverId", as: "requestDrivers", onDelete: "RESTRICT" });
db.vehicleRequestDriver.belongsTo(db.driver, { foreignKey: "driverId", as: "driver", onDelete: "RESTRICT" });

db.vehicle.hasMany(db.mileageLog, {
  foreignKey: "vehicleId",
  as: "mileageLogs",
  onDelete: "RESTRICT",
});

db.mileageLog.belongsTo(db.vehicle, {
  foreignKey: "vehicleId",
  as: "vehicle",
  onDelete: "RESTRICT",
});

db.user.hasMany(db.mileageLog, {
  foreignKey: "userId",
  as: "mileageLogs",
  onDelete: "RESTRICT",
});

db.mileageLog.belongsTo(db.user, {
  foreignKey: "userId",
  as: "user",
  onDelete: "RESTRICT",
});

db.vehicle.hasMany(db.issueReport, {
  foreignKey: "vehicleId",
  as: "issueReports",
  onDelete: "RESTRICT",
});

db.issueReport.belongsTo(db.vehicle, {
  foreignKey: "vehicleId",
  as: "vehicle",
  onDelete: "RESTRICT",
});

db.vehicleRequest.hasMany(db.issueReport, {
  foreignKey: "vehicleRequestId",
  as: "issueReports",
  onDelete: "SET NULL",
});

db.issueReport.belongsTo(db.vehicleRequest, {
  foreignKey: "vehicleRequestId",
  as: "vehicleRequest",
  onDelete: "SET NULL",
});

db.user.hasMany(db.issueReport, {
  foreignKey: "authorId",
  as: "authoredIssueReports",
  onDelete: "RESTRICT",
});

db.issueReport.belongsTo(db.user, {
  foreignKey: "authorId",
  as: "author",
  onDelete: "RESTRICT",
});

db.user.hasMany(db.issueReport, {
  foreignKey: "assigneeId",
  as: "assignedIssueReports",
  onDelete: "SET NULL",
});

db.issueReport.belongsTo(db.user, {
  foreignKey: "assigneeId",
  as: "assignee",
  onDelete: "SET NULL",
});

db.issueReport.hasOne(db.maintenanceNeed, {
  foreignKey: "issueReportId",
  as: "maintenanceNeed",
  onDelete: "SET NULL",
});

db.maintenanceNeed.belongsTo(db.issueReport, {
  foreignKey: "issueReportId",
  as: "issueReport",
  onDelete: "SET NULL",
});

db.user.hasMany(db.maintenanceNeed, {
  foreignKey: "authorId",
  as: "authoredMaintenanceNeeds",
  onDelete: "RESTRICT",
});

db.maintenanceNeed.belongsTo(db.user, {
  foreignKey: "authorId",
  as: "author",
  onDelete: "RESTRICT",
});

db.user.hasMany(db.maintenanceNeed, {
  foreignKey: "assigneeId",
  as: "assignedMaintenanceNeeds",
  onDelete: "SET NULL",
});

db.maintenanceNeed.belongsTo(db.user, {
  foreignKey: "assigneeId",
  as: "assignee",
  onDelete: "SET NULL",
});

db.vehicle.hasMany(db.maintenanceNeed, {
  foreignKey: "vehicleId",
  as: "maintenanceNeeds",
  onDelete: "RESTRICT",
});

db.maintenanceNeed.belongsTo(db.vehicle, {
  foreignKey: "vehicleId",
  as: "vehicle",
  onDelete: "RESTRICT",
});

export default db;
