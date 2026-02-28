import { Router } from "express";

import { validateRequest } from "../middleware/validateRequest.mjs";
import {
  validateCreateInvitationBody,
  validateEventParams,
} from "../validators/invitations.mjs";

const router = Router({ mergeParams: true });

router.get("/", validateRequest({ params: validateEventParams }), (req, res) => {
  res.json({
    status: "todo",
    eventId: req.params.eventId,
    items: [],
  });
});

router.post(
  "/",
  validateRequest({
    params: validateEventParams,
    body: validateCreateInvitationBody,
  }),
  (req, res) => {
    res.status(201).json({
      status: "created",
      eventId: req.params.eventId,
      invitation: req.body,
    });
  }
);

export default router;
