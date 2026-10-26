/**
 * Load environment variables no matter which directory the process starts in:
 * `backend/.env` first (the documented location), then the repo-root `.env`.
 * Existing variables are never overwritten, and tests load their own env (tests/setup.js).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

if (process.env.NODE_ENV !== "test") {
  dotenv.config({ path: [path.join(backendDir, ".env"), path.join(backendDir, "..", ".env")], quiet: true });
}
