import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import { normalizeApplePrivateKey } from "./apple-config";

/** A real EC P-256 key in the PKCS#8 PEM form App Store Connect hands out. */
const PEM = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey.trim();

const ESCAPED = PEM.replace(/\n/g, "\\n");

/** The check that matters: can Node actually sign with what came back. */
function canSign(key: string | null): boolean {
  if (!key) return false;
  try {
    const signer = createSign("SHA256");
    signer.update("payload");
    signer.end();
    signer.sign({ key, dsaEncoding: "ieee-p1363" });
    return true;
  } catch {
    return false;
  }
}

describe("normalizeApplePrivateKey", () => {
  it("takes a real multi-line PEM unchanged", () => {
    assert.equal(normalizeApplePrivateKey(PEM), PEM);
    assert.ok(canSign(normalizeApplePrivateKey(PEM)));
  });

  it("expands the escaped single-line form dashboards force you into", () => {
    assert.equal(normalizeApplePrivateKey(ESCAPED), PEM);
    assert.ok(canSign(normalizeApplePrivateKey(ESCAPED)));
  });

  it("strips the quotes copied out of a .env file", () => {
    // dotenv treats these as syntax and removes them; a dashboard stores them
    // as part of the value, and the key then fails to decode at signing time.
    assert.ok(canSign(normalizeApplePrivateKey(`"${ESCAPED}"`)));
    assert.ok(canSign(normalizeApplePrivateKey(`'${ESCAPED}'`)));
    assert.ok(canSign(normalizeApplePrivateKey(`"${PEM}"`)));
  });

  it("leaves an unmatched quote alone rather than truncating the key", () => {
    // Only a matching pair is formatting. A lone quote is corruption, and
    // silently dropping one character would hide it.
    assert.equal(normalizeApplePrivateKey(`"${ESCAPED}`), `"${ESCAPED}`.replace(/\\n/g, "\n"));
  });

  it("treats absent, blank and quote-only values as unset", () => {
    assert.equal(normalizeApplePrivateKey(undefined), null);
    assert.equal(normalizeApplePrivateKey(null), null);
    assert.equal(normalizeApplePrivateKey("   "), null);
    assert.equal(normalizeApplePrivateKey('""'), null);
  });
});
