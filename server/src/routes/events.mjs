import { Router } from "express";
import { z } from "zod";

import { validateRequest } from "../middleware/validateRequest.mjs";

const router = Router();

const createEventBodySchema = z
  .object({
    title: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    location: z.string().min(1).optional(),
    notes: z.string().optional(),
  })
  .strict();

router.post(
  "/",
  validateRequest({ body: createEventBodySchema }),
  async (req, res) => {
    // Placeholder handler: demonstrates that the middleware validates input.
    // Later, this is where you would write to PostgreSQL.
    res.status(201).json({
      status: "created",
      event: req.body,
    });
  }
);

export default router;
