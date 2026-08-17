/**
 * Apple Root CA - G3, the trust anchor for every JWS Apple signs.
 *
 * Pinned in source rather than read from the system trust store: this app runs
 * on Vercel's runtime, whose CA bundle we do not control, and the only chain we
 * ever want to accept here is Apple's. Nothing else may sign a transaction.
 *
 * Downloaded from https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
 *   subject/issuer: CN=Apple Root CA - G3, O=Apple Inc., C=US  (self-signed)
 *   valid:          2014-04-30 → 2039-04-30
 *   SHA-256:        63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:
 *                   7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79
 *
 * The fingerprint is asserted in `verify-jws.test.ts`, so a corrupted or
 * swapped certificate fails the build rather than silently widening trust.
 */

export const APPLE_ROOT_CA_G3_PEM =
  "-----BEGIN CERTIFICATE-----\n" +
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS\n" +
  "QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u\n" +
  "IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN\n" +
  "MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS\n" +
  "b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y\n" +
  "aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49\n" +
  "AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf\n" +
  "TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517\n" +
  "IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr\n" +
  "MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA\n" +
  "MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4\n" +
  "at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM\n" +
  "6BgD56KyKA==\n" +
  "-----END CERTIFICATE-----\n";

/** Uppercase hex, no separators — matches `X509Certificate.fingerprint256` once colons are stripped. */
export const APPLE_ROOT_CA_G3_SHA256 =
  "63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179".toUpperCase();
