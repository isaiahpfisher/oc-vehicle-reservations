/**
 * Development only. Stops the backend, drops and recreates the databases named
 * by DB_NAME in backend/.env and backend/.env.test, then deletes this machine's
 * Supabase prefix folder and recreates it empty. Does not start the backend again.
 * Does not drop any other database, and does not delete other people's prefix folders.
 *
 * Usage (from the repo root): npm run reset-local-data -- --yes
 */
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import mysql from "mysql2/promise";
import dbConfig from "../app/config/db.config.js";
import { resetPrefixFolder } from "../app/services/areaLogoStorage.js";

const execFileAsync = promisify(execFile);
const SYSTEM_DATABASES = new Set(["mysql", "information_schema", "performance_schema", "sys"]);
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// npm keeps --yes for itself and sets npm_config_yes instead of putting it in argv.
const confirmed = process.argv.includes("--yes") || process.env.npm_config_yes === "true";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readDbName = (filename) => {
  const filePath = path.join(backendDir, filename);
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/^DB_NAME=(.*)$/m);
  const name = match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!/^[A-Za-z0-9_-]+$/.test(name) || SYSTEM_DATABASES.has(name)) {
    throw new Error(`DB_NAME in ${filename} is missing or not an application database.`);
  }

  return name;
};

const backendPort = () => {
  const port = Number(process.env.PORT || 3200);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT is not a valid port.");
  }

  return port;
};

const processInfo = async (pid) => {
  if (process.platform === "win32") {
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-Command",
      `$p = Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}'; if ($p) { Write-Output $p.ParentProcessId; Write-Output $p.CommandLine }`,
    ]);
    const [parentLine, ...commandLines] = stdout.split(/\r?\n/);
    const parentPid = Number(String(parentLine).trim());
    return {
      pid,
      parentPid: Number.isInteger(parentPid) && parentPid > 0 ? parentPid : null,
      command: commandLines.join(" ").trim(),
    };
  }

  const { stdout } = await execFileAsync("ps", ["-o", "ppid=", "-o", "args=", "-p", String(pid)]);
  const match = stdout.trim().match(/^(\d+)\s+([\s\S]*)$/);
  return {
    pid,
    parentPid: match ? Number(match[1]) : null,
    command: match?.[2]?.trim() ?? "",
  };
};

const processChain = async (pid) => {
  const chain = [];
  const seen = new Set();
  let current = pid;

  while (current && !seen.has(current) && chain.length < 12) {
    seen.add(current);
    const info = await processInfo(current);
    chain.push(info);
    current = info.parentPid;
  }

  return chain;
};

const listeningPids = async (port) => {
  if (process.platform === "win32") {
    const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"]);
    const pids = new Set();
    for (const line of stdout.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (parts[3] !== "LISTENING" || !parts[1]?.endsWith(`:${port}`)) {
        continue;
      }
      const pid = Number(parts[4]);
      if (Number.isInteger(pid) && pid > 0) {
        pids.add(pid);
      }
    }
    return [...pids];
  }

  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
    return [...new Set(stdout.trim().split(/\s+/).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0))];
  } catch {
    return [];
  }
};

const killTree = async (pid) => {
  try {
    if (process.platform === "win32") {
      await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"]);
      return;
    }

    const { stdout } = await execFileAsync("ps", ["-o", "pid=", "--ppid", String(pid)]);
    for (const child of stdout.trim().split(/\s+/).map(Number).filter((item) => item > 0)) {
      await killTree(child);
    }
    process.kill(pid, "SIGTERM");
  } catch (err) {
    const text = `${err.stderr || ""} ${err.message}`;
    if (!/not found|no such process|no running instance/i.test(text)) {
      throw err;
    }
  }
};

const waitForPortToClose = async (port) => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if ((await listeningPids(port)).length === 0) {
      return;
    }
    await delay(200);
  }

  throw new Error(`The backend on port ${port} did not stop.`);
};

const stopBackend = async () => {
  const port = backendPort();
  const pids = await listeningPids(port);
  if (!pids.length) {
    console.log(`Backend is not running on port ${port}.`);
    return;
  }

  const chain = await processChain(pids[0]);
  const server = chain.find((item) => item.command.includes("server.js"));
  if (!server) {
    throw new Error(`Port ${port} is in use, but it is not this backend. Stop that program before resetting.`);
  }

  const watch = [...chain].reverse().find((item) => item.command.includes("--watch") && item.command.includes("server.js"));
  await killTree((watch ?? server).pid);
  await waitForPortToClose(port);
  console.log(`Stopped the backend on port ${port}.`);
};

export const resetLocalDatabases = async () => {
  const names = [...new Set([readDbName(".env"), readDbName(".env.test")])];
  const connection = await mysql.createConnection({
    host: dbConfig.HOST,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
  });

  try {
    const [rows] = await connection.query("SHOW DATABASES");
    const existing = new Set(rows.map((row) => row.Database));

    for (const name of names) {
      if (existing.has(name)) {
        await connection.query(`DROP DATABASE \`${name}\``);
      }
      await connection.query(`CREATE DATABASE \`${name}\``);
    }

    return names;
  } finally {
    await connection.end();
  }
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to reset data when NODE_ENV=production.");
    }
    if (!confirmed) {
      throw new Error("Usage: npm run reset-local-data -- --yes");
    }

    await stopBackend();
    const logos = await resetPrefixFolder();
    const databases = await resetLocalDatabases();
    console.log(`Deleted ${logos.count} object(s) from area-logos/${logos.prefix}/ and recreated the folder.`);
    console.log(`Recreated database(s): ${databases.join(", ")}.`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
