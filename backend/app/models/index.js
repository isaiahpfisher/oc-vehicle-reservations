import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import roleModel from "./role.model.js";
// INTERIM: remove once the full Feature 2 (Area Management) is merged; use its area model instead.
import areaModel from "./area.model.js";

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Register models and associations here as features define them, e.g.:
db.user = userModel(sequelize, Sequelize);
db.session = sessionModel(sequelize, Sequelize);
db.area = areaModel(sequelize, Sequelize);
db.role = roleModel(sequelize, Sequelize);

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

export default db;
