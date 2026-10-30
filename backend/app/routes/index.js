import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import areaRoutes from "./area.routes.js";
import vehicleTypeRoutes from "./vehicleType.routes.js";
import serviceTypeRoutes from "./serviceType.routes.js";
import vehicleRoutes from "./vehicle.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Register feature routers here as you implement them, e.g.:
router.use("/", authRoutes);
router.use("/users", userRoutes);
router.use("/areas", areaRoutes);
router.use("/vehicle-types", vehicleTypeRoutes);
router.use("/service-types", serviceTypeRoutes);
router.use("/vehicles", vehicleRoutes);

export default router;
