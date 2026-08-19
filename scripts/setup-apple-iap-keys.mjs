#!/usr/bin/env node
/**
 * Put the App Store Server API credentials into `.env.local`.
 *
 * The `.p8` is read from disk and written straight into the env file — it is
 * never printed, never echoed, and never passed on a command line where it
 * would land in shell history. Only the Key ID and Issuer ID are given as
 * arguments, and neither is secret on its own.
 *
 * Usage:
 *   node scripts/setup-apple-iap-keys.mjs \
 *     --p8 ~/Downloads/SubscriptionKey_ABC1234567.p8 \
 *     --key-id ABC1234567 \
 *     --issuer-id 12a34b56-7890-1cde-f234-567890abcdef
 *
 * The Key ID can be inferred from the filename Apple gives you
 * (`SubscriptionKey_<KEYID>.p8`), so `--key-id` is optional in that case.
 *
 * Add `--check` to ask Apple whether the credentials are accepted without
 * writing anything — useful when several .p8 files are lying around and only
 * one of them is the In-App Purchase key.
 */

import { createSign, createPrivateKey } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENV_FILE = resolve(ROOT, ".env.local");

const VARS = {
  key: "APPLE_APP_STORE_KEY_ID",
  issuer: "APPLE_APP_STORE_ISSUER_ID",
  privateKey: "APPLE_APP_STORE_PRIVATE_KEY",
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

const p8Path = args.p8 ?? args["p8-path"];
if (!p8Path) {
  fail(
    "Missing --p8.\n\n" +
      "  node scripts/setup-apple-iap-keys.mjs \\\n" +
      "    --p8 ~/Downloads/SubscriptionKey_ABC1234567.p8 \\\n" +
      "    --issuer-id 12a34b56-7890-1cde-f234-567890abcdef",
  );
}

const resolvedP8 = resolve(p8Path.replace(/^~/, process.env.HOME ?? "~"));
if (!existsSync(resolvedP8)) fail(`No such file: ${resolvedP8}`);

const privateKeyPem = readFileSync(resolvedP8, "utf8").trim();
if (!privateKeyPem.includes("BEGIN PRIVATE KEY")) {
  fail(
    "That file is not a PKCS#8 private key.\n" +
      "Expected the .p8 downloaded from App Store Connect → Users and Access →\n" +
      "Integrations → In-App Purchase.",
  );
}

// Apple puts the id in the filename. In-App Purchase keys download as
// `SubscriptionKey_<KEYID>.p8`; App Store Connect team keys use `AuthKey_`.
const inferredKeyId =
  basename(resolvedP8).match(/(?:SubscriptionKey|AuthKey)_([A-Z0-9]+)\.p8$/i)?.[1] ?? null;
const keyId = args["key-id"] ?? inferredKeyId;
if (!keyId) {
  fail("Missing --key-id and it could not be inferred from the filename.");
}

const issuerId = args["issuer-id"];
if (!issuerId) {
  fail("Missing --issuer-id (App Store Connect → Integrations, above the key table).");
}
if (!/^[0-9a-f-]{36}$/i.test(issuerId)) {
  fail(`--issuer-id does not look like a UUID: ${issuerId}`);
}

// Prove the key actually signs before it is stored — a truncated or wrong-type
// .p8 otherwise fails much later, as a 502 on a real purchase.
try {
  const key = createPrivateKey(privateKeyPem);
  if (key.asymmetricKeyType !== "ec") {
    fail(`Expected an EC key, got ${key.asymmetricKeyType}. This is not an App Store key.`);
  }
  const signer = createSign("SHA256");
  signer.update("verification");
  signer.end();
  signer.sign({ key, dsaEncoding: "ieee-p1363" });
} catch (error) {
  fail(`The key could not be used to sign: ${error.message}`);
}

/**
 * Ask Apple whether these credentials are accepted.
 *
 * A `.p8` is just an EC key — nothing in the file says which capability Apple
 * granted it, so a Sign in with Apple key and an In-App Purchase key are
 * indistinguishable on disk. The only authority on that is Apple, so this makes
 * one authenticated read-only call and reads the status code:
 *
 *   401 → wrong key, wrong issuer, or the key is not an In-App Purchase key
 *   404 → credentials accepted (the made-up transaction id simply is not found)
 *
 * Nothing is created or changed at Apple by this call.
 */
async function checkWithApple(pem, id, issuer) {
  const b64 = (v) =>
    Buffer.from(v).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "ES256", kid: id, typ: "JWT" }));
  const payload = b64(
    JSON.stringify({
      iss: issuer,
      iat: issuedAt,
      exp: issuedAt + 300,
      aud: "appstoreconnect-v1",
      bid: process.env.APPLE_APP_BUNDLE_ID?.trim() || "com.wise.autocore.mobile",
    }),
  );
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const jwt = `${header}.${payload}.${b64(signer.sign({ key: pem, dsaEncoding: "ieee-p1363" }))}`;

  const hosts = {
    Production: "https://api.storekit.itunes.apple.com",
    Sandbox: "https://api.storekit-sandbox.itunes.apple.com",
  };

  const seen = [];
  for (const [environment, host] of Object.entries(hosts)) {
    // A transaction id that cannot exist: we want the auth verdict, not data.
    const response = await fetch(`${host}/inApps/v1/subscriptions/0000000000000000`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    seen.push(`${environment}: ${response.status}`);

    // 404 (no such transaction) and 400 (malformed id) both mean Apple read the
    // token and moved on to the request itself — the credentials are good. Only
    // 401 is an authentication failure, and before the first App Store release
    // the production host answers 401 for every key, so one environment
    // accepting is the pass condition.
    if (response.status !== 401) {
      return { ok: true, environment, status: response.status, seen };
    }
  }

  return { ok: false, seen };
}

/** Replace an existing assignment in place, otherwise append. */
function upsert(content, name, value) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.replace(/\n*$/, "")}\n${line}\n`;
}

if (args.check !== undefined) {
  const verdict = await checkWithApple(privateKeyPem, keyId, issuerId);
  if (!verdict.ok) {
    fail(
      `Apple rejected these credentials in every environment.\n\n` +
        `  Key ID:    ${keyId}\n` +
        `  Issuer ID: ${issuerId}\n` +
        `  Responses: ${verdict.seen.join(", ")}\n\n` +
        "Either the Issuer ID belongs to a different account, or this .p8 is not\n" +
        "an In-App Purchase key. In App Store Connect the right one is under\n" +
        "Users and Access -> Integrations -> In-App Purchase (not Sign in with\n" +
        "Apple, and not the general App Store Connect API tab).\n\n" +
        "Nothing was written.",
    );
  }
  console.log(
    `\n✓ Apple accepted these credentials in ${verdict.environment}.\n` +
      `  Key ID:    ${keyId}\n` +
      `  Responses: ${verdict.seen.join(", ")}\n\n` +
      `  (HTTP ${verdict.status} is the expected answer for a lookup of a\n` +
      `   transaction that does not exist. A 401 from Production alone is\n` +
      `   normal until the app has shipped to the App Store.)\n\n` +
      `Re-run without --check to write them to .env.local.\n`,
  );
  process.exit(0);
}

let env = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";

if (!env.includes("# Apple in-app purchases")) {
  env = `${env.replace(/\n*$/, "")}\n\n# Apple in-app purchases (App Store Server API)\n`;
}

env = upsert(env, VARS.key, keyId);
env = upsert(env, VARS.issuer, issuerId);
// Quoted with escaped newlines: dotenv keeps it on one line, and the reader in
// apple-config.ts turns \n back into real newlines.
env = upsert(env, VARS.privateKey, `"${privateKeyPem.replace(/\n/g, "\\n")}"`);

writeFileSync(ENV_FILE, env, { mode: 0o600 });
// `mode` only applies when the file is created, so an existing .env.local keeps
// whatever it had. Narrow it explicitly — this file now holds a signing key.
chmodSync(ENV_FILE, 0o600);

console.log(`
✓ Wrote ${VARS.key}, ${VARS.issuer} and ${VARS.privateKey} to .env.local
  (.env.local is gitignored — the key is not committed and was never printed.)

Next, put the same three values on Vercel. Run each and paste the value when
prompted, choosing Production, Preview and Development:

  npx vercel env add ${VARS.key}
  npx vercel env add ${VARS.issuer}
  npx vercel env add ${VARS.privateKey}

For the private key, paste the .p8 contents including the BEGIN/END lines.

Then redeploy and confirm the endpoint is live (401 = configured, 503 = not):

  curl -s -o /dev/null -w "%{http_code}\\n" -X POST \\
    https://app.myautocore.com/api/mobile/billing/apple/verify
`);
