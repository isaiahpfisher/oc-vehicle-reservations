import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.test");
const examplePath = path.join(__dirname, "..", ".env.test.example");

// Override so a DB_NAME exported in the shell (e.g. from the dev .env) can never point tests at the dev database.
dotenv.config({ path: examplePath, override: true });
dotenv.config({ path: envPath, override: true });

process.env.NODE_ENV = "test";

// Google Routes calls are billed: tests never use a real key, even one exported in the shell,
// and any request that still reaches Google fails loudly. Tests that need Routes stub `fetch` themselves.
delete process.env.GOOGLE_MAPS_API_KEY;
const realFetch = globalThis.fetch;
globalThis.fetch = (url, ...args) => {
  if (String(url).includes("googleapis.com")) {
    throw new Error(`Tests must not call Google APIs (${url}). Stub fetch instead.`);
  }
  return realFetch(url, ...args);
};
