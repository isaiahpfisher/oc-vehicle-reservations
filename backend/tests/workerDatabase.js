/**
 * Each Jest worker runs against its own copy of the test database, so test files can run in parallel without wiping
 * each other's rows. Worker 1 (and any in-band run) uses `DB_NAME` itself; worker N uses `<name>-wN-test`, which keeps
 * the `-test` suffix every reset checks for. `globalSetup.js` builds them all before the run.
 */
export const workerDatabase = (baseName, workerId) => {
  const id = Number(workerId) || 1;
  if (id === 1) {
    return baseName;
  }

  return String(baseName).replace(/-test$/, "") + `-w${id}-test`;
};
