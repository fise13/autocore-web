import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * The small line above Home's greeting — short date, optionally the company.
 *
 * The time-of-day resolvers that used to live beside this one were removed with
 * the company-name hero: Home's greeting is chosen in `home/lib/greeting.ts`,
 * and two greeting resolvers in one feature is how two Homes start drifting
 * apart.
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
