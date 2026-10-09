import { Router } from "express";
import sectionController from "../controllers/section.controller.js";
import { authenticate, authenticateAdmin } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], sectionController.findAll);
router.get("/:id", [authenticate], sectionController.findOne);
router.post("/", [authenticateAdmin], sectionController.create);
router.put("/:id", [authenticateAdmin], sectionController.update);
router.delete("/:id", [authenticateAdmin], sectionController.delete);

export default router;
