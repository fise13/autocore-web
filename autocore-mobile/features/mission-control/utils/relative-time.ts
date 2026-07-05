import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatActivityTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 45_000) return 'сейчас';
  if (diffMs < 86_400_000) {
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  }
  return format(date, 'd MMM, HH:mm', { locale: ru });
}
