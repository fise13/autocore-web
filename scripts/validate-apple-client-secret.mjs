#!/usr/bin/env node
/**
 * Validate Apple Sign in with Apple client_secret JWT without a user login.
 *
 * Apple does NOT support grant_type=client_credentials for web Services IDs.
 * Validation uses a deliberately invalid authorization code:
 *   - invalid_client  → JWT / client_id / Key linkage rejected
 *   - invalid_grant   → JWT accepted; only the dummy code is rejected (success)
 *
 * Usage:
 *   APPLE_TEAM_ID=... \
 *   APPLE_KEY_ID=... \
 *   APPLE_SERVICES_ID=com.wise.autocore.web \
 *   APPLE_P8_PATH=/path/to/AuthKey_XXXX.p8 \
 *   APPLE_REDIRECT_URI=https://autocore-6066c.firebaseapp.com/__/auth/handler \
 *   node scripts/validate-apple-client-secret.mjs
 *
 * Optional:
 *   --team-id --key-id --services-id --p8 --redirect-uri
 */

import { createPrivateKey, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const DUMMY_AUTH_CODE = "0000000000000000000000000000000000000000000000000000000000000000";

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

function required(name, ...values) {
  for (const value of values) {
    if (value?.trim()) return value.trim();
  }
  console.error(`Missing ${name}. Set env APPLE_${name.replace(/-/g, "_").toUpperCase()} or --${name}`);
  process.exit(1);
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function loadPrivateKey(path) {
  const absolute = resolve(path);
  const pem = readFileSync(absolute, "utf8");
  if (!pem.includes("BEGIN PRIVATE KEY")) {
    throw new Error(`File is not a PKCS#8 private key: ${absolute}`);
  }
  return createPrivateKey({ key: pem, format: "pem" });
}

function generateAppleClientSecret({ teamId, keyId, servicesId, privateKey, ttlSeconds = 3600 }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + ttlSeconds,
    aud: "https://appleid.apple.com",
    sub: servicesId,
  };

  const encodedHeader = base64UrlJson(header);
  const encodedPayload = base64UrlJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  const clientSecret = `${signingInput}.${signature.toString("base64url")}`;

  return { clientSecret, header, payload };
}

async function postAppleToken(body) {
  const response = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* plain text */
  }

  return { status: response.status, text, json };
}

function printSection(title) {
  console.log(`\n# ${title}\n`);
}

const flags = parseArgs(process.argv.slice(2));

const teamId = required("team-id", flags["team-id"], process.env.APPLE_TEAM_ID);
const keyId = required("key-id", flags["key-id"], process.env.APPLE_KEY_ID);
const servicesId = required(
  "services-id",
  flags["services-id"],
  process.env.APPLE_SERVICES_ID,
  process.env.NEXT_PUBLIC_APPLE_WEB_CLIENT_ID,
);
const p8Path = required("p8", flags.p8, process.env.APPLE_P8_PATH, process.env.APPLE_PRIVATE_KEY_PATH);
const redirectUri =
  flags["redirect-uri"]?.trim() ||
  process.env.APPLE_REDIRECT_URI?.trim() ||
  (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ? `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.trim()}.firebaseapp.com/__/auth/handler`
    : "https://autocore-6066c.firebaseapp.com/__/auth/handler");

const privateKey = loadPrivateKey(p8Path);
const { clientSecret, header, payload } = generateAppleClientSecret({
  teamId,
  keyId,
  servicesId,
  privateKey,
});

printSection("Generated JWT payload");
console.log(JSON.stringify({ header, payload }, null, 2));
console.log("\nDecoded from signed token:");
console.log(JSON.stringify(decodeJwtPart(clientSecret.split(".")[1]), null, 2));

printSection("Apple response");

console.log("Note: Apple web Sign in with Apple does not support grant_type=client_credentials.");
console.log("Using credential probe: grant_type=authorization_code + intentionally invalid code.\n");

const probe = await postAppleToken({
  grant_type: "authorization_code",
  client_id: servicesId,
  client_secret: clientSecret,
  code: DUMMY_AUTH_CODE,
  redirect_uri: redirectUri,
});

console.log("Request:");
console.log(
  JSON.stringify(
    {
      url: APPLE_TOKEN_URL,
      grant_type: "authorization_code",
      client_id: servicesId,
      redirect_uri: redirectUri,
      code: `${DUMMY_AUTH_CODE.slice(0, 16)}…`,
      client_secret: "<JWT omitted>",
    },
    null,
    2,
  ),
);
console.log("\nResponse HTTP status:", probe.status);
console.log("Response body:", probe.json ?? probe.text);

if (flags["also-try-client-credentials"]) {
  console.log("\n--- Optional probe: grant_type=client_credentials ---");
  const cc = await postAppleToken({
    grant_type: "client_credentials",
    client_id: servicesId,
    client_secret: clientSecret,
    scope: "email",
  });
  console.log("HTTP status:", cc.status);
  console.log("Body:", cc.json ?? cc.text);
}

printSection("Conclusion");

const error = probe.json?.error ?? (probe.text.includes("invalid_client") ? "invalid_client" : null);

if (error === "invalid_grant") {
  console.log("Apple ACCEPTED the client_secret JWT and client_id.");
  console.log("Apple rejected only the dummy authorization code (expected).");
  console.log("Your Apple Developer Key + Services ID + Team ID combination is structurally valid.");
  console.log("If Firebase still fails, Firebase Console likely stores a different .p8 / Key ID / Team ID.");
} else if (error === "invalid_client") {
  console.log("Apple REJECTED the client_secret JWT or client_id.");
  console.log("Apple Developer configuration is broken at the Key / Services ID / Team ID layer.");
  console.log("Firebase is not the first suspect until this probe returns invalid_grant.");
} else {
  console.log(`Unexpected Apple error: ${error ?? probe.text}`);
  console.log("Inspect the response body above and compare with Apple TN3107.");
}

printSection("Next diagnostic step");

if (error === "invalid_grant") {
  console.log("1. Export the exact Team ID, Key ID, and .p8 content from Firebase Console → Auth → Apple.");
  console.log("2. Re-run this script with Firebase's values and compare outputs.");
  console.log("3. If this script passes but login fails, capture a real authorization code from DevTools");
  console.log("   and exchange it with the same JWT within 5 minutes:");
  console.log("   POST https://appleid.apple.com/auth/token with the real code.");
  console.log("   - invalid_client with REAL code only → authorize/token client_id context mismatch.");
} else if (error === "invalid_client") {
  console.log("1. Apple Developer → Keys → your key → ensure Sign in with Apple is enabled.");
  console.log("2. Apple Developer → Services ID → Configure → verify Primary App ID linkage.");
  console.log("3. Confirm Key ID matches the .p8 file (not the key name).");
  console.log("4. Confirm sub/iss in JWT equal Services ID and Team ID exactly.");
  console.log("5. Re-run this script after fixing Apple Developer until you get invalid_grant.");
} else {
  console.log("1. Verify network access to appleid.apple.com.");
  console.log("2. Re-run with --also-try-client-credentials to see unsupported-grant errors.");
  console.log("3. Compare JWT header/payload against Apple TN3107.");
}
