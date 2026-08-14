export const MOTOR_QUALITY_GRADES = ["1", "2", "3"] as const;

export type MotorQualityGrade = (typeof MOTOR_QUALITY_GRADES)[number];

/**
 * Shop scale: 2 = excellent, 1 = fair, 3 = poor.
 * Picker order puts excellent first — that's the usual release grade.
 */
export const MOTOR_QUALITY_GRADE_OPTIONS = [
  { value: "2", label: "Excellent" },
  { value: "1", label: "Fair" },
  { value: "3", label: "Poor" },
] as const satisfies ReadonlyArray<{ value: MotorQualityGrade; label: string }>;

export function parseMotorQualityGrade(
  raw: string | null | undefined,
): MotorQualityGrade | null {
  const match = /^([123])(?:\D|$)/.exec((raw ?? "").trim());
  if (!match) return null;
  return match[1] as MotorQualityGrade;
}
