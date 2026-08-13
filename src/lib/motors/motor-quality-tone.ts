/**
 * Engine quality grades 1–3 → badge tone.
 * Business scale: 2 = excellent, 3 = poor; 1 keeps a distinct neutral tone.
 */
export type MotorQualityTone = "info" | "success" | "warning" | "danger";

export function resolveMotorQualityTone(raw: string | null | undefined): MotorQualityTone | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  // Accept "2", or values that start with the digit (e.g. "2 — отлично").
  const match = /^([123])(?:\D|$)/.exec(value);
  if (!match) return null;

  switch (match[1]) {
    case "1":
      return "info";
    case "2":
      return "success";
    case "3":
      return "danger";
    default:
      return null;
  }
}

export function motorQualityBadgeVariant(
  tone: MotorQualityTone,
): "info" | "success" | "warning" | "destructive" {
  return tone === "danger" ? "destructive" : tone;
}
