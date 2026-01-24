import { Router } from "express";
import { z } from "zod";

import { validateRequest } from "../middleware/validateRequest.mjs";

const router = Router({ mergeParams: true });

const eventParamsSchema = z
  .object({
    eventId: z.string().min(1),
  })
  .strict();

const createInvitationSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

router.get("/", validateRequest({ params: eventParamsSchema }), (req, res) => {
  res.json({
    status: "todo",
    eventId: req.params.eventId,
    items: [],
  });
});

router.post(
  "/",
  validateRequest({ params: eventParamsSchema, body: createInvitationSchema }),
  (req, res) => {
    res.status(201).json({
      status: "created",
      eventId: req.params.eventId,
      invitation: req.body,
    });
  }
);

export default router;
