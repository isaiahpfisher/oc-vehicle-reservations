import { Router } from "express";
import navCountController from "../controllers/navCount.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

// UI/UX backlog #15: Sidebar badge numbers for the signed-in user.
router.get("/", [authenticate], navCountController.findMine);

export default router;
