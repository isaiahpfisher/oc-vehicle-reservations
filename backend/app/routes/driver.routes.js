import { Router } from "express";
import driverController from "../controllers/driver.controller.js";
import { authenticate, authorizeRoles } from "../authorization/authorization.js";

const router = Router();

const requireDriverManager = authorizeRoles("admin", "area_admin");

router.get("/", [requireDriverManager], driverController.findAll);
router.get("/selectable", [authenticate], driverController.findSelectable);
router.get("/available-users", [requireDriverManager], driverController.findAvailableUsers);
router.get("/:driverId", [requireDriverManager], driverController.findOne);
router.post("/", [requireDriverManager], driverController.create);
router.put("/:driverId", [requireDriverManager], driverController.update);
router.delete("/:driverId", [requireDriverManager], driverController.remove);

export default router;
