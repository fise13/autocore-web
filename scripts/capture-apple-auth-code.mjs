#!/usr/bin/env node
/**
 * Capture a REAL Apple authorization code from the handler POST.
 * Optionally aborts the handler request so Firebase cannot consume the code first.
 *
 * Usage:
 *   node scripts/capture-apple-auth-code.mjs
 *   AUTO_EXCHANGE=1 node scripts/capture-apple-auth-code.mjs
 */

import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const LOGIN_URL = process.env.LOGIN_URL ?? "http://localhost:3000/login";
const HANDLER_HOST = "autocore-6066c.firebaseapp.com";
const HANDLER_PATH = "/__/auth/handler";
const CHROME =
  process.env.CHROME_PATH ??
  "/Users/victor/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const OUTPUT_PATH = resolve(process.cwd(), "scripts/.apple-auth-code.json");
const WAIT_MS = Number(process.env.CAPTURE_WAIT_MS ?? 300_000);
const ABORT_HANDLER = process.env.ABORT_HANDLER !== "0";

function parseFormBody(postData) {
  if (!postData) return {};
  const params = new URLSearchParams(postData);
  return Object.fromEntries(params.entries());
}

function attachCapture(page, label, onCaptured) {
  if (ABORT_HANDLER) {
    page.setRequestInterception(true);
  }

  page.on("request", (request) => {
    const url = request.url();
    const isHandlerPost =
      request.method() === "POST" && url.includes(HANDLER_HOST) && url.includes(HANDLER_PATH);

    if (isHandlerPost) {
      const fields = parseFormBody(request.postData());
      if (fields.code) {
        onCaptured({
          capturedAt: new Date().toISOString(),
          label,
          url,
          code: fields.code,
          state: fields.state ?? null,
          abortedHandler: ABORT_HANDLER,
        });
      }
      if (ABORT_HANDLER) {
        request.abort("blockedbyclient");
        return;
      }
    }

    if (ABORT_HANDLER) {
      request.continue();
    }
  });
}

console.log("Opening browser for interactive Apple login...");
console.log("Login URL:", LOGIN_URL);
console.log("Abort handler POST before Firebase consumes code:", ABORT_HANDLER);
console.log("Waiting up to", WAIT_MS / 1000, "seconds for handler POST...");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
});

const page = await browser.newPage();
let captured = null;

const onCaptured = (payload) => {
  if (!captured) captured = payload;
};

attachCapture(page, "main", onCaptured);

browser.on("targetcreated", async (target) => {
  if (target.type() !== "page") return;
  const popup = await target.page();
  if (!popup) return;
  attachCapture(popup, "popup", onCaptured);
});

await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll("button").length > 0, { timeout: 30000 });

const clicked = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")];
  const apple = buttons.find((b) => /apple|Apple/i.test(b.textContent ?? ""));
  if (!apple) return false;
  apple.click();
  return true;
});

if (!clicked) {
  console.error("Apple button not found on login page.");
  await browser.close();
  process.exit(1);
}

console.log("Complete Apple login in the popup window...");

const started = Date.now();
while (!captured && Date.now() - started < WAIT_MS) {
  await new Promise((r) => setTimeout(r, 250));
}

await browser.close();

if (!captured) {
  console.error("Timed out without capturing authorization code.");
  process.exit(1);
}

writeFileSync(OUTPUT_PATH, JSON.stringify(captured, null, 2));
console.log("\nCaptured:");
console.log(JSON.stringify(captured, null, 2));
console.log("\nSaved to:", OUTPUT_PATH);

if (process.env.AUTO_EXCHANGE === "1") {
  await new Promise((resolvePromise, rejectPromise) => {
    const exchange = spawn(
      process.execPath,
      [resolve(process.cwd(), "scripts/exchange-real-apple-code.mjs"), "--code", captured.code],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          APPLE_AUTH_CODE: captured.code,
          APPLE_TEAM_ID: process.env.APPLE_TEAM_ID ?? "45W7LA3QFP",
          APPLE_KEY_ID: process.env.APPLE_KEY_ID ?? "HPPLWCR7Y5",
          APPLE_SERVICES_ID: process.env.APPLE_SERVICES_ID ?? "com.wise.autocore.web",
          APPLE_P8_PATH: process.env.APPLE_P8_PATH ?? "/Users/victor/Downloads/AuthKey_HPPLWCR7Y5.p8",
        },
      },
    );
    exchange.on("exit", (code) => (code === 0 ? resolvePromise() : rejectPromise(new Error(`exchange exit ${code}`))));
  });
} else {
  console.log("\nRun exchange immediately:");
  console.log(
    `APPLE_AUTH_CODE='${captured.code}' node scripts/exchange-real-apple-code.mjs --p8 /Users/victor/Downloads/AuthKey_HPPLWCR7Y5.p8`,
  );
}
