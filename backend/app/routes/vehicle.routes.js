import { Router } from "express";
import vehicleController from "../controllers/vehicle.controller.js";
import { authenticate, holdsAnyRole } from "../authorization/authorization.js";

const router = Router();

const requireVehicleRole = (roles) => (req, res, next) =>
  authenticate(req, res, () => {
    if (!holdsAnyRole(req.user, roles)) {
      return res.status(403).send({ message: "Admin or area admin role required." });
    }

    next();
  });

// Feature 13: maintenance reads vehicles so they can open mileage and service logs. Writes stay with managers.
const requireVehicleReader = requireVehicleRole(["admin", "area_admin", "maintenance"]);
const requireVehicleManager = requireVehicleRole(["admin", "area_admin"]);

router.get("/", [requireVehicleReader], vehicleController.findAll);
router.get("/:vehicleId", [requireVehicleReader], vehicleController.findOne);
router.post("/", [requireVehicleManager], vehicleController.create);
router.put("/:vehicleId", [requireVehicleManager], vehicleController.update);
router.delete("/:vehicleId", [requireVehicleManager], vehicleController.remove);

export default router;
