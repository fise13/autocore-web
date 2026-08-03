import { useMemo } from 'react';

import { CollectionRow, ListSection } from '@/components/ui';
import { getStartupSummary } from '@/lib/performance/startup-tracer';
import { estimateCacheSizeBytes, formatCacheSize } from '@/lib/storage/kv';

import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

function formatMark(ms: number | undefined): string {
  if (ms === undefined) return '—';
  return `${ms} ms`;
}

export function DiagnosticsSettingsScreen() {
  const startup = useMemo(() => getStartupSummary(), []);
  const cacheSize = useMemo(() => formatCacheSize(estimateCacheSizeBytes()), []);

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
