import { Router } from "express";
import { z } from "zod";

import { validateRequest } from "../middleware/validateRequest.mjs";

const router = Router({ mergeParams: true });

const eventParamsSchema = z
  .object({
    eventId: z.string().min(1),
  })
  .strict();

const eventUserParamsSchema = z
  .object({
    eventId: z.string().min(1),
    userId: z.string().min(1),
  })
  .strict();

const rsvpBodySchema = z
  .object({
    status: z.enum(["yes", "no", "maybe"]),
    note: z.string().optional(),
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
  "/:userId",
  validateRequest({ params: eventUserParamsSchema, body: rsvpBodySchema }),
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
