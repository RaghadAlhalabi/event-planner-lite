import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { localeMiddleware } from "../src/middleware/locale.mjs";
import { validateRequest } from "../src/middleware/validateRequest.mjs";
import { validateCreateUserBody } from "../src/validators/users.mjs";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(localeMiddleware);

  app.post(
    "/users",
    validateRequest({ body: validateCreateUserBody }),
    (req, res) => {
      res.status(201).json({ ok: true });
    }
  );

  return app;
}

test("validation error message is localized to Norwegian with Accept-Language nb", async () => {
  const app = buildApp();

  const res = await request(app)
    .post("/users")
    .set("Accept-Language", "nb-NO,nb;q=0.9,en;q=0.8")
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "ValidationError");
  assert.equal(res.body.message, "Ugyldig foresporsel");

  assert.ok(Array.isArray(res.body.details));
  assert.ok(res.body.details.length > 0);
  assert.ok(
    res.body.details.some((d) => d.message === "Obligatorisk felt"),
    "Expected at least one localized detail message in Norwegian"
  );
});

test("validation error message falls back to English for unsupported language", async () => {
  const app = buildApp();

  const res = await request(app)
    .post("/users")
    .set("Accept-Language", "fr-FR,es;q=0.9")
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "ValidationError");
  assert.equal(res.body.message, "Invalid request");

  assert.ok(Array.isArray(res.body.details));
  assert.ok(
    res.body.details.some((d) => d.message === "Required field"),
    "Expected at least one fallback English detail message"
  );
});
