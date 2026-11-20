import { Router } from "express";
import noteController from "../controllers/note.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

// Feature 14: parent access is checked in the controller (it follows each parent's own feature).
router.get("/requests/:requestId/notes", [authenticate], noteController.findAllForParent("vehicleRequestId"));
router.get("/issue-reports/:issueReportId/notes", [authenticate], noteController.findAllForParent("issueReportId"));
router.get(
  "/maintenance-needs/:maintenanceNeedId/notes",
  [authenticate],
  noteController.findAllForParent("maintenanceNeedId"),
);
router.get("/notes/:noteId", [authenticate], noteController.findOne);
router.post("/notes", [authenticate], noteController.create);
router.delete("/notes/:noteId", [authenticate], noteController.remove);

export default router;
