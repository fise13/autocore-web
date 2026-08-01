import { createMMKV, type MMKV } from 'react-native-mmkv';

export const appStorage: MMKV = createMMKV({ id: 'autocore-mobile' });

export function getString(key: string): string | undefined {
  return appStorage.getString(key);
}

export function setString(key: string, value: string): void {
  appStorage.set(key, value);
}

export function getJson<T>(key: string): T | null {
  try {
    const raw = appStorage.getString(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJson<T>(key: string, value: T): void {
  try {
    appStorage.set(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function remove(key: string): void {
  appStorage.remove(key);
}

export function getAllKeys(): string[] {
  return appStorage.getAllKeys();
}

export function clearNamespace(prefix: string): void {
  for (const key of appStorage.getAllKeys()) {
    if (key.startsWith(prefix)) {
      appStorage.remove(key);
    }
  }
}

export function estimateCacheSizeBytes(): number {
  return appStorage.byteSize;
}

export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
