import { Router } from "express";
import { randomUUID } from "crypto";

import pool, { hasDatabase } from "../db/pool.mjs";
import { validateRequest } from "../middleware/validateRequest.mjs";
import { sendInvitationEmail } from "../services/email.mjs";
import {
  validateCreateInvitationBody,
  validateEventParams,
} from "../validators/invitationValidator.mjs";

const router = Router({ mergeParams: true });

let invitationsTablesReadyPromise;

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

const ensureTables = async () => {
  if (!invitationsTablesReadyPromise) {
    invitationsTablesReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          event_date DATE,
          user_id VARCHAR(40) REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        ALTER TABLE events
          ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS location VARCHAR(255),
          ADD COLUMN IF NOT EXISTS notes TEXT,
          ADD COLUMN IF NOT EXISTS external_id VARCHAR(64) UNIQUE,
          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS archived_reason VARCHAR(64)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS invitations (
          id SERIAL PRIMARY KEY,
          external_id VARCHAR(64) UNIQUE NOT NULL,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          email VARCHAR(320) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_invitations_event_id
        ON invitations(event_id)
      `);
    })();
  }

  return invitationsTablesReadyPromise;
};

const findEventByParamId = async (eventId) => {
  const result = await pool.query(
    `
      SELECT id, external_id, user_id, title, starts_at, location
      FROM events
      WHERE (external_id = $1 OR id::text = $1)
        AND archived_at IS NULL
      LIMIT 1
    `,
    [eventId]
  );

  return result.rows[0] || null;
};

const toApiInvitation = (row) => ({
  id: row.external_id || `inv_${row.id}`,
  email: row.email,
  status: row.status,
});

const getRequestUserId = (req) => {
  const value = req.get("x-user-id");
  return typeof value === "string" ? value.trim() : "";
};

const requireRequestUserId = (req, res) => {
  const userId = getRequestUserId(req);

  if (!userId) {
    res.status(401).json({
      error: "Unauthorized",
      message: req.t("errors.Unauthorized"),
    });
    return null;
  }

  return userId;
};

router.get("/", validateRequest({ params: validateEventParams }), async (req, res) => {
  if (!ensureDatabase(req, res)) {
    return;
  }

  const requestUserId = requireRequestUserId(req, res);
  if (!requestUserId) {
    return;
  }

  try {
    await ensureTables();

    const event = await findEventByParamId(req.params.eventId);
    if (!event) {
      return res.status(404).json({
        error: "NotFound",
        message: req.t("errors.NotFound"),
      });
    }

    if (event.user_id !== requestUserId) {
      return res.status(403).json({
        error: "Forbidden",
        message: req.t("errors.Forbidden"),
      });
    }

    const result = await pool.query(
      `
        SELECT id, external_id, email, status
        FROM invitations
        WHERE event_id = $1
        ORDER BY created_at ASC
      `,
      [event.id]
    );

    res.json({
      items: result.rows.map(toApiInvitation),
    });
  } catch {
    res.status(500).json({
      error: "DatabaseError",
      message: req.t("errors.DatabaseError"),
    });
  }
});

router.post(
  "/",
  validateRequest({
    params: validateEventParams,
    body: validateCreateInvitationBody,
  }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
      return;
    }

    const requestUserId = requireRequestUserId(req, res);
    if (!requestUserId) {
      return;
    }

    try {
      await ensureTables();

      const event = await findEventByParamId(req.params.eventId);
      if (!event) {
        return res.status(404).json({
          error: "NotFound",
          message: req.t("errors.NotFound"),
        });
      }

      if (event.user_id !== requestUserId) {
        return res.status(403).json({
          error: "Forbidden",
          message: req.t("errors.Forbidden"),
        });
      }

      const externalId = `inv_${randomUUID()}`;
      const result = await pool.query(
        `
          INSERT INTO invitations (external_id, event_id, email, status)
          VALUES ($1, $2, $3, 'pending')
          RETURNING external_id
        `,
        [externalId, event.id, req.body.email.toLowerCase()]
      );

      const invitationId = result.rows[0].external_id;
      const emailResult = await sendInvitationEmail({
        to: req.body.email.toLowerCase(),
        event,
        invitationId,
      });

      let status = "pending";

      if (emailResult.sent) {
        status = "sent";
        await pool.query(
          "UPDATE invitations SET status = 'sent' WHERE external_id = $1",
          [invitationId]
        );
      } else {
        status = "failed_email";
        await pool.query(
          "UPDATE invitations SET status = 'failed_email' WHERE external_id = $1",
          [invitationId]
        );
      }

      res.status(201).json({
        id: invitationId,
        status,
        emailDelivery: {
          sent: emailResult.sent,
          reason: emailResult.reason,
          provider: emailResult.provider || null,
          detail: emailResult.detail || null,
        },
      });
    } catch {
      res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

export default router;
