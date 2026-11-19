import db from "../models/index.js";

/** Sequelize `include` for the note's author. */
export const noteInclude = () => [{ model: db.user, as: "author", attributes: ["id", "firstName", "lastName"] }];

// Only text that looks like a tag (`<b>`, `</script>`, `<!-- -->`), so "a < b > c" survives.
const TAG = /<\/?[a-z!][^>]*>/gi;
// Control characters other than tab and newline.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** FR-002 / FR-005: strip markup and control characters, then trim. Returns "" for non-strings. */
export const sanitizeNoteContent = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n?/g, "\n").replace(TAG, "").replace(CONTROL, "").trim();
};

/** The note payload every note endpoint returns. */
export const toNoteResponse = (note) => ({
  id: note.id,
  vehicleRequestId: note.vehicleRequestId,
  issueReportId: note.issueReportId,
  maintenanceNeedId: note.maintenanceNeedId,
  authorId: note.authorId,
  author: note.author ? { id: note.author.id, firstName: note.author.firstName, lastName: note.author.lastName } : null,
  content: note.content,
  isVisible: note.isVisible,
  includeInEmail: note.includeInEmail,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});
