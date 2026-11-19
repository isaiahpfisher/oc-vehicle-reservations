/**
 * Runs once before the suite. Each test file gets a fresh copy of the helpers, so the schema
 * rebuild lives here instead of on the first test in every file.
 *
 * Files run in parallel, one database per Jest worker (workerDatabase.js). The schema is built once with Sequelize
 * in `DB_NAME`, then copied to every other worker's database with `SHOW CREATE TABLE`, which keeps the foreign keys
 * (`CREATE TABLE ... LIKE` would drop them).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { workerDatabase } from "./workerDatabase.js";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const assertTestDatabase = (name) => {
  if (!String(name).endsWith("-test")) {
    throw new Error(`Refusing to reset "${name}": test databases must be named *-test.`);
  }
};

export default async function globalSetup(globalConfig) {
  process.env.NODE_ENV = "test";
  dotenv.config({ path: path.join(backendDir, ".env.test.example"), override: true });
  dotenv.config({ path: path.join(backendDir, ".env.test"), override: true });
  process.env.NODE_ENV = "test";

  const db = (await import("../app/models/index.js")).default;
  const { sequelize } = db;
  const name = sequelize.config.database;
  assertTestDatabase(name);

  try {
    await sequelize.getQueryInterface().dropAllTables();
    await sequelize.sync({ force: true });

    const workers = Math.max(1, Number(globalConfig?.maxWorkers) || 1);
    if (workers === 1) {
      return;
    }

    const [tables] = await sequelize.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const createStatements = [];
    for (const row of tables) {
      const table = Object.values(row)[0];
      const [[created]] = await sequelize.query(`SHOW CREATE TABLE \`${table}\``);
      createStatements.push(created["Create Table"]);
    }

    // One transaction pins one connection, so USE and FOREIGN_KEY_CHECKS apply to every statement after them.
    await sequelize.transaction(async (transaction) => {
      const run = (sql) => sequelize.query(sql, { transaction });
      await run("SET FOREIGN_KEY_CHECKS = 0");
      try {
        for (let id = 2; id <= workers; id += 1) {
          const copy = workerDatabase(name, id);
          assertTestDatabase(copy);
          await run(`DROP DATABASE IF EXISTS \`${copy}\``);
          await run(`CREATE DATABASE \`${copy}\``);
          await run(`USE \`${copy}\``);
          for (const statement of createStatements) {
            await run(statement);
          }
        }
      } finally {
        await run(`USE \`${name}\``);
        await run("SET FOREIGN_KEY_CHECKS = 1");
      }
    });
  } finally {
    await sequelize.close();
  }
}
