import { Router } from "express";
import placeController from "../controllers/place.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

// Feature 8, FR-008: address search for custom destinations. Order matters: `autocomplete` isn't a place id.
router.get("/autocomplete", [authenticate], placeController.autocomplete);
router.get("/:placeId", [authenticate], placeController.findOne);

export default router;
