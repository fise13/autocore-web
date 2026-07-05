import { getJson, setJson } from '@/lib/storage/kv';
import { ensureAsyncStorageMigrated } from '@/lib/storage/migrate-async-storage';

const STORAGE_KEY = 'autocore-mobile:search-recent-queries';
const MAX_RECENT = 6;

let recentQueriesCache: string[] | null = null;

export function getRecentQueriesCache(): string[] {
  if (recentQueriesCache) return recentQueriesCache;
  recentQueriesCache = getJson<string[]>(STORAGE_KEY) ?? [];
  return recentQueriesCache;
}

export function hydrateSearchIdleCache(): string[] {
  void ensureAsyncStorageMigrated();
  recentQueriesCache = getJson<string[]>(STORAGE_KEY) ?? [];
  return recentQueriesCache;
}

export async function readRecentSearchQueries(): Promise<string[]> {
  await ensureAsyncStorageMigrated();
  const queries = getJson<string[]>(STORAGE_KEY);
  if (!queries || !Array.isArray(queries)) {
    recentQueriesCache = [];
    return [];
  }
  recentQueriesCache = queries.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
  );
  return recentQueriesCache;
}

export async function rememberSearchQuery(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return readRecentSearchQueries();

  const current = await readRecentSearchQueries();
  const next = [trimmed, ...current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );

  setJson(STORAGE_KEY, next);
  recentQueriesCache = next;
  return next;
}

export function clearRecentQueriesCache(): void {
  recentQueriesCache = [];
}
