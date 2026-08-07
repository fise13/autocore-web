import type {
  EngineIntakeAssignment,
  EngineIntakeIdentity,
  EngineIntakeProgress,
  PhotoPackageTemplate,
  PhotoRequirement,
} from "./types";

export const DEFAULT_ENGINE_INTAKE_PACKAGE_ID = "default-engine-intake-v2-capture-first";

/**
 * Capture-first: no rigid photo checklist.
 * Soft optional suggestions remain for legacy UI / rework gaps only.
 */
export const DEFAULT_ENGINE_INTAKE_REQUIREMENTS: readonly PhotoRequirement[] = [
  {
    id: "serial-plate",
    category: "serial_plate",
    label: "Serial plate",
    guidance: "Optional — AI will also look for the plate in free photos.",
    required: false,
    minCount: 0,
    strictness: "field",
  },
  {
    id: "overview-front",
    category: "overview_front",
    label: "Front overview",
    guidance: "Suggestion only — shoot freely.",
    required: false,
    minCount: 0,
    strictness: "verification",
  },
  {
    id: "overview-rear",
    category: "overview_rear",
    label: "Rear overview",
    guidance: "Suggestion only — shoot freely.",
    required: false,
    minCount: 0,
    strictness: "verification",
  },
  {
    id: "overview-left",
    category: "overview_left",
    label: "Left side",
    guidance: "Suggestion only — shoot freely.",
    required: false,
    minCount: 0,
    strictness: "verification",
  },
  {
    id: "overview-right",
    category: "overview_right",
    label: "Right side",
    guidance: "Suggestion only — shoot freely.",
    required: false,
    minCount: 0,
    strictness: "verification",
  },
  {
    id: "damage",
    category: "damage",
    label: "Damage",
    guidance: "Optional close-ups of defects.",
    required: false,
    minCount: 0,
    strictness: "verification",
  },
] as const;

export function defaultEngineIntakeIdentity(
  input: Partial<EngineIntakeIdentity> = {},
): EngineIntakeIdentity {
  return {
    serialCode: input.serialCode?.trim() ?? "",
    brandName: input.brandName?.trim() ?? "",
    engineCode: input.engineCode?.trim() ?? "",
    donorVin: input.donorVin?.trim() ?? "",
    configuration: input.configuration?.trim() ?? "",
  };
}

export function emptyEngineIntakeAssignment(): EngineIntakeAssignment {
  return {
    assigneeUid: null,
    assigneeName: null,
    claimedByUid: null,
    claimedByName: null,
    activeSessionId: null,
    claimDeviceId: null,
    claimedAt: null,
    claimExpiresAt: null,
    lastHeartbeatAt: null,
  };
}

export function emptyEngineIntakeProgress(
  requirements: readonly PhotoRequirement[] = DEFAULT_ENGINE_INTAKE_REQUIREMENTS,
): EngineIntakeProgress {
  const required = requirements.filter((requirement) => requirement.required);
  return {
    requiredCount: required.length,
    satisfiedCount: 0,
    capturedCount: 0,
    uploadedCount: 0,
    acceptedCount: 0,
    requirementCounts: {},
    missingRequirementIds: required.map((requirement) => requirement.id),
    rejectedPhotoIds: [],
    syncQueueDepth: 0,
    coveragePercent: 0,
    missingFacets: [],
    coverageWhisper: null,
  };
}

/** Coerce legacy Firestore progress docs missing coverage fields. */
export function normalizeEngineIntakeProgress(
  raw: unknown,
  requirements: readonly PhotoRequirement[] = DEFAULT_ENGINE_INTAKE_REQUIREMENTS,
): EngineIntakeProgress {
  const fallback = emptyEngineIntakeProgress(requirements);
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Record<string, unknown>;
  const requirementCounts =
    data.requirementCounts && typeof data.requirementCounts === "object"
      ? (data.requirementCounts as Record<string, number>)
      : {};
  return {
    requiredCount:
      typeof data.requiredCount === "number" ? data.requiredCount : fallback.requiredCount,
    satisfiedCount:
      typeof data.satisfiedCount === "number" ? data.satisfiedCount : fallback.satisfiedCount,
    capturedCount:
      typeof data.capturedCount === "number" ? data.capturedCount : fallback.capturedCount,
    uploadedCount:
      typeof data.uploadedCount === "number" ? data.uploadedCount : fallback.uploadedCount,
    acceptedCount:
      typeof data.acceptedCount === "number" ? data.acceptedCount : fallback.acceptedCount,
    requirementCounts,
    missingRequirementIds: Array.isArray(data.missingRequirementIds)
      ? data.missingRequirementIds.map(String)
      : fallback.missingRequirementIds,
    rejectedPhotoIds: Array.isArray(data.rejectedPhotoIds)
      ? data.rejectedPhotoIds.map(String)
      : fallback.rejectedPhotoIds,
    syncQueueDepth:
      typeof data.syncQueueDepth === "number" ? data.syncQueueDepth : fallback.syncQueueDepth,
    coveragePercent:
      typeof data.coveragePercent === "number" ? data.coveragePercent : fallback.coveragePercent,
    missingFacets: Array.isArray(data.missingFacets)
      ? data.missingFacets.map(String)
      : fallback.missingFacets,
    coverageWhisper:
      typeof data.coverageWhisper === "string" ? data.coverageWhisper : fallback.coverageWhisper,
  };
}

export function defaultEngineIntakePhotoPackage(companyId: string): PhotoPackageTemplate {
  return {
    id: DEFAULT_ENGINE_INTAKE_PACKAGE_ID,
    companyId,
    name: "Capture-first warehouse documentation",
    version: 2,
    isDefault: true,
    requirements: DEFAULT_ENGINE_INTAKE_REQUIREMENTS.map((requirement) => ({ ...requirement })),
    createdAt: null,
    updatedAt: null,
  };
}
