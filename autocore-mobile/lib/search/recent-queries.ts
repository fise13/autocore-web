import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'autocore-mobile:search-recent-queries';
const MAX_RECENT = 6;

export async function readRecentSearchQueries(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  } catch {
    return [];
  }
}

export async function rememberSearchQuery(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return readRecentSearchQueries();

  const current = await readRecentSearchQueries();
  const next = [trimmed, ...current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
