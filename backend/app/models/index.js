import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import roleModel from "./role.model.js";
import areaModel from "./area.model.js";
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
db.area = areaModel(sequelize, Sequelize);
db.role = roleModel(sequelize, Sequelize);
db.vehicleType = vehicleTypeModel(sequelize, Sequelize); // INTERIM(feature-4)
db.vehicle = vehicleModel(sequelize, Sequelize); // INTERIM(feature-5)
db.destination = destinationModel(sequelize, Sequelize); // INTERIM(feature-6)
db.driver = driverModel(sequelize, Sequelize); // INTERIM(feature-7)
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

// INTERIM(feature-5): vehicle associations. Remove when Feature 5 merges its own.
db.area.hasMany(db.vehicle, { foreignKey: "areaId", as: "vehicles" });
db.vehicle.belongsTo(db.area, { foreignKey: "areaId", as: "area" });
db.vehicleType.hasMany(db.vehicle, { foreignKey: "vehicleTypeId", as: "vehicles" });
db.vehicle.belongsTo(db.vehicleType, { foreignKey: "vehicleTypeId", as: "vehicleType" });

// Feature 8 — vehicle requests
db.user.hasMany(db.vehicleRequest, { foreignKey: "userId", as: "vehicleRequests" });
db.vehicleRequest.belongsTo(db.user, { foreignKey: "userId", as: "user" });
db.user.hasMany(db.vehicleRequest, { foreignKey: "approverId", as: "approvedVehicleRequests" });
db.vehicleRequest.belongsTo(db.user, { foreignKey: "approverId", as: "approver" });
db.area.hasMany(db.vehicleRequest, { foreignKey: "areaId", as: "vehicleRequests" });
db.vehicleRequest.belongsTo(db.area, { foreignKey: "areaId", as: "area" });

db.vehicleRequest.hasMany(db.vehicleRequestDestination, {
  foreignKey: "vehicleRequestId",
  as: "stops",
  onDelete: "CASCADE",
});
db.vehicleRequestDestination.belongsTo(db.vehicleRequest, { foreignKey: "vehicleRequestId", as: "vehicleRequest" });
db.destination.hasMany(db.vehicleRequestDestination, { foreignKey: "destinationId", as: "requestStops" });
db.vehicleRequestDestination.belongsTo(db.destination, { foreignKey: "destinationId", as: "destination" });

db.vehicleRequest.hasMany(db.vehicleRequestVehicle, {
  foreignKey: "vehicleRequestId",
  as: "requestVehicles",
  onDelete: "CASCADE",
});
db.vehicleRequestVehicle.belongsTo(db.vehicleRequest, { foreignKey: "vehicleRequestId", as: "vehicleRequest" });
db.vehicle.hasMany(db.vehicleRequestVehicle, { foreignKey: "vehicleId", as: "requestVehicles" });
db.vehicleRequestVehicle.belongsTo(db.vehicle, { foreignKey: "vehicleId", as: "vehicle" });

db.vehicleRequest.hasMany(db.vehicleRequestDriver, {
  foreignKey: "vehicleRequestId",
  as: "requestDrivers",
  onDelete: "CASCADE",
});
db.vehicleRequestDriver.belongsTo(db.vehicleRequest, { foreignKey: "vehicleRequestId", as: "vehicleRequest" });
db.driver.hasMany(db.vehicleRequestDriver, { foreignKey: "driverId", as: "requestDrivers" });
db.vehicleRequestDriver.belongsTo(db.driver, { foreignKey: "driverId", as: "driver" });

export default db;
