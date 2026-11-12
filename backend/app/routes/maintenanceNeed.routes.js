import { Router } from "express";
import maintenanceNeedController from "../controllers/maintenanceNeed.controller.js";
import { authorizeRoles } from "../authorization/authorization.js";

const router = Router();
const canManageMaintenanceNeeds = authorizeRoles("admin", "area_admin", "maintenance");

router.get("/options", [canManageMaintenanceNeeds], maintenanceNeedController.options);
router.get("/", [canManageMaintenanceNeeds], maintenanceNeedController.findAll);
router.get("/:maintenanceNeedId", [canManageMaintenanceNeeds], maintenanceNeedController.findOne);
router.post("/", [canManageMaintenanceNeeds], maintenanceNeedController.create);
router.put("/:maintenanceNeedId", [canManageMaintenanceNeeds], maintenanceNeedController.update);
router.delete("/:maintenanceNeedId", [canManageMaintenanceNeeds], maintenanceNeedController.remove);

export default router;
