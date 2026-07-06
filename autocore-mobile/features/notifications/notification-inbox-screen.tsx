import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AlertTriangleIcon, BellIcon } from '@/assets/icons';
import { Badge, Button, EmptyState, SearchInput, Text } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useTheme } from '@/hooks';
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
  const { colors } = useTheme();
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

  const handleDelete = useCallback((id: string) => {
    void NotificationService.delete(id);
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
      <View style={{ gap: spacing[4] }}>
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
          <Pressable
            onPress={() => void handleRefresh()}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing[3],
              padding: spacing[3],
              borderRadius: rhythm.cardRadius,
              borderWidth: rhythm.hairline,
              borderColor: `${colors.destructive}33`,
              backgroundColor: `${colors.destructive}12`,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: rhythm.radius,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${colors.destructive}1F`,
              }}
            >
              <AlertTriangleIcon size="sm" color={colors.destructive} />
            </View>
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Text variant="bodyStrong">Не удалось загрузить</Text>
              <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
                {error}
              </Text>
              <Text
                variant="caption"
                style={{ color: colors.destructive, fontWeight: '600', marginTop: spacing[1] }}
              >
                Нажмите, чтобы повторить
              </Text>
            </View>
          </Pressable>
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
          <ActivityDateGroup
            key={group.key}
            label={group.label}
            items={group.items}
            onPress={handlePress}
            onDelete={handleDelete}
          />
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
