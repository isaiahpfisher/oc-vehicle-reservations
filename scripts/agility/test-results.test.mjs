/**
 * Run: npm run test:agility
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRestAssetList } from "./rest-helpers.mjs";
import { buildResultPlan, findFilesThatDidNotRun, matchResults, resultPayload } from "./test-results.mjs";

const backlog = {
  features: [
    {
      num: 1,
      stories: [
        { name: "US-1.1: First", tests: [{ ref: "AC1", name: "Saves" }, { ref: "AC2", name: "Shared title" }] },
      ],
    },
    {
      num: 2,
      stories: [
        { name: "US-2.1: Second", tests: [{ ref: "AC3", name: "Shared title" }, { ref: "AC4", name: "Deletes" }] },
      ],
    },
  ],
};

const result = (story, title, status = "passed") => ({
  ancestorTitles: story ? ["Feature 1 — Thing", story] : ["Feature 1 — Thing"],
  fullName: `${story} ${title}`,
  title,
  status,
});
const report = (...assertionResults) => ({ testResults: [{ status: "passed", assertionResults }] });
const verdictOf = (reports, ref) =>
  [1, 2].flatMap((num) => matchResults(backlog, reports, num).acs).find((ac) => ac.ref === ref).verdict;
const asset = (overrides = {}) => ({
  oid: "Test:1",
  name: "Saves",
  reference: "AC1",
  statusName: "",
  owners: [],
  assetState: "64",
  ...overrides,
});

describe("matchResults", () => {
  it("matches a shared title only within the test's own story", () => {
    const reports = [report(result("US-2.1 — Second", "Shared title"))];
    assert.equal(verdictOf(reports, "AC3"), "Passed");
    assert.equal(verdictOf(reports, "AC2"), null);
  });

  it("falls back to a title that belongs to one scenario", () => {
    assert.equal(verdictOf([report(result(null, "Deletes"))], "AC4"), "Passed");
    assert.equal(verdictOf([report(result("US-1.1 — First", "Deletes"))], "AC4"), "Passed");
  });

  it("reports a shared title it cannot place instead of guessing", () => {
    const { acs, unmatched } = matchResults(backlog, [report(result(null, "Shared title"))], 1);
    assert.equal(unmatched.length, 1);
    assert.ok(acs.every((ac) => ac.verdict === null));
  });

  it("fails an AC when any of its tests fails, in either suite", () => {
    const reports = [report(result("US-1.1 — First", "Saves")), report(result("US-1.1 — First", "Saves", "failed"))];
    assert.equal(verdictOf(reports, "AC1"), "Failed");
  });

  it("gives no verdict when an AC's only test was skipped", () => {
    assert.equal(verdictOf([report(result("US-1.1 — First", "Saves", "pending"))], "AC1"), null);
  });

  it("ignores harness and rule tests, even when a title matches a scenario", () => {
    const shell = { ancestorTitles: ["App shell (ui-style-system.mdc)"], fullName: "shell", title: "Deletes", status: "failed" };
    const { acs, unmatched } = matchResults(backlog, [report(shell)], 2);
    assert.deepEqual(unmatched, []);
    assert.equal(acs.find((ac) => ac.ref === "AC4").verdict, null);
  });

  it("returns only the chosen feature's ACs", () => {
    const { acs } = matchResults(backlog, [report(result("US-1.1 — First", "Saves"))], 2);
    assert.deepEqual(acs.map((ac) => ac.ref), ["AC3", "AC4"]);
  });

  it("does not let another feature's test claim a title shared across features", () => {
    const reports = [report(result("US-2.1 — Second", "Shared title", "failed"))];
    const { acs } = matchResults(backlog, reports, 1);
    assert.equal(acs.find((ac) => ac.ref === "AC2").verdict, null);
  });

  it("counts a test filed under another feature when its title belongs to the chosen feature", () => {
    const { acs } = matchResults(backlog, [report(result("US-1.1 — First", "Deletes"))], 2);
    assert.equal(acs.find((ac) => ac.ref === "AC4").verdict, "Passed");
  });

  it("reports unmatched tests only for the chosen feature", () => {
    const reports = [report(result("US-1.1 — First", "Not a scenario"))];
    assert.equal(matchResults(backlog, reports, 1).unmatched.length, 1);
    assert.equal(matchResults(backlog, reports, 2).unmatched.length, 0);
  });
});

describe("findFilesThatDidNotRun", () => {
  it("flags a failed file with no failing test, but not ordinary failures", () => {
    const crashed = { status: "failed", assertionResults: [] };
    const skippedBySetup = { status: "failed", assertionResults: [{ status: "pending" }] };
    const failing = { status: "failed", assertionResults: [{ status: "failed" }] };
    const passing = { status: "passed", assertionResults: [{ status: "passed" }] };
    assert.deepEqual(findFilesThatDidNotRun({ testResults: [crashed, skippedBySetup, failing, passing] }), [
      crashed,
      skippedBySetup,
    ]);
  });
});

describe("buildResultPlan", () => {
  const passed = { ref: "AC1", name: "Saves", verdict: "Passed" };

  it("changes an AC only when its status differs", () => {
    assert.equal(buildResultPlan([passed], [asset()]).changes.length, 1);
    assert.equal(buildResultPlan([{ ...passed, verdict: "Failed" }], [asset({ statusName: "Passed" })]).changes.length, 1);

    const same = buildResultPlan([passed], [asset({ statusName: "Passed" })]);
    assert.equal(same.changes.length, 0);
    assert.equal(same.unchanged.length, 1);
  });

  it("leaves ACs without a test alone, whatever their status", () => {
    const plan = buildResultPlan([{ ...passed, verdict: null }], [asset({ statusName: "Passed" })]);
    assert.equal(plan.changes.length, 0);
    assert.equal(plan.noTest.length, 1);
  });

  it("holds back an AC whose Reference is missing or now names another scenario", () => {
    assert.equal(buildResultPlan([passed], []).outOfSync.length, 1);
    const renamed = buildResultPlan([passed], [asset({ name: "Something else" })]);
    assert.equal(renamed.outOfSync.length, 1);
    assert.equal(renamed.changes.length, 0);
  });

  it("holds back closed ACs, which Agility will not update", () => {
    const plan = buildResultPlan([passed], [asset({ assetState: "128" })]);
    assert.equal(plan.closed.length, 1);
    assert.equal(plan.changes.length, 0);
  });
});

describe("resultPayload", () => {
  const statusOids = new Map([["Passed", "TestStatus:1"]]);
  const payload = (owners) =>
    resultPayload({ ac: { verdict: "Passed" }, asset: asset({ owners }) }, statusOids, "Member:9");

  it("makes the tester Owner of an AC with no owner", () => {
    assert.deepEqual(payload([]), {
      from: "Test:1",
      update: { Status: "TestStatus:1", Owners: { add: ["Member:9"], remove: [] } },
    });
  });

  it("changes only the status of an AC that already has an owner", () => {
    assert.deepEqual(payload(["Member:2", "Member:3"]), {
      from: "Test:1",
      update: { Status: "TestStatus:1" },
    });
  });
});

describe("parseRestAssetList", () => {
  it("reads status, every owner, and asset state", () => {
    const xml = `<Assets><Asset href="/x" id="Test:5"><Attribute name="Name">A &amp; B</Attribute><Attribute name="Reference" /><Attribute name="Status.Name">Passed</Attribute><Attribute name="AssetState">64</Attribute><Relation name="Status"><Asset idref="TestStatus:1" /></Relation><Relation name="Owners"><Asset idref="Member:1" /><Asset idref="Member:2" /></Relation></Asset><Asset href="/y" id="Test:6"><Attribute name="Name">C</Attribute><Relation name="Owners" /></Asset></Assets>`;
    const [first, second] = parseRestAssetList(xml, "Test");
    assert.equal(first.name, "A & B");
    assert.equal(first.statusName, "Passed");
    assert.deepEqual(first.owners, ["Member:1", "Member:2"]);
    assert.equal(first.assetState, "64");
    assert.deepEqual(second.owners, []);
    assert.equal(second.statusName, "");
  });
});
