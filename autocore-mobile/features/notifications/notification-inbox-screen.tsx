import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { BellIcon, SearchIcon } from '@/assets/icons';
import { Button, EmptyState, SearchInput, SettingsSectionCard, Text } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks';
import { NotificationService } from '@/services/notifications';
import type { AppNotification } from '@/services/notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { duration, haptics, rhythm, spacing } from '@/theme';

import { ActivityDateGroup } from './components/activity-date-group';
import { ActivityFeedFilters } from './components/activity-feed-filters';
import { NotificationInboxSkeleton } from './components/notification-row-skeleton';
import { groupNotificationsByDate } from './lib/group-by-date';
import { resolveNotificationInboxReturnHref } from '@/lib/navigation/open-notification-inbox';

export function NotificationInboxScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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

  const filtersActive =
    categoryFilter !== 'all' || readFilter !== 'all' || searchQuery.trim().length > 0;

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

  const handleMarkRead = useCallback((item: AppNotification) => {
    void NotificationService.markRead(item.id);
  }, []);

  const handleDelete = useCallback((item: AppNotification) => {
    void NotificationService.delete(item.id);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    haptics.success();
    void NotificationService.markAllRead();
  }, []);

  const handleSearch = useCallback((text: string) => {
    setLocalSearch(text);
    NotificationService.setSearchQuery(text);
  }, []);

  const clearFilters = useCallback(() => {
    haptics.selection();
    setLocalSearch('');
    NotificationService.setSearchQuery('');
    NotificationService.setCategoryFilter('all');
    NotificationService.setReadFilter('all');
  }, []);

  const subtitle =
    syncing || refreshing
      ? 'Syncing…'
      : unreadCount > 0
        ? `${unreadCount} unread`
        : 'All caught up';

  const showSkeleton = loading && filteredItems.length === 0 && !error;
  const showEmpty = !loading && filteredItems.length === 0 && !error;

  return (
    <ProfileScreenShell
      title="Activity"
      subtitle={subtitle}
      backFallbackHref={backFallbackHref}
      onBack={() => {
        // Same-stack opens (Settings → Activity): prefer pop.
        // Cross-tab opens (Home/Orders/… → Activity): history can't restore the prior tab,
        // so replace to the returnTo target encoded when the inbox was opened.
        const sameStackReturn =
          !returnTo || returnTo === 'hub' || returnTo === 'notifications';
        if (sameStackReturn && router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(backFallbackHref);
      }}
      headerAction={
        unreadCount > 0 ? (
          <Animated.View entering={FadeIn.duration(duration.fast)} exiting={FadeOut.duration(duration.instant)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications read"
              onPress={handleMarkAllRead}
              hitSlop={8}
              style={({ pressed }) => ({
                paddingHorizontal: spacing[2.5],
                paddingVertical: spacing[1.5],
                borderRadius: 999,
                backgroundColor: pressed ? colors.muted : 'transparent',
              })}
            >
              <Text variant="caption" style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                Mark all read
              </Text>
            </Pressable>
          </Animated.View>
        ) : null
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
      }
    >
      <View style={{ gap: rhythm.stack }}>
        <Animated.View entering={FadeIn.duration(duration.normal)}>
          <SearchInput
            value={localSearch}
            onChangeText={handleSearch}
            placeholder="Search activity…"
          />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(duration.normal).delay(40)}>
          <ActivityFeedFilters
            items={storeItems}
            onCategoryChange={(c) => NotificationService.setCategoryFilter(c)}
            onReadFilterChange={(f) => NotificationService.setReadFilter(f)}
          />
        </Animated.View>

        {error ? (
          <SettingsSectionCard title="Couldn't load" tone="danger" inset>
            <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.tight }}>
              <Text variant="caption" color="muted">
                {error}
              </Text>
              <Button variant="secondary" size="sm" onPress={() => void handleRefresh()}>
                Retry
              </Button>
            </View>
          </SettingsSectionCard>
        ) : null}

        {showSkeleton ? <NotificationInboxSkeleton /> : null}

        {showEmpty && filtersActive ? (
          <EmptyState
            icon={SearchIcon}
            title="Nothing matches"
            description="No activity matches the current search and filters."
            primaryAction={{ label: 'Clear filters', onPress: clearFilters }}
          />
        ) : null}

        {showEmpty && !filtersActive ? (
          <EmptyState
            icon={BellIcon}
            title="No activity yet"
            description={
              canManageTeam
                ? 'Events show up here as they happen. If team members joined earlier, you can restore their notification history.'
                : 'Work order, billing, team, and document events will show up here.'
            }
            primaryAction={{ label: 'Refresh', onPress: () => void handleRefresh() }}
            secondaryAction={
              canManageTeam
                ? {
                    label: backfilling ? 'Restoring…' : 'Restore team history',
                    onPress: () => void handleBackfillTeam(),
                  }
                : undefined
            }
          />
        ) : null}

        <Animated.View layout={LinearTransition.duration(260)} style={{ gap: rhythm.stack }}>
          {groups.map((group) => (
            <ActivityDateGroup
              key={group.key}
              label={group.label}
              items={group.items}
              onPress={handlePress}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}
        </Animated.View>

        {hasMore ? (
          <Button variant="secondary" size="sm" onPress={() => NotificationService.loadMore()}>
            Load more
          </Button>
        ) : null}

        {filteredItems.length > 0 ? (
          <Text
            variant="caption"
            color="muted"
            style={{ fontSize: 12, textAlign: 'center', paddingTop: spacing[1] }}
          >
            Swipe a row to mark it read or remove it
          </Text>
        ) : null}
      </View>
    </ProfileScreenShell>
  );
}
