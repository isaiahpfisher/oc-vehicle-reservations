/**
 * UI/UX backlog #41: maintenance need statuses as people read them. The stored value "Canceled" (Feature 11) is shown
 * as "Cancelled", the spelling requests and issue reports use. Values never change, so the API is untouched.
 */
export const NEED_STATUS_OPTIONS = [
  { title: "Open", value: "Open" },
  { title: "In Progress", value: "In Progress" },
  { title: "Completed", value: "Completed" },
  { title: "Cancelled", value: "Canceled" },
];

export const needStatusLabel = (status) => NEED_STATUS_OPTIONS.find(({ value }) => value === status)?.title ?? status;

/** Chip colors for a need's priority ("None" shows as plain text) and status, on the list and the need's page. */
export const NEED_PRIORITY_COLORS = { High: "error", Medium: "warning", Low: "info" };
export const NEED_STATUS_COLORS = { Open: "primary", "In Progress": "warning", Completed: "success" };
