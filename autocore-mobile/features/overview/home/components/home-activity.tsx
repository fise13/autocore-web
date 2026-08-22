import { memo, useCallback, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { HOME_ACTIVITY_COLLAPSED } from '../lib/activity';
import type { HomeActivityRow } from '../types';
import { home, HomeChevron, HomeDivider, HomeRow, HomeSection, HomeSurface } from './home-primitives';

const ActivityRow = memo(function ActivityRow({
  row,
  onPress,
}: {
  row: HomeActivityRow;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const statusColor =
    row.statusTone === 'warning'
      ? colors.warning
      : row.statusTone === 'success'
        ? colors.success
        : colors.mutedForeground;

  return (
    <HomeRow
      accessibilityLabel={`${row.title}, ${row.detail}, ${row.statusLabel}, ${row.timeLabel}`}
      accessibilityHint="Opens the work order"
      onPress={onPress}
      style={{ paddingHorizontal: home.rowPadX, paddingVertical: home.rowPadY }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.stack }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: home.inline,
            }}
          >
            <Text variant="callout" numberOfLines={1} style={{ fontWeight: '500', flexShrink: 1 }}>
              {row.title}
            </Text>
            <Text
              variant="caption1"
              color="muted"
              numberOfLines={1}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {row.timeLabel}
            </Text>
          </View>
          <Text variant="footnote" color="muted" numberOfLines={1}>
            {row.detail}
            <Text variant="footnote" style={{ color: statusColor }}>
              {'  ·  '}
              {row.statusLabel}
            </Text>
          </Text>
        </View>
        <HomeChevron />
      </View>
    </HomeRow>
  );
});

/**
 * Recent activity — the safety net when the Summary is sparse.
 *
 * Deliberately the lightest section on the screen: three rows, an expand at the
 * bottom of the same surface, and nothing that pretends to be a feed.
 */
export const HomeActivity = memo(function HomeActivity({
  rows,
  onOpen,
  onOpenWork,
}: {
  rows: HomeActivityRow[];
  onOpen: (row: HomeActivityRow) => void;
  onOpenWork: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const handleOpen = useCallback((row: HomeActivityRow) => () => onOpen(row), [onOpen]);

  const toggle = useCallback(() => {
    haptics.light();
    setExpanded((value) => !value);
  }, []);

  if (rows.length === 0) {
    return (
      <HomeSection title="Recent activity">
        <HomeSurface padded style={{ gap: home.micro }}>
          <Text variant="footnote" color="muted">
            No recent activity.
          </Text>
          <Text
            variant="footnote"
            color="accent"
            style={{ fontWeight: '500' }}
            accessibilityRole="link"
            onPress={onOpenWork}
          >
            Open Work
          </Text>
        </HomeSurface>
      </HomeSection>
    );
  }

  const canExpand = rows.length > HOME_ACTIVITY_COLLAPSED;
  const visible = expanded ? rows : rows.slice(0, HOME_ACTIVITY_COLLAPSED);

  return (
    <HomeSection title="Recent activity">
      <HomeSurface>
        {visible.map((row, index) => (
          <View key={row.id}>
            {index > 0 ? <HomeDivider /> : null}
            <ActivityRow row={row} onPress={handleOpen(row)} />
          </View>
        ))}

        {canExpand ? (
          <View>
            <HomeDivider inset={0} />
            <HomeRow
              accessibilityLabel={expanded ? 'Show fewer events' : `Show all ${rows.length} events`}
              onPress={toggle}
              style={{ paddingHorizontal: home.rowPadX, paddingVertical: home.rowPadY }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="callout" color="accent" style={{ fontWeight: '500' }}>
                  {expanded ? 'Show less' : `Show all ${rows.length}`}
                </Text>
                {expanded ? null : <HomeChevron />}
              </View>
            </HomeRow>
          </View>
        ) : null}
      </HomeSurface>
    </HomeSection>
  );
});
