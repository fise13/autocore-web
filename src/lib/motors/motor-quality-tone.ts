import { parseMotorQualityGrade } from "@autocore/engine-intake";

/**
 * Engine quality grades 1–3 → badge tone.
 * Business scale: 2 = excellent, 3 = poor; 1 keeps a distinct neutral tone.
 */
export type MotorQualityTone = "info" | "success" | "warning" | "danger";

export function resolveMotorQualityTone(raw: string | null | undefined): MotorQualityTone | null {
  const grade = parseMotorQualityGrade(raw);
  if (!grade) return null;

  switch (grade) {
    case "1":
      return "info";
    case "2":
      return "success";
    case "3":
      return "danger";
  }
}

export function motorQualityBadgeVariant(
  tone: MotorQualityTone,
): "info" | "success" | "warning" | "destructive" {
  return tone === "danger" ? "destructive" : tone;
}
