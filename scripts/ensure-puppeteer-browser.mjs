#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function hasPuppeteerChrome() {
  const cacheRoot = join(homedir(), ".cache", "puppeteer", "chrome");
  if (!existsSync(cacheRoot)) return false;

  return readdirSync(cacheRoot).some((entry) => entry.startsWith("mac_") || entry.startsWith("linux_"));
}

if (process.env.VERCEL || process.env.CI === "true") {
  process.exit(0);
}

if (hasPuppeteerChrome()) {
  process.exit(0);
}

console.log("[ensure-puppeteer-browser] Installing Chrome for Testing (one-time, ~150MB)…");
const result = spawnSync("npx", ["puppeteer", "browsers", "install", "chrome"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
