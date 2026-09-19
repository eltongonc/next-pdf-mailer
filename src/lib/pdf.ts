import puppeteer from "puppeteer";
import { HttpError } from "./server";
let active = 0;
export async function generatePdf(html: string) {
  if (active >= 2)
    throw new HttpError(429, "PDF renderer is busy. Please retry shortly.");
  active++;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      timeout: 20000,
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (
        request.url().startsWith("data:image/") ||
        request.url().startsWith("data:font/")
      )
        void request.continue();
      else void request.abort();
    });
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load", timeout: 15000 });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 15000,
    });
  } finally {
    try {
      await browser?.close();
    } finally {
      active--;
    }
  }
}
