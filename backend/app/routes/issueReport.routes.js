import { Router } from "express";
import issueReportController from "../controllers/issueReport.controller.js";
import { authenticate, authorizeRoles, holdsOnlyRole } from "../authorization/authorization.js";

const router = Router();

/** Feature 10 responses use `{ message: "Unauthorized." }` for a missing session. */
const requireSession = (req, res, next) => {
  const send = res.send.bind(res);
  let rewritten = false;
  res.send = (body) => {
    if (!rewritten && res.statusCode === 401) {
      rewritten = true;
      return send({ message: "Unauthorized." });
    }

    return send(body);
  };
  return authenticate(req, res, next);
};

/**
 * UI/UX backlog #28: maintenance users don't use issue reports; their work arrives as maintenance needs. Someone who
 * also holds another role (e.g. area admin) keeps that role's access, and every requester can still report.
 */
export const NOT_FOR_MAINTENANCE = "Maintenance users can't use issue reports.";
const notMaintenanceOnly = (req, res, next) =>
  requireSession(req, res, () => {
    if (holdsOnlyRole(req.user, "maintenance")) {
      return res.status(403).send({ message: NOT_FOR_MAINTENANCE });
    }

    next();
  });

router.get("/", [notMaintenanceOnly], issueReportController.findAll);
// Feature 14 (US-14.6): assignee choices for the issue report form (managers set the assignee).
router.get("/assignees", [authorizeRoles("admin", "area_admin")], issueReportController.assignees);
router.get("/:issueReportId", [notMaintenanceOnly], issueReportController.findOne);
router.post("/", [notMaintenanceOnly], issueReportController.create);
router.put("/:issueReportId", [notMaintenanceOnly], issueReportController.update);
router.delete("/:issueReportId", [notMaintenanceOnly], issueReportController.remove);

export default router;
