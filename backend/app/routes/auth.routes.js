import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

router.post("/login", authController.login);
// Development only: returns 404 unless DEV_LOGIN=true and NODE_ENV is not production.
router.post("/dev-login", authController.devLogin);
router.post("/logout", [authenticate], authController.logout);

export default router;
