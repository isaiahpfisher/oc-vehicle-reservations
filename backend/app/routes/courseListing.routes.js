import { Router } from "express";
import courseListingController from "../controllers/courseListing.controller.js";
import { authenticateStudent } from "../authorization/authorization.js";

const router = Router();

router.get("/:semesterId", [authenticateStudent], courseListingController.findAll);
router.delete("/:enrollmentId", [authenticateStudent], courseListingController.removeEnrollment);
export default router;