import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

/** First name only — never a time-of-day greeting. */
export function resolveProfileHeadline(displayName: string | null | undefined): string {
  const trimmed = displayName?.trim();
  if (!trimmed) return '';
  const [firstName] = trimmed.split(/\s+/);
  return firstName || trimmed;
}

/**
 * Mission Control eyebrow — time-of-day greeting above the company name.
 */
export function resolveTimeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Overview hero — just the first name.
 * Falls back to "Home" when the profile has no usable name.
 */
export function resolveGreetingHeadline(
  displayName: string | null | undefined,
): string {
  return resolveProfileHeadline(displayName) || 'Home';
}

/**
 * Quiet line under the hero — short date and company.
 * Matches Finances rhythm without extra filler words.
 */
export function resolveGreetingMeta(
  companyName?: string | null,
  date = new Date(),
): string {
  const datePart = format(date, 'EEEE, d MMMM', { locale: enUS });
  const company = companyName?.trim();
  if (!company) return datePart;
  return `${datePart} · ${company}`;
}
