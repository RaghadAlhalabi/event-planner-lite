import { Router } from "express";
import { randomUUID } from "crypto";

import pool, { hasDatabase } from "../db/pool.mjs";
import { validateRequest } from "../middleware/validateRequest.mjs";
import {
  validateEventParams,
  validateEventUserParams,
  validateRsvpBody,
} from "../validators/rsvps.mjs";

const router = Router({ mergeParams: true });

let rsvpTablesReadyPromise;

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
  if (!rsvpTablesReadyPromise) {
    rsvpTablesReadyPromise = (async () => {
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
          ADD COLUMN IF NOT EXISTS external_id VARCHAR(64) UNIQUE
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS rsvps (
          id SERIAL PRIMARY KEY,
          external_id VARCHAR(64) UNIQUE NOT NULL,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL,
          note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, user_id)
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_rsvps_event_id
        ON rsvps(event_id)
      `);
    })();
  }

  return rsvpTablesReadyPromise;
};

const findEventByParamId = async (eventId) => {
  const result = await pool.query(
    `
      SELECT id
      FROM events
      WHERE external_id = $1 OR id::text = $1
      LIMIT 1
    `,
    [eventId]
  );

  return result.rows[0] || null;
};

const toApiRsvp = (row) => ({
  id: row.external_id || `rsvp_${row.id}`,
  userId: row.user_id,
  status: row.status,
  note: row.note || null,
});

router.get("/", validateRequest({ params: validateEventParams }), async (req, res) => {
  if (!ensureDatabase(req, res)) {
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

    const result = await pool.query(
      `
        SELECT id, external_id, user_id, status, note
        FROM rsvps
        WHERE event_id = $1
        ORDER BY updated_at DESC
      `,
      [event.id]
    );

    res.json({ items: result.rows.map(toApiRsvp) });
  } catch {
    res.status(500).json({
      error: "DatabaseError",
      message: req.t("errors.DatabaseError"),
    });
  }
});

router.post(
  "/:userId",
  validateRequest({
    params: validateEventUserParams,
    body: validateRsvpBody,
  }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
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

      const result = await pool.query(
        `
          INSERT INTO rsvps (external_id, event_id, user_id, status, note)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (event_id, user_id)
          DO UPDATE SET
            status = EXCLUDED.status,
            note = EXCLUDED.note,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, external_id
        `,
        [
          `rsvp_${randomUUID()}`,
          event.id,
          req.params.userId,
          req.body.status,
          req.body.note ?? null,
        ]
      );

      res.json({ status: "saved", id: result.rows[0].external_id || `rsvp_${result.rows[0].id}` });
    } catch (error) {
      if (error?.code === "23503") {
        return res.status(404).json({
          error: "NotFound",
          message: req.t("errors.NotFound"),
        });
      }

      res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

export default router;
