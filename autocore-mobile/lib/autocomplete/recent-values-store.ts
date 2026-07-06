import { getJson, setJson } from '@/lib/storage/kv';

import type { AutocompleteSourceId } from './types';

const MAX_RECENT = 12;

function storageKey(companyId: string, source: AutocompleteSourceId): string {
  return `autocomplete:recent:${companyId}:${source}`;
}

function fieldKey(companyId: string, field: string): string {
  return `autocomplete:field:${companyId}:${field}`;
}

export function readRecentValues(companyId: string, source: AutocompleteSourceId): string[] {
  if (!companyId) return [];
  return getJson<string[]>(storageKey(companyId, source)) ?? [];
}

export function rememberRecentValue(companyId: string, source: AutocompleteSourceId, value: string): void {
  const trimmed = value.trim();
  if (!trimmed || !companyId) return;

  const current = readRecentValues(companyId, source);
  const next = [trimmed, ...current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );
  setJson(storageKey(companyId, source), next);
}

export function readFieldValues(companyId: string, field: string): string[] {
  if (!companyId || !field) return [];
  return getJson<string[]>(fieldKey(companyId, field)) ?? [];
}

export function rememberFieldValue(companyId: string, field: string, value: string): void {
  const trimmed = value.trim();
  if (!trimmed || !companyId || !field) return;

  const current = readFieldValues(companyId, field);
  const next = [trimmed, ...current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );
  setJson(fieldKey(companyId, field), next);
}
