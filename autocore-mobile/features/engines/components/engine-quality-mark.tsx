import { memo } from 'react';

import { Badge } from '@/components/ui';
import type { MotorQualityGrade } from '@autocore/engine-intake';

import {
  engineQualityGradeLabel,
  engineQualityToneForGrade,
} from '../lib/engine-quality';

type EngineQualityMarkProps = {
  grade: MotorQualityGrade | null;
  compact?: boolean;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

function qualityBadgeVariant(
  grade: MotorQualityGrade | null,
): 'default' | 'secondary' | 'destructive' | 'success' {
  const tone = engineQualityToneForGrade(grade);
  if (tone === 'success') return 'success';
  if (tone === 'danger') return 'destructive';
  if (tone === 'primary') return 'default';
  return 'secondary';
}

export const EngineQualityMark = memo(function EngineQualityMark({
  grade,
  accessibilityLabel,
}: EngineQualityMarkProps) {
  const word = grade ? engineQualityGradeLabel(grade) : 'Ungraded';

  return (
    <Badge
      variant={qualityBadgeVariant(grade)}
      emphasis="subtle"
      dot
      accessibilityLabel={
        accessibilityLabel ?? (grade ? `Quality ${grade}, ${word}` : 'Ungraded')
      }
    >
      {word}
    </Badge>
  );
});
