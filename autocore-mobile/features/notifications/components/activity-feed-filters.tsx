import { useMemo } from 'react';
import { View } from 'react-native';

import { HorizontalFilterBar, SegmentedControl } from '@/components/ui';
import {
  APP_CATEGORY_LABELS,
  APP_NOTIFICATION_CATEGORIES,
  type AppNotification,
  type AppNotificationCategory,
} from '@/services/notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { spacing } from '@/theme';

const READ_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'New' },
  { value: 'read', label: 'Read' },
];

type ActivityFeedFiltersProps = {
  /** Everything in the inbox, before filtering — drives which chips are useful. */
  items: AppNotification[];
  onCategoryChange?: (category: AppNotificationCategory | 'all') => void;
  onReadFilterChange?: (filter: 'all' | 'unread' | 'read') => void;
};

/**
 * Status and category in a single compact block.
 *
 * Categories with nothing in them are hidden rather than offered as dead ends,
 * and each chip carries its unread count, so the bar answers "where is the new
 * stuff?" without any tapping.
 */
export function ActivityFeedFilters({
  items,
  onCategoryChange,
  onReadFilterChange,
}: ActivityFeedFiltersProps) {
  const categoryFilter = useNotificationStore((s) => s.categoryFilter);
  const readFilter = useNotificationStore((s) => s.readFilter);

  const categoryOptions = useMemo(() => {
    const totalUnread = items.reduce((count, item) => count + (item.read ? 0 : 1), 0);

    const options: Array<{ value: AppNotificationCategory | 'all'; label: string }> = [
      { value: 'all', label: totalUnread > 0 ? `All · ${totalUnread}` : 'All' },
    ];

    for (const category of APP_NOTIFICATION_CATEGORIES) {
      const inCategory = items.filter((item) => item.category === category);
      // Keep the active chip visible even when the current filter empties it.
      if (inCategory.length === 0 && categoryFilter !== category) continue;

      const unread = inCategory.reduce((count, item) => count + (item.read ? 0 : 1), 0);
      const label = APP_CATEGORY_LABELS[category];
      options.push({ value: category, label: unread > 0 ? `${label} · ${unread}` : label });
    }

    return options;
  }, [categoryFilter, items]);

  return (
    <View style={{ gap: spacing[2.5] }}>
      <SegmentedControl
        accessibilityLabel="Filter by status"
        segments={READ_FILTERS}
        value={readFilter}
        onValueChange={(value) => onReadFilterChange?.(value as 'all' | 'unread' | 'read')}
      />

      {categoryOptions.length > 1 ? (
        <HorizontalFilterBar
          options={categoryOptions}
          value={categoryFilter}
          onChange={(value) => onCategoryChange?.(value)}
        />
      ) : null}
    </View>
  );
}
