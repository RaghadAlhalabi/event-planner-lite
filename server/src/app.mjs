import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import pool from "./db/pool.mjs";
import eventsRouter from "./routes/events.mjs";
import invitationsRouter from "./routes/invitations.mjs";
import rsvpsRouter from "./routes/rsvps.mjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/events/:eventId/invitations", invitationsRouter);
app.use("/api/events/:eventId/rsvps", rsvpsRouter);

// Basic API health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    name: "Event Planner Lite API",
    time: new Date().toISOString(),
  });
});

// DB health
app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ status: "ok", dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
