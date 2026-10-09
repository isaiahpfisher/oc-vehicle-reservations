/**
 * Shared parser: feature specs → Agility backlog structure.
 *
 * Feature specs are auto-discovered from `features/feature-N-*.md`.
 * Epic names come from each file's `# Feature: …` heading.
 * Set DEFAULT_PROJECT to your Agility Scope name before first export/push.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const rootDir = join(__dirname, "..", "..");

export const DEFAULT_PROJECT = "Courses App";

const FEATURE_FILE_RE = /^feature-(\d+)-.+\.md$/i;

/**
 * Discover `features/feature-N-*.md` and derive epic titles from `# Feature: …`.
 * @returns {{ num: number, file: string, epic: string }[]}
 */
export function discoverFeatureFiles() {
  const featuresDir = join(rootDir, "features");
  if (!existsSync(featuresDir)) {
    return [];
  }

  const discovered = [];

  for (const name of readdirSync(featuresDir)) {
    const match = name.match(FEATURE_FILE_RE);
    if (!match) continue;

    const num = Number(match[1]);
    const file = `features/${name}`;
    const content = readFileSync(join(featuresDir, name), "utf8");
    const titleMatch = content.match(/^#\s*Feature:\s*(.+)$/m);
    const epic = titleMatch ? titleMatch[1].trim() : `Feature ${num}`;

    discovered.push({ num, file, epic });
  }

  discovered.sort((a, b) => a.num - b.num || a.file.localeCompare(b.file));
  return discovered;
}

/** @type {{ num: number, file: string, epic: string }[]} */
export const FEATURE_FILES = discoverFeatureFiles();

export function storyRef(featureNum, usNum) {
  return `SK-F${featureNum}-US${featureNum}.${usNum}`;
}

export function storyId(featureNum, usNum) {
  return `US-${featureNum}.${usNum}`;
}

export function testRef(featureNum, index) {
  return `SK-F${featureNum}-AC${String(index).padStart(3, "0")}`;
}

export function epicRef(featureNum) {
  return `SK-F${featureNum}-EPIC`;
}

const GHERKIN_STEP_RE = /^(Given|When|Then|And|But)\b/i;
const STORY_ID_RE = /US-(\d+)\.(\d+)/i;

/** Lines of a `## Heading…` section, up to (not including) the next `## ` heading. */
function sectionLines(content, headingPrefix) {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${headingPrefix}`));
  if (start === -1) {
    return null;
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return end === -1 ? rest : rest.slice(0, end);
}

/** Strip list bullets (`-`, `*`, `+`, `1.`) and bold markers from a markdown line. */
function stripMarkdown(line) {
  return line
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

export function parseUserStories(content) {
  const lines =
    sectionLines(content, "User Stories") ?? content.split("## Acceptance Criteria")[0].split("\n");

  const stories = [];
  let current = null;

  for (const line of lines) {
    // `### US-3.1: Title` (also tolerates `—` / `-` separators)
    const heading = line.match(/^###\s+US-\d+\.(\d+)\s*[:—–-]\s*(.+)$/);
    if (heading) {
      current = { num: heading[1], title: heading[2].trim(), asA: "", iWant: "", soThat: "" };
      stories.push(current);
      continue;
    }

    if (line.startsWith("#")) {
      current = null;
      continue;
    }

    if (!current) {
      continue;
    }

    // Blank lines, trailing `  ` line breaks and bold are all optional around these clauses.
    const text = stripMarkdown(line);
    const asA = text.match(/^As (?:an?|the)\s+(.+)$/i);
    const iWant = text.match(/^I want(?: to)?\s+(.+)$/i);
    const soThat = text.match(/^So that\s+(.+)$/i);

    if (asA && !current.asA) current.asA = asA[1].trim();
    else if (iWant && !current.iWant) current.iWant = iWant[1].trim();
    else if (soThat && !current.soThat) current.soThat = soThat[1].trim();
  }

  return stories;
}

export function parseScenarios(content) {
  const lines = sectionLines(content, "Acceptance Criteria");
  if (!lines) {
    return [];
  }

  const scenarios = [];
  let section = "";
  let current = null;

  for (const line of lines) {
    const scenarioHeading = line.match(/^#{3,6}\s+Scenario(?: Outline)?:\s*(.+)$/i);
    if (scenarioHeading) {
      current = { section, title: scenarioHeading[1].trim(), steps: [] };
      scenarios.push(current);
      continue;
    }

    if (/^###\s/.test(line)) {
      section = line.replace(/^###\s+/, "").trim();
      current = null;
      continue;
    }

    // Steps may be `- **Given** …`, `*   **Given** …`, or unbulleted; non-Gherkin lines are ignored.
    const step = stripMarkdown(line);
    if (current && GHERKIN_STEP_RE.test(step)) {
      current.steps.push(step);
    }
  }

  return scenarios;
}

/**
 * Map each Gherkin scenario to a user story number using the AC `### US-N.n` heading.
 * Only the story number is used, so a mistyped feature prefix (e.g. `US-3.1` in feature 5) still maps.
 */
export function mapScenarioToStory(featureNum, scenario) {
  return scenario.section.match(STORY_ID_RE)?.[2] ?? "1";
}

export function formatGherkin(scenario) {
  return scenario.steps.join("\n");
}

/** Expected results are the first `Then` step plus every step after it (And/But continuations). */
export function formatExpectedResults(scenario) {
  const thenIndex = scenario.steps.findIndex((step) => /^Then\b/i.test(step));
  return thenIndex === -1 ? formatGherkin(scenario) : scenario.steps.slice(thenIndex).join("\n");
}

function storyDescription(story, feature, ref) {
  return [
    `As a/the ${story.asA}`,
    `I want ${story.iWant}`,
    `So that ${story.soThat}`,
    "",
    `Spec: ${feature.file}`,
    `Story ID: ${ref}`,
    `Branch: feature/${feature.num}-*`,
  ].join("\n");
}

/**
 * @param {string} project Agility Scope (project name)
 * @param {{ featureNums?: number[] }} [options]
 */
export function buildBacklog(project = DEFAULT_PROJECT, options = {}) {
  const { featureNums } = options;
  const featureFiles = discoverFeatureFiles();

  if (featureFiles.length === 0) {
    throw new Error(
      "No feature specs found. Add files matching features/feature-N-*.md with a `# Feature: …` heading.",
    );
  }

  const selectedFeatures =
    featureNums?.length > 0
      ? featureFiles.filter((feature) => featureNums.includes(feature.num))
      : featureFiles;

  if (featureNums?.length > 0 && selectedFeatures.length === 0) {
    const valid = featureFiles.map((feature) => feature.num).join(", ");
    throw new Error(`Unknown feature number(s): ${featureNums.join(", ")}. Valid: ${valid}`);
  }

  const features = [];
  let totalStories = 0;
  let totalTests = 0;

  for (const feature of selectedFeatures) {
    const content = readFileSync(join(rootDir, feature.file), "utf8");
    const epicReference = epicRef(feature.num);
    const stories = parseUserStories(content);
    const scenarios = parseScenarios(content);

    const testsByStory = new Map();
    for (const story of stories) {
      testsByStory.set(story.num, []);
    }

    let acIndex = 1;
    for (const scenario of scenarios) {
      const usNum = mapScenarioToStory(feature.num, scenario);
      const parentRef = storyRef(feature.num, usNum);
      const ref = testRef(feature.num, acIndex);
      acIndex += 1;

      const test = {
        ref,
        name: scenario.title,
        description: formatGherkin(scenario),
        expectedResults: formatExpectedResults(scenario),
        parentRef,
      };

      if (!testsByStory.has(usNum)) {
        console.warn(
          `Warning: ${feature.file} scenario "${scenario.title}" maps to US-${feature.num}.${usNum}, ` +
            "which has no parsed user story — it will not be pushed.",
        );
        continue;
      }
      if (scenario.steps.length === 0) {
        console.warn(`Warning: ${feature.file} scenario "${scenario.title}" has no Given/When/Then steps.`);
      }
      testsByStory.get(usNum).push(test);
    }

    const featureStories = stories.map((story) => {
      const ref = storyRef(feature.num, story.num);
      totalStories += 1;
      totalTests += testsByStory.get(story.num).length;
      return {
        ref,
        name: `${storyId(feature.num, story.num)}: ${story.title}`,
        description: storyDescription(story, feature, ref),
        tests: testsByStory.get(story.num) ?? [],
      };
    });

    features.push({
      num: feature.num,
      epic: {
        ref: epicReference,
        name: feature.epic,
        description: `Epic for ${feature.file}. Spec-driven backlog.`,
        specLink: feature.file,
      },
      stories: featureStories,
    });
  }

  return {
    project,
    features,
    totals: {
      epics: features.length,
      stories: totalStories,
      tests: totalTests,
    },
  };
}
