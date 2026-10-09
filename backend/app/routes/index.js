import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import facultyRoutes from "./faculty.routes.js";
import courseRoutes from "./course.routes.js";
import sectionRoutes from "./section.routes.js";
import semesterRoutes from "./semester.routes.js";
import enrollmentRoutes from "./enrollment.routes.js";
import courseListingRoutes from "./courselisting.routes.js";

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

export default router;
