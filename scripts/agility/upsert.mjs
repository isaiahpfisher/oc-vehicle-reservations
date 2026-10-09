/**
 * Idempotent push: match existing Agility assets by Reference (scope-wide), update them in place,
 * and create only what is missing. Runs in phases so tests are never created as nested children
 * of a story that already has them:
 *   1. epic   — create if missing, else sync its Name and Reference
 *   2. stories — create/update under the epic
 *   3. tests   — create/update under their story (moving misfiled tests via Parent)
 */

import { findAssetByRefOrName, listAssetsWhere } from "./rest-helpers.mjs";

/**
 * Load every epic, story, and test in the scope once per run.
 * @param {(path: string) => Promise<{ ok: boolean, status: number, text: string }>} restGet
 * @param {string} scopeWhere e.g. `Scope='Scope:1234'`
 */
export async function loadExistingAssets(restGet, scopeWhere) {
  const [epics, stories, tests] = await Promise.all([
    listAssetsWhere(restGet, "Epic", scopeWhere, ["Name", "Reference"]),
    listAssetsWhere(restGet, "Story", scopeWhere, ["Name", "Reference", "Super"]),
    listAssetsWhere(restGet, "Test", scopeWhere, ["Name", "Reference", "Parent"]),
  ]);
  return { epics, stories, tests };
}

/** Name fallback only considers assets without a Reference, so it never steals another item's asset. */
function unreferenced(assets) {
  return assets.filter((asset) => !asset.reference);
}

/**
 * Epic lookup order: Reference → the epic this feature's existing stories live under → Name.
 * The story-based step disambiguates features that share an epic name (e.g. two "Section Management").
 */
function resolveEpic(feature, existing) {
  const byRef = findAssetByRefOrName(existing.epics, { ref: feature.epic.ref });
  if (byRef) {
    return byRef;
  }

  const storyRefs = new Set(feature.stories.map((story) => story.ref));
  const epicOids = existing.stories
    .filter((story) => storyRefs.has(story.reference) && story.super)
    .map((story) => story.super);
  if (epicOids.length > 0) {
    const counts = new Map();
    for (const oid of epicOids) counts.set(oid, (counts.get(oid) ?? 0) + 1);
    const [oid] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const epic = existing.epics.find((asset) => asset.oid === oid);
    if (epic) {
      return epic;
    }
  }

  return findAssetByRefOrName(unreferenced(existing.epics), { name: feature.epic.name });
}

/**
 * @param {object} feature from buildBacklog()
 * @param {{ epics: object[], stories: object[], tests: object[] }} existing from loadExistingAssets()
 */
export function buildFeatureUpsertPlan(feature, existing) {
  const epic = resolveEpic(feature, existing);
  const epicStories = epic ? existing.stories.filter((story) => story.super === epic.oid) : [];

  const stories = feature.stories.map((story) => {
    const match =
      findAssetByRefOrName(existing.stories, { ref: story.ref }) ??
      findAssetByRefOrName(unreferenced(epicStories), { name: story.name });
    return { story, oid: match?.oid ?? null };
  });

  const tests = stories.flatMap(({ story, oid: storyOid }) =>
    story.tests.map((test) => {
      const siblings = storyOid ? existing.tests.filter((asset) => asset.parent === storyOid) : [];
      const match =
        findAssetByRefOrName(existing.tests, { ref: test.ref }) ??
        findAssetByRefOrName(unreferenced(siblings), { name: test.name });
      return { test, storyRef: story.ref, oid: match?.oid ?? null, moved: Boolean(match && match.parent !== storyOid) };
    }),
  );

  return { feature, epic, stories, tests };
}

function epicNeedsUpdate(plan) {
  const { epic } = plan.feature;
  return plan.epic.reference !== epic.ref || plan.epic.name !== epic.name;
}

export function formatUpsertPlanSummary(plan) {
  const count = (items, exists) => items.filter((item) => Boolean(item.oid) === exists).length;
  return {
    epic: plan.epic ? (epicNeedsUpdate(plan) ? "found (Name/Reference synced)" : "found") : "create",
    storiesCreate: count(plan.stories, false),
    storiesUpdate: count(plan.stories, true),
    testsCreate: count(plan.tests, false),
    testsUpdate: count(plan.tests, true),
    testsMoved: plan.tests.filter((item) => item.moved).length,
  };
}

function epicPayload(plan, scopeRef) {
  const { epic } = plan.feature;
  if (!plan.epic) {
    return { Scope: scopeRef, AssetType: "Epic", Name: epic.name, Description: epic.description, Reference: epic.ref };
  }
  if (epicNeedsUpdate(plan)) {
    return { from: plan.epic.oid, update: { Name: epic.name, Reference: epic.ref } };
  }
  return null;
}

function storyPayloads(plan, scopeRef, epicOid) {
  return plan.stories.map(({ story, oid }) => {
    const fields = { Name: story.name, Description: story.description, Reference: story.ref, Super: epicOid };
    return oid ? { from: oid, update: fields } : { Scope: scopeRef, AssetType: "Story", ...fields };
  });
}

function testPayloads(plan, storyOidByRef) {
  return plan.tests.map(({ test, storyRef, oid }) => {
    const fields = {
      Name: test.name,
      Description: test.description,
      ExpectedResults: test.expectedResults,
      Reference: test.ref,
      Parent: storyOidByRef.get(storyRef),
    };
    // Test.Scope is read-only (inherited from the parent story), so creates omit it.
    return oid ? { from: oid, update: fields } : { AssetType: "Test", ...fields };
  });
}

/**
 * Apply a plan in phases. `reloadStories` re-reads scope stories so newly created story OIDs are
 * resolved by Reference rather than by response order.
 * @param {object} plan from buildFeatureUpsertPlan()
 * @param {string} scopeRef
 * @param {(payloads: object[], label: string) => Promise<{ created: string[], modified: string[] }>} post
 * @param {() => Promise<object[]>} reloadStories
 */
export async function executeFeatureUpsert(plan, scopeRef, post, reloadStories) {
  const label = plan.feature.epic.name;
  let epicOid = plan.epic?.oid;
  const epicOp = epicPayload(plan, scopeRef);

  if (!epicOid) {
    const result = await post([epicOp], `Epic create (${label})`);
    if (result.created.length !== 1) {
      throw new Error(`Expected 1 epic OID, got ${result.created.length}: ${result.created.join(", ")}`);
    }
    epicOid = result.created[0];
    console.log(`  Epic created: ${epicOid}`);
  } else if (epicOp) {
    await post([epicOp], `Epic update (${label})`);
  }

  let created = 0;
  let modified = 0;

  const storyResult = await post(storyPayloads(plan, scopeRef, epicOid), `Stories (${label})`);
  created += storyResult.created.length;
  modified += storyResult.modified.length;

  const storyOidByRef = new Map(plan.stories.filter((s) => s.oid).map((s) => [s.story.ref, s.oid]));
  if (plan.stories.some((s) => !s.oid)) {
    for (const story of await reloadStories()) {
      if (story.reference && !storyOidByRef.has(story.reference)) {
        storyOidByRef.set(story.reference, story.oid);
      }
    }
  }

  const missing = plan.stories.filter((s) => !storyOidByRef.has(s.story.ref));
  if (missing.length > 0) {
    throw new Error(`Could not resolve created stories: ${missing.map((s) => s.story.ref).join(", ")}`);
  }

  const tests = testPayloads(plan, storyOidByRef);
  if (tests.length > 0) {
    const testResult = await post(tests, `Tests (${label})`);
    created += testResult.created.length;
    modified += testResult.modified.length;
  }

  return { created, modified };
}

/**
 * Compact by default: one line per feature plus only the items that will be created or moved.
 * `verbose` lists every matched item and prints the full payloads.
 */
export function printUpsertPlan(plan, scopeRef, { verbose = false } = {}) {
  const summary = formatUpsertPlanSummary(plan);
  const { feature } = plan;
  const epic = plan.epic ? `${plan.epic.oid}${summary.epic === "found" ? "" : ", name/reference synced"}` : "new epic";
  console.log(
    `Feature ${feature.num} — ${feature.epic.name} (${epic}): ` +
      `stories ${summary.storiesCreate} new / ${summary.storiesUpdate} updated, ` +
      `tests ${summary.testsCreate} new / ${summary.testsUpdate} updated` +
      (summary.testsMoved > 0 ? `, ${summary.testsMoved} moved` : ""),
  );

  for (const { story, oid } of plan.stories) {
    const tests = plan.tests.filter((t) => t.storyRef === story.ref);
    const shownTests = verbose ? tests : tests.filter((t) => !t.oid || t.moved);
    if (!verbose && oid && shownTests.length === 0) {
      continue;
    }

    console.log(`    ${oid ? "~" : "+"} ${story.ref} — ${story.name}${oid ? ` (${oid})` : ""}`);
    for (const item of shownTests) {
      const suffix = item.oid ? ` (${item.oid}${item.moved ? ", moved here" : ""})` : "";
      console.log(`        ${item.oid ? "~" : "+"} ${item.test.ref} — ${item.test.name}${suffix}`);
    }
  }

  if (!verbose) {
    return;
  }

  const epicOid = plan.epic?.oid ?? "<new epic>";
  const placeholderOids = new Map(plan.stories.map((s) => [s.story.ref, s.oid ?? `<new story ${s.story.ref}>`]));
  console.log("  Payload preview:");
  console.log(
    JSON.stringify(
      {
        epic: epicPayload(plan, scopeRef),
        stories: storyPayloads(plan, scopeRef, epicOid),
        tests: testPayloads(plan, placeholderOids),
      },
      null,
      2,
    ),
  );
}
