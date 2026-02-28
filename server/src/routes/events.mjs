import { Router } from "express";

import { validateRequest } from "../middleware/validateRequest.mjs";
import {
  validateCreateEventBody,
  validateEventParams,
} from "../validators/events.mjs";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "todo",
    items: [],
  });
});

router.post(
  "/",
  validateRequest({ body: validateCreateEventBody }),
  async (req, res) => {
    // Later, this is where i would write to PostgreSQL.
    res.status(201).json({
      status: "created",
      event: req.body,
    });
  }
);

router.get(
  "/:eventId",
  validateRequest({ params: validateEventParams }),
  (req, res) => {
    res.json({
      status: "todo",
      eventId: req.params.eventId,
    });
  }
);

router.put(
  "/:eventId",
  validateRequest({ params: validateEventParams, body: validateCreateEventBody }),
  (req, res) => {
    res.json({
      status: "updated",
      eventId: req.params.eventId,
      event: req.body,
    });
  }
);

router.delete(
  "/:eventId",
  validateRequest({ params: validateEventParams }),
  (req, res) => {
    res.json({
      status: "deleted",
      eventId: req.params.eventId,
    });
  }
);

export default router;
