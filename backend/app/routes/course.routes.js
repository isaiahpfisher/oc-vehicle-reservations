import { Router } from "express";
import courseController from "../controllers/course.controller.js";
import { authenticate, authenticateAdmin } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], courseController.findAll);
router.get("/:id", [authenticate], courseController.findOne);
router.post("/", [authenticateAdmin], courseController.create);
router.put("/:id", [authenticateAdmin], courseController.update);
router.delete("/:id", [authenticateAdmin], courseController.remove);

export default router;
