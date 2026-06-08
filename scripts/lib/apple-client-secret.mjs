import { createPrivateKey, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";

export function parseArgs(argv) {
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

export function required(name, ...values) {
  for (const value of values) {
    if (value?.trim()) return value.trim();
  }
  throw new Error(`Missing ${name}. Set env APPLE_${name.replace(/-/g, "_").toUpperCase()} or --${name}`);
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

export function loadPrivateKey(path) {
  const absolute = resolve(path);
  const pem = readFileSync(absolute, "utf8");
  if (!pem.includes("BEGIN PRIVATE KEY")) {
    throw new Error(`File is not a PKCS#8 private key: ${absolute}`);
  }
  return createPrivateKey({ key: pem, format: "pem" });
}

export function generateAppleClientSecret({ teamId, keyId, servicesId, privateKey, ttlSeconds = 3600 }) {
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

export function resolveAppleCredentials(flags = {}) {
  const teamId = required("team-id", flags["team-id"], process.env.APPLE_TEAM_ID);
  const keyId = required("key-id", flags["key-id"], process.env.APPLE_KEY_ID);
  const servicesId = required(
    "services-id",
    flags["services-id"],
    process.env.APPLE_SERVICES_ID,
    "com.wise.autocore.web",
  );
  const p8Path = required("p8", flags.p8, process.env.APPLE_P8_PATH, process.env.APPLE_PRIVATE_KEY_PATH);
  const redirectUri =
    flags["redirect-uri"]?.trim() ||
    process.env.APPLE_REDIRECT_URI?.trim() ||
    "https://autocore-6066c.firebaseapp.com/__/auth/handler";

  return {
    teamId,
    keyId,
    servicesId,
    p8Path,
    redirectUri,
    privateKey: loadPrivateKey(p8Path),
  };
}

export async function postAppleToken(body) {
  const response = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const headers = Object.fromEntries(response.headers.entries());
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* plain text */
  }

  return { status: response.status, headers, text, json };
}

export function printSection(title) {
  console.log(`\n# ${title}\n`);
}
