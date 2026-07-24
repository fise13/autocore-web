import { userCopy } from "@/lib/user-copy";

type MotorNameParts = {
  brandName?: string | null;
  engineCode?: string | null;
  configuration?: string | null;
  serialCode?: string | null;
};

/** User-facing motor name: brand + engine code + configuration (no serial). */
export function formatMotorDisplayName(parts: MotorNameParts): string {
  return [parts.brandName, parts.engineCode, parts.configuration].filter(Boolean).join(" ").trim();
}

/** Line label for work orders and documents. Serial is optional secondary detail. */
export function formatMotorLineLabel(
  parts: MotorNameParts & { outcome?: "install" | "sell" },
  options?: { includeSerial?: boolean; fallback?: string; marks?: string[] },
): string {
  const name = formatMotorDisplayName(parts);
  const base =
    name ||
    (options?.includeSerial && parts.serialCode?.trim()
      ? parts.serialCode.trim()
      : options?.fallback ?? userCopy.documents.motor.engineFallback);
  const marks = (options?.marks ?? []).map((m) => m.trim()).filter(Boolean);
  if (marks.length === 0) return base;
  return `${base} · ${marks.join(" · ")}`;
}

/** Outcome / operation subtitle with optional customer marks. */
export function formatMotorLineSubtitle(
  outcome: "install" | "sell" | undefined,
  marks?: string[],
): string {
  const base = outcome === "sell" ? userCopy.documents.motor.sell : userCopy.documents.motor.install;
  const cleanMarks = (marks ?? []).map((m) => m.trim()).filter(Boolean);
  if (cleanMarks.length === 0) return base;
  return `${base} · ${cleanMarks.join(" · ")}`;
}
