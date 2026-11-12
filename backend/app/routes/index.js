import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import areaRoutes from "./area.routes.js";
import vehicleTypeRoutes from "./vehicleType.routes.js";
import serviceTypeRoutes from "./serviceType.routes.js";
import destinationRoutes from "./destination.routes.js";
import vehicleRoutes from "./vehicle.routes.js";
import driverRoutes from "./driver.routes.js";
import vehicleRequestRoutes from "./vehicleRequest.routes.js";
import placeRoutes from "./place.routes.js";
import issueReportRoutes from "./issueReport.routes.js";
import mileageLogRoutes from "./mileageLog.routes.js";
import serviceLogRoutes from "./serviceLog.routes.js";
import maintenanceNeedRoutes from "./maintenanceNeed.routes.js";

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
router.use("/", vehicleRequestRoutes);
router.use("/places", placeRoutes);
router.use("/issue-reports", issueReportRoutes);
router.use("/mileage-logs", mileageLogRoutes);
router.use("/service-logs", serviceLogRoutes);
router.use("/maintenance-needs", maintenanceNeedRoutes);

export default router;
