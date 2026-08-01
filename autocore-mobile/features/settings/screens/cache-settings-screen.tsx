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
      toast({ title: 'Cache cleared', variant: 'success' });
    } catch {
      toast({ title: 'Failed to clear cache', variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  }, []);

  return (
    <ProfileScreenShell title="Cache" subtitle="Offline data and performance">
      <ProfileMetaCard title="Local cache">
        <ProfileMetaRow label="Size" value={cacheLabel} />
        <ProfileMetaRow label="Storage" value="MMKV" />
        <ProfileMetaRow label="Offline cache" value="Enabled" />
      </ProfileMetaCard>

      <View style={{ paddingHorizontal: rhythm.pad }}>
        <Button variant="secondary" loading={clearing} onPress={() => void handleClear()}>
          Clear cache
        </Button>
        <Text variant="caption" color="muted" style={{ marginTop: rhythm.inline, lineHeight: 18 }}>
          Reference data will be reloaded on your next sign-in.
        </Text>
      </View>
    </ProfileScreenShell>
  );
}
