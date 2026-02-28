import { Router } from "express";

import { validateRequest } from "../middleware/validateRequest.mjs";
import {
  validateEventParams,
  validateEventUserParams,
  validateRsvpBody,
} from "../validators/rsvps.mjs";

const router = Router({ mergeParams: true });

router.get("/", validateRequest({ params: validateEventParams }), (req, res) => {
  res.json({
    status: "todo",
    eventId: req.params.eventId,
    items: [],
  });
});

router.post(
  "/:userId",
  validateRequest({
    params: validateEventUserParams,
    body: validateRsvpBody,
  }),
  (req, res) => {
    res.json({
      status: "saved",
      eventId: req.params.eventId,
      userId: req.params.userId,
      rsvp: req.body,
    });
  }
);

export default router;
