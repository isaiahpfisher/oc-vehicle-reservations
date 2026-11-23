import { Router } from "express";
import destinationController from "../controllers/destination.controller.js";
import { authenticate, authorizeRoles } from "../authorization/authorization.js";

const router = Router();
const canManageDestinations = authorizeRoles("admin", "area_admin");

router.get("/", [canManageDestinations], destinationController.findAll);
// Feature 8: any signed-in user picks official destinations on the request form. Before `/:destinationId`.
router.get("/selectable", [authenticate], destinationController.findSelectable);
router.get("/:destinationId", [canManageDestinations], destinationController.findOne);
// UI/UX backlog #69: the trips that stop there, in the caller's areas.
router.get("/:destinationId/trips", [canManageDestinations], destinationController.findTrips);
router.post("/", [canManageDestinations], destinationController.create);
router.put("/:destinationId", [canManageDestinations], destinationController.update);
router.delete("/:destinationId", [canManageDestinations], destinationController.remove);

export default router;
