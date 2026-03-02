import { Router } from "express";
import { randomUUID } from "crypto";

import pool, { hasDatabase } from "../db/pool.mjs";
import { validateRequest } from "../middleware/validateRequest.mjs";
import {
  validateCreateUserBody,
  validateUserIdParams,
} from "../validators/users.mjs";

const router = Router();

const ensureDatabase = (res) => {
  if (!hasDatabase || !pool) {
    res.status(503).json({
      error: "DatabaseUnavailable",
      message: "Database is not configured.",
    });
    return false;
  }

  return true;
};

router.post(
  "/",
  validateRequest({ body: validateCreateUserBody }),
  async (req, res) => {
    if (!ensureDatabase(res)) {
      return;
    }

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

    try {
      await pool.query(
        `
          INSERT INTO users
            (id, email, display_name, tos_consent_at, privacy_consent_at, timezone, created_at)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          user.id,
          user.email,
          user.displayName,
          user.tosConsentAt,
          user.privacyConsentAt,
          user.timezone,
          user.createdAt,
        ]
      );

      res.status(201).json({ id });
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({
          error: "Conflict",
          message: "User already exists.",
        });
      }

      return res.status(500).json({
        error: "DatabaseError",
        message: "Failed to create user.",
      });
    }
  }
);

router.get(
  "/:userId",
  validateRequest({ params: validateUserIdParams }),
  async (req, res) => {
    if (!ensureDatabase(res)) {
      return;
    }

    try {
      const result = await pool.query(
        `
          SELECT
            id,
            email,
            display_name AS "displayName",
            tos_consent_at AS "tosConsentAt",
            privacy_consent_at AS "privacyConsentAt",
            timezone,
            created_at AS "createdAt"
          FROM users
          WHERE id = $1
        `,
        [req.params.userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "NotFound",
          message: "User not found",
        });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({
        error: "DatabaseError",
        message: "Failed to load user.",
      });
    }
  }
);

router.delete(
  "/:userId",
  validateRequest({ params: validateUserIdParams }),
  async (req, res) => {
    if (!ensureDatabase(res)) {
      return;
    }

    try {
      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [req.params.userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "NotFound",
          message: "User not found",
        });
      }

      return res.json({
        status: "deleted",
        userId: req.params.userId,
        publicContributionsRetained: true,
      });
    } catch (error) {
      return res.status(500).json({
        error: "DatabaseError",
        message: "Failed to delete user.",
      });
    }
  }
);

export default router;
