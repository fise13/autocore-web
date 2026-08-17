#!/usr/bin/env node
/**
 * Test discovery for `npm test`.
 *
 * This used to be two hand-maintained lists of file paths inside package.json.
 * Any test file whose path nobody remembered to append never ran — 26 of 103
 * files had drifted out of CI that way, including coverage for payroll
 * (`compute-my-earnings`), warehouse location links, and Apple identity
 * parsing. CLAUDE.md warned about the trap; the trap still sprang.
 *
 * Walking the tree instead means a new `*.test.ts` is picked up the moment it
 * is written, with no second step to forget.
 *
 * Usage:
 *   node scripts/run-tests.mjs            # every suite
 *   node scripts/run-tests.mjs --list     # print discovered files, run nothing
 *   node scripts/run-tests.mjs src/lib    # only tests under a path prefix
 */

import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Roots that can contain tests. Everything else is not walked at all. */
const SEARCH_ROOTS = ["src", "packages", "autocore-mobile", "firebase/functions/src"];

/**
 * Directory names pruned everywhere — build output, vendored code, native shells.
 *
 * Note `lib` is deliberately NOT pruned: `src/lib` and `autocore-mobile/lib` are
 * source directories holding most of the suite. Only `firebase/functions/lib` is
 * build output, and that tree is not searched at all.
 */
const PRUNE = new Set([
  "node_modules",
  ".next",
  ".expo",
  "dist",
  "build",
  "ios",
  "android",
  "graphify-out",
  "src-tauri",
  "__snapshots__",
  ".git",
]);

const TEST_RE = /\.test\.tsx?$/;

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (PRUNE.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && TEST_RE.test(entry.name)) {
      out.push(relative(ROOT, full));
    }
  }
  return out;
}

function discover() {
  const found = [];
  for (const root of SEARCH_ROOTS) {
    const abs = join(ROOT, root);
    try {
      if (statSync(abs).isDirectory()) walk(abs, found);
    } catch {
      // Root absent in this checkout (e.g. mobile not cloned) — skip quietly.
    }
  }
  // Stable order so a failure is reproducible run to run.
  return found.sort((a, b) => a.localeCompare(b));
}

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const prefixes = args.filter((a) => !a.startsWith("--"));

let files = discover();
if (prefixes.length > 0) {
  files = files.filter((f) => prefixes.some((p) => f.startsWith(p.split("/").join(sep))));
}

if (files.length === 0) {
  console.error("No test files found.");
  process.exit(1);
}

if (listOnly) {
  console.log(files.join("\n"));
  console.log(`\n${files.length} test files`);
  process.exit(0);
}

/**
 * Mobile runs in its own process with cwd=autocore-mobile.
 *
 * Both tsconfigs define `@/*`, but to different roots — `src/*` at the repo
 * root, `autocore-mobile/*` in the app. Running a mobile test from the repo
 * root resolves `@/lib/...` into the web tree and fails to find the module.
 */
const MOBILE_PREFIX = `autocore-mobile${sep}`;
const mobileFiles = files
  .filter((f) => f.startsWith(MOBILE_PREFIX))
  .map((f) => f.slice(MOBILE_PREFIX.length));
const rootFiles = files.filter((f) => !f.startsWith(MOBILE_PREFIX));

function runGroup(label, cwd, groupFiles) {
  if (groupFiles.length === 0) return Promise.resolve(0);
  console.log(`\n─── ${label}: ${groupFiles.length} test files ───\n`);
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "--test", ...groupFiles],
      { stdio: "inherit", cwd },
    );
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

const webCode = await runGroup("web + packages", ROOT, rootFiles);
const mobileCode = await runGroup("mobile", join(ROOT, "autocore-mobile"), mobileFiles);

const failed = webCode !== 0 || mobileCode !== 0;
console.log(
  `\n─── summary: web ${webCode === 0 ? "pass" : "FAIL"}, mobile ${mobileCode === 0 ? "pass" : "FAIL"} ───`,
);
process.exit(failed ? 1 : 0);
