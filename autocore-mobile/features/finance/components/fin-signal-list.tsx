import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

import { fin, finType } from '../layout';
import { bandTone, toneColor } from '../lib/tone';
import type { FinanceSignal } from '../types';
import { FinDivider, FinSheet } from './fin-primitives';

/**
 * The signals behind the index, each with its own measurement.
 *
 * A signal with no inputs shows an empty track and names the record that is
 * missing — it is never given a neutral 50 to keep the composite tidy, because
 * that would quietly invent a reading.
 */
function SignalRow({ signal }: { signal: FinanceSignal }) {
  const { colors } = useTheme();
  const available = signal.score != null;
  const color = available ? toneColor(bandTone(signal.score), colors) : colors.mutedForeground;

  return (
    <View style={{ gap: fin.tight, paddingHorizontal: fin.stack, paddingVertical: fin.stack - 2 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: fin.stack,
        }}
      >
        <Text style={{ ...finType.rowTitle, opacity: available ? 1 : 0.6 }} numberOfLines={1}>
          {signal.label}
        </Text>
        <Text
          style={{
            ...finType.amount,
            fontSize: 15,
            color: available ? colors.foreground : colors.mutedForeground,
          }}
          numberOfLines={1}
        >
          {signal.readout}
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
        {available ? (
          <View
            style={{
              width: `${Math.max(2, signal.score ?? 0)}%`,
              height: '100%',
              borderRadius: 2,
              backgroundColor: color,
            }}
          />
        ) : null}
      </View>

      <Text style={finType.caption} color="muted">
        {signal.missing ?? signal.meaning}
      </Text>

      <Text style={{ ...finType.caption, opacity: 0.7 }} color="muted">
        {available ? `${signal.score} / 100 · weight ${signal.weight}` : 'Excluded from the score'}
      </Text>
    </View>
  );
}

export function FinSignalList({ signals }: { signals: FinanceSignal[] }) {
  return (
    <FinSheet>
      {signals.map((signal, index) => (
        <View key={signal.id}>
          {index > 0 ? <FinDivider /> : null}
          <SignalRow signal={signal} />
        </View>
      ))}
    </FinSheet>
  );
}
