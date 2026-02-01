import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";

import { validateRequest } from "../middleware/validateRequest.mjs";

const router = Router();

const users = new Map();

const userIdParamsSchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

const createUserBodySchema = z
  .object({
    email: z.string().email(),
    displayName: z.string().min(1),
    tosConsentAt: z.string().datetime(),
    privacyConsentAt: z.string().datetime(),
    timezone: z.string().min(1).optional(),
  })
  .strict();

router.post(
  "/",
  validateRequest({ body: createUserBodySchema }),
  (req, res) => {
    const id = `usr_${randomUUID()}`;
    const now = new Date().toISOString();

    const user = {
      id,
      email: req.body.email,
      displayName: req.body.displayName,
      tosConsentAt: req.body.tosConsentAt,
      privacyConsentAt: req.body.privacyConsentAt,
      timezone: req.body.timezone,
      createdAt: now,
    };

    users.set(id, user);

    res.status(201).json({ id });
  }
);

router.get(
  "/:userId",
  validateRequest({ params: userIdParamsSchema }),
  (req, res) => {
    const user = users.get(req.params.userId);
    if (!user) {
      return res.status(404).json({
        error: "NotFound",
        message: "User not found",
      });
    }

    return res.json(user);
  }
);

router.delete(
  "/:userId",
  validateRequest({ params: userIdParamsSchema }),
  (req, res) => {
    const user = users.get(req.params.userId);
    if (!user) {
      return res.status(404).json({
        error: "NotFound",
        message: "User not found",
      });
    }

    users.delete(req.params.userId);

    return res.json({
      status: "deleted",
      userId: req.params.userId,
      publicContributionsRetained: true,
    });
  }
);

export default router;
