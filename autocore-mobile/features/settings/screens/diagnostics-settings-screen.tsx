import { useCallback, useMemo, useSyncExternalStore } from 'react';
import * as Clipboard from 'expo-clipboard';
import { View } from 'react-native';

import { CollectionRow, ListSection, Text, toast } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import {
  formatIapTraceLines,
  getIapTraceSeq,
  subscribeIapTrace,
} from '@/lib/subscriptions/iap-trace';
import { getStartupSummary } from '@/lib/performance/startup-tracer';
import {
  isConnected,
  isPurchaseInFlight,
  warmedSubscriptionSkus,
} from '@/lib/subscriptions/purchase-manager';
import {
  getPurchaseStoreSnapshot,
  subscribePurchaseStore,
} from '@/lib/subscriptions/purchase-store';
import { estimateCacheSizeBytes, formatCacheSize } from '@/lib/storage/kv';
import { tokens } from '@/theme/tokens';

function formatMark(ms: number | undefined): string {
  if (ms === undefined) return '—';
  return `${ms} ms`;
}

export function DiagnosticsSettingsScreen() {
  const startup = useMemo(() => getStartupSummary(), []);
  const cacheSize = useMemo(() => formatCacheSize(estimateCacheSizeBytes()), []);
  const purchase = useSyncExternalStore(
    subscribePurchaseStore,
    getPurchaseStoreSnapshot,
    getPurchaseStoreSnapshot,
  );
  const iapSeq = useSyncExternalStore(subscribeIapTrace, getIapTraceSeq, getIapTraceSeq);
  const traceLines = useMemo(() => formatIapTraceLines(12), [iapSeq]);
  const warmed = warmedSubscriptionSkus();

  const copyTrace = useCallback(async () => {
    const body = formatIapTraceLines(60).join('\n') || 'No IAP events yet.';
    await Clipboard.setStringAsync(body);
    toast({ title: 'IAP trace copied', variant: 'success' });
  }, []);

  return (
    <ProfileScreenShell title="Diagnostics" subtitle="Logs and developer mode">
      <ListSection title="Environment">
        <CollectionRow title="Build" value={__DEV__ ? 'Development' : 'Production'} showChevron={false} />
        <CollectionRow title="Realtime" value="Firebase" showChevron={false} />
        <CollectionRow title="Cache" value={cacheSize} showChevron={false} />
      </ListSection>

      <ListSection title="App startup">
        <CollectionRow title="JS bundle" value={formatMark(startup.js_bundle_eval)} showChevron={false} />
        <CollectionRow
          title="Session from cache"
          value={formatMark(startup.session_cache_read)}
          showChevron={false}
        />
        <CollectionRow
          title="Data snapshots"
          value={formatMark(startup.snapshots_preloaded)}
          showChevron={false}
        />
        <CollectionRow title="Auth ready" value={formatMark(startup.auth_ready)} showChevron={false} />
        <CollectionRow title="Splash hidden" value={formatMark(startup.splash_hidden)} showChevron={false} />
        <CollectionRow
          title="Tabs ready"
          value={formatMark(startup.tabs_interactive)}
          showChevron={false}
        />
      </ListSection>

      <ListSection title="In-app purchases" footer="Copy the trace after a failed buy and send it with a screenshot.">
        <CollectionRow
          title="Store connection"
          value={isConnected() ? 'Connected' : 'Disconnected'}
          showChevron={false}
        />
        <CollectionRow
          title="Prepared"
          value={purchase.storePrepared ? 'Yes' : 'No'}
          showChevron={false}
        />
        <CollectionRow
          title="Purchase in flight"
          value={isPurchaseInFlight() ? 'Yes' : 'No'}
          showChevron={false}
        />
        <CollectionRow
          title="Warmed SKUs"
          value={warmed.length > 0 ? warmed.join(', ') : '—'}
          showChevron={false}
        />
        <CollectionRow
          title="Catalog"
          value={`${purchase.products.length} product${purchase.products.length === 1 ? '' : 's'}`}
          showChevron={false}
        />
        <CollectionRow title="Flow" value={purchase.flow.phase} showChevron={false} />
        <CollectionRow
          title="Copy IAP trace"
          subtitle={traceLines.length > 0 ? traceLines[traceLines.length - 1] : 'No events yet'}
          onPress={() => void copyTrace()}
        />
      </ListSection>

      {traceLines.length > 0 ? (
        <View style={{ marginHorizontal: tokens.space.screenX, gap: tokens.space.inline }}>
          <Text variant="caption" color="muted" style={{ lineHeight: 18, fontVariant: ['tabular-nums'] }}>
            {traceLines.join('\n')}
          </Text>
        </View>
      ) : null}

      <ListSection title="Debug">
        <CollectionRow
          title="Developer mode"
          value={__DEV__ ? 'Enabled' : 'Disabled'}
          showChevron={false}
        />
      </ListSection>
    </ProfileScreenShell>
  );
}
