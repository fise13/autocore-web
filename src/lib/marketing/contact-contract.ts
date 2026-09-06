import { z } from "zod";

export const CONTACT_INTENTS = ["sales", "support", "partnerships", "general"] as const;

export type ContactIntent = (typeof CONTACT_INTENTS)[number];

export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 4000;
export const CONTACT_NAME_MAX = 80;
export const CONTACT_COMPANY_MAX = 120;
export const CONTACT_EMAIL_MAX = 254;

export const contactPayloadSchema = z.object({
  intent: z.enum(CONTACT_INTENTS),
  name: z.string().trim().min(1).max(CONTACT_NAME_MAX),
  email: z.string().trim().email().max(CONTACT_EMAIL_MAX),
  company: z.string().trim().max(CONTACT_COMPANY_MAX).optional().default(""),
  message: z.string().trim().min(CONTACT_MESSAGE_MIN).max(CONTACT_MESSAGE_MAX),
  /** Honeypot. Bots fill it; people never see it. */
  website: z.string().max(200).optional().default(""),
});

export type ContactPayload = z.infer<typeof contactPayloadSchema>;

export function parseContactPayload(input: unknown) {
  return contactPayloadSchema.safeParse(input);
}

export function isContactIntent(value: unknown): value is ContactIntent {
  return typeof value === "string" && (CONTACT_INTENTS as readonly string[]).includes(value);
}

/** Inbox subject prefix. English on purpose, so mailbox filters stay stable. */
export function contactIntentLabel(intent: ContactIntent): string {
  switch (intent) {
    case "sales":
      return "Sales";
    case "support":
      return "Support";
    case "partnerships":
      return "Partnership";
    case "general":
      return "General";
  }
}
