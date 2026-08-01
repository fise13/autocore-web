import {
  endOfDay,
  format,
  isToday,
  isYesterday,
  startOfDay,
  subDays,
} from 'date-fns';
import { enUS } from 'date-fns/locale';

import type { AppNotification } from '@/services/notifications/types';

export type DateGroupKey = 'today' | 'yesterday' | 'earlier';

export type DateGroup = {
  key: DateGroupKey;
  label: string;
  items: AppNotification[];
};

const GROUP_LABELS: Record<DateGroupKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

export function groupNotificationsByDate(items: AppNotification[]): DateGroup[] {
  const buckets: Record<DateGroupKey, AppNotification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const item of items) {
    const date = new Date(item.createdAt);
    if (isToday(date)) {
      buckets.today.push(item);
    } else if (isYesterday(date)) {
      buckets.yesterday.push(item);
    } else {
      buckets.earlier.push(item);
    }
  }

  return (['today', 'yesterday', 'earlier'] as DateGroupKey[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      key,
      label: GROUP_LABELS[key],
      items: buckets[key],
    }));
}

export function formatNotificationTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: enUS });
    }
    if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'HH:mm', { locale: enUS })}`;
    }
    return format(date, 'd MMM, HH:mm', { locale: enUS });
  } catch {
    return '';
  }
}

export function isWithinDateRange(iso: string, key: DateGroupKey): boolean {
  const date = new Date(iso);
  if (key === 'today') return isToday(date);
  if (key === 'yesterday') return isYesterday(date);
  const yesterdayStart = startOfDay(subDays(new Date(), 1));
  return date < yesterdayStart;
}
