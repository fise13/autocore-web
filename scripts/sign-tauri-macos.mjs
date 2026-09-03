#!/usr/bin/env node
/**
 * Embed the Mac development provisioning profile and re-sign AutoCore.app.
 *
 * Native Sign in with Apple (AuthenticationServices) fails with error 1000 when
 * the bundle is ad-hoc signed or missing `embedded.provisionprofile`. Tauri
 * applies entitlements + `signingIdentity` but does not copy a profile into
 * `Contents/`, so this runs after `tauri build` (and can be run by hand on a
 * `tauri dev` bundle).
 *
 * Looks for `src-tauri/*.provisionprofile` (gitignored). Skips quietly when
 * the identity is Developer ID (distribution) or no profile is present.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAURI_DIR = join(ROOT, "src-tauri");
const ENTITLEMENTS = join(TAURI_DIR, "entitlements.plist");
const DEV_ENTITLEMENTS = join(TAURI_DIR, "entitlements.development.plist");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }
  return result;
}

function readSigningIdentityFromConf() {
  try {
    const conf = JSON.parse(readFileSync(join(TAURI_DIR, "tauri.conf.json"), "utf8"));
    const identity = conf?.bundle?.macOS?.signingIdentity;
    return typeof identity === "string" && identity.trim() && identity.trim() !== "-"
      ? identity.trim()
      : null;
  } catch {
    return null;
  }
}

function findProvisionProfile() {
  if (!existsSync(TAURI_DIR)) return null;
  const named = join(TAURI_DIR, "AutoCore_Desktop_Mac_Development.provisionprofile");
  if (existsSync(named)) return named;
  const match = readdirSync(TAURI_DIR).find((name) => name.endsWith(".provisionprofile"));
  return match ? join(TAURI_DIR, match) : null;
}

function candidateApps() {
  const triples = ["aarch64-apple-darwin", "x86_64-apple-darwin", "universal-apple-darwin"];
  const configs = ["release", "debug"];
  const paths = [];
  for (const config of configs) {
    paths.push(join(TAURI_DIR, "target", config, "bundle", "macos", "AutoCore.app"));
    paths.push(join(TAURI_DIR, "target", config, "AutoCore.app"));
    for (const triple of triples) {
      paths.push(
        join(TAURI_DIR, "target", triple, config, "bundle", "macos", "AutoCore.app"),
      );
      paths.push(join(TAURI_DIR, "target", triple, config, "AutoCore.app"));
    }
  }
  return [...new Set(paths)].filter((path) => existsSync(path));
}

function isDevelopmentIdentity(identity) {
  return /Apple Development|Mac Developer/i.test(identity);
}

function signApp(appPath, identity, profilePath) {
  if (profilePath) {
    cpSync(profilePath, join(appPath, "Contents", "embedded.provisionprofile"));
  }

  const entitlements =
    isDevelopmentIdentity(identity) && existsSync(DEV_ENTITLEMENTS)
      ? DEV_ENTITLEMENTS
      : ENTITLEMENTS;

  run("codesign", [
    "--force",
    "--sign",
    identity,
    "--entitlements",
    entitlements,
    "--options",
    "runtime",
    "--timestamp=none",
    appPath,
  ]);

  run("codesign", ["--verify", "--deep", "--strict", appPath]);
  console.log(`[sign-tauri-macos] Signed ${appPath}`);
}

if (process.platform !== "darwin") {
  console.log("[sign-tauri-macos] skip: not macOS");
  process.exit(0);
}

const identity =
  process.env.APPLE_SIGNING_IDENTITY?.trim() || readSigningIdentityFromConf();

if (!identity) {
  console.log("[sign-tauri-macos] skip: no signing identity (ad-hoc builds cannot use Sign in with Apple)");
  process.exit(0);
}

if (!isDevelopmentIdentity(identity)) {
  console.log(`[sign-tauri-macos] skip profile embed for identity: ${identity}`);
  process.exit(0);
}

if (!existsSync(ENTITLEMENTS)) {
  console.error(`[sign-tauri-macos] Missing ${ENTITLEMENTS}`);
  process.exit(1);
}

const profilePath = findProvisionProfile();
if (!profilePath) {
  console.warn(
    "[sign-tauri-macos] No src-tauri/*.provisionprofile — Sign in with Apple will fail with error 1000.",
  );
  process.exit(0);
}

const extraApp = process.argv[2];
const apps = extraApp ? [extraApp] : candidateApps();

if (apps.length === 0) {
  console.warn("[sign-tauri-macos] No AutoCore.app found under src-tauri/target/");
  process.exit(0);
}

for (const app of apps) {
  signApp(app, identity, profilePath);
}
