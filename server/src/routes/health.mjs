import { Router } from "express";

import pool, { hasDatabase } from "../db/pool.mjs";

const router = Router();

// Basic API health
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    name: "Event Planner Lite API",
    time: new Date().toISOString(),
  });
});

// DB health
router.get("/db", async (req, res) => {
  if (!hasDatabase || !pool) {
    return res.status(503).json({
      status: "unavailable",
      message: "Database not configured",
    });
  }

  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ status: "ok", dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
