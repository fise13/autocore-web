#!/usr/bin/env node
/**
 * Syncs the remote app URL used by the Tauri shell (Vercel by default).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TAURI_DIR = join(ROOT, "src-tauri");
const URL_FILE = join(TAURI_DIR, "desktop-app-url.txt");
const CONF_FILE = join(TAURI_DIR, "tauri.conf.json");

const DEFAULT_APP_ORIGIN = "https://app.myautocore.com";

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function resolveDesktopAppUrl() {
  const localEnv = parseEnvFile(join(ROOT, ".env.local"));
  const explicit =
    process.env.DESKTOP_APP_URL?.trim() ||
    localEnv.DESKTOP_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_DESKTOP_APP_URL?.trim() ||
    localEnv.NEXT_PUBLIC_DESKTOP_APP_URL?.trim();

  if (explicit) {
    return `${explicit.replace(/\/$/, "")}/login?desktop=1`;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    localEnv.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  const isLocalHost =
    /localhost|127\.0\.0\.1|local\.autocore/i.test(appUrl);

  if (appUrl && !isLocalHost) {
    return `${appUrl.replace(/\/$/, "")}/login?desktop=1`;
  }

  return `${DEFAULT_APP_ORIGIN}/login?desktop=1`;
}

function syncTauriConf(appUrl) {
  const conf = JSON.parse(readFileSync(CONF_FILE, "utf8"));
  conf.build.devUrl = appUrl;
  conf.build.beforeDevCommand = "";
  conf.build.beforeBuildCommand = "node scripts/sync-tauri-app-url.mjs";
  delete conf.bundle.resources;
  writeFileSync(CONF_FILE, `${JSON.stringify(conf, null, 2)}\n`);
}

const appUrl = resolveDesktopAppUrl();
writeFileSync(URL_FILE, `${appUrl}\n`, "utf8");
syncTauriConf(appUrl);
console.log(`[tauri:sync] Desktop shell URL → ${appUrl}`);
