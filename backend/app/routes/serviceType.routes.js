import { Router } from "express";
import serviceTypeController from "../controllers/serviceType.controller.js";
import { authorizeRoles } from "../authorization/authorization.js";

const router = Router();
const canManageServiceTypes = authorizeRoles("admin", "area_admin", "maintenance");

router.get("/", [canManageServiceTypes], serviceTypeController.findAll);
router.get("/:serviceTypeId", [canManageServiceTypes], serviceTypeController.findOne);
router.post("/", [canManageServiceTypes], serviceTypeController.create);
router.put("/:serviceTypeId", [canManageServiceTypes], serviceTypeController.update);
router.delete("/:serviceTypeId", [canManageServiceTypes], serviceTypeController.remove);

export default router;
