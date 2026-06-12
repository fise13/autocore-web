const DEFAULT_PHONE = "+77471795869";
const DEFAULT_EMAIL = "support@myautocore.com";

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Human-readable phone, e.g. +7 747 179 5869 */
export function formatPlatformPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 10) {
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

export type PlatformContacts = {
  phone: string;
  email: string;
  telHref: string;
  mailtoHref: string;
  formattedPhone: string;
  supportLine: string;
};

/**
 * Public support contacts for marketing pages, footer, SEO and /contact.
 * Configure via NEXT_PUBLIC_AUTOCORE_SUPPORT_* in .env.local (see .env.local.example).
 * Not injected into client PDFs or app branding.
 */
export function getPlatformContacts(): PlatformContacts {
  const phone =
    readEnv("NEXT_PUBLIC_AUTOCORE_SUPPORT_PHONE", "AUTOCORE_SUPPORT_PHONE") ?? DEFAULT_PHONE;
  const email =
    readEnv("NEXT_PUBLIC_AUTOCORE_SUPPORT_EMAIL", "AUTOCORE_SUPPORT_EMAIL") ?? DEFAULT_EMAIL;
  const normalizedPhone = phone.replace(/\s/g, "");
  const formattedPhone = formatPlatformPhone(phone);

  return {
    phone: normalizedPhone,
    email,
    telHref: `tel:${normalizedPhone}`,
    mailtoHref: `mailto:${email}`,
    formattedPhone,
    supportLine: `${formattedPhone} · ${email}`,
  };
}

/** Server-only inbox for support chat operator notifications. */
export function getSupportAgentEmail(): string {
  return (
    readEnv("SUPPORT_AGENT_EMAIL", "NEXT_PUBLIC_AUTOCORE_SUPPORT_EMAIL", "AUTOCORE_SUPPORT_EMAIL") ??
    DEFAULT_EMAIL
  );
}
