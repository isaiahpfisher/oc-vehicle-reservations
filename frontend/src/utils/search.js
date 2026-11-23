/**
 * UI/UX backlog #32: true when every word of `query` appears somewhere in `parts` (case-insensitive), the way the
 * other list searches work. An empty query matches everything.
 */
export const matchesWords = (query, parts) => {
  const words = String(query ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = parts.filter((part) => part !== null && part !== undefined).join(" ").toLowerCase();
  return words.every((word) => text.includes(word));
};
