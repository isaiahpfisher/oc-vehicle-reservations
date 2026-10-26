/** INTERIM stand-in for Feature 2 (Area Management). Replace with Feature 2's area routes once it is merged. */
import { Router } from "express";
import areaController from "../controllers/area.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.get("/", [authenticate], areaController.findAll);

export default router;
