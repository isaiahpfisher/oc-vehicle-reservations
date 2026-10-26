import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
// INTERIM: remove once the full Feature 2 (Area Management) is merged; mount its area routes instead.
import areaRoutes from "./area.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Register feature routers here as you implement them, e.g.:
router.use("/", authRoutes);
router.use("/users", userRoutes);
router.use("/areas", areaRoutes);

export default router;
