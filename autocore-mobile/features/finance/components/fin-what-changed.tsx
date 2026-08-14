import { memo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

import { fin, finFontCap, finType } from '../layout';
import { formatMoneyAdaptive, formatSignedMoney } from '../lib/format';
import { toneColor, toneForValue } from '../lib/tone';
import type { FinanceChange, FinanceDriver, FinanceFlowNodeId } from '../types';
import { FinPressable } from './fin-primitives';

const VISIBLE_BY_DEFAULT = 3;

/**
 * Causality, stated exactly.
 *
 * Each driver is the signed movement of one flow node, and the drivers sum to
 * the profit delta to the cent — so the bars are a decomposition, not an
 * attribution guess. The track is scaled to the largest single mover, which
 * makes the dominant cause obvious without printing a second set of numbers.
 */
const DriverRow = memo(function DriverRow({
  driver,
  maxMagnitude,
  onPress,
}: {
  driver: FinanceDriver;
  maxMagnitude: number;
  onPress?: (id: FinanceFlowNodeId) => void;
}) {
  const { colors } = useTheme();
  const tone = toneForValue(driver.contribution);
  const color = toneColor(tone, colors);
  const share = maxMagnitude > 0 ? Math.abs(driver.contribution) / maxMagnitude : 0;
  const navigable = driver.id !== 'other_movements' && Boolean(onPress);

  const body = (
    <View style={{ gap: fin.tight, paddingVertical: fin.tight }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: fin.stack,
        }}
      >
        <Text style={finType.rowTitle} numberOfLines={1}>
          {driver.label}
        </Text>
        <Text
          style={{ ...finType.amount, color }}
          maxFontSizeMultiplier={finFontCap.metric}
          numberOfLines={1}
        >
          {formatSignedMoney(driver.contribution)}
        </Text>
      </View>

      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: withAlpha(colors.mutedForeground, 0.12),
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.max(2, share * 100)}%`,
            height: '100%',
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>

      {driver.current > 0 || driver.previous > 0 ? (
        <Text style={finType.caption} color="muted" numberOfLines={1}>
          {driver.kind === 'income' ? 'Revenue' : 'Spend'} {formatMoneyAdaptive(driver.previous)} →{' '}
          {formatMoneyAdaptive(driver.current)}
        </Text>
      ) : null}
    </View>
  );

  if (!navigable) return body;

  return (
    <FinPressable
      onPress={() => onPress?.(driver.id as FinanceFlowNodeId)}
      haptic="light"
      accessibilityLabel={`${driver.label}, ${formatSignedMoney(driver.contribution)}`}
      accessibilityHint="Opens the operations behind this movement"
      style={{ borderRadius: fin.rowRadius }}
    >
      {body}
    </FinPressable>
  );
});

export function FinWhatChanged({
  change,
  headline,
  comparisonLabel,
  onDriverPress,
}: {
  change: FinanceChange;
  headline: string;
  comparisonLabel: string;
  onDriverPress?: (id: FinanceFlowNodeId) => void;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  if (change.noBaseline) {
    return (
      <Text style={finType.rowMeta} color="muted">
        No comparable period yet — once a second period of operations exists, this section explains
        every dollar of the difference.
      </Text>
    );
  }

  if (change.drivers.length === 0) {
    return (
      <Text style={finType.rowMeta} color="muted">
        Nothing moved materially {comparisonLabel}.
      </Text>
    );
  }

  const maxMagnitude = Math.max(...change.drivers.map((driver) => Math.abs(driver.contribution)));
  const visible = expanded ? change.drivers : change.drivers.slice(0, VISIBLE_BY_DEFAULT);
  const hidden = change.drivers.length - visible.length;
  const tone = toneForValue(change.delta);

  return (
    <View style={{ gap: fin.stack }}>
      <Text style={{ ...finType.rowTitle, fontSize: 17, lineHeight: 23 }}>
        <Text style={{ ...finType.rowTitle, fontSize: 17, lineHeight: 23, fontWeight: '600', color: toneColor(tone, colors) }}>
          {headline}
        </Text>
        <Text style={{ ...finType.rowTitle, fontSize: 17, lineHeight: 23 }} color="muted">
          {` ${comparisonLabel}.`}
        </Text>
      </Text>

      <View style={{ gap: fin.tight }}>
        {visible.map((driver, index) => (
          <Animated.View
            key={driver.id}
            entering={reduced || index < VISIBLE_BY_DEFAULT ? undefined : FadeIn.duration(180)}
          >
            <DriverRow driver={driver} maxMagnitude={maxMagnitude} onPress={onDriverPress} />
          </Animated.View>
        ))}
      </View>

      {hidden > 0 || expanded ? (
        <FinPressable
          onPress={() => setExpanded((current) => !current)}
          haptic="light"
          accessibilityLabel={expanded ? 'Show fewer drivers' : `Show ${hidden} more drivers`}
          style={{ alignSelf: 'flex-start', paddingVertical: fin.micro }}
        >
          <Text style={{ ...finType.label, color: colors.primary }}>
            {expanded ? 'Show less' : `Show ${hidden} more`}
          </Text>
        </FinPressable>
      ) : null}
    </View>
  );
}
