import { Router } from "express";
import vehicleTypeInstructionController from "../controllers/vehicleTypeInstruction.controller.js";
import { authorizeRoles } from "../authorization/authorization.js";

const router = Router();
const canManageInstructions = authorizeRoles("admin", "area_admin");

router.get("/", [canManageInstructions], vehicleTypeInstructionController.findAll);
router.get("/:vehicleTypeInstructionId", [canManageInstructions], vehicleTypeInstructionController.findOne);
router.post("/", [canManageInstructions], vehicleTypeInstructionController.create);
router.put("/:vehicleTypeInstructionId", [canManageInstructions], vehicleTypeInstructionController.update);
router.delete("/:vehicleTypeInstructionId", [canManageInstructions], vehicleTypeInstructionController.remove);

export default router;
