import { Router } from "express";
import areaController from "../controllers/area.controller.js";
import { readLogoUpload } from "../middleware/logoUpload.js";
import { authenticate, authenticateAdmin } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], areaController.findAll);
router.get("/:areaId", [authenticate], areaController.findOne);
router.post("/", [authenticateAdmin, readLogoUpload], areaController.create);
router.put("/:areaId", [authenticateAdmin, readLogoUpload], areaController.update);
router.delete("/:areaId", [authenticateAdmin], areaController.remove);

export default router;
