import { Router } from "express";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";

import pool, { hasDatabase } from "../db/pool.mjs";
import { validateRequest } from "../middleware/validateRequest.mjs";
import {
  validateCreateUserBody,
  validateLoginUserBody,
  validateUserIdParams,
} from "../validators/userValidator.mjs";

const router = Router();

let usersTableReadyPromise;

const ensureDatabase = (req, res) => {
  if (!hasDatabase || !pool) {
    res.status(503).json({
      error: "DatabaseUnavailable",
      message: req.t("errors.DatabaseUnavailable"),
    });
    return false;
  }

  return true;
};

const ensureUsersTable = async () => {
  if (!usersTableReadyPromise) {
    usersTableReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(40) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          display_name VARCHAR(100) NOT NULL,
          tos_consent_at TIMESTAMP NOT NULL,
          privacy_consent_at TIMESTAMP NOT NULL,
          timezone VARCHAR(64),
          password_hash TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS password_hash TEXT
      `);
    })();
  }

  return usersTableReadyPromise;
};

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
};

const verifyPassword = (password, passwordHash) => {
  if (!passwordHash || typeof passwordHash !== "string") {
    return false;
  }

  const [salt, stored] = passwordHash.split(":");
  if (!salt || !stored) {
    return false;
  }

  const computed = scryptSync(password, salt, 64).toString("hex");
  const storedBuffer = Buffer.from(stored, "hex");
  const computedBuffer = Buffer.from(computed, "hex");

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, computedBuffer);
};

router.post(
  "/login",
  validateRequest({ body: validateLoginUserBody }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
      return;
    }

    try {
      await ensureUsersTable();

      const result = await pool.query(
        `
          SELECT
            id,
            email,
            display_name AS "displayName",
            tos_consent_at AS "tosConsentAt",
            privacy_consent_at AS "privacyConsentAt",
            timezone,
            password_hash AS "passwordHash",
            created_at AS "createdAt"
          FROM users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [req.body.email]
      );

      const user = result.rows[0];

      if (user && !user.passwordHash) {
        return res.status(401).json({
          error: "LegacyAccount",
          message: req.t("errors.LegacyAccount"),
        });
      }

      if (!user || !verifyPassword(req.body.password, user.passwordHash)) {
        return res.status(401).json({
          error: "InvalidCredentials",
          message: req.t("errors.InvalidCredentials"),
        });
      }

      return res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        tosConsentAt: user.tosConsentAt,
        privacyConsentAt: user.privacyConsentAt,
        timezone: user.timezone,
        createdAt: user.createdAt,
      });
    } catch (error) {
      return res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

router.post(
  "/",
  validateRequest({ body: validateCreateUserBody }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
      return;
    }

    try {
      await ensureUsersTable();

      const id = `usr_${randomUUID()}`;
      const now = new Date().toISOString();
      const passwordHash = hashPassword(req.body.password);

      const user = {
        id,
        email: req.body.email,
        displayName: req.body.displayName,
        tosConsentAt: req.body.tosConsentAt,
        privacyConsentAt: req.body.privacyConsentAt,
        timezone: req.body.timezone,
        createdAt: now,
      };

      await pool.query(
        `
          INSERT INTO users
            (id, email, display_name, tos_consent_at, privacy_consent_at, timezone, password_hash, created_at)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          user.id,
          user.email,
          user.displayName,
          user.tosConsentAt,
          user.privacyConsentAt,
          user.timezone,
          passwordHash,
          user.createdAt,
        ]
      );

      res.status(201).json({ id });
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({
          error: "Conflict",
          message: req.t("errors.Conflict"),
        });
      }

      return res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

router.get(
  "/:userId",
  validateRequest({ params: validateUserIdParams }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
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
          message: req.t("errors.NotFound"),
        });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

router.delete(
  "/:userId",
  validateRequest({ params: validateUserIdParams }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
      return;
    }

    const dbClient = await pool.connect();

    try {
      await dbClient.query("BEGIN");

      // Keep public contributions while removing account ownership metadata.
      const hasEventsTableResult = await dbClient.query(
        "SELECT to_regclass('public.events') IS NOT NULL AS exists"
      );
      if (hasEventsTableResult.rows[0]?.exists) {
        await dbClient.query(
          "UPDATE events SET user_id = NULL WHERE user_id = $1",
          [req.params.userId]
        );
      }

      const result = await dbClient.query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [req.params.userId]
      );

      if (result.rowCount === 0) {
        await dbClient.query("ROLLBACK");
        return res.status(404).json({
          error: "NotFound",
          message: req.t("errors.NotFound"),
        });
      }

      await dbClient.query("COMMIT");

      return res.json({
        status: "deleted",
        userId: req.params.userId,
        publicContributionsRetained: true,
      });
    } catch (error) {
      try {
        await dbClient.query("ROLLBACK");
      } catch {}

      return res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    } finally {
      dbClient.release();
    }
  }
);

export default router;
