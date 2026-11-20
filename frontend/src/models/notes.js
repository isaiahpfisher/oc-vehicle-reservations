/** Feature 14 — display and permission helpers for notes. No HTTP, no Vue state. */

export const authorName = (author) => [author?.firstName, author?.lastName].filter(Boolean).join(" ") || "Unknown user";

export const authorInitials = (author) =>
  [author?.firstName, author?.lastName]
    .filter(Boolean)
    .map((name) => name[0].toUpperCase())
    .join("") || "?";

const timestampFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** The full date and time, e.g. `Nov 3, 2026, 2:15 PM` (tooltips and confirm messages). */
export const noteTimestamp = (createdAt) => (createdAt ? timestampFormat.format(new Date(createdAt)) : "");

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const dayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const dayYearFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * A short time a reader can place at a glance: `Today at 2:15 PM`, `Yesterday at 9:02 AM`, `Monday at 3:00 PM`
 * (this week), `Nov 3 at 2:15 PM` (this year), or `Nov 3, 2025 at 2:15 PM`.
 */
export const friendlyTimestamp = (createdAt, now = new Date()) => {
  if (!createdAt) {
    return "";
  }

  const date = new Date(createdAt);
  // Rounded so a daylight-saving change doesn't make a day 23 or 25 hours long.
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = timeFormat.format(date);

  if (daysAgo === 0) return `Today at ${time}`;
  if (daysAgo === 1) return `Yesterday at ${time}`;
  if (daysAgo > 1 && daysAgo < 7) return `${weekdayFormat.format(date)} at ${time}`;

  const day = (date.getFullYear() === now.getFullYear() ? dayFormat : dayYearFormat).format(date);
  return `${day} at ${time}`;
};

/**
 * Who, besides staff, reads each parent's notes, and what the parent is called. On a maintenance need every reader
 * is staff (Feature 11), so there is no one to hide a note from and no `audience`.
 */
export const NOTE_PARENT_DETAILS = {
  vehicleRequestId: { noun: "request", audience: "requester" },
  issueReportId: { noun: "report", audience: "reporter" },
  maintenanceNeedId: { noun: "need", audience: null },
};

/** US-14.3: staff get a separate **Staff only** channel wherever someone who isn't staff can read the notes. */
export const hasStaffChannel = (parentKey) => !!NOTE_PARENT_DETAILS[parentKey]?.audience;

/**
 * FR-004 / US-14.5: admins delete any note; anyone else only their own, and only while no one else has posted after it.
 * `notes` is the thread as the user sees it, oldest first.
 */
export const canDeleteNote = (note, notes, { userId, isAdmin }) => {
  if (isAdmin) {
    return true;
  }

  if (note.authorId !== userId) {
    return false;
  }

  const index = notes.findIndex(({ id }) => id === note.id);
  return !notes.slice(index + 1).some(({ authorId }) => authorId !== userId);
};
