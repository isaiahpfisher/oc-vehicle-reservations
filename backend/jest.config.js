/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  globalSetup: "./tests/globalSetup.js",
  setupFiles: ["./tests/setup.js"],
  modulePathIgnorePatterns: ["<rootDir>/deploy/"],
  // Each worker has its own database (tests/workerDatabase.js), so files can run side by side.
  maxWorkers: "50%",
  // Seeding the whole database takes a couple of seconds, more while other workers share MariaDB.
  testTimeout: 20000,
  verbose: true,
};
