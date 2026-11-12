import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from "../models/maintenanceNeed.model.js";

const exports = {};

const PRIORITY_MESSAGE = "Priority must be Low, Medium, High, or None.";
const STATUS_MESSAGE = "Status must be Open, In Progress, Completed, or Canceled.";
const DATE_MESSAGE = "Resolved at date must be in format yyyy-mm-dd.";
const DATE_RANGE_MESSAGE = "Resolved at date must be between 1950 and today.";
const AREA_MESSAGE = "Unauthorized for this area.";
const NOT_FOUND = "Maintenance need does not exist.";

const person = { model: db.user, attributes: ["id", "firstName", "lastName"] };

const includes = () => [
  { ...person, as: "author" },
  { ...person, as: "assignee", required: false },
  {
    model: db.vehicle,
    as: "vehicle",
    attributes: ["id", "color", "make", "model", "licensePlate", "areaId", "universityId"],
  },
];

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const positiveInt = (value) => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0) {
    return Number(value);
  }

  return null;
};

const seesEveryArea = (user) => user.roles.some(({ role }) => role === "admin" || role === "maintenance");

const mayLinkIssueReport = (user) => user.roles.some(({ role }) => role === "admin" || role === "area_admin");

const mayUseVehicle = (user, vehicle) => {
  if (seesEveryArea(user)) {
    return true;
  }

  return user.roles.some(({ role, areaId }) => role === "area_admin" && Number(areaId) === Number(vehicle.areaId));
};

const areaIdsFor = (user) =>
  user.roles.filter(({ role }) => role === "area_admin").map(({ areaId }) => Number(areaId));

const parseNeedId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);

const loadNeed = (id) => db.maintenanceNeed.findByPk(id, { include: includes() });

const fail = (status, message) => ({ status, message });

const checkResolvedAt = (status, value) => {
  const empty = value === null || value === undefined || value === "";

  if (!empty) {
    const text = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return fail(400, DATE_MESSAGE);
    }

    if (text < "1950-01-01" || text > todayString()) {
      return fail(400, DATE_RANGE_MESSAGE);
    }

    if (status === "Open" || status === "In Progress") {
      return { value: null };
    }

    return { value: text };
  }

  if (status === "Completed" || status === "Canceled") {
    return { value: todayString() };
  }

  return { value: null };
};

const checkAssignee = async (value) => {
  if (value === null || value === undefined || value === "") {
    return { id: null };
  }

  const assigneeId = positiveInt(value);
  if (assigneeId === null) {
    return fail(400, "User does not exist.");
  }

  const assignee = await db.user.findByPk(assigneeId, {
    include: [{ model: db.role, as: "roles", attributes: ["role"] }],
  });

  if (!assignee) {
    return fail(400, "User does not exist.");
  }

  if (!assignee.roles.some(({ role }) => role === "maintenance")) {
    return fail(400, "User does not have maintenance role.");
  }

  return { id: assigneeId };
};

/**
 * Turn a request body into a row.
 * A non-null issue report id copies that report into the from-issue defaults.
 * authorId is always the signed-in user.
 */
const readBody = async (body, user, currentId, preservedIssueReportId = null) => {
  const source = body ?? {};
  const hasIssueReport = Object.prototype.hasOwnProperty.call(source, "issueReportId");
  const issueReportSent = hasIssueReport && source.issueReportId !== null && source.issueReportId !== undefined && source.issueReportId !== "";
  let issueReportId = hasIssueReport ? null : currentId ? preservedIssueReportId : null;
  let values = source;

  if (issueReportSent) {
    if (!mayLinkIssueReport(user)) {
      return fail(400, "Issue report id must be null.");
    }

    issueReportId = positiveInt(source.issueReportId);
    if (issueReportId === null) {
      return fail(400, "Issue report id does not exist.");
    }

    const issueReport = await db.issueReport.findByPk(issueReportId);
    if (!issueReport) {
      return fail(400, "Issue report id does not exist.");
    }

    const taken = await db.maintenanceNeed.findOne({
      where: { issueReportId, ...(currentId ? { id: { [Op.ne]: currentId } } : {}) },
    });

    if (taken) {
      return fail(400, "Issue report already belongs to a maintenance need.");
    }

    // Creating from an issue report copies the report and uses the form defaults.
    if (!currentId) {
      values = {
        title: "Maintenance Needed",
        vehicleId: issueReport.vehicleId,
        assigneeId: issueReport.assigneeId,
        description: issueReport.description,
        outOfService: true,
        priority: "None",
        status: "Open",
        resolvedAt: null,
      };
    }
  }

  const title = typeof values.title === "string" ? values.title.trim() : "";
  if (!title) {
    return fail(400, "Missing title.");
  }

  if (title.length > 50) {
    return fail(400, "Title cannot be longer than 50 characters.");
  }

  if (values.vehicleId === null || values.vehicleId === undefined || values.vehicleId === "") {
    return fail(400, "Missing vehicle id.");
  }

  const vehicleId = positiveInt(values.vehicleId);
  const vehicle = vehicleId === null ? null : await db.vehicle.findByPk(vehicleId);
  if (!vehicle) {
    return fail(400, "Vehicle does not exist.");
  }

  if (!mayUseVehicle(user, vehicle)) {
    return fail(403, AREA_MESSAGE);
  }

  if (values.outOfService === null || values.outOfService === undefined || values.outOfService === "") {
    return fail(400, "Out of service boolean is required.");
  }

  if (typeof values.outOfService !== "boolean") {
    return fail(400, "Out of service boolean must be a boolean.");
  }

  if (values.priority === null || values.priority === undefined || values.priority === "") {
    return fail(400, "Priority is required.");
  }

  if (!MAINTENANCE_PRIORITIES.includes(values.priority)) {
    return fail(400, PRIORITY_MESSAGE);
  }

  if (values.status === null || values.status === undefined || values.status === "") {
    return fail(400, "Status is required.");
  }

  if (!MAINTENANCE_STATUSES.includes(values.status)) {
    return fail(400, STATUS_MESSAGE);
  }

  const resolved = checkResolvedAt(values.status, values.resolvedAt);
  if (resolved.message) {
    return resolved;
  }

  const assignee = await checkAssignee(values.assigneeId);
  if (assignee.message) {
    return assignee;
  }

  const description = typeof values.description === "string" ? values.description.trim() : "";

  return {
    values: {
      issueReportId,
      authorId: user.id,
      vehicleId: vehicle.id,
      assigneeId: assignee.id,
      title,
      description: description || null,
      outOfService: values.outOfService,
      priority: values.priority,
      status: values.status,
      resolvedAt: resolved.value,
    },
  };
};

const sendFailure = (res, result) => res.status(result.status || 400).send({ message: result.message });

exports.findAll = async (req, res) => {
  try {
    const include = includes();

    if (!seesEveryArea(req.user)) {
      const areaIds = areaIdsFor(req.user);
      if (areaIds.length === 0) {
        return res.status(200).send([]);
      }

      include[2] = { ...include[2], where: { areaId: { [Op.in]: areaIds } }, required: true };
    }

    const needs = await db.maintenanceNeed.findAll({
      include,
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.status(200).send(needs);
  } catch (err) {
    logger.error(`maintenance need list failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch maintenance needs." });
  }
};

exports.options = async (req, res) => {
  try {
    const areaIds = seesEveryArea(req.user) ? null : areaIdsFor(req.user);
    const vehicles =
      areaIds && areaIds.length === 0
        ? []
        : await db.vehicle.findAll({
            attributes: ["id", "color", "make", "model", "licensePlate", "areaId"],
            where: areaIds ? { areaId: { [Op.in]: areaIds } } : undefined,
            order: [
              ["make", "ASC"],
              ["model", "ASC"],
            ],
          });

    const assignees = await db.user.findAll({
      attributes: ["id", "firstName", "lastName"],
      include: [{ model: db.role, as: "roles", attributes: [], where: { role: "maintenance" }, required: true }],
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });

    return res.status(200).send({ vehicles, assignees });
  } catch (err) {
    logger.error(`maintenance need options failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch maintenance need options." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const id = parseNeedId(req.params.maintenanceNeedId);
    if (id === null) {
      return res.status(400).send({ message: "Invalid maintenance need id." });
    }

    const need = await loadNeed(id);
    if (!need) {
      return res.status(404).send({ message: NOT_FOUND });
    }

    if (!mayUseVehicle(req.user, need.vehicle)) {
      return res.status(403).send({ message: AREA_MESSAGE });
    }

    return res.status(200).send(need);
  } catch (err) {
    logger.error(`maintenance need fetch failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch maintenance need." });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await readBody(req.body, req.user);
    if (result.message) {
      return sendFailure(res, result);
    }

    const created = await db.maintenanceNeed.create(result.values);
    return res.status(201).send(await loadNeed(created.id));
  } catch (err) {
    logger.error(`maintenance need create failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to create maintenance need." });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseNeedId(req.params.maintenanceNeedId);
    if (id === null) {
      return res.status(400).send({ message: "Invalid maintenance need id." });
    }

    const existing = await loadNeed(id);
    if (!existing) {
      return res.status(404).send({ message: NOT_FOUND });
    }

    if (!mayUseVehicle(req.user, existing.vehicle)) {
      return res.status(403).send({ message: AREA_MESSAGE });
    }

    const result = await readBody(req.body, req.user, id, existing.issueReportId);
    if (result.message) {
      return sendFailure(res, result);
    }

    await existing.update(result.values);
    return res.status(200).send(await loadNeed(id));
  } catch (err) {
    logger.error(`maintenance need update failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to update maintenance need." });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = parseNeedId(req.params.maintenanceNeedId);
    if (id === null) {
      return res.status(400).send({ message: "Invalid maintenance need id." });
    }

    const existing = await loadNeed(id);
    if (!existing) {
      return res.status(404).send({ message: NOT_FOUND });
    }

    if (!mayUseVehicle(req.user, existing.vehicle)) {
      return res.status(403).send({ message: AREA_MESSAGE });
    }

    // Feature 13: a service log can record the work done for this need.
    if ((await db.serviceLog.count({ where: { maintenanceNeedId: existing.id } })) > 0) {
      return res.status(400).send({ message: "Maintenance need is used by a service log and can't be deleted." });
    }

    await existing.destroy();
    return res.status(200).send({ message: "Maintenance need deleted." });
  } catch (err) {
    logger.error(`maintenance need delete failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to delete maintenance need." });
  }
};

export default exports;
