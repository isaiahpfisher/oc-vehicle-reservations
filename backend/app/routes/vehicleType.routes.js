import { Router } from "express";
import vehicleTypeController from "../controllers/vehicleType.controller.js";
import { authenticate, authorizeRoles, holdsAnyRole } from "../authorization/authorization.js";

const router = Router();
const adminOnly = authorizeRoles("admin");

// Feature 5 vehicle form lists types for area admins. Writes stay admin-only.
// Other signed-in roles still get the Feature 4 message.
const readVehicleTypes = (req, res, next) =>
  authenticate(req, res, () => {
    if (!holdsAnyRole(req.user, ["admin", "area_admin"])) {
      return res.status(403).send({ message: "Admin role required." });
    }

    next();
  });

router.get("/", [readVehicleTypes], vehicleTypeController.findAll);
router.get("/:vehicleTypeId", [readVehicleTypes], vehicleTypeController.findOne);
router.post("/", [adminOnly], vehicleTypeController.create);
router.put("/:vehicleTypeId", [adminOnly], vehicleTypeController.update);
router.delete("/:vehicleTypeId", [adminOnly], vehicleTypeController.remove);

export default router;
