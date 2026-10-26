import "./env.js";
import dbConfig from "./db.config.js";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  timezone: dbConfig.timezone,
  // Sequelize applies `timezone` itself (SET time_zone and date parsing) but also copies it into the
  // mysql2 connection, which only accepts "local", "Z", or "+HH:MM" and warns on IANA names like
  // America/Chicago. Give mysql2 its own default; dialectOptions override that copied value.
  dialectOptions: {
    timezone: "local",
  },
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
