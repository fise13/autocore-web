import { View } from 'react-native';

import { HorizontalFilterBar, SegmentedControl } from '@/components/ui';
import { Text } from '@/components/ui/text';
import {
  APP_CATEGORY_LABELS,
  APP_NOTIFICATION_CATEGORIES,
  type AppNotificationCategory,
} from '@/services/notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { spacing } from '@/theme';

const READ_FILTERS = [
  { id: 'all' as const, label: 'Все' },
  { id: 'unread' as const, label: 'Новые' },
  { id: 'read' as const, label: 'Прочитанные' },
];

const CATEGORY_OPTIONS = [
  { value: 'all' as const, label: 'Все' },
  ...APP_NOTIFICATION_CATEGORIES.map((category) => ({
    value: category,
    label: APP_CATEGORY_LABELS[category],
  })),
];

type ActivityFeedFiltersProps = {
  onCategoryChange?: (category: AppNotificationCategory | 'all') => void;
  onReadFilterChange?: (filter: 'all' | 'unread' | 'read') => void;
};

export function ActivityFeedFilters({
  onCategoryChange,
  onReadFilterChange,
}: ActivityFeedFiltersProps) {
  const categoryFilter = useNotificationStore((s) => s.categoryFilter);
  const readFilter = useNotificationStore((s) => s.readFilter);

  return (
    <View style={{ gap: spacing[3] }}>
      <View style={{ gap: spacing[1.5] }}>
        <Text variant="meta" color="muted" style={{ paddingHorizontal: 2 }}>
          Категория
        </Text>
        <HorizontalFilterBar
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(value) => onCategoryChange?.(value)}
        />
      </View>

      <View style={{ gap: spacing[1.5] }}>
        <Text variant="meta" color="muted" style={{ paddingHorizontal: 2 }}>
          Статус
        </Text>
        <SegmentedControl
          segments={READ_FILTERS.map((filter) => ({
            value: filter.id,
            label: filter.label,
          }))}
          value={readFilter}
          onValueChange={(value) => onReadFilterChange?.(value as 'all' | 'unread' | 'read')}
        />
      </View>
    </View>
  );
}
