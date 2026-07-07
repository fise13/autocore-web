import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Text, toast } from '@/components/ui';
import { haptics, rhythm } from '@/theme';
import { clearLocalSessionCaches } from '@/lib/storage/clear-local-caches';
import { estimateCacheSizeBytes, formatCacheSize } from '@/lib/storage/kv';

import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

export function CacheSettingsScreen() {
  const [cacheBytes, setCacheBytes] = useState(() => estimateCacheSizeBytes());
  const [clearing, setClearing] = useState(false);

  const cacheLabel = useMemo(() => formatCacheSize(cacheBytes), [cacheBytes]);

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      haptics.medium();
      await clearLocalSessionCaches();
      setCacheBytes(estimateCacheSizeBytes());
      toast({ title: 'Кэш очищен', variant: 'success' });
    } catch {
      toast({ title: 'Не удалось очистить кэш', variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  }, []);

  return (
    <ProfileScreenShell title="Кэш" subtitle="Офлайн-данные и производительность">
      <ProfileMetaCard title="Локальный кэш">
        <ProfileMetaRow label="Объём" value={cacheLabel} />
        <ProfileMetaRow label="Хранилище" value="MMKV" />
        <ProfileMetaRow label="Офлайн-кэш" value="Включён" />
      </ProfileMetaCard>

      <View style={{ paddingHorizontal: rhythm.pad }}>
        <Button variant="secondary" loading={clearing} onPress={() => void handleClear()}>
          Сбросить кэш
        </Button>
        <Text variant="caption" color="muted" style={{ marginTop: rhythm.inline, lineHeight: 18 }}>
          Справочники будут загружены заново при следующем входе.
        </Text>
      </View>
    </ProfileScreenShell>
  );
}
