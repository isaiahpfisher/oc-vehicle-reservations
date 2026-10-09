import { Router } from "express";
import facultyController from "../controllers/faculty.controller.js";
import { authenticate, authenticateAdmin } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticateAdmin], facultyController.findAll);
router.get("/:id", [authenticateAdmin], facultyController.findOne);
router.post("/", [authenticateAdmin], facultyController.create);
router.put("/:id", [authenticateAdmin], facultyController.update);
router.delete("/:id", [authenticateAdmin], facultyController.remove);

export default router;
