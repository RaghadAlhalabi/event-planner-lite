import { Router } from "express";

import pool, { hasDatabase } from "../db/pool.mjs";
import { validateRequest } from "../middleware/validateRequest.mjs";
import { sendEmailProbe } from "../services/email.mjs";
import { validateEmailTestBody } from "../validators/healthValidator.mjs";

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
