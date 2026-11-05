import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import areaRoutes from "./area.routes.js";
import vehicleTypeRoutes from "./vehicleType.routes.js";
import serviceTypeRoutes from "./serviceType.routes.js";
import destinationRoutes from "./destination.routes.js";
import vehicleRoutes from "./vehicle.routes.js";
import driverRoutes from "./driver.routes.js";
import mileageLogRoutes from "./mileageLog.routes.js";

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
router.use("/destinations", destinationRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/drivers", driverRoutes);
router.use("/mileage-logs", mileageLogRoutes);

export default router;
