import { Router } from "express";

import pool, { hasDatabase } from "../db/pool.mjs";
import { validateRequest } from "../middleware/validateRequest.mjs";
import { sendEmailProbe } from "../services/email.mjs";
import { validateEmailTestBody } from "../validators/healthValidator.mjs";

const router = Router();

const ACTIVE_RSVP_ROUTES = [
  { method: "GET", path: "/api/events/:eventId/rsvps" },
  { method: "POST", path: "/api/events/:eventId/rsvps" },
  { method: "POST", path: "/api/events/:eventId/rsvps/:userId" },
  { method: "GET", path: "/api/rsvps/:eventId" },
  { method: "POST", path: "/api/rsvps/:eventId" },
  { method: "POST", path: "/api/rsvps/:eventId/:userId" },
];

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
      message: req.t("errors.DatabaseUnavailable"),
    });
  }

  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ status: "ok", dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: req.t("errors.DatabaseError"),
    });
  }
});

// Temporary route debug endpoint for production verification.
router.get("/routes", (req, res) => {
  const expectedToken = process.env.HEALTH_DEBUG_TOKEN;
  const providedToken = req.get("x-health-debug-token");

  if (expectedToken && providedToken !== expectedToken) {
    return res.status(401).json({
      error: "Unauthorized",
      message: req.t("errors.Unauthorized"),
    });
  }

  const buildHint = {
    renderCommit: process.env.RENDER_GIT_COMMIT || null,
    renderBranch: process.env.RENDER_GIT_BRANCH || null,
    renderService: process.env.RENDER_SERVICE_NAME || null,
    commitSha: process.env.COMMIT_SHA || process.env.GIT_COMMIT || null,
    release: process.env.RELEASE || null,
  };

  const hasBuildHint = Object.values(buildHint).some((value) => Boolean(value));

  return res.json({
    ok: true,
    rsvpRoutes: ACTIVE_RSVP_ROUTES,
    buildHint: hasBuildHint ? buildHint : null,
    time: new Date().toISOString(),
  });
});

// SMTP health probe (protected by EMAIL_TEST_TOKEN)
router.post(
  "/email-test",
  validateRequest({ body: validateEmailTestBody }),
  async (req, res) => {
    const expectedToken = process.env.EMAIL_TEST_TOKEN;
    const providedToken = req.get("x-email-test-token");

    if (!expectedToken || providedToken !== expectedToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: req.t("errors.Unauthorized"),
      });
    }

    const result = await sendEmailProbe({ to: req.body.to });

    if (result.sent) {
      return res.json({
        status: "ok",
        to: req.body.to,
        delivery: result,
      });
    }

    return res.status(503).json({
      status: "unavailable",
      to: req.body.to,
      delivery: result,
    });
  }
);

export default router;
