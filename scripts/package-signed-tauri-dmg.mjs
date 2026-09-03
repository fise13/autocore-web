#!/usr/bin/env node
/**
 * Recreate the macOS DMG from the already-signed AutoCore.app.
 *
 * `tauri build` writes the disk image before `sign-tauri-macos.mjs` embeds the
 * development profile and re-signs. Shipping that first DMG would drop
 * Associated Domains / Sign in with Apple. This rebuilds from the signed app.
 */
import { homedir, tmpdir } from "node:os";
import { existsSync, mkdirSync, mkdtempSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAURI_DIR = join(ROOT, "src-tauri");

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...opts,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }
  return result;
}

function candidateApps() {
  const triples = ["aarch64-apple-darwin", "x86_64-apple-darwin", "universal-apple-darwin"];
  const paths = [];
  for (const triple of triples) {
    paths.push(join(TAURI_DIR, "target", triple, "release", "bundle", "macos", "AutoCore.app"));
  }
  paths.push(join(TAURI_DIR, "target", "release", "bundle", "macos", "AutoCore.app"));
  return paths.filter((path) => existsSync(path));
}

function dmgDirForApp(appPath) {
  return join(dirname(dirname(appPath)), "dmg");
}

if (process.platform !== "darwin") {
  console.log("[package-signed-tauri-dmg] skip: not macOS");
  process.exit(0);
}

const extraApp = process.argv[2];
const apps = extraApp ? [extraApp] : candidateApps();

if (apps.length === 0) {
  console.warn("[package-signed-tauri-dmg] No signed AutoCore.app found");
  process.exit(0);
}

spawnSync("hdiutil", ["detach", "/Volumes/AutoCore", "-quiet", "-force"]);

for (const appPath of apps) {
  const staging = mkdtempSync(join(tmpdir(), "autocore-dmg-"));
  try {
    const stagedApp = join(staging, "AutoCore.app");
    cpSync(appPath, stagedApp, { recursive: true });

    const dmgDir = dmgDirForApp(appPath);
    mkdirSync(dmgDir, { recursive: true });
    const outDmg = join(dmgDir, "AutoCore.dmg");

    run("hdiutil", [
      "create",
      "-volname",
      "AutoCore",
      "-srcfolder",
      staging,
      "-ov",
      "-format",
      "UDZO",
      outDmg,
    ]);
    console.log(`[package-signed-tauri-dmg] ${outDmg} ← ${appPath}`);

    const desktopDmg = join(homedir(), "Desktop", "AutoCore.dmg");
    cpSync(outDmg, desktopDmg);
    console.log(`[package-signed-tauri-dmg] Copied to ${desktopDmg}`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
