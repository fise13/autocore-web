/**
 * Motor quality — shop grades 1 / 2 / 3 (fair / excellent / poor).
 *
 * Same scale as intake and the web motors grid. Pure — no React, no Firestore.
 */
import {
  MOTOR_QUALITY_GRADE_OPTIONS,
  parseMotorQualityGrade,
  type MotorQualityGrade,
} from '@autocore/engine-intake';

import { joinSearchFields } from '../../../lib/search/match-query';
import type { MotorEntity } from '../../../types/motor';

export type EngineQualityFilter = 'all' | MotorQualityGrade | 'ungraded';

export type EngineQualityTone = 'success' | 'primary' | 'danger' | 'muted';

export const ENGINE_QUALITY_FILTERS: ReadonlyArray<{
  value: EngineQualityFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: '2', label: 'Excellent' },
  { value: '1', label: 'Fair' },
  { value: '3', label: 'Poor' },
  { value: 'ungraded', label: 'Ungraded' },
];

/** Top-of-yard control — shop digits in scale order, not picker order. */
export const ENGINE_QUALITY_GRADE_MARKS = ['1', '2', '3'] as const;

const QUALITY_LABEL: Record<MotorQualityGrade, string> = {
  '2': 'Excellent',
  '1': 'Fair',
  '3': 'Poor',
};

/**
 * Tokens a person actually types when they mean a grade — English labels,
 * the digit, and the Russian words used on the shop floor.
 */
const QUALITY_SEARCH_ALIASES: Record<MotorQualityGrade, readonly string[]> = {
  '2': ['excellent', 'отличн', 'отличное', 'отличный', 'grade 2', 'quality 2', 'q2'],
  '1': ['fair', 'средн', 'среднее', 'норм', 'удовлетворительн', 'grade 1', 'quality 1', 'q1'],
  '3': ['poor', 'плох', 'плохое', 'плохой', 'grade 3', 'quality 3', 'q3'],
};

const UNGRADED_SEARCH_ALIASES = [
  'ungraded',
  'no grade',
  'no quality',
  'без качества',
  'без оценки',
] as const;

export function engineQualityGrade(motor: Pick<MotorEntity, 'quality'>): MotorQualityGrade | null {
  return parseMotorQualityGrade(motor.quality);
}

export function engineQualityGradeLabel(grade: MotorQualityGrade): string {
  return QUALITY_LABEL[grade];
}

export function engineQualityLabel(motor: Pick<MotorEntity, 'quality'>): string {
  const grade = engineQualityGrade(motor);
  return grade ? engineQualityGradeLabel(grade) : 'Ungraded';
}

export function engineQualityToneForGrade(grade: MotorQualityGrade | null): EngineQualityTone {
  switch (grade) {
    case '2':
      return 'success';
    case '1':
      return 'primary';
    case '3':
      return 'danger';
    default:
      return 'muted';
  }
}

export function engineQualityTone(motor: Pick<MotorEntity, 'quality'>): EngineQualityTone {
  return engineQualityToneForGrade(engineQualityGrade(motor));
}

export function engineQualitySearchText(motor: Pick<MotorEntity, 'quality'>): string {
  const grade = engineQualityGrade(motor);
  if (!grade) return joinSearchFields(...UNGRADED_SEARCH_ALIASES);
  const option = MOTOR_QUALITY_GRADE_OPTIONS.find((entry) => entry.value === grade);
  return joinSearchFields(option?.label, motor.quality, ...QUALITY_SEARCH_ALIASES[grade]);
}

export function engineMatchesQualityFilter(
  motor: Pick<MotorEntity, 'quality'>,
  filter: EngineQualityFilter,
): boolean {
  if (filter === 'all') return true;
  const grade = engineQualityGrade(motor);
  if (filter === 'ungraded') return grade == null;
  return grade === filter;
}

export function isExactQualityGradeQuery(query: string): MotorQualityGrade | null {
  const trimmed = query.trim();
  return trimmed === '1' || trimmed === '2' || trimmed === '3' ? trimmed : null;
}
