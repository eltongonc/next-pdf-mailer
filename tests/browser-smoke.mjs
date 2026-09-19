import assert from "node:assert/strict";
import puppeteer from "puppeteer";
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
  await page.waitForSelector(".template-card");
  await page.screenshot({
    path: "/tmp/paperpost-dashboard.png",
    fullPage: true,
  });
  await page.click(".template-card");
  await page.waitForSelector("iframe");
  const frame = page.frames().find((f) => f !== page.mainFrame());
  await frame.waitForFunction(() =>
    document.body.textContent.includes("Studio North"),
  );
  await page.click(".button-group .primary");
  await page.waitForFunction(
    () => !!localStorage.getItem("paperpost.templates"),
  );
  const result = await page.evaluate(async () => {
    const template = JSON.parse(localStorage.getItem("paperpost.templates"))[0];
    const response = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template }),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      status: response.status,
      type: response.headers.get("content-type"),
      signature: String.fromCharCode(...bytes.slice(0, 5)),
      length: bytes.length,
    };
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.signature, "%PDF-");
  assert.equal(result.type, "application/pdf");
  assert.ok(result.length > 1000);
  await page.screenshot({ path: "/tmp/paperpost-editor.png", fullPage: true });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".template-card");
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/paperpost-mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "Mobile page should not overflow horizontally",
  );
  const unauthenticated = await page.evaluate(
    async () =>
      (await fetch("/api/v1/send", { method: "POST", body: "{}" })).status,
  );
  assert.equal(unauthenticated, 401);
  assert.deepEqual(errors, []);
  console.log(
    "Browser smoke passed: editor, preview, local persistence, real PDF generation, responsive layout, and API authentication.",
  );
} finally {
  await browser.close();
}
