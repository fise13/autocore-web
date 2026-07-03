import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { getWorkflowStages } from '../lib/workflow';
import { ordersLayout } from '../layout';
import type { OrderStatus } from '../types';

type OrderWorkflowProgressProps = {
  status: OrderStatus;
  compact?: boolean;
};

export function OrderWorkflowProgress({ status, compact = false }: OrderWorkflowProgressProps) {
  const { colors } = useTheme();
  const stages = getWorkflowStages(status);

  return (
    <View style={{ gap: compact ? 6 : 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          const dotColor = stage.done ? colors.primary : stage.current ? colors.warning : colors.border;
          const lineColor = stage.done ? colors.primary : colors.border;

          return (
            <View key={stage.id} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: ordersLayout.workflowDot,
                  height: ordersLayout.workflowDot,
                  borderRadius: ordersLayout.workflowDot / 2,
                  backgroundColor: dotColor,
                  borderWidth: stage.current && !stage.done ? 1.5 : 0,
                  borderColor: colors.warning,
                }}
              />
              {!isLast ? (
                <View style={{ flex: 1, height: 1.5, backgroundColor: lineColor, marginHorizontal: 2 }} />
              ) : null}
            </View>
          );
        })}
      </View>
      {!compact ? (
        <View style={{ flexDirection: 'row' }}>
          {stages.map((stage, index) => (
            <View key={stage.id} style={{ flex: 1 }}>
              <Text
                variant="caption"
                color={stage.current ? undefined : 'muted'}
                style={{
                  fontSize: 9,
                  fontWeight: stage.current ? '600' : '500',
                  textAlign: indexCenter(index, stages.length),
                  color: stage.current ? colors.foreground : undefined,
                }}
                numberOfLines={1}
              >
                {stage.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function indexCenter(index: number, total: number): 'left' | 'center' | 'right' {
  if (index === 0) return 'left';
  if (index === total - 1) return 'right';
  return 'center';
}
