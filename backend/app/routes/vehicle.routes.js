import { Router } from "express";
import vehicleController from "../controllers/vehicle.controller.js";
import { authenticate, holdsAnyRole } from "../authorization/authorization.js";

const router = Router();

const requireVehicleManager = (req, res, next) =>
  authenticate(req, res, () => {
    if (!holdsAnyRole(req.user, ["admin", "area_admin"])) {
      return res.status(403).send({ message: "Admin or area admin role required." });
    }

    next();
  });

router.get("/", [requireVehicleManager], vehicleController.findAll);
router.get("/:vehicleId", [requireVehicleManager], vehicleController.findOne);
router.post("/", [requireVehicleManager], vehicleController.create);
router.put("/:vehicleId", [requireVehicleManager], vehicleController.update);
router.delete("/:vehicleId", [requireVehicleManager], vehicleController.remove);

export default router;
