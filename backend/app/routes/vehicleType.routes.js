import { Router } from "express";
import vehicleTypeController from "../controllers/vehicleType.controller.js";
import { authorizeRoles } from "../authorization/authorization.js";

const router = Router();
const adminOnly = authorizeRoles("admin");

router.get("/", [adminOnly], vehicleTypeController.findAll);
router.get("/:vehicleTypeId", [adminOnly], vehicleTypeController.findOne);
router.post("/", [adminOnly], vehicleTypeController.create);
router.put("/:vehicleTypeId", [adminOnly], vehicleTypeController.update);
router.delete("/:vehicleTypeId", [adminOnly], vehicleTypeController.remove);

export default router;
