import { Router } from "express";
import vehicleRequestController from "../controllers/vehicleRequest.controller.js";
import { authenticate, authorizeRoles } from "../authorization/authorization.js";

const router = Router();

router.get("/me/requests", [authenticate], vehicleRequestController.findMine);
router.get("/requests", [authorizeRoles("area_admin")], vehicleRequestController.findAll);
router.post("/requests", [authenticate], vehicleRequestController.create);
router.get("/requests/:requestId", [authenticate], vehicleRequestController.findOne);
router.put("/requests/:requestId", [authenticate], vehicleRequestController.update);
router.get(
  "/requests/:requestId/vehicle-options",
  [authorizeRoles("area_admin")],
  vehicleRequestController.vehicleOptions,
);

export default router;
