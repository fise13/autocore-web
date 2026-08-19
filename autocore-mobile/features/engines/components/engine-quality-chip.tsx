import { memo } from 'react';

import type { MotorEntity } from '@/types/motor';

import { EngineQualityMark } from './engine-quality-mark';
import { engineQualityGrade, engineQualityLabel } from '../lib/engine-quality';

export const EngineQualityChip = memo(function EngineQualityChip({
  motor,
}: {
  motor: MotorEntity;
}) {
  const grade = engineQualityGrade(motor);
  return (
    <EngineQualityMark
      grade={grade}
      compact
      accessibilityLabel={`Quality ${engineQualityLabel(motor)}`}
    />
  );
});
