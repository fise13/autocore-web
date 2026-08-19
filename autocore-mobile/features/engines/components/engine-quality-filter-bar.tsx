import { SegmentedControl } from '@/components/ui';
import type { MotorQualityGrade } from '@autocore/engine-intake';

import {
  ENGINE_QUALITY_GRADE_MARKS,
  engineQualityGradeLabel,
} from '../lib/engine-quality';

export type EngineQualityFilterValue = MotorQualityGrade | 'all';

type EngineQualityFilterBarProps = {
  value: EngineQualityFilterValue;
  onChange: (next: EngineQualityFilterValue) => void;
};

const SEGMENTS = [
  { value: 'all', label: 'All' },
  ...ENGINE_QUALITY_GRADE_MARKS.map((grade) => ({
    value: grade,
    label: engineQualityGradeLabel(grade),
  })),
];

/** Quality filter — same segmented control as intake and the rest of the app. */
export function EngineQualityFilterBar({ value, onChange }: EngineQualityFilterBarProps) {
  return (
    <SegmentedControl
      accessibilityLabel="Filter by quality"
      segments={SEGMENTS}
      value={value}
      onValueChange={(next) => onChange(next as EngineQualityFilterValue)}
    />
  );
}
