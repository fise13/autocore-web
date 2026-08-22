/**
 * What an HTTP status from our own billing API means for a purchase — L0.
 *
 * Split out of `purchase-errors.ts` purely so it can be tested: that module
 * imports `react-native-iap`, which cannot load under `node --test`, and this
 * mapping is the part with a real decision in it. Everything here is pure.
 *
 * The distinction that matters is retryable vs not. `/verify` answers a genuine
 * rejection with 200 and a `reason`, so anything that arrives here as a status
 * is an operational failure — and lumping them all under "network" told a buyer
 * whose server was missing its App Store credentials to wait for a connection
 * that was never the problem.
 */
import type { PurchaseFailureCode } from './types';

export function verificationFailureForStatus(status: number): PurchaseFailureCode {
  // Apple's subscription already belongs to another workspace.
  if (status === 409) return 'bound_to_other_company';
  // This seat may not manage billing. Waiting cannot promote them.
  if (status === 403) return 'permission_denied';
  // `/verify` has no App Store Server API credentials — a deployment problem,
  // not a connection problem, and no amount of retrying resolves it.
  if (status === 503) return 'server_unconfigured';
  if (status === 402 || status === 400) return 'verification_failed';
  return 'network';
}

/** Whether retrying this status could ever produce a different answer. */
export function isRetryableVerificationStatus(status: number): boolean {
  const code = verificationFailureForStatus(status);
  return code !== 'server_unconfigured' && code !== 'permission_denied';
}
