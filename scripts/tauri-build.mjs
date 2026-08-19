#!/usr/bin/env node
/**
 * Release entry point for the desktop app.
 *
 * Wraps `tauri build` so updater configuration comes from the environment rather
 * than from a committed file:
 *
 *   TAURI_UPDATER_ENDPOINT   update manifest URL (supports {{target}}, {{arch}},
 *                            {{current_version}} placeholders)
 *   TAURI_UPDATER_PUBKEY     minisign public key that verifies downloads
 *
 * Both are passed to the CLI as a `--config` patch, so `tauri.conf.json` stays
 * clean and no endpoint or key is ever committed. When they are absent the build
 * simply has no updater — the Rust side skips the plugin (see
 * `src-tauri/src/updater.rs`) and the app reports `updaterEnabled: false`
 * instead of offering a button that cannot work.
 *
 * The private signing key (TAURI_SIGNING_PRIVATE_KEY) is read by the CLI itself
 * and must only ever come from CI secrets. See docs/DESKTOP-RELEASE.md.
 *
 * Extra arguments are forwarded, so `--target aarch64-apple-darwin` works.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function buildUpdaterPatch() {
  const endpoint = process.env.TAURI_UPDATER_ENDPOINT?.trim();
  const pubkey = process.env.TAURI_UPDATER_PUBKEY?.trim();

  if (!endpoint && !pubkey) return null;

  // Half a configuration is worse than none: it would produce a build that
  // claims update support and then fails at runtime.
  if (!endpoint || !pubkey) {
    console.error(
      "[tauri:build] TAURI_UPDATER_ENDPOINT and TAURI_UPDATER_PUBKEY must be set together.",
    );
    process.exit(1);
  }

  return {
    bundle: { createUpdaterArtifacts: true },
    plugins: { updater: { endpoints: [endpoint], pubkey } },
  };
}

run("node", ["scripts/sync-tauri-app-url.mjs"]);

const forwarded = process.argv.slice(2);
const patch = buildUpdaterPatch();
const args = ["tauri", "build", ...forwarded];

if (patch) {
  console.log("[tauri:build] Updater enabled for this build");
  args.push("--config", JSON.stringify(patch));
} else {
  console.log("[tauri:build] No updater configuration; building without auto-update");
}

run("npx", args);
