import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';
import { useMoneyFormatRevision } from '@/store/money-format-store';

import { fin, finFontCap, finType } from '../layout';
import { formatMoneyAdaptive, formatPercent } from '../lib/format';
import { toneForValue } from '../lib/tone';
import type { FinanceFlow, FinanceFlowNode, FinanceFlowNodeId } from '../types';
import { FinChevron, FinDivider, FinPressable, FinRail, FinSheet } from './fin-primitives';

/**
 * Segment shades. One hue per side, stepped down by weight — the reader learns
 * "blue is money in, graphite is money out" once, and no third colour is spent
 * on telling categories apart when position and label already do that.
 */
const RAMP = [1, 0.62, 0.4, 0.26, 0.18, 0.12];

/**
 * Costs are drawn from the foreground ink, which at full strength is pure
 * black in light mode — too heavy for a share bar. The side factor holds the
 * darkest cost segment below that.
 */
function rampColor(base: string, index: number, ceiling: number): string {
  return withAlpha(base, RAMP[Math.min(index, RAMP.length - 1)] * ceiling);
}

const FlowRow = memo(function FlowRow({
  node,
  color,
  onPress,
}: {
  node: FinanceFlowNode;
  color: string;
  onPress?: (id: FinanceFlowNodeId) => void;
}) {
  const { colors } = useTheme();
  useMoneyFormatRevision();

  return (
    <FinPressable
      onPress={onPress ? () => onPress(node.id) : undefined}
      haptic="light"
      accessibilityLabel={`${node.label}, ${formatMoneyAdaptive(node.amount)}, ${formatPercent(node.share, 0)} of the total`}
      accessibilityHint="Opens the operations in this category"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: fin.inline + 2,
        paddingHorizontal: fin.stack,
        paddingVertical: 11,
        minHeight: 48,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ ...finType.rowTitle, flex: 1 }} numberOfLines={1}>
        {node.label}
      </Text>
      <Text style={finType.caption} color="muted">
        {formatPercent(node.share, 0)}
      </Text>
      <Text
        style={{ ...finType.amount, color: colors.foreground, minWidth: 76, textAlign: 'right' }}
        maxFontSizeMultiplier={finFontCap.metric}
        numberOfLines={1}
      >
        {formatMoneyAdaptive(node.amount)}
      </Text>
      {onPress ? <FinChevron /> : null}
    </FinPressable>
  );
});

function FlowStage({
  title,
  total,
  nodes,
  base,
  ceiling,
  onNodePress,
}: {
  title: string;
  total: number;
  nodes: FinanceFlowNode[];
  base: string;
  ceiling: number;
  onNodePress?: (id: FinanceFlowNodeId) => void;
}) {
  const { colors } = useTheme();
  useMoneyFormatRevision();
  const segments = useMemo(
    () =>
      nodes.map((node, index) => ({
        id: node.id,
        share: node.share,
        color: rampColor(base, index, ceiling),
      })),
    [base, ceiling, nodes],
  );

  return (
    <View style={{ gap: fin.stack - 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingHorizontal: fin.micro,
        }}
      >
        <Text style={finType.label} color="muted">
          {title}
        </Text>
        <Text
          style={{ ...finType.metric, fontSize: 20, lineHeight: 25, color: colors.foreground }}
          maxFontSizeMultiplier={finFontCap.metric}
        >
          {formatMoneyAdaptive(total)}
        </Text>
      </View>

      <FinRail segments={segments} />

      {nodes.length > 0 ? (
        <FinSheet>
          {nodes.map((node, index) => (
            <View key={node.id}>
              {index > 0 ? <FinDivider inset={fin.stack + 16} /> : null}
              <FlowRow node={node} color={rampColor(base, index, ceiling)} onPress={onNodePress} />
            </View>
          ))}
        </FinSheet>
      ) : (
        <Text style={{ ...finType.rowMeta, paddingHorizontal: fin.micro }} color="muted">
          Nothing recorded in this period.
        </Text>
      )}
    </View>
  );
}

/** Thin connector — states that the block below is drawn from the block above. */
function FlowConnector({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.inline, paddingLeft: fin.micro }}>
      <View style={{ width: 1, height: 18, backgroundColor: withAlpha(colors.mutedForeground, 0.35) }} />
      <Text style={finType.caption} color="muted">
        {label}
      </Text>
    </View>
  );
}

export function FinMoneyFlow({
  flow,
  onNodePress,
}: {
  flow: FinanceFlow;
  onNodePress?: (id: FinanceFlowNodeId) => void;
}) {
  const { colors, isDark } = useTheme();
  const netTone = toneForValue(flow.net);
  // Dark mode draws costs from near-white ink, which outweighs the revenue
  // blue at the same strength; hold it lower so money-in stays the louder side.
  const costCeiling = isDark ? 0.55 : 0.72;

  return (
    <View style={{ gap: fin.block - 6 }}>
      <FlowStage
        title="Revenue in"
        total={flow.revenue}
        nodes={flow.channels}
        base={colors.primary}
        ceiling={1}
        onNodePress={onNodePress}
      />

      <FlowConnector label="minus what it cost to earn" />

      <FlowStage
        title="Costs out"
        total={flow.cost}
        nodes={flow.costs}
        base={colors.foreground}
        ceiling={costCeiling}
        onNodePress={onNodePress}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingTop: fin.stack,
          paddingHorizontal: fin.micro,
          borderTopWidth: fin.hairline,
          borderTopColor: colors.border,
        }}
      >
        <Text style={{ ...finType.rowTitle, fontWeight: '600' }}>Net profit</Text>
        <Text
          style={{
            ...finType.metric,
            color: netTone === 'negative' ? colors.danger : colors.foreground,
          }}
          maxFontSizeMultiplier={finFontCap.metric}
        >
          {formatMoneyAdaptive(flow.net)}
        </Text>
      </View>
    </View>
  );
}
