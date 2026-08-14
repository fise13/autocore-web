import { useMemo } from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen, ScreenScroll, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { operationCategoryLabel } from '@/lib/accounting/labels';

import { FinDetailHeader } from './components/fin-detail-header';
import {
  FinDelta,
  FinDivider,
  FinSection,
  FinShareGround,
  FinSheet,
} from './components/fin-primitives';
import { FinFullState } from './components/fin-states';
import { useFinanceModel, useWindowOperations } from './hooks/use-finance-model';
import { fin, finFontCap, finType } from './layout';
import {
  engineModelFromOperation,
  flowNodeLabel,
  isRevenueNode,
  operationContext,
} from './lib/classify';
import { operationsForNode } from './lib/flow';
import { formatCount, formatMoneyAdaptive, formatPercent, formatSignedPercent } from './lib/format';
import { formatWindowRange } from './lib/period';
import { relativeChange } from './lib/series';
import { deltaDirection, toneForValue } from './lib/tone';
import type { FinanceFlowNodeId } from './types';

const MAX_OPERATIONS = 30;

/**
 * A single channel, opened up.
 *
 * The point of this screen is the join: financial totals resolved back to the
 * AutoCore entities that produced them — an engine model, a work order, a
 * spend category — and then down to the individual records, so any figure on
 * the overview can be walked all the way to its source rows.
 */
export function FinanceFlowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { model, operations, workOrderNumbers } = useFinanceModel();
  const windowOperations = useWindowOperations(model, operations);

  const nodeId = id as FinanceFlowNodeId;
  const node = useMemo(
    () =>
      [...model.flow.channels, ...model.flow.costs].find((entry) => entry.id === nodeId) ?? null,
    [model.flow.channels, model.flow.costs, nodeId],
  );

  const nodeOperations = useMemo(
    () => operationsForNode(windowOperations, nodeId),
    [nodeId, windowOperations],
  );

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; amount: number; count: number }>();

    for (const { operation } of nodeOperations) {
      let label: string;
      if (nodeId === 'engines') {
        label = engineModelFromOperation(operation).label;
      } else if (nodeId === 'work_orders') {
        label = operation.relatedWorkOrderId
          ? `Order ${workOrderNumbers[operation.relatedWorkOrderId] ?? ''}`.trim()
          : 'Unlinked order income';
      } else {
        label = operationCategoryLabel(operation.category);
      }

      const entry = map.get(label) ?? { label, amount: 0, count: 0 };
      entry.amount += operation.amount;
      entry.count += 1;
      map.set(label, entry);
    }

    return [...map.values()].sort((left, right) => right.amount - left.amount);
  }, [nodeId, nodeOperations, workOrderNumbers]);

  if (!node) {
    return (
      <Screen>
        <FinDetailHeader title={flowNodeLabel(nodeId)} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <FinFullState
            title="Nothing in this category"
            description={`No ${flowNodeLabel(nodeId).toLowerCase()} were recorded in ${model.window.period.longLabel.toLowerCase()}.`}
          />
        </View>
      </Screen>
    );
  }

  const income = isRevenueNode(nodeId);
  const change = relativeChange(node.previous, node.amount);
  // For a cost line, growth is the unwelcome direction.
  const tone = toneForValue(change, income);
  const sideTotal = income ? model.flow.revenue : model.flow.cost;

  return (
    <Screen>
      <ScreenScroll tabBarInset topFade={false}>
        <FinDetailHeader
          title={node.label}
          subtitle={`${income ? 'Revenue channel' : 'Cost group'} · ${model.window.period.longLabel}`}
        />

        <View style={{ paddingHorizontal: fin.pad, gap: fin.chapter }}>
          <View style={{ gap: fin.stack }}>
            <View style={{ gap: fin.micro }}>
              <Text
                style={{ ...finType.hero, color: colors.foreground }}
                maxFontSizeMultiplier={finFontCap.hero}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatMoneyAdaptive(node.amount)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: fin.inline }}>
                {change != null ? (
                  <FinDelta
                    value={formatSignedPercent(change)}
                    tone={tone}
                    direction={deltaDirection(change)}
                  />
                ) : null}
                <Text style={finType.rowMeta} color="muted">
                  {change != null
                    ? model.window.period.comparisonLabel
                    : 'No comparable period yet'}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: fin.stack,
                paddingTop: fin.stack,
                borderTopWidth: fin.hairline,
                borderTopColor: colors.borderMuted,
              }}
            >
              <Stat
                label={income ? 'Share of revenue' : 'Share of costs'}
                value={formatPercent(sideTotal > 0 ? node.amount / sideTotal : null, 0)}
              />
              <Stat label="Operations" value={String(node.count)} />
              <Stat
                label="Average"
                value={node.count > 0 ? formatMoneyAdaptive(node.amount / node.count) : '—'}
              />
            </View>
          </View>

          {groups.length > 0 ? (
            <FinSection
              title={
                nodeId === 'engines'
                  ? 'By engine model'
                  : nodeId === 'work_orders'
                    ? 'By order'
                    : 'By category'
              }
              caption={`${formatCount(groups.length, 'group')} in ${formatWindowRange(model.window)}`}
            >
              <FinSheet>
                {groups.map((group, index) => (
                  <View key={group.label}>
                    {index > 0 ? <FinDivider /> : null}
                    <View style={{ overflow: 'hidden' }}>
                      <FinShareGround
                        share={node.amount > 0 ? group.amount / node.amount : 0}
                        color={income ? colors.primary : colors.foreground}
                      />
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: fin.stack,
                          paddingHorizontal: fin.stack,
                          paddingVertical: 13,
                        }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={finType.rowTitle} numberOfLines={1}>
                            {group.label}
                          </Text>
                          <Text style={finType.caption} color="muted">
                            {formatCount(group.count, 'operation')}
                          </Text>
                        </View>
                        <Text style={{ ...finType.amount, color: colors.foreground }}>
                          {formatMoneyAdaptive(group.amount)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </FinSheet>
            </FinSection>
          ) : null}

          <FinSection
            title="Records"
            caption={
              nodeOperations.length > MAX_OPERATIONS
                ? `Newest ${MAX_OPERATIONS} of ${nodeOperations.length}`
                : formatCount(nodeOperations.length, 'operation')
            }
          >
            <FinSheet>
              {nodeOperations.slice(0, MAX_OPERATIONS).map((entry, index) => (
                <View key={entry.operation.id}>
                  {index > 0 ? <FinDivider /> : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: fin.stack,
                      paddingHorizontal: fin.stack,
                      paddingVertical: 12,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={finType.rowTitle} numberOfLines={1}>
                        {operationContext(entry.operation, workOrderNumbers) ??
                          operationCategoryLabel(entry.operation.category)}
                      </Text>
                      <Text style={finType.caption} color="muted">
                        {format(entry.at, 'd MMM · HH:mm', { locale: enUS })}
                      </Text>
                    </View>
                    <Text
                      style={{
                        ...finType.amount,
                        color: income ? colors.success : colors.foreground,
                      }}
                    >
                      {income ? '+' : '−'}
                      {formatMoneyAdaptive(entry.operation.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </FinSheet>
          </FinSection>
        </View>
      </ScreenScroll>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={finType.caption} color="muted" numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={{ ...finType.amount, fontSize: 17, color: colors.foreground }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
