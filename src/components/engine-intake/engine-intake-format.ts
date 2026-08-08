import {
  warehouseLifecycleLabel,
  type DocumentationChecklistItemState,
  type EngineIntakeJob,
  type EngineIntakeJobState,
} from "@autocore/engine-intake";

export function formatIntakeState(state: string): string {
  return state
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

const INTAKE_EVENT_LABELS: Record<string, string> = {
  "session.started": "Session started",
  "session.paused": "Session paused",
  "session.resumed": "Session resumed",
  "session.completed": "Session finished",
  "session.cancelled": "Session cancelled",
  "photo.captured": "Photo captured",
  "photo.uploaded": "Photo uploaded",
  "photo.deleted": "Photo removed",
  "job.created": "Engine drafted",
  "job.claimed": "Claimed by worker",
  "job.released": "Claim released",
  "job.paused": "Paused",
  "job.resumed": "Resumed",
  "job.field_completed": "Field documentation finished",
  "job.reassigned": "Reassigned",
  "job.identity_updated": "Identity updated",
  "job.approved": "Released to Motors Grid",
  "job.quarantined": "Moved to quarantine",
  "job.rejected": "Rejected",
  "job.cancelled": "Cancelled",
  "job.closed": "Closed",
  "checklist.item_overridden": "Checklist override",
  "verification.started": "Verification opened",
  "verification.released": "Verification released",
  "rework.requested": "Retake requested",
};

export function formatIntakeEventLabel(type: string): string {
  return INTAKE_EVENT_LABELS[type] ?? formatIntakeState(type);
}

export function formatIntakeDate(value: string | null): string {
  if (!value) return "Pending";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(parsed)
    : "Pending";
}

export function jobSerial(job: EngineIntakeJob): string {
  return (
    job.expectedIdentity.serialCode ||
    job.expectedIdentity.engineCode ||
    job.sourceReference ||
    "Unnamed engine"
  );
}

export function jobIdentityLine(job: EngineIntakeJob): string {
  const brand = job.expectedIdentity.brandName?.trim();
  const code = job.expectedIdentity.engineCode?.trim();
  if (brand && code) return `${brand} · ${code}`;
  if (brand || code) return brand || code || "";
  return "Understanding…";
}

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
