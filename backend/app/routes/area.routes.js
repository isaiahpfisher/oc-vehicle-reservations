import { Router } from "express";
import areaController from "../controllers/area.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], areaController.findAll);
router.get("/:areaId", [authenticate], areaController.findOne);
router.post("/", [authenticate], areaController.create);
router.put("/:areaId", [authenticate], areaController.update);
router.delete("/:areaId", [authenticate], areaController.remove);

export default router;
