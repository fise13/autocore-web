import type {
  EngineIntakeAssignment,
  EngineIntakeIdentity,
  EngineIntakeProgress,
  PhotoPackageTemplate,
  PhotoRequirement,
} from "./types";

export const DEFAULT_ENGINE_INTAKE_PACKAGE_ID = "default-engine-intake-v1";

export const DEFAULT_ENGINE_INTAKE_REQUIREMENTS: readonly PhotoRequirement[] = [
  {
    id: "serial-plate",
    category: "serial_plate",
    label: "Serial plate",
    guidance: "Fill the frame with the engine number or plate.",
    required: true,
    minCount: 1,
    strictness: "field",
  },
  {
    id: "overview-front",
    category: "overview_front",
    label: "Front overview",
    guidance: "Capture the complete front face and accessories.",
    required: true,
    minCount: 1,
    strictness: "verification",
  },
  {
    id: "overview-rear",
    category: "overview_rear",
    label: "Rear overview",
    guidance: "Capture the complete rear face.",
    required: true,
    minCount: 1,
    strictness: "verification",
  },
  {
    id: "overview-left",
    category: "overview_left",
    label: "Left side",
    guidance: "Capture mounts, harness, and side condition.",
    required: true,
    minCount: 1,
    strictness: "verification",
  },
  {
    id: "overview-right",
    category: "overview_right",
    label: "Right side",
    guidance: "Capture mounts, harness, and side condition.",
    required: true,
    minCount: 1,
    strictness: "verification",
  },
  {
    id: "damage",
    category: "damage",
    label: "Damage",
    guidance: "Add close-ups of every visible defect.",
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
  requirements: readonly PhotoRequirement[],
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
  };
}

export function defaultEngineIntakePhotoPackage(companyId: string): PhotoPackageTemplate {
  return {
    id: DEFAULT_ENGINE_INTAKE_PACKAGE_ID,
    companyId,
    name: "Standard engine intake",
    version: 1,
    isDefault: true,
    requirements: DEFAULT_ENGINE_INTAKE_REQUIREMENTS.map((requirement) => ({ ...requirement })),
    createdAt: null,
    updatedAt: null,
  };
}
