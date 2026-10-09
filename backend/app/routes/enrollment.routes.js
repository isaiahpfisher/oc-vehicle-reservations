import { Router } from "express";
import enrollmentController from "../controllers/enrollment.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], enrollmentController.findAll);
router.post("/", [authenticate], enrollmentController.create);
router.delete("/:sectionId", [authenticate], enrollmentController.delete);

export default router;
