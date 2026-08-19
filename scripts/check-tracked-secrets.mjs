import { readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const forbiddenFiles = [
  /^\.env(?:\.|$)/,
  /(?:^|\/)\.env(?:\.|$)/,
  /firebase-adminsdk.*\.json$/i,
  /service-account.*\.json$/i,
  // Apple signing keys: App Store Server API, Sign in with Apple, APNs.
  /\.p8$/i,
];

const allowedExamples = [
  /\.env\.(?:local|vercel|desktop)\.example$/,
  /(?:^|\/)\.env\.example$/,
];

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\brk_live_[A-Za-z0-9]{16,}\b/,
  /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/,
  /\bghp_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
];

const result = spawnSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});

if (result.status !== 0) {
  console.error("Unable to enumerate tracked files.");
  process.exit(2);
}

const violations = [];
const trackedFiles = result.stdout.split("\0").filter(Boolean);

for (const file of trackedFiles) {
  if (file.includes("/node_modules/")) {
    continue;
  }

  const isAllowedExample = allowedExamples.some((pattern) => pattern.test(file));
  if (!isAllowedExample && forbiddenFiles.some((pattern) => pattern.test(file))) {
    violations.push(`${file}: forbidden secret-bearing filename`);
    continue;
  }

  let stats;
  try {
    stats = statSync(file);
  } catch {
    continue;
  }

  if (!stats.isFile() || stats.size > 1024 * 1024) {
    continue;
  }

  let contents;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (secretPatterns.some((pattern) => pattern.test(contents))) {
    violations.push(`${file}: content matches a high-confidence secret pattern`);
  }
}

if (violations.length > 0) {
  console.error("Tracked-secret check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Tracked-secret check passed (${trackedFiles.length} files inspected).`);
