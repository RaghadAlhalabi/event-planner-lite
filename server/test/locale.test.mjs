import test from "node:test";
import assert from "node:assert/strict";

import { resolveLocale, t } from "../src/i18n/messages.mjs";

test("resolveLocale defaults to en for missing header", () => {
  assert.equal(resolveLocale(undefined), "en");
  assert.equal(resolveLocale(""), "en");
});

test("resolveLocale maps no/nb variants to nb", () => {
  assert.equal(resolveLocale("nb-NO,nb;q=0.9,en;q=0.8"), "nb");
  assert.equal(resolveLocale("no,en-US;q=0.7"), "nb");
});

test("resolveLocale respects q-values for supported locales", () => {
  assert.equal(resolveLocale("en-US;q=0.7,nb;q=0.9"), "nb");
  assert.equal(resolveLocale("nb-NO;q=0.4,en;q=0.8"), "en");
});

test("resolveLocale falls back to en when only unsupported locales are present", () => {
  assert.equal(resolveLocale("fr-FR,es;q=0.9"), "en");
});

test("translation helper returns localized server error message", () => {
  assert.equal(t("nb", "errors.ValidationError"), "Ugyldig foresporsel");
  assert.equal(t("en", "errors.ValidationError"), "Invalid request");
});
