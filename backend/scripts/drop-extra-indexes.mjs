/**
 * Drop duplicate MySQL indexes left behind by Sequelize sync ({ alter: true }).
 * Keeps one index per table and column list. Does not drop the database or its rows.
 *
 * Usage (from the repo root): npm run drop-extra-indexes
 * Preview only: npm run drop-extra-indexes -- --dry-run
 */
import path from "path";
import { fileURLToPath } from "url";
import sequelize from "../app/config/sequelizeInstance.js";

// npm keeps --dry-run for itself and sets npm_config_dry_run instead of putting it in argv.
const dryRun = process.argv.includes("--dry-run") || process.env.npm_config_dry_run === "true";
const ident = /^[A-Za-z0-9_]+$/;

const quote = (name) => {
  if (!ident.test(name)) {
    throw new Error(`Unexpected identifier: ${name}`);
  }

  return `\`${name}\``;
};

const chooseKeeper = (names, foreignKeys) => {
  const protectedName = names.find((name) => name === "PRIMARY" || foreignKeys.has(name));
  if (protectedName) {
    return protectedName;
  }

  const plain = names.filter((name) => !/_\d+$/.test(name));
  const pool = plain.length ? plain : names;
  return pool.slice().sort((left, right) => left.length - right.length || left.localeCompare(right))[0];
};

export const dropExtraIndexes = async () => {
  const [indexes] = await sequelize.query(`
    SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique,
           GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
  `);
  const [foreignKeys] = await sequelize.query(`
    SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  const foreignKeyNames = new Map();
  for (const row of foreignKeys) {
    const names = foreignKeyNames.get(row.tableName) ?? new Set();
    names.add(row.constraintName);
    foreignKeyNames.set(row.tableName, names);
  }

  const groups = new Map();
  for (const row of indexes) {
    const key = `${row.tableName}|${row.nonUnique}|${row.columns}`;
    const names = groups.get(key) ?? [];
    names.push(row.indexName);
    groups.set(key, names);
  }

  const dropped = [];
  for (const [key, names] of groups) {
    if (names.length < 2) {
      continue;
    }

    const [tableName] = key.split("|");
    const keeper = chooseKeeper(names, foreignKeyNames.get(tableName) ?? new Set());
    for (const indexName of names) {
      if (indexName === keeper || indexName === "PRIMARY") {
        continue;
      }

      const statement = `ALTER TABLE ${quote(tableName)} DROP INDEX ${quote(indexName)}`;
      if (!dryRun) {
        await sequelize.query(statement);
      }
      dropped.push(`${tableName}.${indexName}`);
    }
  }

  return dropped;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    if (dryRun) {
      console.log("Dry run. No indexes will be dropped.");
    }
    const dropped = await dropExtraIndexes();
    const verb = dryRun ? "Would drop" : "Dropped";
    console.log(dropped.length ? `${verb} ${dropped.length} duplicate index(es):` : "No duplicate indexes.");
    for (const name of dropped) {
      console.log(`  ${name}`);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
