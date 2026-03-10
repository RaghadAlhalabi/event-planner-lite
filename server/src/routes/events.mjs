import { Router } from "express";
import { randomUUID } from "crypto";

import pool, { hasDatabase } from "../db/pool.mjs";
import { validateRequest } from "../middleware/validateRequest.mjs";
import {
  validateCreateEventBody,
  validateEventParams,
} from "../validators/eventValidator.mjs";

const router = Router();

let eventsTableReadyPromise;

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

const ensureEventsTable = async () => {
  if (!eventsTableReadyPromise) {
    eventsTableReadyPromise = (async () => {
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
    })();
  }

  return eventsTableReadyPromise;
};

const toApiEvent = (row) => ({
  id: row.external_id || `evt_${row.id}`,
  title: row.title,
  startsAt: row.starts_at || null,
  endsAt: row.ends_at || null,
  location: row.location || null,
  notes: row.notes || row.description || null,
  createdAt: row.created_at,
});

router.get("/", async (req, res) => {
  if (!ensureDatabase(req, res)) {
    return;
  }

  try {
    await ensureEventsTable();

    const values = [];
    const where = [];

    if (typeof req.query.ownerId === "string" && req.query.ownerId.trim()) {
      values.push(req.query.ownerId.trim());
      where.push(`user_id = $${values.length}`);
    }

    if (typeof req.query.from === "string" && req.query.from.trim()) {
      values.push(req.query.from.trim());
      where.push(`COALESCE(starts_at, event_date::timestamptz) >= $${values.length}::timestamptz`);
    }

    if (typeof req.query.to === "string" && req.query.to.trim()) {
      values.push(req.query.to.trim());
      where.push(`COALESCE(starts_at, event_date::timestamptz) <= $${values.length}::timestamptz`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(
      `
        SELECT
          id,
          external_id,
          title,
          starts_at AS "starts_at",
          ends_at AS "ends_at",
          location,
          notes,
          description,
          created_at AS "created_at"
        FROM events
        ${whereClause}
        ORDER BY COALESCE(starts_at, created_at) ASC
      `,
      values
    );

    res.json({
      items: result.rows.map(toApiEvent),
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
  validateRequest({ body: validateCreateEventBody }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
      return;
    }

    try {
      await ensureEventsTable();

      const externalId = `evt_${randomUUID()}`;
      const result = await pool.query(
        `
          INSERT INTO events
            (external_id, title, starts_at, ends_at, location, notes, description, event_date)
          VALUES
            ($1, $2, $3::timestamptz, $4::timestamptz, $5, $6, $6, ($3::timestamptz)::date)
          RETURNING
            id,
            external_id,
            title,
            starts_at AS "starts_at",
            ends_at AS "ends_at",
            location,
            notes,
            description,
            created_at AS "created_at"
        `,
        [
          externalId,
          req.body.title,
          req.body.startsAt,
          req.body.endsAt ?? null,
          req.body.location ?? null,
          req.body.notes ?? null,
        ]
      );

      res.status(201).json({ id: result.rows[0].external_id });
    } catch {
      res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

router.get(
  "/:eventId",
  validateRequest({ params: validateEventParams }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
      return;
    }

    try {
      await ensureEventsTable();

      const result = await pool.query(
        `
          SELECT
            id,
            external_id,
            title,
            starts_at AS "starts_at",
            ends_at AS "ends_at",
            location,
            notes,
            description,
            created_at AS "created_at"
          FROM events
          WHERE external_id = $1 OR id::text = $1
          LIMIT 1
        `,
        [req.params.eventId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "NotFound",
          message: req.t("errors.NotFound"),
        });
      }

      res.json(toApiEvent(result.rows[0]));
    } catch {
      res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

router.put(
  "/:eventId",
  validateRequest({ params: validateEventParams, body: validateCreateEventBody }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
      return;
    }

    try {
      await ensureEventsTable();

      const result = await pool.query(
        `
          UPDATE events
          SET
            title = $2,
            starts_at = $3::timestamptz,
            ends_at = $4::timestamptz,
            location = $5,
            notes = $6,
            description = $6,
            event_date = ($3::timestamptz)::date
          WHERE external_id = $1 OR id::text = $1
          RETURNING id
        `,
        [
          req.params.eventId,
          req.body.title,
          req.body.startsAt,
          req.body.endsAt ?? null,
          req.body.location ?? null,
          req.body.notes ?? null,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "NotFound",
          message: req.t("errors.NotFound"),
        });
      }

      res.json({ status: "updated" });
    } catch {
      res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

router.delete(
  "/:eventId",
  validateRequest({ params: validateEventParams }),
  async (req, res) => {
    if (!ensureDatabase(req, res)) {
      return;
    }

    try {
      await ensureEventsTable();

      const result = await pool.query(
        `
          DELETE FROM events
          WHERE external_id = $1 OR id::text = $1
          RETURNING id
        `,
        [req.params.eventId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "NotFound",
          message: req.t("errors.NotFound"),
        });
      }

      res.json({ status: "deleted" });
    } catch {
      res.status(500).json({
        error: "DatabaseError",
        message: req.t("errors.DatabaseError"),
      });
    }
  }
);

export default router;
