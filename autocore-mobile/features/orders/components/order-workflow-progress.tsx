import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { getWorkflowStages } from '../lib/workflow';
import { resolveStatusInk } from '../lib/status';
import { woType } from '../theme/wo-visual';
import type { OrderStatus } from '../types';

type OrderWorkflowProgressProps = {
  status: OrderStatus;
  compact?: boolean;
};

/**
 * Segmented workflow track. Six stage names at 9pt were unreadable, so the
 * segments carry the position and a single caption names where the order is.
 */
export function OrderWorkflowProgress({ status, compact = false }: OrderWorkflowProgressProps) {
  const { colors } = useTheme();
  const stages = getWorkflowStages(status);
  const ink = resolveStatusInk(colors, status);
  const currentIndex = stages.findIndex((stage) => stage.current);
  const doneCount = stages.filter((stage) => stage.done).length;
  const step = currentIndex >= 0 ? currentIndex + 1 : doneCount;

  return (
    <View style={{ gap: compact ? 6 : 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {stages.map((stage) => {
          const filled = stage.done || stage.current;
          return (
            <View
              key={stage.id}
              style={{
                flex: 1,
                height: compact ? 3 : 4,
                borderRadius: 2,
                backgroundColor: filled ? ink.solid : colors.border,
                opacity: stage.current ? 1 : stage.done ? 0.55 : 1,
              }}
            />
          );
        })}
      </View>

      {!compact ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="meta" style={{ ...woType.meta, fontWeight: '600', color: colors.foreground }}>
            {ink.label}
          </Text>
          <Text
            variant="meta"
            style={{
              ...woType.meta,
              color: colors.mutedForeground,
              fontVariant: ['tabular-nums'],
            }}
          >
            {status === 'cancelled' ? 'Void' : `Step ${step} of ${stages.length}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
