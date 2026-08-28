import type { MotorQualityGrade } from '@autocore/engine-intake';

import {
  ENGINE_QUALITY_GRADE_MARKS,
  engineQualityGradeLabel,
} from '../lib/engine-quality';

export type EngineQualityFilterValue = MotorQualityGrade | 'all';

/**
 * Quality filter options.
 *
 * Data rather than a component: both list renderers draw the filter themselves
 * — React Native with the app's `SegmentedControl`, iOS with a SwiftUI
 * segmented `Picker` inside the list — and both must offer the same grades in
 * the same order.
 */
export const ENGINE_QUALITY_FILTER_SEGMENTS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  ...ENGINE_QUALITY_GRADE_MARKS.map((grade) => ({
    value: grade,
    label: engineQualityGradeLabel(grade),
  })),
];
