/**
 * Turn local Jest/Vitest JSON reports into Agility AC (Test asset) status changes.
 * No I/O here; scripts/sync-agility-test-results.mjs runs the tests and talks to Agility.
 */

import { findAssetByRefOrName } from "./rest-helpers.mjs";

const STORY_ID_RE = /US-\d+\.\d+/;
const TRACED_TEST_RE = /\bFeature \d+|US-\d+\.\d+/;
const ACTIVE_ASSET_STATE = "64";

/** Any failing test fails the AC; skipped tests say nothing about it. */
function verdict(statuses) {
  if (statuses.includes("failed")) return "Failed";
  return statuses.includes("passed") ? "Passed" : null;
}

/** The feature a traced test is filed under: its story's prefix, else its `Feature N` describe. */
function tracedFeature(ancestors) {
  return Number((ancestors.match(/US-(\d+)\./) ?? ancestors.match(/\bFeature (\d+)/))[1]);
}

/**
 * Match tests to ACs per testing-standards.mdc: `describe("US-N.n …")` + `it("<Scenario title>")`.
 * Tests under another story or no story (e.g. Feature 5's rules tested in Feature 2's describe)
 * still match when their title belongs to exactly one scenario. App shell and harness tests are ignored.
 * Matches against every feature before narrowing: a title shared across features must not look
 * unique just because the other feature was filtered out.
 * @param {object} backlog from buildBacklog(), with every feature
 * @param {object[]} reports parsed Jest/Vitest JSON reports
 * @param {number} featureNum the feature being tested
 * @returns {{ acs: object[], unmatched: string[] }} the feature's ACs with their `verdict`, plus its tests matching no AC
 */
export function matchResults(backlog, reports, featureNum) {
  const acs = backlog.features.flatMap((feature) =>
    feature.stories.flatMap((story) =>
      story.tests.map((test) => ({
        ...test,
        feature: feature.num,
        storyId: story.name.match(STORY_ID_RE)[0],
        statuses: [],
      })),
    ),
  );

  const byStoryAndTitle = new Map(acs.map((ac) => [`${ac.storyId}|${ac.name}`, ac]));
  const byTitle = new Map();
  for (const ac of acs) {
    byTitle.set(ac.name, [...(byTitle.get(ac.name) ?? []), ac]);
  }

  const unmatched = [];
  for (const report of reports) {
    for (const file of report.testResults) {
      for (const result of file.assertionResults) {
        const ancestors = result.ancestorTitles.join(" ");
        if (!TRACED_TEST_RE.test(ancestors)) {
          continue;
        }

        const sameTitle = byTitle.get(result.title) ?? [];
        const ac =
          byStoryAndTitle.get(`${ancestors.match(STORY_ID_RE)?.[0]}|${result.title}`) ??
          (sameTitle.length === 1 ? sameTitle[0] : null);

        if (ac) ac.statuses.push(result.status);
        else if (tracedFeature(ancestors) === featureNum) unmatched.push(result.fullName);
      }
    }
  }

  return {
    acs: acs.filter((ac) => ac.feature === featureNum).map((ac) => ({ ...ac, verdict: verdict(ac.statuses) })),
    unmatched,
  };
}

/**
 * Test files that failed without a failing test (import errors, crashed setup). Their tests never
 * ran, so an AC they share with a passing test in the other suite would wrongly look passed.
 */
export function findFilesThatDidNotRun(report) {
  return report.testResults.filter(
    (file) => file.status === "failed" && !file.assertionResults.some((result) => result.status === "failed"),
  );
}

/**
 * Only a differing status is a change. ACs whose Agility name differs from the spec are held back: References are positional, so the
 * Reference may now point at a different scenario.
 * @param {object[]} acs from matchResults()
 * @param {object[]} assets Agility Test assets
 */
export function buildResultPlan(acs, assets) {
  const plan = { changes: [], unchanged: [], noTest: [], outOfSync: [], closed: [] };

  for (const ac of acs) {
    if (!ac.verdict) {
      plan.noTest.push({ ac });
      continue;
    }

    const asset = findAssetByRefOrName(assets, { ref: ac.ref });
    if (!asset || asset.name !== ac.name) {
      plan.outOfSync.push({ ac, asset });
    } else if (asset.statusName === ac.verdict) {
      plan.unchanged.push({ ac, asset });
    } else if (asset.assetState !== ACTIVE_ASSET_STATE) {
      plan.closed.push({ ac, asset });
    } else {
      plan.changes.push({ ac, asset });
    }
  }

  return plan;
}

export function needsOwner({ asset }) {
  return asset.owners.length === 0;
}

/** The tester becomes Owner only of an AC with no owner; existing owners are never changed. */
export function resultPayload(change, statusOids, memberOid) {
  const update = { Status: statusOids.get(change.ac.verdict) };
  if (needsOwner(change)) {
    update.Owners = { add: [memberOid], remove: [] };
  }
  return { from: change.asset.oid, update };
}
