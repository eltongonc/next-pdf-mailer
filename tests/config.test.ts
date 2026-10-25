import test from "node:test";
import assert from "node:assert/strict";
import { validateProductionConfig } from "../src/lib/config";

const valid: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:secret@db/paperpost",
  APP_ORIGIN: "https://paperpost.example.com",
};

void test("development permits an unconfigured playground", () => {
  assert.doesNotThrow(() =>
    validateProductionConfig({ NODE_ENV: "development" }),
  );
});
void test("production requires a database and an exact HTTPS origin", () => {
  assert.doesNotThrow(() => validateProductionConfig(valid));
  for (const APP_ORIGIN of [
    "",
    "http://example.com",
    "https://example.com/",
    "https://example.com/path",
    "https://user:pass@example.com",
  ]) {
    assert.throws(
      () => validateProductionConfig({ ...valid, APP_ORIGIN }),
      /APP_ORIGIN/,
    );
  }
  for (const DATABASE_URL of [
    "",
    "https://example.com/database",
    "postgresql://db",
  ]) {
    assert.throws(
      () => validateProductionConfig({ ...valid, DATABASE_URL }),
      /DATABASE_URL/,
    );
  }
});
void test("email configuration is all or nothing and errors redact values", () => {
  const email = {
    RESEND_API_KEY: "re_secret",
    MAIL_FROM: "Paperpost <sender@example.com>",
    RESEND_WEBHOOK_SECRET: "whsec_secret",
  };
  assert.doesNotThrow(() => validateProductionConfig({ ...valid, ...email }));
  for (const field of Object.keys(email)) {
    assert.throws(
      () => validateProductionConfig({ ...valid, ...email, [field]: "" }),
      new RegExp(field),
    );
  }
  assert.throws(
    () => validateProductionConfig({ ...valid, DATABASE_URL: "super-secret" }),
    (error: unknown) =>
      error instanceof Error && !error.message.includes("super-secret"),
  );
});
