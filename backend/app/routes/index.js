import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import facultyRoutes from "./faculty.routes.js";
import courseRoutes from "./course.routes.js";
import sectionRoutes from "./section.routes.js";
import semesterRoutes from "./semester.routes.js";
import enrollmentRoutes from "./enrollment.routes.js";
import courseListingRoutes from "./courselisting.routes.js";
import areaRoutes from "./area.routes.js";
import vehicleRequestRoutes from "./vehicleRequest.routes.js";
import featureStubRoutes from "./featureStubs.routes.js"; // STUB(features 6, 7)

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Register feature routers here as you implement them, e.g.:
router.use("/", authRoutes);
router.use("/users", userRoutes);
router.use("/faculty", facultyRoutes);
router.use("/courses", courseRoutes);
router.use("/sections", sectionRoutes);
router.use("/semesters", semesterRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/course-listings", courseListingRoutes);
router.use("/areas", areaRoutes);
router.use("/", vehicleRequestRoutes);
router.use("/", featureStubRoutes); // STUB(features 6, 7)

export default router;
