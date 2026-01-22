import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { z } from "zod";

import { validateRequest } from "../src/middleware/validateRequest.mjs";

test("validateRequest returns 400 with details on invalid body", async () => {
  const app = express();
  app.use(express.json());

  const schema = z.object({ title: z.string().min(1) }).strict();
  app.post("/", validateRequest({ body: schema }), (req, res) => {
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

  const schema = z.object({ title: z.string().min(1) }).strict();
  app.post("/", validateRequest({ body: schema }), (req, res) => {
    res.status(201).json({ ok: true, title: req.body.title });
  });

  const res = await request(app).post("/").send({ title: "Party" });

  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { ok: true, title: "Party" });
});
