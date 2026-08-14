import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

import type { EarningsWeekDay } from '../lib/build-earnings-snapshot';
import { EarningsCard } from './earnings-card';
import { EarningsSectionHeader } from './earnings-section-header';

type EarningsWeekTallyProps = {
  days: EarningsWeekDay[];
  closedCount: number;
};

export function EarningsWeekTally({ days, closedCount }: EarningsWeekTallyProps) {
  const { colors } = useTheme();
  const hasAny = closedCount > 0;

  return (
    <View>
      <EarningsSectionHeader
        title="This week"
        meta={closedCount === 1 ? '1 closed' : `${closedCount} closed`}
      />
      <EarningsCard>
        <View
          style={{
            flexDirection: 'row',
            gap: tokens.space.micro,
            paddingHorizontal: tokens.space.stack,
            paddingVertical: tokens.space.stack + 2,
          }}
        >
          {days.map((day) => {
            const filled = day.count > 0;
            const bg = day.isToday
              ? filled
                ? colors.primarySubtle
                : toneBackground(colors.primary, 0.1)
              : filled
                ? toneBackground(colors.foreground, 0.06)
                : 'transparent';

            return (
              <View key={day.key} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: '100%',
                    maxWidth: 40,
                    aspectRatio: 1,
                    borderRadius: tokens.radius.control,
                    backgroundColor: bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    variant="headline"
                    style={{
                      fontVariant: ['tabular-nums'],
                      color: filled
                        ? day.isToday
                          ? colors.primaryOnSubtle
                          : colors.foreground
                        : colors.mutedForeground,
                    }}
                  >
                    {hasAny ? day.count : '·'}
                  </Text>
                </View>
                <Text
                  variant="caption2"
                  style={{
                    color: day.isToday ? colors.foreground : colors.mutedForeground,
                    fontWeight: day.isToday ? '600' : '500',
                  }}
                >
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>
      </EarningsCard>
    </View>
  );
}
