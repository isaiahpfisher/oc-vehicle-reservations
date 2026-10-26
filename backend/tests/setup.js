import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.test");
const examplePath = path.join(__dirname, "..", ".env.test.example");

// override: tests must never inherit DB_NAME etc. from the shell (that once pointed tests at the dev DB).
// The example sets defaults; a local .env.test, if present, wins over it.
dotenv.config({ path: examplePath, override: true, quiet: true });
dotenv.config({ path: envPath, override: true, quiet: true });

process.env.NODE_ENV = "test";
