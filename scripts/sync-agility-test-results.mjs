/**
 * Run the local test suites and record the results on Agility ACs (Status + Owners).
 *
 * Asks which feature is being tested; only that feature's ACs can change. Previews every change,
 * then asks for the tester's email (when an AC has no owner yet) and a confirmation before writing.
 * Tests map to ACs through testing-standards.mdc naming; see scripts/agility/test-results.mjs.
 *
 * Usage:
 *   npm run agility:sync-results
 *   npm run agility:sync-results -- --verbose
 *
 * Environment (.env.agility): AGILITY_BASE_URL, AGILITY_ACCESS_TOKEN, AGILITY_SCOPE
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { buildBacklog, DEFAULT_PROJECT, FEATURE_FILES, rootDir } from "./agility/backlog-data.mjs";
import { listAssetsWhere } from "./agility/rest-helpers.mjs";
import { buildResultPlan, findFilesThatDidNotRun, matchResults, needsOwner, resultPayload } from "./agility/test-results.mjs";

// Relative and space-free so it passes through the Windows shell unquoted; gitignored via node_modules.
const REPORT_FILE = "node_modules/.cache/agility-test-results.json";
const SUITES = [
  { name: "backend", args: ["--json", `--outputFile=${REPORT_FILE}`] },
  { name: "frontend", args: ["--reporter=json", `--outputFile=${REPORT_FILE}`] },
];

const envFile = join(rootDir, ".env.agility");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const baseUrl = (process.env.AGILITY_BASE_URL ?? "").replace(/\/$/, "");
const accessToken = process.env.AGILITY_ACCESS_TOKEN ?? "";
const scopeName = process.env.AGILITY_SCOPE ?? DEFAULT_PROJECT;
const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");

function quoted(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function restGet(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  return { ok: response.ok, status: response.status, text: await response.text() };
}

function loadTestAssets() {
  return listAssetsWhere(restGet, "Test", `Scope.Name=${quoted(scopeName)}`, [
    "Name",
    "Reference",
    "Status.Name",
    "Owners",
    "AssetState",
  ]);
}

/** Returns the suite's parsed report. Failing tests are a result; a suite that did not run is an error. */
function runSuite({ name, args }) {
  console.log(`Running ${name} tests…`);
  const cwd = join(rootDir, name);
  const reportPath = join(cwd, REPORT_FILE);
  rmSync(reportPath, { force: true });
  mkdirSync(dirname(reportPath), { recursive: true });

  const run = spawnSync("npm", ["test", "--", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
    stdio: ["ignore", "ignore", "pipe"],
  });

  if (!existsSync(reportPath)) {
    throw new Error(`${name} tests did not produce a report (exit ${run.status}):\n${(run.stderr ?? "").slice(-2000)}`);
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const notRun = findFilesThatDidNotRun(report);
  if (notRun.length > 0) {
    const details = notRun.map((file) => `  ${file.name}\n${file.message ?? ""}`).join("\n");
    throw new Error(`${name}: ${notRun.length} test file(s) did not run, so results would be incomplete:\n${details}`);
  }
  if (run.status !== 0 && report.numFailedTests === 0) {
    throw new Error(`${name} tests exited ${run.status} with no failing test:\n${(run.stderr ?? "").slice(-2000)}`);
  }

  console.log(`  ${report.numPassedTests} passed, ${report.numFailedTests} failed, ${report.numPendingTests} skipped`);
  return report;
}

function printChanges(title, changes) {
  if (changes.length === 0) {
    return;
  }
  console.log(`\n${title} (${changes.length}):`);
  for (const { ac, asset } of changes) {
    console.log(`  ${ac.ref}  ${asset.statusName || "(no status)"} → ${ac.verdict}  ${ac.storyId}: ${ac.name}`);
  }
}

function printList(title, lines) {
  console.log(`  ${lines.length} ${title}`);
  if (verbose) {
    for (const line of lines) console.log(`      ${line}`);
  }
}

function printPreview(plan, unmatched) {
  const describeAc = ({ ac }) => `${ac.ref} ${ac.storyId}: ${ac.name}`;

  console.log("\nLeft as they are:");
  console.log(`  ${plan.unchanged.length} ACs already have the right status`);
  printList("ACs have no test that ran", plan.noTest.map(describeAc));
  printList("tests match no AC", unmatched);
  if (!verbose) {
    console.log("  (--verbose lists the ACs and tests above)");
  }

  if (plan.outOfSync.length > 0) {
    console.log(`\nHeld back, Agility no longer matches the spec — run npm run agility:push -- --upsert (${plan.outOfSync.length}):`);
    for (const item of plan.outOfSync) console.log(`  ${describeAc(item)}`);
  }
  if (plan.closed.length > 0) {
    console.log(`\nHeld back, closed in Agility (${plan.closed.length}):`);
    for (const item of plan.closed) console.log(`  ${describeAc(item)}  → ${item.ac.verdict}`);
  }

  printChanges("Will be marked Failed", plan.changes.filter(({ ac }) => ac.verdict === "Failed"));
  printChanges("Will be marked Passed", plan.changes.filter(({ ac }) => ac.verdict === "Passed"));
}

/** Re-prompts until the answer is a feature with a spec. */
async function promptForFeature() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("Features:");
    for (const feature of FEATURE_FILES) console.log(`  ${feature.num}  ${feature.epic}`);

    for (;;) {
      const answer = (await rl.question("\nFeature you are testing (number): ")).trim();
      const feature = FEATURE_FILES.find(({ num }) => String(num) === answer);
      if (feature) {
        return feature;
      }
      console.log(`No feature numbered "${answer}".`);
    }
  } finally {
    rl.close();
  }
}

/** Re-prompts until the email belongs to exactly one Agility member. */
async function promptForMember(rl) {
  for (;;) {
    const email = (await rl.question("\nTester email (for Owner): ")).trim();
    const members = email ? await listAssetsWhere(restGet, "Member", `Email=${quoted(email)}`, ["Name"]) : [];
    if (members.length === 1) {
      return { ...members[0], email };
    }
    console.log(
      members.length === 0
        ? `No Agility member has the email "${email}". Use the address on their Agility profile.`
        : `${members.length} Agility members have the email "${email}"; ask an admin to resolve the duplicate.`,
    );
  }
}

async function loadStatusOids() {
  const statuses = await listAssetsWhere(restGet, "TestStatus", "AssetState='64'", ["Name"]);
  const oids = new Map(statuses.map((status) => [status.name, status.oid]));
  for (const name of ["Passed", "Failed"]) {
    if (!oids.has(name)) {
      throw new Error(`Agility has no test status named "${name}".`);
    }
  }
  return oids;
}

async function postChanges(payloads) {
  const response = await fetch(`${baseUrl}/api/asset`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payloads),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Agility update failed (${response.status}): ${text.slice(0, 2000)}`);
  }

  const failures = JSON.parse(text).commandFailures?.commands ?? [];
  if (failures.length > 0) {
    throw new Error(`Agility reported ${failures.length} failed update(s):\n${JSON.stringify(failures, null, 2)}`);
  }
}

/** Read back from Agility rather than trusting the response, including after a partly failed write. */
async function verifyChanges(changes, memberOid) {
  const assets = await loadTestAssets();
  return changes.filter((change) => {
    const current = assets.find((candidate) => candidate.oid === change.asset.oid);
    const expectedOwners = needsOwner(change) ? [memberOid] : change.asset.owners;
    return !(
      current?.statusName === change.ac.verdict &&
      [...current.owners].sort().join() === [...expectedOwners].sort().join()
    );
  });
}

async function main() {
  if (!baseUrl || !accessToken) {
    throw new Error("Set AGILITY_BASE_URL and AGILITY_ACCESS_TOKEN in .env.agility (see .env.agility.example).");
  }

  const feature = await promptForFeature();
  const backlog = buildBacklog(scopeName);
  const reports = SUITES.map(runSuite);
  const { acs, unmatched } = matchResults(backlog, reports, feature.num);

  console.log(`\nLoading ACs from Agility — ${scopeName}…`);
  const assets = await loadTestAssets();
  if (assets.length === 0) {
    throw new Error(`No ACs found in "${scopeName}". Check AGILITY_SCOPE.`);
  }

  const plan = buildResultPlan(acs, assets);
  console.log(`\nFeature ${feature.num} — ${feature.epic}: ${acs.length} ACs`);
  printPreview(plan, unmatched);

  if (plan.changes.length === 0) {
    console.log("\nNothing to update.");
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const unowned = plan.changes.filter(needsOwner).length;
  let member = null;
  let answer;
  try {
    if (unowned > 0) {
      member = await promptForMember(rl);
      console.log(`\n${member.email} (${member.oid}) becomes Owner of the ${unowned} ACs with no owner.`);
    }
    console.log(`\n${plan.changes.length - unowned} ACs keep their current owner.`);
    answer = await rl.question(`Update ${plan.changes.length} ACs in Agility? [y/N] `);
  } finally {
    rl.close();
  }

  if (answer.trim().toLowerCase() !== "y") {
    console.log("Cancelled. Nothing was changed.");
    return;
  }

  const statusOids = await loadStatusOids();
  let writeError = null;
  try {
    await postChanges(plan.changes.map((change) => resultPayload(change, statusOids, member?.oid)));
  } catch (error) {
    writeError = error;
    console.error(error.message);
  }

  const notApplied = await verifyChanges(plan.changes, member?.oid);
  if (notApplied.length > 0) {
    console.error(`\n${notApplied.length} of ${plan.changes.length} ACs do not show the expected status and owner:`);
    for (const { ac } of notApplied) console.error(`  ${ac.ref}  ${ac.name}`);
  }
  if (writeError || notApplied.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`Updated and verified ${plan.changes.length} ACs.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
