#!/usr/bin/env node
/**
 * Create/refresh an iOS Development profile for com.wise.autocore.mobile
 * that includes Associated Domains, then write it next to the Xcode project.
 *
 * Reads APPLE_APP_STORE_KEY_ID / ISSUER_ID / PRIVATE_KEY from .env.local
 * (or AuthKey_<KEYID>.p8 in the repo root). Never prints secrets.
 */
import { createSign, createPrivateKey } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_ID = "com.wise.autocore.mobile";
const DEVICE_UDID = process.argv[2] || "00008120-0014255811E2201E";
const PROFILE_NAME = "AutoCore Mobile iOS Development";
const OUT = join(ROOT, "autocore-mobile/ios/AutoCore_iOS_Development.mobileprovision");

function parseEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, eq).trim()] = value.replaceAll("\\n", "\n");
  }
  return env;
}

const env = { ...parseEnv(join(ROOT, ".env.local")), ...process.env };
const p8Files = ["AuthKey_646C22CYV2.p8"].map((name) => join(ROOT, name)).filter(existsSync);
const p8Path = p8Files[0];
const keyIdFromFile = p8Path ? p8Path.match(/AuthKey_([A-Z0-9]+)\.p8$/)?.[1] : null;
const keyId = keyIdFromFile || env.APPLE_APP_STORE_KEY_ID?.trim();
const issuerId = env.APPLE_APP_STORE_ISSUER_ID?.trim();
let pem = p8Path ? readFileSync(p8Path, "utf8") : env.APPLE_APP_STORE_PRIVATE_KEY?.trim();
if (!keyId || !issuerId || !pem) {
  console.error("Missing APPLE_APP_STORE_KEY_ID / ISSUER_ID / PRIVATE_KEY");
  process.exit(1);
}
if (!pem.includes("BEGIN")) {
  pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`;
}

function jwt() {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })).toString(
    "base64url",
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iss: issuerId, iat: now, exp: now + 20 * 60, aud: "appstoreconnect-v1" }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const key = createPrivateKey(pem);
  const sig = createSign("SHA256").update(data).sign({
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${data}.${sig.toString("base64url")}`;
}

const token = jwt();

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = json.errors?.map((e) => e.detail || e.title).join("; ") || text.slice(0, 400);
    throw new Error(`${method} ${path} → ${res.status}: ${detail}`);
  }
  return json;
}

const bundles = await api(
  `/v1/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_ID)}&limit=5`,
);
const bundle = bundles.data?.[0];
if (!bundle) throw new Error(`No App ID ${BUNDLE_ID}`);
console.log(`App ID ${BUNDLE_ID} → ${bundle.id}`);

const caps = await api(`/v1/bundleIds/${bundle.id}/bundleIdCapabilities`);
const types = (caps.data ?? []).map((c) => c.attributes?.capabilityType);
console.log(`Capabilities: ${types.sort().join(", ") || "(none)"}`);
if (!types.includes("ASSOCIATED_DOMAINS")) {
  console.log("Enabling ASSOCIATED_DOMAINS…");
  await api("/v1/bundleIdCapabilities", {
    method: "POST",
    body: {
      data: {
        type: "bundleIdCapabilities",
        attributes: { capabilityType: "ASSOCIATED_DOMAINS" },
        relationships: { bundleId: { data: { type: "bundleIds", id: bundle.id } } },
      },
    },
  });
}

let certs = await api("/v1/certificates?filter[certificateType]=IOS_DEVELOPMENT&limit=50");
if ((certs.data ?? []).length === 0) {
  certs = await api("/v1/certificates?filter[certificateType]=DEVELOPMENT&limit=50");
}
const certIds = (certs.data ?? []).map((c) => c.id);
if (certIds.length === 0) throw new Error("No IOS_DEVELOPMENT certificates");
console.log(`Development certs: ${certIds.length}`);

const devices = await api("/v1/devices?filter[platform]=IOS&limit=200");
const deviceRecords = (devices.data ?? []).filter((d) => d.attributes?.status === "ENABLED");
if (deviceRecords.length === 0) throw new Error("No enabled iOS devices on the team");
const named = deviceRecords.find(
  (d) => d.attributes?.udid?.replace(/-/g, "").toUpperCase() === DEVICE_UDID.replace(/-/g, "").toUpperCase(),
);
console.log(
  `Devices: ${deviceRecords.length}${named ? `; includes ${named.attributes.name}` : ""}`,
);

const existing = await api(
  `/v1/profiles?filter[profileType]=IOS_APP_DEVELOPMENT&filter[name]=${encodeURIComponent(PROFILE_NAME)}&limit=5`,
);
for (const profile of existing.data ?? []) {
  console.log(`Deleting old profile ${profile.id}`);
  await api(`/v1/profiles/${profile.id}`, { method: "DELETE" });
}

const created = await api("/v1/profiles", {
  method: "POST",
  body: {
    data: {
      type: "profiles",
      attributes: { name: PROFILE_NAME, profileType: "IOS_APP_DEVELOPMENT" },
      relationships: {
        bundleId: { data: { type: "bundleIds", id: bundle.id } },
        certificates: { data: certIds.map((id) => ({ type: "certificates", id })) },
        devices: { data: deviceRecords.map((d) => ({ type: "devices", id: d.id })) },
      },
    },
  },
});
const profile = created.data;
const encoded = profile?.attributes?.profileContent;
if (!encoded) throw new Error("Profile created but no content");
writeFileSync(OUT, Buffer.from(encoded, "base64"));
console.log(`Wrote ${OUT}`);
console.log(`uuid=${profile.id} state=${profile.attributes?.profileState}`);
