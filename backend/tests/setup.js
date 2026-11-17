import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { workerDatabase } from "./workerDatabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.test");
const examplePath = path.join(__dirname, "..", ".env.test.example");

// Override so a DB_NAME exported in the shell (e.g. from the dev .env) can never point tests at the dev database.
dotenv.config({ path: examplePath, override: true });
dotenv.config({ path: envPath, override: true });

process.env.NODE_ENV = "test";

// This worker's own database (see workerDatabase.js). Scripts the tests spawn inherit it through process.env.
process.env.DB_NAME = workerDatabase(process.env.DB_NAME, process.env.JEST_WORKER_ID);

// Google Routes calls are billed: tests never use a real key, even one exported in the shell,
// and any request that still reaches Google fails loudly. Tests that need Routes stub `fetch` themselves.
delete process.env.GOOGLE_MAPS_API_KEY;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const realFetch = globalThis.fetch;
globalThis.fetch = (url, ...args) => {
  if (String(url).includes("googleapis.com")) {
    throw new Error(`Tests must not call Google APIs (${url}). Stub fetch instead.`);
  }
  if (String(url).includes("supabase.co")) {
    throw new Error(`Tests must not call Supabase (${url}). Stub storage instead.`);
  }
  return realFetch(url, ...args);
};

// supertest starts the app with `app.listen(0)`, which binds a random port on IPv6 `::`, then sends the request to
// `127.0.0.1:<port>`. On macOS another program can already hold that port on 127.0.0.1 (Ollama does, at 49168), and
// the request goes to it instead: a test once got Ollama's `200` for `POST /api/drivers`. Binding test servers to
// 127.0.0.1 makes the system pick a port that is free there.
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function listenOnLoopback(...args) {
  if (args[0] === 0 && (args.length === 1 || typeof args[1] === "function")) {
    return listen.call(this, 0, "127.0.0.1", ...args.slice(1));
  }
  return listen.apply(this, args);
};
