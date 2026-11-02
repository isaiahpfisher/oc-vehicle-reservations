# Digital.ai Agility import

Export user stories and Gherkin acceptance criteria from `features/` into CSV files, or push via the Bulk JSON API.

## Generate CSV import files

```bash
npm run agility:export
# or:
node scripts/export-agility-import.mjs --project "Your Project Name"
```

Creates `docs/agility-import/PortfolioItem.csv`, `Story.csv`, and `Test.csv` for Excel import into Agility.

Feature specs are **auto-discovered** from `features/feature-N-*.md` (epic title = `# Feature: …`). Before first export, set `DEFAULT_PROJECT` in `scripts/agility/backlog-data.mjs` (or pass `--project`) to your Agility Scope name.

## Push via Agility Bulk API

1. Copy `.env.agility.example` → `.env.agility` and set `AGILITY_BASE_URL`, `AGILITY_ACCESS_TOKEN`, `AGILITY_SCOPE`.
2. Run:

```bash
npm run agility:push                    # full create
npm run agility:push -- --feature 1     # one feature
npm run agility:push -- --feature 1 --upsert   # update existing
```

## Record test results on ACs

```bash
npm run agility:sync-results
npm run agility:sync-results -- --verbose   # also list ACs with no test and tests with no AC
```

Asks which feature you are testing, runs the backend and frontend suites, previews which of that feature's ACs will change, asks for the tester's email if any of them has no owner, and writes only after you confirm. Then it reads the ACs back from Agility to verify them. Backend tests need `backend/.env.test` and the test database, as for `npm test`.

- **Scope:** only ACs on the chosen feature's user stories can change. Both full suites still run, because a feature's ACs can be covered by tests filed under another feature, and a test file that fails to run stops the sync whichever feature it belongs to.
- **Matching:** `describe("US-N.n …")` + `it("<Scenario title>")`, per [testing-standards.mdc](../../.cursor/rules/testing-standards.mdc). A test under another story or no story still matches if its title belongs to exactly one scenario.
- **Status:** an AC is `Failed` if any of its tests fails, `Passed` if at least one passes and none fail. ACs with no test that ran are left alone, so manually verified ACs keep their status.
- **Owner:** when an AC's status changes and it has no owner, the tester becomes its owner. Existing owners are never changed, and the email prompt is skipped if no AC needs an owner.
- **Stops without writing** if a test file fails to run, since its ACs could otherwise look passed from the other suite's tests.
- **Holds back** closed ACs and ACs whose Agility name no longer matches the spec. AC References are positional, so run `npm run agility:push -- --upsert` first if the spec changed.

Check a preview before confirming: if the test database is down, every backend test fails and its ACs will be listed as `Failed`.

See the OC CS Speckit `docs/agility-import/README.md` in the source kit repo for full Excel import steps and upsert behavior, or expand this file as your team adopts Agility.
