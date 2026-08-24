import {
  warehouseLifecycleLabel,
  type DocumentationChecklistItemState,
  type EngineIntakeJob,
  type EngineIntakeJobState,
  type IntakePhotoCategory,
} from "@autocore/engine-intake";

import { userCopy, getActiveUserCopyLocale } from "@/lib/user-copy";

export function formatIntakeState(state: string): string {
  return state
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function formatIntakeEventLabel(type: string): string {
  const labels = userCopy.engineIntake.events as Record<string, string>;
  return labels[type] ?? formatIntakeState(type);
}

export function formatIntakeDate(value: string | null): string {
  const copy = userCopy.engineIntake.workspace;
  if (!value) return copy.pending;
  const parsed = new Date(value);
  const locale = getActiveUserCopyLocale() === "en" ? "en" : "ru";
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(parsed)
    : copy.pending;
}

export function jobSerial(job: EngineIntakeJob): string {
  return (
    job.expectedIdentity.serialCode ||
    job.expectedIdentity.engineCode ||
    job.sourceReference ||
    userCopy.engineIntake.workspace.unnamedEngine
  );
}

export function jobIdentityLine(job: EngineIntakeJob): string {
  const brand = job.expectedIdentity.brandName?.trim();
  const code = job.expectedIdentity.engineCode?.trim();
  if (brand && code) return `${brand} · ${code}`;
  if (brand || code) return brand || code || "";
  return userCopy.engineIntake.workspace.noIdentity;
}

export function jobChecklistStatusLabel(job: EngineIntakeJob): string {
  const checklist = job.documentationChecklist;
  if (job.progress.syncQueueDepth > 0) {
    return `${job.progress.syncQueueDepth} syncing`;
  }
  if (!checklist) {
    return job.progress.capturedCount > 0
      ? `${job.progress.capturedCount} photos`
      : "Awaiting photos";
  }
  if (checklist.summary.ready) return "Ready to release";
  if (job.progress.capturedCount === 0) return "Awaiting photos";
  if (checklist.understandingState === "pending") return "Awaiting photos";
  if (checklist.summary.uncertainCount > 0) {
    return `${checklist.summary.uncertainCount} need a glance`;
  }
  if (checklist.summary.saleGateMissingCount > 0) {
    return `${checklist.summary.saleGateMissingCount} still open`;
  }
  return `${job.progress.capturedCount} photos`;
}

export function intakePhotoCategoryLabel(category: string): string {
  const labels = userCopy.engineIntake.photoCategories as Record<string, string>;
  return labels[category] ?? formatIntakeState(category);
}

export function intakePhotoDisplayLabel(photo: {
  category: string;
  aiLabel?: string | null;
}): string {
  const custom = photo.aiLabel?.trim();
  if (custom) return custom;
  return intakePhotoCategoryLabel(photo.category);
}

export const INTAKE_PHOTO_CATEGORY_OPTIONS: IntakePhotoCategory[] = [
  "serial_plate",
  "overview",
  "overview_front",
  "overview_rear",
  "overview_left",
  "overview_right",
  "overview_top",
  "valve_cover",
  "oil_pan",
  "turbo",
  "intake",
  "exhaust",
  "damage",
  "harness",
  "mounts",
  "accessories",
  "temporary_tag",
  "other",
];

export function jobLifecycleLabel(state: EngineIntakeJobState): string {
  return warehouseLifecycleLabel(state);
}

export function jobStateBadgeVariant(state: EngineIntakeJobState) {
  if (state === "verified" || state === "closed") return "success" as const;
  if (state === "rework" || state === "quarantine") return "warning" as const;
  if (state === "rejected" || state === "cancelled") return "destructive" as const;
  if (state === "in_session" || state === "awaiting_verification") return "info" as const;
  return "secondary" as const;
}

export function checklistStateMark(state: DocumentationChecklistItemState): string {
  if (state === "completed") return "✓";
  if (state === "uncertain") return "?";
  if (state === "not_applicable") return "NA";
  return "✕";
}

export function checklistStateBadgeVariant(state: DocumentationChecklistItemState) {
  if (state === "completed") return "success" as const;
  if (state === "uncertain") return "warning" as const;
  if (state === "not_applicable") return "secondary" as const;
  return "destructive" as const;
}
