import { Router } from "express";
import { z } from "zod";

import { validateRequest } from "../middleware/validateRequest.mjs";

const router = Router();

const eventParamsSchema = z
  .object({
    eventId: z.string().min(1),
  })
  .strict();

const createEventBodySchema = z
  .object({
    title: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    location: z.string().min(1).optional(),
    notes: z.string().optional(),
  })
  .strict();

router.get("/", (req, res) => {
  res.json({
    status: "todo",
    items: [],
  });
});

router.post(
  "/",
  validateRequest({ body: createEventBodySchema }),
  async (req, res) => {
      // Later, this is where PostgreSQL writes would go.
    res.status(201).json({
      status: "created",
      event: req.body,
    });
  }
);

router.get(
  "/:eventId",
  validateRequest({ params: eventParamsSchema }),
  (req, res) => {
    res.json({
      status: "todo",
      eventId: req.params.eventId,
    });
  }
);

router.put(
  "/:eventId",
  validateRequest({ params: eventParamsSchema, body: createEventBodySchema }),
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
  validateRequest({ params: eventParamsSchema }),
  (req, res) => {
    res.json({
      status: "deleted",
      eventId: req.params.eventId,
    });
  }
);

export default router;
