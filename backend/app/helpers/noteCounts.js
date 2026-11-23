import { fn, col } from "sequelize";
import db from "../models/index.js";
import { canSeeHiddenNotes } from "../authorization/noteScope.js";

/**
 * UI/UX backlog #73: how many notes each listed record has, and when the latest was posted, so list rows can show
 * which records have a conversation without opening each one. Counts only the notes this viewer may read: hidden
 * notes (`isVisible: false`) count only for people who can see them (Feature 14).
 *
 * `key` is the note's parent column (`issueReportId`, `maintenanceNeedId`, `vehicleRequestId`). Returns a function
 * from a record id to `{ noteCount, lastNoteAt }` (`0` and `null` when there are none).
 */
export const noteCountsFor = async (user, key, ids) => {
  const counts = new Map();
  if (ids.length) {
    const where = { [key]: ids };
    if (!canSeeHiddenNotes(user)) {
      where.isVisible = true;
    }

    // Raw `col()` names skip Sequelize's attribute → column mapping, so use the model's own column names.
    const column = (attribute) => db.note.getAttributes()[attribute].field;
    const rows = await db.note.findAll({
      attributes: [key, [fn("COUNT", col(column("id"))), "noteCount"], [fn("MAX", col(column("createdAt"))), "lastNoteAt"]],
      where,
      group: [key],
      raw: true,
    });
    for (const row of rows) {
      counts.set(Number(row[key]), {
        noteCount: Number(row.noteCount),
        lastNoteAt: row.lastNoteAt ? new Date(row.lastNoteAt).toISOString() : null,
      });
    }
  }

  return (id) => counts.get(Number(id)) ?? { noteCount: 0, lastNoteAt: null };
};
