import { memo } from 'react';

import { Badge } from '@/components/ui';
import type { MotorEntity } from '@/types/motor';

import { engineStatusLabel, engineStatusTone, type EngineStatusTone } from '../lib/engine-variants';

function statusBadgeVariant(
  tone: EngineStatusTone,
): 'default' | 'secondary' | 'destructive' | 'success' | 'warning' {
  switch (tone) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'danger':
      return 'destructive';
    case 'progress':
      return 'default';
    default:
      return 'secondary';
  }
}

export const EngineStatusDot = memo(function EngineStatusDot({ motor }: { motor: MotorEntity }) {
  return <EngineStatusPill motor={motor} compact />;
});

export const EngineStatusPill = memo(function EngineStatusPill({
  motor,
  compact: _compact = false,
}: {
  motor: MotorEntity;
  compact?: boolean;
}) {
  const tone = engineStatusTone(motor);
  const label = engineStatusLabel(motor);

  return (
    <Badge variant={statusBadgeVariant(tone)} emphasis="subtle" accessibilityLabel={`Status ${label}`}>
      {label}
    </Badge>
  );
});
