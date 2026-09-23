import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import puppeteer from "puppeteer";

const email = `browser-${randomUUID()}@example.com`;
const password = "browser integration password";
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1050 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.APP_URL || "http://localhost:3000");
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('.auth button[type="button"]');
  await page.waitForSelector('[aria-label="Sign out"]');
  const account = await page.evaluate(async () =>
    (await fetch("/api/auth")).json(),
  );
  assert.equal(account.email, email);
  await page.reload();
  await page.waitForSelector('[aria-label="Sign out"]');
  await page.click('[aria-label="Sign out"]');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click(".auth button.primary");
  await page.waitForSelector('[aria-label="Sign out"]');
  assert.deepEqual(errors, []);
  console.log("Browser account signup, persistence, logout and login passed.");
} finally {
  await browser.close();
  await db.query("delete from users where email = $1", [email]);
  await db.query("delete from auth_attempts where email_hash = $1", [
    createHash("sha256").update(email).digest("hex"),
  ]);
  await db.end();
}
