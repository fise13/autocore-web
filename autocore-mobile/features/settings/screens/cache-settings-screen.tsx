import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, CollectionRow, ListSection, Text, toast } from '@/components/ui';
import { haptics } from '@/theme';
import { clearLocalSessionCaches } from '@/lib/storage/clear-local-caches';
import { estimateCacheSizeBytes, formatCacheSize } from '@/lib/storage/kv';
import { tokens } from '@/theme/tokens';

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
      <ListSection title="Local cache" footer="Reference data reloads on your next sign-in.">
        <CollectionRow title="Size" value={cacheLabel} showChevron={false} />
        <CollectionRow title="Storage" value="MMKV" showChevron={false} />
        <CollectionRow title="Offline cache" value="Enabled" showChevron={false} />
      </ListSection>

      <View style={{ marginHorizontal: tokens.space.screenX, gap: tokens.space.inline }}>
        <Button variant="secondary" loading={clearing} onPress={() => void handleClear()}>
          Clear cache
        </Button>
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          Does not delete cloud company data.
        </Text>
      </View>
    </ProfileScreenShell>
  );
}
