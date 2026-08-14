import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

import { fin, finFontCap, finType } from '../layout';
import { healthCoverageLabel, healthUnavailableReason } from '../lib/health';
import { formatSignedPoints } from '../lib/format';
import { bandTone, toneColor } from '../lib/tone';
import type { FinanceHealth } from '../types';
import { FinChevron, FinPressable } from './fin-primitives';

/** Band boundaries from `healthBand` — the rail marks the same thresholds. */
const BAND_TICKS = [35, 55, 70, 85];

/**
 * The index rail.
 *
 * Deliberately not a ring: a ring implies a goal you close, and this is a
 * position on a scale. The filled length is the score, the ticks are the band
 * boundaries the score is judged against, so the reader can see how much room
 * there is on either side of where the business currently sits.
 */
function HealthRail({ score, color }: { score: number; color: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ height: 10, justifyContent: 'center' }}>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: withAlpha(colors.mutedForeground, 0.16),
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.min(100, Math.max(2, score))}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 2, height: 6 }}>
        {BAND_TICKS.map((tick) => (
          <View
            key={tick}
            style={{
              position: 'absolute',
              left: `${tick}%`,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: withAlpha(colors.background, 0.55),
            }}
          />
        ))}
      </View>
    </View>
  );
}

export const FinHealth = memo(function FinHealth({
  health,
  comparisonLabel,
  onPress,
}: {
  health: FinanceHealth;
  comparisonLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tone = bandTone(health.score);
  const color = toneColor(tone, colors);

  return (
    <FinPressable
      onPress={onPress}
      haptic="light"
      accessibilityLabel={
        health.score == null
          ? 'Financial health, not enough data'
          : `Financial health ${health.score}, ${health.bandLabel}`
      }
      accessibilityHint="Opens the signals behind the score"
      style={{ borderRadius: fin.sheetRadius, paddingVertical: fin.micro }}
    >
      <View style={{ gap: fin.stack }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={finType.label} color="muted">
            Financial health
          </Text>
          <FinChevron />
        </View>

        {health.score == null ? (
          <View style={{ gap: fin.micro }}>
            <Text style={{ ...finType.metric, color: colors.mutedForeground }}>
              Not enough signal
            </Text>
            <Text style={finType.rowMeta} color="muted">
              {healthUnavailableReason(health)}
            </Text>
          </View>
        ) : (
          <View style={{ gap: fin.stack }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: fin.stack }}>
              <Text
                style={{ ...finType.score, color: colors.foreground }}
                maxFontSizeMultiplier={finFontCap.hero}
                accessibilityElementsHidden
              >
                {health.score}
              </Text>
              <View style={{ flex: 1, gap: 2, paddingBottom: 8 }}>
                <Text style={{ ...finType.rowTitle, fontWeight: '600', color }}>
                  {health.bandLabel}
                </Text>
                <Text style={finType.rowMeta} color="muted">
                  {health.delta == null
                    ? 'No comparable period yet'
                    : health.delta === 0
                      ? `Unchanged ${comparisonLabel}`
                      : `${formatSignedPoints(health.delta)} pts ${comparisonLabel}`}
                </Text>
              </View>
            </View>

            <HealthRail score={health.score} color={color} />

            <Text style={finType.caption} color="muted">
              {healthCoverageLabel(health)}
            </Text>
          </View>
        )}
      </View>
    </FinPressable>
  );
});
