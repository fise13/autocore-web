import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function toDateFromFirestore(value: unknown): Date | undefined {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === 'function') {
      return candidate.toDate.call(value);
    }
  }
  return undefined;
}

const DATE_FIELD_RE = /(?:At|Date|Time|timestamp)$/i;

function shouldReviveDateField(key?: string): boolean {
  return Boolean(key && DATE_FIELD_RE.test(key));
}

/** Coerce Firestore timestamps, ISO strings, and epoch numbers into Date. */
export function coerceToDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const fromFirestore = toDateFromFirestore(value);
  if (fromFirestore) return fromFirestore;

  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  if (value && typeof value === 'object' && 'seconds' in value) {
    const record = value as { seconds?: unknown; nanoseconds?: unknown };
    if (typeof record.seconds === 'number') {
      const nanos = typeof record.nanoseconds === 'number' ? record.nanoseconds : 0;
      return new Date(record.seconds * 1000 + nanos / 1_000_000);
    }
  }

  return undefined;
}

/** Restore Date instances after JSON round-trip through MMKV / AsyncStorage. */
export function reviveDatesDeep<T>(value: T, key?: string): T {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((entry) => reviveDatesDeep(entry)) as T;
  }

  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    if (shouldReviveDateField(key)) {
      const revived = coerceToDate(value);
      if (revived) return revived as T;
    }
    return value;
  }

  if (typeof value === 'number' && shouldReviveDateField(key)) {
    const revived = coerceToDate(value);
    if (revived) return revived as T;
  }

  if (typeof value === 'object') {
    const revived = shouldReviveDateField(key) ? coerceToDate(value) : undefined;
    if (revived) return revived as T;

    const out: Record<string, unknown> = {};
    for (const [entryKey, entry] of Object.entries(value as Record<string, unknown>)) {
      out[entryKey] = reviveDatesDeep(entry, entryKey);
    }
    return out as T;
  }

  return value;
}

/**
 * `format` from date-fns calls Date methods on its input, so it throws on the
 * Timestamps and rehydrated ISO strings that reach the UI through fields typed
 * as `Date`. Coerce first and fall back rather than crashing a whole screen.
 */
export function formatTimestamp(
  value: unknown,
  pattern: string,
  fallback = '—',
): string {
  const date = coerceToDate(value);
  return date ? format(date, pattern, { locale: enUS }) : fallback;
}
