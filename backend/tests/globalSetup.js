/**
 * Runs once before the suite. Each test file gets a fresh copy of the helpers, so the schema
 * rebuild lives here instead of on the first test in every file.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default async function globalSetup() {
  process.env.NODE_ENV = "test";
  dotenv.config({ path: path.join(backendDir, ".env.test.example"), override: true });
  dotenv.config({ path: path.join(backendDir, ".env.test"), override: true });
  process.env.NODE_ENV = "test";

  const db = (await import("../app/models/index.js")).default;
  const name = db.sequelize.config.database;
  if (!String(name).endsWith("-test")) {
    throw new Error(`Refusing to reset "${name}": test databases must be named *-test.`);
  }

  try {
    await db.sequelize.getQueryInterface().dropAllTables();
    await db.sequelize.sync({ force: true });
  } finally {
    await db.sequelize.close();
  }
}
