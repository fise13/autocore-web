import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecentScan } from '@/features/scan/types';

const STORAGE_KEY = '@autocore/scan/recent';
const MAX_RECENT = 20;

type StoredRecentScan = {
  id: string;
  label: string;
  payload: string;
  itemId?: string;
  timestamp: number;
};

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

function mapStored(item: StoredRecentScan): RecentScan {
  return {
    id: item.id,
    label: item.label,
    time: formatRelativeTime(item.timestamp),
    payload: item.payload,
    itemId: item.itemId,
  };
}

export async function loadRecentScans(): Promise<RecentScan[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRecentScan[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECENT)
      .map(mapStored);
  } catch {
    return [];
  }
}

export async function rememberRecentScan(input: {
  payload: string;
  label: string;
  itemId?: string;
}): Promise<void> {
  const payload = input.payload.trim();
  if (!payload) return;

  const existing = await loadRecentScans();
  const stored: StoredRecentScan[] = [
    {
      id: `${Date.now()}-${payload}`,
      label: input.label,
      payload,
      itemId: input.itemId,
      timestamp: Date.now(),
    },
    ...existing
      .filter((item) => item.payload !== payload)
      .map((item) => ({
        id: item.id,
        label: item.label,
        payload: item.payload,
        itemId: item.itemId,
        timestamp: Date.now(),
      })),
  ].slice(0, MAX_RECENT);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}
