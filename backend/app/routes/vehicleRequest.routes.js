import { Router } from "express";
import vehicleRequestController from "../controllers/vehicleRequest.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

// INTERIM: remove when Feature 8 serves vehicle requests.
router.get("/", [authenticate], vehicleRequestController.findAll);

export default router;
