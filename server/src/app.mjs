import "dotenv/config";
import express from "express";

import { applyMiddleware } from "./middleware/index.mjs";
import eventsRouter from "./routes/events.mjs";
import healthRouter from "./routes/health.mjs";
import invitationsRouter from "./routes/invitations.mjs";
import rsvpsRouter from "./routes/rsvps.mjs";
import usersRouter from "./routes/users.mjs";

const app = express();
applyMiddleware(app);

app.get("/", (req, res) => {
  res.json({
    name: "Event Planner Lite API",
    status: "ok",
    docs: "/api/health",
    time: new Date().toISOString(),
  });
});

app.use("/api/events", eventsRouter);
app.use("/api/events/:eventId/invitations", invitationsRouter);
app.use("/api", rsvpsRouter);
app.use("/api/users", usersRouter);
app.use("/api/health", healthRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
