import { useMemo } from 'react';

import { getStartupSummary } from '@/lib/performance/startup-tracer';
import { estimateCacheSizeBytes, formatCacheSize } from '@/lib/storage/kv';

import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
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
      <ProfileMetaCard title="Environment">
        <ProfileMetaRow label="Build" value={__DEV__ ? 'Development' : 'Production'} />
        <ProfileMetaRow label="Realtime" value="Firebase" />
        <ProfileMetaRow label="Cache" value={cacheSize} />
      </ProfileMetaCard>

      <ProfileMetaCard title="App Startup">
        <ProfileMetaRow label="JS bundle" value={formatMark(startup.js_bundle_eval)} />
        <ProfileMetaRow label="Session from cache" value={formatMark(startup.session_cache_read)} />
        <ProfileMetaRow label="Data snapshots" value={formatMark(startup.snapshots_preloaded)} />
        <ProfileMetaRow label="Auth ready" value={formatMark(startup.auth_ready)} />
        <ProfileMetaRow label="Splash hidden" value={formatMark(startup.splash_hidden)} />
        <ProfileMetaRow label="Tabs ready" value={formatMark(startup.tabs_interactive)} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Debug">
        <ProfileMetaRow label="Developer mode" value={__DEV__ ? 'Enabled' : 'Disabled'} />
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
