#!/usr/bin/env node
/**
 * Copies latest Tauri bundle artifacts into public/downloads for Vercel hosting.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TARGET_DIR = join(ROOT, "src-tauri", "target");
const OUT_DIR = join(ROOT, "public", "downloads");

function findNewest(dir, extension) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(extension))
    .map((name) => join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] ?? null;
}

function resolveBundleDir() {
  const candidates = [
    join(TARGET_DIR, "release", "bundle"),
    join(TARGET_DIR, "aarch64-apple-darwin", "release", "bundle"),
    join(TARGET_DIR, "x86_64-apple-darwin", "release", "bundle"),
    join(TARGET_DIR, "x86_64-pc-windows-msvc", "release", "bundle"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  if (!existsSync(TARGET_DIR)) return null;

  for (const entry of readdirSync(TARGET_DIR)) {
    const nested = join(TARGET_DIR, entry, "release", "bundle");
    if (existsSync(nested)) return nested;
  }

  return null;
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

const bundleDir = resolveBundleDir();
if (!bundleDir) {
  console.warn("[tauri:publish] No bundle directory found. Run npm run tauri:build:mac or tauri:build:win first.");
  process.exit(0);
}

console.log(`[tauri:publish] Using bundle dir: ${bundleDir}`);

const macDmg = findNewest(join(bundleDir, "dmg"), ".dmg");
const macApp = findNewest(join(bundleDir, "macos"), ".app");
const winExe =
  findNewest(join(bundleDir, "nsis"), ".exe") ??
  findNewest(join(bundleDir, "msi"), ".msi");

const copiedMac =
  copyArtifact(macDmg, "AutoCore-mac.dmg") ||
  copyArtifact(macApp, "AutoCore-mac.app");
copyArtifact(winExe, "AutoCore-windows.exe");

if (!copiedMac) {
  console.warn("[tauri:publish] No macOS artifact found. Run npm run tauri:build:mac first.");
}

if (!winExe) {
  console.warn("[tauri:publish] No Windows artifact found. Run npm run tauri:build:win on Windows.");
}
