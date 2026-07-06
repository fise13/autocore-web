import { ScrollView, View } from 'react-native';

import { Chip } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { INVITE_STATUS_LABELS, type InviteStatus } from '@autocore/org';
import { rhythm, spacing } from '@/theme';

export type InviteStatusFilter = InviteStatus | 'all';

const INVITE_FILTER_OPTIONS: Array<{ value: InviteStatusFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  ...(Object.keys(INVITE_STATUS_LABELS) as InviteStatus[]).map((status) => ({
    value: status,
    label: INVITE_STATUS_LABELS[status],
  })),
];

type TeamInviteStatusFiltersProps = {
  value: InviteStatusFilter;
  onChange: (value: InviteStatusFilter) => void;
};

export function TeamInviteStatusFilters({ value, onChange }: TeamInviteStatusFiltersProps) {
  return (
    <View style={{ gap: spacing[1.5] }}>
      <Text variant="meta" color="muted" style={{ paddingHorizontal: 2 }}>
        Статус приглашения
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          gap: rhythm.tight,
          paddingVertical: 2,
          paddingRight: rhythm.pad,
        }}
      >
        {INVITE_FILTER_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
            style={{ flexShrink: 0 }}
          >
            {option.label}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
}
