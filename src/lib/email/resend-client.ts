import "server-only";

import { Resend } from "resend";

const DEFAULT_NOREPLY = "AutoCore <noreply@myautocore.com>";
const DEFAULT_SUPPORT = "AutoCore <support@myautocore.com>";

export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

export function getNoreplyFrom(): string {
  return process.env.RESEND_NOREPLY_EMAIL?.trim() || DEFAULT_NOREPLY;
}

export function getSupportFrom(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_SUPPORT;
}

export function getResend(): Resend {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

export function isResendConfigured(): boolean {
  return Boolean(getResendApiKey());
}
