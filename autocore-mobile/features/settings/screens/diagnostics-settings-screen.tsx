import { useMemo } from 'react';

import { getStartupSummary } from '@/lib/performance/startup-tracer';
import { estimateCacheSizeBytes, formatCacheSize } from '@/lib/storage/kv';

import { ProfileMetaCard, ProfileMetaRow } from '@/features/profile/components/profile-meta-card';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';

function formatMark(ms: number | undefined): string {
  if (ms === undefined) return '—';
  return `${ms} мс`;
}

export function DiagnosticsSettingsScreen() {
  const startup = useMemo(() => getStartupSummary(), []);
  const cacheSize = useMemo(() => formatCacheSize(estimateCacheSizeBytes()), []);

  return (
    <ProfileScreenShell title="Диагностика" subtitle="Логи и режим разработчика">
      <ProfileMetaCard title="Среда">
        <ProfileMetaRow label="Сборка" value={__DEV__ ? 'Development' : 'Production'} />
        <ProfileMetaRow label="Realtime" value="Firebase" />
        <ProfileMetaRow label="Кэш" value={cacheSize} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Запуск приложения">
        <ProfileMetaRow label="JS bundle" value={formatMark(startup.js_bundle_eval)} />
        <ProfileMetaRow label="Сессия из кэша" value={formatMark(startup.session_cache_read)} />
        <ProfileMetaRow label="Снимки данных" value={formatMark(startup.snapshots_preloaded)} />
        <ProfileMetaRow label="Auth ready" value={formatMark(startup.auth_ready)} />
        <ProfileMetaRow label="Splash скрыт" value={formatMark(startup.splash_hidden)} />
        <ProfileMetaRow label="Вкладки готовы" value={formatMark(startup.tabs_interactive)} />
      </ProfileMetaCard>

      <ProfileMetaCard title="Отладка">
        <ProfileMetaRow label="Режим разработчика" value={__DEV__ ? 'Включён' : 'Выключен'} />
      </ProfileMetaCard>
    </ProfileScreenShell>
  );
}
