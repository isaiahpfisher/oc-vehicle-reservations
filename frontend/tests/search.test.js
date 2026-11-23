/**
 * UI/UX backlog #32 — list search helper
 * Spec: docs/ui-ux-backlog.md (no feature spec yet; scratch branch)
 */
import { describe, it, expect } from "vitest";
import { matchesWords } from "../src/utils/search.js";

describe("UI/UX backlog #32 — matchesWords", () => {
  it("matches when every word appears somewhere, in any order and case", () => {
    expect(matchesWords("oil van", ["Oil Change", "VAN-101"])).toBe(true);
    expect(matchesWords("  VAN   oil ", ["Oil Change", "VAN-101"])).toBe(true);
    expect(matchesWords("oil bus", ["Oil Change", "VAN-101"])).toBe(false);
  });

  it("treats an empty query as matching everything, and skips missing parts", () => {
    expect(matchesWords("", ["anything"])).toBe(true);
    expect(matchesWords(null, [])).toBe(true);
    expect(matchesWords("12050", [12050, null, undefined])).toBe(true);
    expect(matchesWords("null", [null])).toBe(false);
  });
});
