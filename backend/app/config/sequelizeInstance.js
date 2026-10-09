import "dotenv/config";
import dbConfig from "./db.config.js";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  timezone: dbConfig.timezone,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
  logging: false,
  define: {
    underscored: true,
  },
});

export default sequelize;
