import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { canAccessArea } from "../authorization/authorization.js";
import { ISSUE_STATUSES, ISSUE_TYPES } from "../models/issueReport.model.js";

const exports = {};

const withRelations = [
  { model: db.user, as: "author", attributes: ["id", "firstName", "lastName"] },
  { model: db.user, as: "assignee", attributes: ["id", "firstName", "lastName"], required: false },
  { model: db.vehicle, as: "vehicle", attributes: ["id", "universityId", "areaId"] },
  { model: db.vehicleRequest, as: "vehicleRequest", attributes: ["id", "purpose"], required: false },
];

const isAdminUser = (user) => user.roles.some(({ role }) => role === "admin");

const managedAreaIds = (user) =>
  user.roles.filter(({ role }) => role === "area_admin").map(({ areaId }) => areaId);

const forbid = (res) => res.status(403).send({ message: "Forbidden." });

const asDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
};

const person = (user) =>
  user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null;

const present = (report) => ({
  id: report.id,
  vehicleId: report.vehicleId,
  vehicleRequestId: report.vehicleRequestId,
  authorId: report.authorId,
  assigneeId: report.assigneeId,
  type: report.type,
  description: report.description,
  status: report.status,
  resolvedAt: asDate(report.resolvedAt),
  author: person(report.author),
  assignee: person(report.assignee),
  vehicle: report.vehicle ? { id: report.vehicle.id, universityId: report.vehicle.universityId } : null,
  vehicleRequest: report.vehicleRequest
    ? { id: report.vehicleRequest.id, purpose: report.vehicleRequest.purpose }
    : null,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt,
});

const wholeId = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { empty: true };
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return { invalid: true };
  }

  return { value: Number(text) };
};

const issueReportIdFrom = (req, res) => {
  const parsed = wholeId(req.params.issueReportId);
  if (parsed.empty || parsed.invalid) {
    res.status(400).send({ message: "Invalid issue report id." });
    return null;
  }

  return parsed.value;
};

const calendarDate = (value) => {
  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return text;
};

const readBody = (body) => {
  const vehicle = wholeId(body.vehicleId);
  if (vehicle.empty || vehicle.invalid) {
    return { message: "Missing vehicle." };
  }

  if (body.type === undefined || body.type === null || String(body.type).trim() === "") {
    return { message: "Missing type." };
  }

  if (!ISSUE_TYPES.includes(body.type)) {
    return { message: "Invalid type." };
  }

  const description = body.description === undefined || body.description === null ? "" : String(body.description).trim();
  if (!description) {
    return { message: "Missing description." };
  }

  if (body.status === undefined || body.status === null || String(body.status).trim() === "") {
    return { message: "Missing status." };
  }

  if (!ISSUE_STATUSES.includes(body.status)) {
    return { message: "Invalid status." };
  }

  let resolvedAt = null;
  if (body.status === "resolved") {
    if (body.resolvedAt === undefined || body.resolvedAt === null || String(body.resolvedAt).trim() === "") {
      return { message: "Missing resolved date." };
    }

    resolvedAt = calendarDate(body.resolvedAt);
    if (!resolvedAt) {
      return { message: "Invalid resolved date." };
    }
  } else if (body.resolvedAt !== undefined && body.resolvedAt !== null && String(body.resolvedAt).trim() !== "") {
    return { message: "Resolved date must be empty." };
  }

  const vehicleRequest = wholeId(body.vehicleRequestId);
  if (vehicleRequest.invalid) {
    return { message: "Vehicle request not found." };
  }

  const assignee = wholeId(body.assigneeId);
  if (assignee.invalid) {
    return { message: "Assignee not found." };
  }

  return {
    value: {
      vehicleId: vehicle.value,
      vehicleRequestId: vehicleRequest.value ?? null,
      assigneeId: assignee.value ?? null,
      type: body.type,
      description,
      status: body.status,
      resolvedAt,
    },
  };
};

const reload = (id) => db.issueReport.findByPk(id, { include: withRelations });

const loadManaged = async (req, res) => {
  const issueReportId = issueReportIdFrom(req, res);
  if (issueReportId === null) {
    return null;
  }

  const report = await reload(issueReportId);
  if (!report) {
    res.status(404).send({ message: `Issue report with id=${issueReportId} not found.` });
    return null;
  }

  if (!isAdminUser(req.user) && !canAccessArea(req.user, report.vehicle.areaId)) {
    forbid(res);
    return null;
  }

  return report;
};

exports.findAll = async (req, res) => {
  try {
    const userFilter = req.query.userId !== undefined && String(req.query.userId).trim() !== "";
    const vehicleFilter = req.query.vehicleId !== undefined && String(req.query.vehicleId).trim() !== "";
    const where = {};
    let vehicleWhere;

    if (userFilter) {
      const parsed = wholeId(req.query.userId);
      if (parsed.empty || parsed.invalid) {
        return res.status(400).send({ message: "Invalid user id." });
      }

      if (!isAdminUser(req.user) && managedAreaIds(req.user).length === 0 && parsed.value !== req.user.id) {
        return forbid(res);
      }

      const user = await db.user.findByPk(parsed.value);
      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }

      where.authorId = parsed.value;
    }

    if (vehicleFilter) {
      const parsed = wholeId(req.query.vehicleId);
      if (parsed.empty || parsed.invalid) {
        return res.status(400).send({ message: "Invalid vehicle id." });
      }

      const vehicle = await db.vehicle.findByPk(parsed.value);
      if (!vehicle) {
        return res.status(404).send({ message: "Vehicle not found." });
      }

      if (!isAdminUser(req.user) && !canAccessArea(req.user, vehicle.areaId)) {
        return forbid(res);
      }

      where.vehicleId = parsed.value;
    }

    if (!userFilter && !vehicleFilter && !isAdminUser(req.user) && managedAreaIds(req.user).length === 0) {
      return forbid(res);
    }

    if (!isAdminUser(req.user) && managedAreaIds(req.user).length > 0 && !vehicleFilter) {
      vehicleWhere = { areaId: { [Op.in]: managedAreaIds(req.user) } };
    }

    const reports = await db.issueReport.findAll({
      where,
      include: withRelations.map((include) =>
        include.as === "vehicle" && vehicleWhere ? { ...include, where: vehicleWhere, required: true } : include,
      ),
      order: [["id", "DESC"]],
    });

    return res.send(reports.map(present));
  } catch (err) {
    logger.error(`issue report findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch issue reports." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const issueReportId = issueReportIdFrom(req, res);
    if (issueReportId === null) {
      return;
    }

    const report = await reload(issueReportId);
    if (!report) {
      return res.status(404).send({ message: `Issue report with id=${issueReportId} not found.` });
    }

    const allowed =
      isAdminUser(req.user) ||
      canAccessArea(req.user, report.vehicle.areaId) ||
      report.authorId === req.user.id;

    if (!allowed) {
      return forbid(res);
    }

    return res.send(present(report));
  } catch (err) {
    logger.error(`issue report findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch issue report." });
  }
};

exports.create = async (req, res) => {
  try {
    const result = readBody(req.body);
    if (result.message) {
      const status = result.message.endsWith("not found.") ? 404 : 400;
      return res.status(status).send({ message: result.message });
    }

    const vehicle = await db.vehicle.findByPk(result.value.vehicleId);
    if (!vehicle) {
      return res.status(404).send({ message: "Vehicle not found." });
    }

    if (result.value.vehicleRequestId !== null) {
      const request = await db.vehicleRequest.findByPk(result.value.vehicleRequestId);
      if (!request) {
        return res.status(404).send({ message: "Vehicle request not found." });
      }
    }

    if (result.value.assigneeId !== null) {
      const assignee = await db.user.findByPk(result.value.assigneeId);
      if (!assignee) {
        return res.status(404).send({ message: "Assignee not found." });
      }
    }

    const created = await db.issueReport.create({
      ...result.value,
      authorId: req.user.id,
    });
    const report = await reload(created.id);

    return res.status(201).send(present(report));
  } catch (err) {
    logger.error(`issue report create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create issue report." });
  }
};

exports.update = async (req, res) => {
  try {
    const report = await loadManaged(req, res);
    if (!report) {
      return;
    }

    const result = readBody(req.body);
    if (result.message) {
      const status = result.message.endsWith("not found.") ? 404 : 400;
      return res.status(status).send({ message: result.message });
    }

    const vehicle = await db.vehicle.findByPk(result.value.vehicleId);
    if (!vehicle) {
      return res.status(404).send({ message: "Vehicle not found." });
    }

    if (!isAdminUser(req.user) && !canAccessArea(req.user, vehicle.areaId)) {
      return forbid(res);
    }

    if (result.value.vehicleRequestId !== null) {
      const request = await db.vehicleRequest.findByPk(result.value.vehicleRequestId);
      if (!request) {
        return res.status(404).send({ message: "Vehicle request not found." });
      }
    }

    if (result.value.assigneeId !== null) {
      const assignee = await db.user.findByPk(result.value.assigneeId);
      if (!assignee) {
        return res.status(404).send({ message: "Assignee not found." });
      }
    }

    await report.update(result.value);
    const updated = await reload(report.id);

    return res.send(present(updated));
  } catch (err) {
    logger.error(`issue report update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update issue report." });
  }
};

exports.remove = async (req, res) => {
  try {
    const report = await loadManaged(req, res);
    if (!report) {
      return;
    }

    await report.destroy();

    return res.status(200).send({ message: "Issue report deleted successfully." });
  } catch (err) {
    logger.error(`issue report delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete issue report." });
  }
};

export default exports;
