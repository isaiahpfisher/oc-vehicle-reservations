import { Router } from "express";
import serviceLogController from "../controllers/serviceLog.controller.js";
import { authorizeRoles } from "../authorization/authorization.js";

const router = Router();
const canManageServiceLogs = authorizeRoles("admin", "area_admin", "maintenance");

router.get("/", [canManageServiceLogs], serviceLogController.findAll);
router.get("/vehicle/:vehicleId", [canManageServiceLogs], serviceLogController.findByVehicle);
router.get("/:serviceLogId", [canManageServiceLogs], serviceLogController.findOne);
router.post("/", [canManageServiceLogs], serviceLogController.create);
router.put("/:serviceLogId", [canManageServiceLogs], serviceLogController.update);
router.delete("/:serviceLogId", [canManageServiceLogs], serviceLogController.remove);

export default router;
