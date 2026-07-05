import AsyncStorage from '@react-native-async-storage/async-storage';

import { setString } from '@/lib/storage/kv';

const MIGRATION_FLAG = 'autocore-mobile:migration:async-storage:v1';

let migrationPromise: Promise<void> | null = null;

/**
 * One-time copy of legacy AsyncStorage cache keys into MMKV.
 * Safe to call multiple times — runs at most once per install.
 */
export function ensureAsyncStorageMigrated(): Promise<void> {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      const done = await AsyncStorage.getItem(MIGRATION_FLAG);
      if (done === '1') return;

      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(
        (key) =>
          key.startsWith('autocore-mobile:') &&
          key !== MIGRATION_FLAG &&
          !key.startsWith('autocore-mobile:migration:'),
      );

      await Promise.all(
        cacheKeys.map(async (key) => {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            setString(key, value);
          }
        }),
      );

      await AsyncStorage.setItem(MIGRATION_FLAG, '1');
    } catch {
      // Non-fatal — MMKV may already have data or migration can retry next launch.
    }
  })();

  return migrationPromise;
}
