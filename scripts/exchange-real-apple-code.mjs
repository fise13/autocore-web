#!/usr/bin/env node
/**
 * Exchange a REAL Apple authorization code against appleid.apple.com/auth/token.
 *
 * Usage:
 *   APPLE_TEAM_ID=45W7LA3QFP \
 *   APPLE_KEY_ID=HPPLWCR7Y5 \
 *   APPLE_SERVICES_ID=com.wise.autocore.web \
 *   APPLE_P8_PATH=/Users/victor/Downloads/AuthKey_HPPLWCR7Y5.p8 \
 *   APPLE_AUTH_CODE=<code-from-handler-post> \
 *   node scripts/exchange-real-apple-code.mjs
 *
 * Or:
 *   node scripts/exchange-real-apple-code.mjs \
 *     --code <real_code> \
 *     --p8 /path/to/AuthKey_HPPLWCR7Y5.p8
 */

import {
  APPLE_TOKEN_URL,
  decodeJwtPart,
  generateAppleClientSecret,
  parseArgs,
  postAppleToken,
  printSection,
  required,
  resolveAppleCredentials,
} from "./lib/apple-client-secret.mjs";

const flags = parseArgs(process.argv.slice(2));

let credentials;
try {
  credentials = resolveAppleCredentials(flags);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const authCode = required(
  "code",
  flags.code,
  process.env.APPLE_AUTH_CODE,
  process.env.APPLE_AUTHORIZATION_CODE,
);

const { teamId, keyId, servicesId, redirectUri, privateKey } = credentials;

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

printSection("Token exchange request");
console.log(
  JSON.stringify(
    {
      url: APPLE_TOKEN_URL,
      grant_type: "authorization_code",
      client_id: servicesId,
      redirect_uri: redirectUri,
      code: `${authCode.slice(0, 24)}… (${authCode.length} chars)`,
      client_secret: "<JWT omitted>",
    },
    null,
    2,
  ),
);

const response = await postAppleToken({
  grant_type: "authorization_code",
  client_id: servicesId,
  client_secret: clientSecret,
  code: authCode,
  redirect_uri: redirectUri,
});

printSection("Real Token Exchange Result");
console.log("HTTP status:", response.status);
console.log("Headers:", JSON.stringify(response.headers, null, 2));
console.log("Body:", response.json ?? response.text);

printSection("Apple Verdict");

const error = response.json?.error ?? null;

if (response.status === 200 && response.json?.access_token) {
  console.log("Case A: Apple returned tokens.");
  console.log("Apple accepted the real authorization code and client_secret JWT.");
  console.log("Fields returned:", Object.keys(response.json).join(", "));
} else if (error === "invalid_client") {
  console.log("Case B: Apple returned invalid_client.");
  console.log("Apple rejected client_id and/or client_secret JWT for this real authorization code.");
  console.log("Response body:", JSON.stringify(response.json ?? response.text));
} else if (error === "invalid_grant") {
  console.log("Case C: Apple returned invalid_grant.");
  console.log("Description:", response.json?.error_description ?? "(none)");
  console.log(
    "Possible causes evidenced only by this response: code expired, code already consumed, or redirect_uri mismatch.",
  );
} else {
  console.log("Unhandled response.");
  console.log(JSON.stringify(response.json ?? response.text));
}

printSection("Firebase Verdict");

if (response.status === 200 && response.json?.access_token) {
  console.log(
    "Direct Apple token exchange succeeded with the same credentials visible in Firebase Console.",
  );
  console.log(
    "If Firebase sign-in still returns auth/invalid-credential / Apple invalid_client, Firebase backend is the failing component relative to this successful exchange.",
  );
} else if (error === "invalid_client") {
  console.log(
    "Apple rejected the exchange before tokens could be issued. This result does not isolate Firebase; Apple rejected the request at appleid.apple.com/auth/token.",
  );
} else if (error === "invalid_grant") {
  console.log(
    "Exchange did not complete. Firebase verdict requires a successful or invalid_client response from a fresh, unconsumed code.",
  );
} else {
  console.log("Inconclusive for Firebase isolation.");
}

printSection("Proven Facts");
console.log("- JWT generated locally with Team ID, Key ID, Services ID, and .p8 from inputs.");
console.log("- Real authorization code length:", authCode.length);
console.log("- redirect_uri used:", redirectUri);
console.log("- Apple HTTP status:", response.status);
console.log("- Apple error field:", error ?? "(none)");
if (response.json?.id_token) {
  console.log("- id_token received: yes");
}
if (response.json?.access_token) {
  console.log("- access_token received: yes");
}

printSection("Remaining Unknowns");
if (response.status === 200 && response.json?.access_token) {
  console.log("- Whether Firebase handler uses the same Team ID / Key ID / .p8 at token exchange time.");
  console.log("- Whether Firebase handler sends the same redirect_uri shown above.");
} else if (error === "invalid_grant") {
  console.log("- Whether this code was already consumed by Firebase handler before manual exchange.");
  console.log("- Whether a fresh code captured before Firebase processes it yields Case A.");
} else {
  console.log("- Whether a fresh unconsumed authorization code produces a different Apple response.");
}
