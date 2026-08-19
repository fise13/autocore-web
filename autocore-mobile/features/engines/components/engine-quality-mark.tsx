import { memo } from 'react';

import { useTheme } from '@/hooks';
import type { MotorQualityGrade } from '@autocore/engine-intake';

import { EngineTag } from './engine-surface';
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

/**
 * Shop grade as a pastel tag. The word carries the meaning; the digit stays
 * in the accessibility name for anyone who still shouts "two".
 */
export const EngineQualityMark = memo(function EngineQualityMark({
  grade,
  compact = false,
  selected = false,
  onPress,
  accessibilityLabel,
}: EngineQualityMarkProps) {
  const { tones } = useTheme();
  const tone = engineQualityToneForGrade(grade);
  const word = grade ? engineQualityGradeLabel(grade) : 'Ungraded';

  return (
    <EngineTag
      label={word}
      chrome={tones[tone]}
      compact={compact}
      selected={selected}
      onPress={onPress}
      accessibilityLabel={
        accessibilityLabel ?? (grade ? `Quality ${grade}, ${word}` : 'Ungraded')
      }
    />
  );
});

/** Detail-screen counterpart — same tag, a little more padding. */
export const EngineQualityPill = memo(function EngineQualityPill({
  grade,
}: {
  grade: MotorQualityGrade | null;
}) {
  return <EngineQualityMark grade={grade} />;
});
