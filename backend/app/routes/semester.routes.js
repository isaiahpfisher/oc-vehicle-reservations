import { Router } from "express";
import semesterController from "../controllers/semester.controller.js";
import { authenticate, authenticateAdmin } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], semesterController.findAll);
router.get("/:id", [authenticate], semesterController.findOne);
router.post("/", [authenticateAdmin], semesterController.create);
router.put("/:id", [authenticateAdmin], semesterController.update);
router.delete("/:id", [authenticateAdmin], semesterController.remove);

export default router;
