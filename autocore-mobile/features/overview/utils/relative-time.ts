import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

import { coerceToDate } from '@/lib/firestore-timestamp';

export function formatActivityTime(value: unknown, now = new Date()): string {
  const date = coerceToDate(value);
  if (!date) return '—';
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 45_000) return 'just now';
  if (diffMs < 86_400_000) {
    return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
  }
  return format(date, 'd MMM, HH:mm', { locale: enUS });
}
