import { Router } from "express";
import placeController from "../controllers/place.controller.js";
import { authenticate, authorizeRoles } from "../authorization/authorization.js";

const router = Router();

// Feature 8, FR-008: address search for destinations. Order matters: `autocomplete` isn't a place id.
router.get("/autocomplete", [authenticate], placeController.autocomplete);
// FR-010: billed per call, and only the destination form needs it, so it takes the same roles as that form.
router.get("/:placeId/miles-from-campus", [authorizeRoles("admin", "area_admin")], placeController.milesFromCampus);
router.get("/:placeId", [authenticate], placeController.findOne);

export default router;
