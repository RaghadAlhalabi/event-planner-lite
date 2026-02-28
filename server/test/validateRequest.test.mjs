import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { validateRequest } from "../src/middleware/validateRequest.mjs";

function validateTitleBody(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push({
      path: "(root)",
      message: "Expected object",
      code: "invalid_type",
    });
    return { value: body, errors };
  }

  if (body.title === undefined) {
    errors.push({
      path: "title",
      message: "Required field",
      code: "missing",
    });
  } else if (typeof body.title !== "string") {
    errors.push({
      path: "title",
      message: "Expected string",
      code: "invalid_type",
    });
  } else if (body.title.length < 1) {
    errors.push({
      path: "title",
      message: "Must be at least 1 characters",
      code: "invalid_value",
    });
  }

  return { value: body, errors };
}

test("validateRequest returns 400 with details on invalid body", async () => {
  const app = express();
  app.use(express.json());

  app.post("/", validateRequest({ body: validateTitleBody }), (req, res) => {
    res.json({ ok: true });
  });

  const res = await request(app).post("/").send({});

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "ValidationError");
  assert.equal(res.body.message, "Invalid request");
  assert.ok(Array.isArray(res.body.details));
  assert.ok(res.body.details.some((d) => d.path === "title"));
});

test("validateRequest lets valid requests reach the handler", async () => {
  const app = express();
  app.use(express.json());

  app.post("/", validateRequest({ body: validateTitleBody }), (req, res) => {
    res.status(201).json({ ok: true, title: req.body.title });
  });

  const res = await request(app).post("/").send({ title: "Party" });

  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { ok: true, title: "Party" });
});
