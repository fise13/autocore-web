import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin, finFontCap, finType } from '../layout';
import { formatSignedMoney } from '../lib/format';
import { toneColor, toneForValue } from '../lib/tone';
import type { FinanceActivityDay, FinanceActivityEntry } from '../types';
import { FinPressable } from './fin-primitives';

/**
 * Activity as a timeline, not a transactions table.
 *
 * The time column is the spine, the day header carries the day's net, and each
 * entry names the entity the money moved through — an engine, an order, a
 * client — so the reader sees the business, not the bookkeeping.
 */
const ActivityRow = memo(function ActivityRow({
  entry,
  onPress,
}: {
  entry: FinanceActivityEntry;
  onPress?: (entry: FinanceActivityEntry) => void;
}) {
  const { colors } = useTheme();
  const incoming = entry.direction === 'in';

  return (
    <FinPressable
      onPress={onPress ? () => onPress(entry) : undefined}
      haptic="light"
      accessibilityLabel={`${entry.title}, ${formatSignedMoney(entry.amount, entry.direction)} at ${entry.time}`}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: fin.stack - 4,
        paddingVertical: 10,
        borderRadius: fin.rowRadius,
      }}
    >
      <Text
        style={{ ...finType.caption, fontVariant: ['tabular-nums'], width: 42, paddingTop: 2 }}
        color="muted"
      >
        {entry.time}
      </Text>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={finType.rowTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        {entry.context ? (
          <Text style={finType.caption} color="muted" numberOfLines={1}>
            {entry.context}
          </Text>
        ) : null}
      </View>

      <Text
        style={{
          ...finType.amount,
          color: incoming ? colors.success : colors.foreground,
        }}
        maxFontSizeMultiplier={finFontCap.metric}
        numberOfLines={1}
      >
        {formatSignedMoney(entry.amount, entry.direction)}
      </Text>
    </FinPressable>
  );
});

export function FinActivity({
  days,
  onEntryPress,
}: {
  days: FinanceActivityDay[];
  onEntryPress?: (entry: FinanceActivityEntry) => void;
}) {
  const { colors } = useTheme();

  if (days.length === 0) {
    return (
      <Text style={finType.rowMeta} color="muted">
        No money moved in this period.
      </Text>
    );
  }

  return (
    <View style={{ gap: fin.block - 8 }}>
      {days.map((day) => (
        <View key={day.key} style={{ gap: fin.micro }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              paddingBottom: fin.tight,
              borderBottomWidth: fin.hairline,
              borderBottomColor: colors.borderMuted,
            }}
          >
            <Text style={{ ...finType.label, color: colors.foreground }}>{day.label}</Text>
            <Text
              style={{
                ...finType.caption,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                color: toneColor(toneForValue(day.net), colors),
              }}
            >
              {formatSignedMoney(day.net)}
            </Text>
          </View>

          {day.entries.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} onPress={onEntryPress} />
          ))}
        </View>
      ))}
    </View>
  );
}
