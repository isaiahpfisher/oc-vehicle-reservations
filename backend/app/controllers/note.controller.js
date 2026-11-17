import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { requiredInt } from "../helpers/fields.js";
import { noteInclude, sanitizeNoteContent, toNoteResponse } from "../helpers/notes.js";
import { isAdmin } from "../authorization/authorization.js";
import { NOTE_PARENTS, canSeeHiddenNotes } from "../authorization/noteScope.js";
import { NOTE_PARENT_KEYS } from "../models/note.model.js";

const exports = {};

const FORBIDDEN_PARENT = "You do not have access to this record.";
const noteNotFound = (res, id) => res.status(404).send({ message: `Note with id=${id} not found.` });

/** Load the parent and check the caller may read it. Sends 404/403 and returns null otherwise. */
const readableParent = async (req, res, key, id) => {
  const config = NOTE_PARENTS[key];
  const parent = await config.load(id);
  if (!parent) {
    res.status(404).send({ message: config.notFoundMessage(id) });
    return null;
  }

  if (!config.canRead(req.user, parent)) {
    res.status(403).send({ message: FORBIDDEN_PARENT });
    return null;
  }

  return parent;
};

const parentKeyOf = (note) => NOTE_PARENT_KEYS.find((key) => note[key] !== null);

/** Load a note the caller may see: its parent must be readable, and hidden notes need a staff role. */
const loadVisibleNote = async (req, res) => {
  const noteId = requiredInt(req.params.noteId);
  if (noteId === null) {
    res.status(400).send({ message: "Invalid note id." });
    return null;
  }

  const note = await db.note.findByPk(noteId, { include: noteInclude() });
  if (!note) {
    noteNotFound(res, noteId);
    return null;
  }

  const key = parentKeyOf(note);
  if (!(await readableParent(req, res, key, note[key]))) {
    return null;
  }

  if (!note.isVisible && !canSeeHiddenNotes(req.user)) {
    noteNotFound(res, noteId);
    return null;
  }

  return note;
};

/** One handler for `GET /requests/:requestId/notes`, `/issue-reports/:issueReportId/notes`, and `/maintenance-needs/:maintenanceNeedId/notes`. */
exports.findAllForParent = (key) => async (req, res) => {
  try {
    const config = NOTE_PARENTS[key];
    const parentId = requiredInt(req.params[config.param]);
    if (parentId === null) {
      return res.status(400).send({ message: config.invalidMessage });
    }

    if (!(await readableParent(req, res, key, parentId))) {
      return;
    }

    const where = { [key]: parentId };
    if (!canSeeHiddenNotes(req.user)) {
      where.isVisible = true;
    }

    const notes = await db.note.findAll({
      where,
      include: noteInclude(),
      order: [
        ["createdAt", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.send(notes.map(toNoteResponse));
  } catch (err) {
    logger.error(`note findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch notes." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const note = await loadVisibleNote(req, res);
    if (!note) {
      return;
    }

    return res.send(toNoteResponse(note));
  } catch (err) {
    logger.error(`note findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch note." });
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body ?? {};
    const sent = NOTE_PARENT_KEYS.filter((key) => body[key] !== undefined && body[key] !== null);
    if (sent.length !== 1) {
      return res
        .status(400)
        .send({ message: "Exactly one of vehicleRequestId, issueReportId, or maintenanceNeedId is required." });
    }

    const [key] = sent;
    const parentId = requiredInt(body[key]);
    if (parentId === null) {
      return res.status(400).send({ message: NOTE_PARENTS[key].invalidMessage });
    }

    const content = sanitizeNoteContent(body.content);
    if (!content) {
      return res.status(400).send({ message: "Note content is required." });
    }

    const isVisible = body.isVisible ?? true;
    if (typeof isVisible !== "boolean") {
      return res.status(400).send({ message: "isVisible must be true or false." });
    }

    const includeInEmail = body.includeInEmail ?? false;
    if (typeof includeInEmail !== "boolean") {
      return res.status(400).send({ message: "includeInEmail must be true or false." });
    }

    if (!(await readableParent(req, res, key, parentId))) {
      return;
    }

    if (!isVisible && !canSeeHiddenNotes(req.user)) {
      return res.status(403).send({ message: "Only admins, area admins, and maintenance users can post hidden notes." });
    }

    const created = await db.note.create({ [key]: parentId, authorId: req.user.id, content, isVisible, includeInEmail });
    const note = await db.note.findByPk(created.id, { include: noteInclude() });

    return res.status(201).send(toNoteResponse(note));
  } catch (err) {
    logger.error(`note create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create note." });
  }
};

exports.remove = async (req, res) => {
  try {
    const note = await loadVisibleNote(req, res);
    if (!note) {
      return;
    }

    if (!isAdmin(req.user)) {
      if (note.authorId !== req.user.id) {
        return res.status(403).send({ message: "You can only delete your own notes." });
      }

      // FR-004: a later note by anyone else on the same parent counts as a reply.
      const key = parentKeyOf(note);
      const replies = await db.note.count({
        where: { [key]: note[key], id: { [Op.gt]: note.id }, authorId: { [Op.ne]: req.user.id } },
      });
      if (replies > 0) {
        return res.status(400).send({ message: "Notes can only be deleted before someone replies." });
      }
    }

    await note.destroy();
    return res.status(204).send();
  } catch (err) {
    logger.error(`note delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete note." });
  }
};

export default exports;
