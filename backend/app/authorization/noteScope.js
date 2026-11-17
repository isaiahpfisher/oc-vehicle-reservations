import db from "../models/index.js";
import { canAccessArea, holdsAnyRole } from "./authorization.js";
import { canViewRequest } from "./vehicleRequestScope.js";

/**
 * Feature 14: who may read a note's parent follows that parent's own feature.
 * - Vehicle request (Feature 8): the requester, or an admin / area admin of its area.
 * - Issue report (Feature 10): the author, or an admin / area admin of the vehicle's area.
 * - Maintenance need (Feature 11): admins and maintenance users, or an area admin of the vehicle's area.
 */
const vehicleInclude = { model: db.vehicle, as: "vehicle", attributes: ["id", "areaId"] };

export const NOTE_PARENTS = {
  vehicleRequestId: {
    param: "requestId",
    invalidMessage: "Invalid request id.",
    notFoundMessage: (id) => `Vehicle request with id=${id} not found.`,
    load: (id) => db.vehicleRequest.findByPk(id),
    canRead: canViewRequest,
  },
  issueReportId: {
    param: "issueReportId",
    invalidMessage: "Invalid issue report id.",
    notFoundMessage: (id) => `Issue report with id=${id} not found.`,
    load: (id) => db.issueReport.findByPk(id, { include: [vehicleInclude] }),
    canRead: (user, report) => report.authorId === user.id || canAccessArea(user, report.vehicle.areaId),
  },
  maintenanceNeedId: {
    param: "maintenanceNeedId",
    invalidMessage: "Invalid maintenance need id.",
    notFoundMessage: (id) => `Maintenance need with id=${id} not found.`,
    load: (id) => db.maintenanceNeed.findByPk(id, { include: [vehicleInclude] }),
    canRead: (user, need) => holdsAnyRole(user, ["maintenance"]) || canAccessArea(user, need.vehicle.areaId),
  },
};

/** Admins, area admins, and maintenance users may see and post hidden notes (`isVisible: false`). */
export const canSeeHiddenNotes = (user) => holdsAnyRole(user, ["area_admin", "maintenance"]);
