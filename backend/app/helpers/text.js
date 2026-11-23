/** "A", "A and B", "A, B, and C" — for messages that name several things. */
export const listText = (items) =>
  items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
