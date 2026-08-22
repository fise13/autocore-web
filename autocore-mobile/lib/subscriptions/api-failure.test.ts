import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isRetryableVerificationStatus, verificationFailureForStatus } from './api-failure';

describe('verificationFailureForStatus', () => {
  it('names a server with no App Store credentials, instead of blaming the network', () => {
    // This is the case that hid a paid, unrecorded subscription: `/verify`
    // answers 503 when `APPLE_APP_STORE_*` is missing from the deployment, and
    // calling that "no connection" told the buyer to wait it out forever.
    assert.equal(verificationFailureForStatus(503), 'server_unconfigured');
  });

  it('keeps the rejections that are about this purchase', () => {
    assert.equal(verificationFailureForStatus(409), 'bound_to_other_company');
    assert.equal(verificationFailureForStatus(403), 'permission_denied');
    assert.equal(verificationFailureForStatus(402), 'verification_failed');
    assert.equal(verificationFailureForStatus(400), 'verification_failed');
  });

  it('treats anything else as transient, including a bad gateway', () => {
    assert.equal(verificationFailureForStatus(0), 'network');
    assert.equal(verificationFailureForStatus(500), 'network');
    assert.equal(verificationFailureForStatus(502), 'network');
    assert.equal(verificationFailureForStatus(504), 'network');
  });
});

describe('isRetryableVerificationStatus', () => {
  it('keeps retrying what a retry can fix', () => {
    assert.equal(isRetryableVerificationStatus(502), true);
    assert.equal(isRetryableVerificationStatus(0), true);
    // Apple may still be catching up on a transaction it has not published.
    assert.equal(isRetryableVerificationStatus(400), true);
  });

  it('stops pretending a misconfigured server or a wrong seat will resolve itself', () => {
    assert.equal(isRetryableVerificationStatus(503), false);
    assert.equal(isRetryableVerificationStatus(403), false);
  });
});
