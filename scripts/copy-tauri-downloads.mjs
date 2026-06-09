#!/usr/bin/env node
/**
 * Copies latest Tauri bundle artifacts into public/downloads for Vercel hosting.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BUNDLE_DIR = join(ROOT, "src-tauri", "target", "release", "bundle");
const OUT_DIR = join(ROOT, "public", "downloads");

function findNewest(dir, extension) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(extension))
    .map((name) => join(dir, name));
  return files.at(-1) ?? null;
}

function copyArtifact(source, targetName) {
  if (!source) {
    console.warn(`[tauri:publish] Skipped — artifact not found for ${targetName}`);
    return false;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const target = join(OUT_DIR, targetName);
  copyFileSync(source, target);
  console.log(`[tauri:publish] ${targetName} ← ${source}`);
  return true;
}

const macDmg = findNewest(join(BUNDLE_DIR, "dmg"), ".dmg");
const macApp = findNewest(join(BUNDLE_DIR, "macos"), ".app");
const winExe =
  findNewest(join(BUNDLE_DIR, "nsis"), ".exe") ??
  findNewest(join(BUNDLE_DIR, "msi"), ".msi");

const copied =
  copyArtifact(macDmg, "AutoCore-mac.dmg") ||
  copyArtifact(macApp, "AutoCore-mac.app");
copyArtifact(winExe, "AutoCore-windows.exe");

if (!copied) {
  console.warn("[tauri:publish] No macOS artifact found. Run npm run tauri:build:mac first.");
}

if (!winExe) {
  console.warn("[tauri:publish] No Windows artifact found. Run npm run tauri:build:win on Windows.");
}
