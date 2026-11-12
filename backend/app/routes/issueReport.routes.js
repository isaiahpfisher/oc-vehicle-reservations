import { Router } from "express";
import issueReportController from "../controllers/issueReport.controller.js";
import { authenticate } from "../authorization/authorization.js";

const router = Router();

/** Feature 10 responses use `{ message: "Unauthorized." }` for a missing session. */
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

router.get("/", [requireSession], issueReportController.findAll);
router.get("/:issueReportId", [requireSession], issueReportController.findOne);
router.post("/", [requireSession], issueReportController.create);
router.put("/:issueReportId", [requireSession], issueReportController.update);
router.delete("/:issueReportId", [requireSession], issueReportController.remove);

export default router;
