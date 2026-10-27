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
