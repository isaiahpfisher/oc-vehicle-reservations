import { Router } from "express";
import destinationController from "../controllers/destination.controller.js";
import { authorizeRoles } from "../authorization/authorization.js";

const router = Router();
const canManageDestinations = authorizeRoles("admin", "area_admin");

router.get("/", [canManageDestinations], destinationController.findAll);
router.get("/:destinationId", [canManageDestinations], destinationController.findOne);
router.post("/", [canManageDestinations], destinationController.create);
router.put("/:destinationId", [canManageDestinations], destinationController.update);
router.delete("/:destinationId", [canManageDestinations], destinationController.remove);

export default router;
