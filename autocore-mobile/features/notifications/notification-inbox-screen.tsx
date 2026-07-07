import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { BellIcon } from '@/assets/icons';
import { Badge, Button, EmptyState, SearchInput, SettingsSectionCard, Text } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useSession } from '@/hooks/use-session';
import { NotificationService } from '@/services/notifications';
import type { AppNotification } from '@/services/notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { rhythm, spacing } from '@/theme';

import { ActivityDateGroup } from './components/activity-date-group';
import { ActivityFeedFilters } from './components/activity-feed-filters';
import { NotificationInboxSkeleton } from './components/notification-row-skeleton';
import { groupNotificationsByDate } from './lib/group-by-date';
import { resolveNotificationInboxReturnHref } from '@/lib/navigation/open-notification-inbox';

export function NotificationInboxScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const backFallbackHref = useMemo(
    () => resolveNotificationInboxReturnHref(returnTo),
    [returnTo],
  );
  const { can } = useSession();
  const canManageTeam = can('employee_manage');
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loading = useNotificationStore((s) => s.loading);
  const syncing = useNotificationStore((s) => s.syncing);
  const error = useNotificationStore((s) => s.error);
  const hasMore = useNotificationStore((s) => s.hasMore);
  const categoryFilter = useNotificationStore((s) => s.categoryFilter);
  const readFilter = useNotificationStore((s) => s.readFilter);
  const searchQuery = useNotificationStore((s) => s.searchQuery);
  const storeItems = useNotificationStore((s) => s.items);

  const [refreshing, setRefreshing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const filteredItems = useMemo(
    () => NotificationService.getFilteredItems(),
    [categoryFilter, readFilter, searchQuery, storeItems],
  );

  const groups = useMemo(() => groupNotificationsByDate(filteredItems), [filteredItems]);

  const handleBackfillTeam = useCallback(async () => {
    setBackfilling(true);
    try {
      await NotificationService.backfillTeamHistory();
    } finally {
      setBackfilling(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await NotificationService.syncInbox();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void NotificationService.syncInbox();
    }, []),
  );

  const handlePress = useCallback((item: AppNotification) => {
    NotificationService.open(item);
  }, []);

  const handleSearch = useCallback((text: string) => {
    setLocalSearch(text);
    NotificationService.setSearchQuery(text);
  }, []);

  const subtitle =
    syncing || refreshing
      ? 'Синхронизация…'
      : unreadCount > 0
        ? `${unreadCount} непрочитанных`
        : 'Все прочитано';

  const showSkeleton = loading && filteredItems.length === 0 && !error;
  const showEmpty = !loading && filteredItems.length === 0 && !error;

  return (
    <ProfileScreenShell
      title="Центр активности"
      subtitle={subtitle}
      backFallbackHref={backFallbackHref}
      onBack={() => router.replace(backFallbackHref)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
      }
    >
      <View style={{ gap: rhythm.stack }}>
        <SearchInput
          value={localSearch}
          onChangeText={handleSearch}
          placeholder="Поиск уведомлений…"
        />

        <ActivityFeedFilters
          onCategoryChange={(c) => NotificationService.setCategoryFilter(c)}
          onReadFilterChange={(f) => NotificationService.setReadFilter(f)}
        />

        {unreadCount > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Badge variant="secondary">{`${unreadCount} новых`}</Badge>
            <Button variant="ghost" size="sm" onPress={() => void NotificationService.markAllRead()}>
              Прочитать все
            </Button>
          </View>
        ) : null}

        {error ? (
          <SettingsSectionCard title="Не удалось загрузить" tone="danger" inset>
            <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.tight }}>
              <Text variant="caption" color="muted">
                {error}
              </Text>
              <Button variant="secondary" size="sm" onPress={() => void handleRefresh()}>
                Повторить
              </Button>
            </View>
          </SettingsSectionCard>
        ) : null}

        {showSkeleton ? <NotificationInboxSkeleton /> : null}

        {showEmpty ? (
          <EmptyState
            icon={BellIcon}
            title="Нет уведомлений"
            description={
              canManageTeam
                ? 'События появляются в момент действия. Если сотрудники присоединились раньше, восстановите уведомления о команде.'
                : 'Здесь появятся события по нарядам, финансам, команде и документам.'
            }
            primaryAction={{ label: 'Обновить', onPress: () => void handleRefresh() }}
            secondaryAction={
              canManageTeam
                ? {
                    label: backfilling ? 'Восстановление…' : 'Восстановить команду',
                    onPress: () => void handleBackfillTeam(),
                  }
                : undefined
            }
          />
        ) : null}

        {groups.map((group) => (
          <View key={group.key} style={{ marginBottom: spacing[1] }}>
            <ActivityDateGroup label={group.label} items={group.items} onPress={handlePress} />
          </View>
        ))}

        {hasMore ? (
          <Button variant="secondary" size="sm" onPress={() => NotificationService.loadMore()}>
            Загрузить ещё
          </Button>
        ) : null}
      </View>
    </ProfileScreenShell>
  );
}
