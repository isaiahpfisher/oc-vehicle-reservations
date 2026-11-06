import { Router } from "express";
import mileageLogController from "../controllers/mileageLog.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

/** Feature 9 responses use `{ message: "Unauthorized." }` for a missing session. */
const requireSession = (req, res, next) => {
  const send = res.send.bind(res);
  let rewritten = false;
  res.send = (body) => {
    if (!rewritten && res.statusCode === 401) {
      rewritten = true;
      return send({ message: "Unauthorized." });
    }

    return send(body);
  };
  return authenticate(req, res, next);
};

router.get("/", [requireSession], mileageLogController.findAll);
router.get("/:mileageLogId", [requireSession], mileageLogController.findOne);
router.post("/", [requireSession], mileageLogController.create);
router.put("/:mileageLogId", [requireSession], mileageLogController.update);
router.delete("/:mileageLogId", [requireSession], mileageLogController.remove);

export default router;
