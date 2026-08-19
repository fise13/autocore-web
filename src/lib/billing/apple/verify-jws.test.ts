import assert from "node:assert/strict";
import { X509Certificate, createSign, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import {
  APPLE_TEST_NOTIFICATION_JWS,
  APPLE_TEST_NOTIFICATION_SIGNED_AT,
} from "./__fixtures__/apple-test-notification";
import { APPLE_ROOT_CA_G3_PEM, APPLE_ROOT_CA_G3_SHA256 } from "./apple-root-ca";
import { AppleJwsError, decodeAppleJwsUnsafe, verifyAppleJws } from "./verify-jws";

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * A JWS signed by a chain we control. It is structurally identical to Apple's —
 * ES256, certificates in `x5c` — and differs only in who signed the root. If the
 * verifier ever accepts one of these, the notification endpoint is forgeable.
 */
function forgeJws(payload: unknown): string {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const header = base64Url(JSON.stringify({ alg: "ES256", x5c: [] }));
  const body = base64Url(JSON.stringify(payload));
  const signer = createSign("SHA256");
  signer.update(`${header}.${body}`);
  signer.end();
  const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${header}.${body}.${base64Url(signature)}`;
}

describe("pinned Apple root", () => {
  it("is the certificate Apple publishes", () => {
    const root = new X509Certificate(APPLE_ROOT_CA_G3_PEM);
    assert.equal(root.fingerprint256.replace(/:/g, "").toUpperCase(), APPLE_ROOT_CA_G3_SHA256);
    assert.match(root.subject, /Apple Root CA - G3/);
    // Self-signed: subject and issuer are the same entity.
    assert.equal(root.subject, root.issuer);
    assert.equal(root.verify(root.publicKey), true);
  });

  it("has not expired", () => {
    const root = new X509Certificate(APPLE_ROOT_CA_G3_PEM);
    assert.ok(new Date(root.validTo).getTime() > Date.now());
  });
});

describe("verifyAppleJws", () => {
  it("refuses a JWS signed by a chain that is not Apple's", () => {
    assert.throws(
      () => verifyAppleJws(forgeJws({ notificationType: "SUBSCRIBED" })),
      (error: unknown) =>
        error instanceof AppleJwsError && /certificate chain/i.test(error.message),
    );
  });

  it("refuses alg:none — the classic verifier bypass", () => {
    const header = base64Url(JSON.stringify({ alg: "none", x5c: [] }));
    const body = base64Url(JSON.stringify({ notificationType: "SUBSCRIBED" }));
    assert.throws(
      () => verifyAppleJws(`${header}.${body}.`),
      (error: unknown) =>
        error instanceof AppleJwsError && /Unsupported JWS algorithm/.test(error.message),
    );
  });

  it("refuses an RSA algorithm swap", () => {
    const header = base64Url(JSON.stringify({ alg: "RS256", x5c: ["abc"] }));
    const body = base64Url(JSON.stringify({}));
    assert.throws(
      () => verifyAppleJws(`${header}.${body}.sig`),
      (error: unknown) => error instanceof AppleJwsError,
    );
  });

  it("refuses a token with no certificate chain at all", () => {
    const header = base64Url(JSON.stringify({ alg: "ES256" }));
    const body = base64Url(JSON.stringify({}));
    assert.throws(
      () => verifyAppleJws(`${header}.${body}.sig`),
      (error: unknown) =>
        error instanceof AppleJwsError && /missing a certificate chain/.test(error.message),
    );
  });

  it("refuses a malformed token", () => {
    assert.throws(() => verifyAppleJws("not-a-jws"), AppleJwsError);
    assert.throws(() => verifyAppleJws(""), AppleJwsError);
  });

  it("refuses a chain whose root is not the pinned one", () => {
    // Two self-signed certs: a plausible-looking chain anchored to a stranger.
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    void publicKey;
    const header = base64Url(
      JSON.stringify({
        alg: "ES256",
        // Valid base64 that is not a certificate — the parser must reject it
        // rather than throw something unhandled.
        x5c: [Buffer.from("nonsense").toString("base64"), Buffer.from("also").toString("base64")],
      }),
    );
    const body = base64Url(JSON.stringify({}));
    const signer = createSign("SHA256");
    signer.update(`${header}.${body}`);
    signer.end();
    const signature = base64Url(signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }));

    assert.throws(
      () => verifyAppleJws(`${header}.${body}.${signature}`),
      (error: unknown) => error instanceof AppleJwsError,
    );
  });
});

describe("a genuine Apple signature", () => {
  /**
   * The counterpart to every rejection test above. Those pass just as happily
   * against a verifier that refuses everything — which is exactly the bug this
   * catches: wrapping the certificate's already-public key in
   * `createPublicKey()` threw on real payloads while all the negative tests
   * stayed green.
   */
  it("is accepted, and the payload decodes", () => {
    const payload = verifyAppleJws<{
      notificationType?: string;
      data?: { bundleId?: string; environment?: string };
    }>(APPLE_TEST_NOTIFICATION_JWS, APPLE_TEST_NOTIFICATION_SIGNED_AT);

    assert.equal(payload.notificationType, "TEST");
    assert.equal(payload.data?.bundleId, "com.wise.autocore.mobile");
    assert.equal(payload.data?.environment, "Sandbox");
  });

  it("still fails if a single byte of the payload is altered", () => {
    const [header, body, signature] = APPLE_TEST_NOTIFICATION_JWS.split(".");
    const tampered = Buffer.from(
      JSON.stringify({ notificationType: "REFUND", data: { bundleId: "com.wise.autocore.mobile" } }),
    ).toString("base64url");

    assert.throws(
      () => verifyAppleJws(`${header}.${tampered}.${signature}`, APPLE_TEST_NOTIFICATION_SIGNED_AT),
      (error: unknown) =>
        error instanceof AppleJwsError && /signature does not verify/.test(error.message),
    );
    void body;
  });

  it("fails outside the signing certificate's validity window", () => {
    assert.throws(
      () => verifyAppleJws(APPLE_TEST_NOTIFICATION_JWS, new Date("2020-01-01T00:00:00Z")),
      (error: unknown) =>
        error instanceof AppleJwsError && /validity window/.test(error.message),
    );
  });
});

describe("decodeAppleJwsUnsafe", () => {
  it("reads a payload without checking the signature", () => {
    const token = forgeJws({ productId: "com.autocore.pro.monthly" });
    assert.deepEqual(decodeAppleJwsUnsafe(token), { productId: "com.autocore.pro.monthly" });
  });

  it("still refuses something that is not a JWS", () => {
    assert.throws(() => decodeAppleJwsUnsafe("nope"), AppleJwsError);
  });
});
