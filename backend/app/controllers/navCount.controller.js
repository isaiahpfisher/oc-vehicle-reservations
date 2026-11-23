import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { holdsAnyRole, isAdmin } from "../authorization/authorization.js";
import { managedRequestsWhere } from "../authorization/vehicleRequestScope.js";
import { ACTIVE_REQUEST_STATUSES, loadConditions, localDay, vehicleProblemsFor } from "../helpers/vehicleStatus.js";

const exports = {};

/** Requests still waiting on an admin (Feature 8, US-8.5 "Needs my action"). */
const NEEDS_ACTION = ["pending", "awaiting_vehicle"];
const OPEN_NEED = ["Open", "In Progress"];
/** Drivers whose license matters (approved ones drive, pending ones are about to), and how soon it counts as expiring. */
const ACTIVE_DRIVER = ["approved", "pending"];
const LICENSE_DUE_SOON_DAYS = 30;

/** Vehicle statuses the Vehicles page's "Needs attention" filter shows (NEEDS_ATTENTION_STATUSES in the frontend). */
const NEEDS_ATTENTION = ["out_of_service", "service_overdue", "plate_expired", "service_due_soon", "plate_expiring"];

/**
 * Vehicles the user can see on Vehicles that need attention. Admins and maintenance users see every vehicle; area
 * admins see their areas'. Retired vehicles have the status "retired", so they never count.
 */
const vehiclesNeedingAttention = async (user) => {
  const vehicles = await db.vehicle.findAll({ where: seesEveryArea(user) ? undefined : { areaId: managedAreaIds(user) } });
  const conditions = await loadConditions(vehicles);
  return vehicles.filter(({ id }) => NEEDS_ATTENTION.includes(conditions.get(id)?.status)).length;
};

/** The last day a license counts as expiring soon: today plus 30 days, matching the Drivers page's "Licenses to renew". */
const licenseRenewBy = (now = new Date()) => {
  const limit = new Date(now);
  limit.setDate(limit.getDate() + LICENSE_DUE_SOON_DAYS);
  return localDay(limit);
};

const managedAreaIds = (user) => user.roles.filter(({ role }) => role === "area_admin").map(({ areaId }) => areaId);

/** Admins and maintenance users see every area's vehicles and maintenance needs; area admins see their own areas'. */
const seesEveryArea = (user) => isAdmin(user) || user.roles.some(({ role }) => role === "maintenance");

/** Vehicles in the user's areas; `null` (no limit) when `everyArea`. */
const scopedVehicle = (user, everyArea) =>
  everyArea ? null : { model: db.vehicle, as: "vehicle", attributes: [], where: { areaId: managedAreaIds(user) }, required: true };

/**
 * Requests in the user's areas that the Requests page flags: still needing approval or a vehicle ("Needs my action"),
 * or headed for a trip with a problem on an assigned vehicle ("Vehicle problems"). A request with both counts once.
 */
const requestsNeedingAttention = async (user) => {
  const requests = await db.vehicleRequest.findAll({
    where: { ...managedRequestsWhere(user), status: ACTIVE_REQUEST_STATUSES },
    include: [{ model: db.vehicleRequestVehicle, as: "requestVehicles", attributes: ["vehicleId"] }],
  });
  const problems = await vehicleProblemsFor(requests);
  return requests.filter(({ id, status }) => NEEDS_ACTION.includes(status) || Object.keys(problems.get(id) ?? {}).length)
    .length;
};

/** Rows of `model` on vehicles the user can see; issue reports follow admin scope, maintenance needs `seesEveryArea`. */
const countIn = (model, user, where, everyArea = isAdmin(user)) => {
  const vehicle = scopedVehicle(user, everyArea);
  return model.count({ where, ...(vehicle ? { include: [vehicle] } : {}) });
};

/**
 * UI/UX backlog #15: the numbers on the Sidebar's links — what's waiting for the signed-in user. A key is `null` when
 * the user can't open that page, so the Sidebar shows no badge.
 * - `requests`: requests in their areas that still need approving or a vehicle, or whose vehicles have a problem for
 *   the trip (area admins and admins).
 * - `issueReports`: pending issue reports in their areas (area admins and admins; never maintenance-only users).
 * - `maintenanceNeeds`: every Open or In Progress need they can see (admins and maintenance users: all; area admins:
 *   their areas').
 * - `vehicles`: vehicles they can see whose status needs attention (admins, area admins, and maintenance users).
 * - `drivers`: approved and pending drivers whose license has expired or expires within 30 days (area admins and
 *   admins; drivers aren't tied to an area, so every one counts).
 */
exports.findMine = async (req, res) => {
  try {
    const user = req.user;
    const manages = holdsAnyRole(user, ["area_admin"]);
    const seesVehicles = holdsAnyRole(user, ["area_admin", "maintenance"]);

    const [requests, issueReports, maintenanceNeeds, vehicles, drivers] = await Promise.all([
      manages ? requestsNeedingAttention(user) : null,
      manages ? countIn(db.issueReport, user, { status: "pending" }) : null,
      seesVehicles ? countIn(db.maintenanceNeed, user, { status: OPEN_NEED }, seesEveryArea(user)) : null,
      seesVehicles ? vehiclesNeedingAttention(user) : null,
      manages
        ? db.driver.count({ where: { status: ACTIVE_DRIVER, licenseExpirationDate: { [Op.lte]: licenseRenewBy() } } })
        : null,
    ]);

    return res.send({ requests, issueReports, maintenanceNeeds, vehicles, drivers });
  } catch (err) {
    logger.error(`nav counts failed: ${err.message}`);
    return res.status(500).send({ message: "Failed to fetch counts." });
  }
};

export default exports;
