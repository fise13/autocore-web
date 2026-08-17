import { X509Certificate, createPublicKey, createVerify } from "node:crypto";

import { APPLE_ROOT_CA_G3_PEM, APPLE_ROOT_CA_G3_SHA256 } from "./apple-root-ca";

/**
 * JWS verification for everything Apple signs: StoreKit 2 transactions,
 * renewal info, and App Store Server Notifications V2.
 *
 * Why hand-rolled rather than a JWT library: the signature is only half the
 * problem. Apple embeds the signing certificate chain in the `x5c` header, so
 * the check that actually matters is "does this chain terminate at Apple's root
 * CA" — a generic JWT library verifies a signature against a key you hand it,
 * which would let anyone who mints their own chain sign a transaction. The
 * chain is walked here and anchored to a pinned root.
 *
 * The notification endpoint is unauthenticated by construction — Apple posts to
 * a public URL — so this is the *only* thing standing between a stranger's POST
 * and a company being granted Pro. Treat any change here as a security change.
 */

export class AppleJwsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppleJwsError";
  }
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function normalizeFingerprint(value: string): string {
  return value.replace(/:/g, "").toUpperCase();
}

type JwsHeader = {
  alg?: string;
  x5c?: string[];
};

/**
 * JOSE ECDSA signatures are the raw `r || s` pair; `crypto.verify` wants DER.
 * Converting here rather than reaching for a library keeps the dependency
 * surface of the payment path at zero.
 */
function joseToDer(signature: Buffer): Buffer {
  if (signature.length % 2 !== 0) {
    throw new AppleJwsError("Malformed ECDSA signature");
  }
  const half = signature.length / 2;

  const encodeInteger = (raw: Buffer): Buffer => {
    // Strip leading zeros, then re-add one if the high bit is set — DER
    // INTEGERs are signed and must not be read as negative.
    let start = 0;
    while (start < raw.length - 1 && raw[start] === 0) start += 1;
    let body = raw.subarray(start);
    if (body[0] & 0x80) {
      body = Buffer.concat([Buffer.from([0x00]), body]);
    }
    return Buffer.concat([Buffer.from([0x02, body.length]), body]);
  };

  const r = encodeInteger(signature.subarray(0, half));
  const s = encodeInteger(signature.subarray(half));
  const body = Buffer.concat([r, s]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}

function parseCertificate(base64Der: string): X509Certificate {
  try {
    return new X509Certificate(Buffer.from(base64Der, "base64"));
  } catch {
    throw new AppleJwsError("Certificate in x5c is not valid DER");
  }
}

function assertWithinValidity(certificate: X509Certificate, at: Date, label: string): void {
  const from = new Date(certificate.validFrom).getTime();
  const to = new Date(certificate.validTo).getTime();
  const now = at.getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) {
    throw new AppleJwsError(`${label} certificate has an unreadable validity window`);
  }
  if (now < from || now > to) {
    throw new AppleJwsError(`${label} certificate is outside its validity window`);
  }
}

/**
 * Walk the `x5c` chain leaf → intermediate → root and anchor it to the pinned
 * Apple root. Returns the leaf, whose public key signed the payload.
 *
 * `at` exists so tests can verify a chain that has since expired without
 * weakening the check; production always passes the current time.
 */
export function verifyCertificateChain(x5c: string[], at: Date = new Date()): X509Certificate {
  if (!Array.isArray(x5c) || x5c.length < 2) {
    throw new AppleJwsError("JWS header is missing a certificate chain");
  }

  const chain = x5c.map(parseCertificate);
  const root = new X509Certificate(APPLE_ROOT_CA_G3_PEM);

  // The chain Apple sends ends with its root. Pin it by fingerprint rather than
  // trusting the certificate the caller supplied to describe itself.
  const presentedRoot = chain[chain.length - 1];
  if (normalizeFingerprint(presentedRoot.fingerprint256) !== APPLE_ROOT_CA_G3_SHA256) {
    throw new AppleJwsError("Certificate chain does not terminate at Apple Root CA - G3");
  }
  if (!presentedRoot.verify(root.publicKey)) {
    throw new AppleJwsError("Presented root certificate is not self-consistent");
  }

  for (let index = 0; index < chain.length - 1; index += 1) {
    const child = chain[index];
    const parent = chain[index + 1];
    assertWithinValidity(child, at, index === 0 ? "Leaf" : "Intermediate");
    if (!child.verify(parent.publicKey)) {
      throw new AppleJwsError("Certificate chain is broken");
    }
    if (child.issuer !== parent.subject) {
      throw new AppleJwsError("Certificate chain issuer does not match its parent");
    }
  }

  assertWithinValidity(presentedRoot, at, "Root");
  return chain[0];
}

/**
 * Verify a compact JWS and return its decoded payload.
 *
 * Only ES256 is accepted. `alg: none` and any RSA variant are rejected outright
 * rather than dispatched on — algorithm confusion is the classic way a JWS
 * verifier gets turned into a rubber stamp.
 */
export function verifyAppleJws<T>(token: string, at: Date = new Date()): T {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AppleJwsError("Malformed JWS");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: JwsHeader;
  try {
    header = JSON.parse(decodeBase64Url(encodedHeader).toString("utf8")) as JwsHeader;
  } catch {
    throw new AppleJwsError("Unreadable JWS header");
  }

  if (header.alg !== "ES256") {
    throw new AppleJwsError(`Unsupported JWS algorithm: ${header.alg ?? "none"}`);
  }

  const leaf = verifyCertificateChain(header.x5c ?? [], at);

  const signature = joseToDer(decodeBase64Url(encodedSignature));
  const verifier = createVerify("SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  if (!verifier.verify(createPublicKey(leaf.publicKey), signature)) {
    throw new AppleJwsError("JWS signature does not verify");
  }

  try {
    return JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as T;
  } catch {
    throw new AppleJwsError("Unreadable JWS payload");
  }
}

/**
 * Read a JWS payload **without** verifying it.
 *
 * Only for values that already arrived over an authenticated channel — a
 * response body from Apple's own App Store Server API, fetched over TLS with
 * our signed key. Never call this on anything a client or a webhook supplied.
 */
export function decodeAppleJwsUnsafe<T>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AppleJwsError("Malformed JWS");
  }
  try {
    return JSON.parse(decodeBase64Url(parts[1]).toString("utf8")) as T;
  } catch {
    throw new AppleJwsError("Unreadable JWS payload");
  }
}
