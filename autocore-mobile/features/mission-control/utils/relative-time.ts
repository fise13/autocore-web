import { format, formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

export function formatActivityTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 45_000) return 'just now';
  if (diffMs < 86_400_000) {
    return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
  }
  return format(date, 'd MMM, HH:mm', { locale: enUS });
}
