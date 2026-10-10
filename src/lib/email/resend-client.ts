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

export type SendEmailPayload = Parameters<Resend["emails"]["send"]>[0];

/**
 * The only way to send mail. Resend's SDK does not throw: a rejected send (bad key,
 * unverified sender domain, rate limit) comes back as `{ error }`, and every caller
 * awaited it and moved on — so the UI said "sent", the logs stayed clean and nothing
 * reached the inbox. This turns that into a thrown, logged error.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<{ id: string }> {
  const { data, error } = await getResend().emails.send(payload);
  if (error || !data) {
    const reason = error ? `${error.name}: ${error.message}` : "no response from Resend";
    console.error("[email] Resend rejected the message", { to: payload.to, subject: payload.subject, reason });
    throw new Error(`Email was not sent (${reason})`);
  }
  return { id: data.id };
}
