import type { IntakePhotoCategory } from "./types";

/** Documentation facets — coverage is quality/diversity, not photo count. */
export const DOCUMENTATION_FACETS = [
  "identity",
  "overall",
  "left",
  "right",
  "front",
  "rear",
  "top",
  "bottom",
  "induction",
  "condition",
] as const;

export type DocumentationFacet = (typeof DOCUMENTATION_FACETS)[number];

export const DOCUMENTATION_FACET_WEIGHTS: Record<DocumentationFacet, number> = {
  identity: 1.4,
  overall: 1.2,
  left: 1,
  right: 1,
  front: 1,
  rear: 1,
  top: 0.9,
  bottom: 0.9,
  induction: 0.6,
  condition: 0.5,
};

export const DOCUMENTATION_FACET_LABELS: Record<DocumentationFacet, string> = {
  identity: "serial plate",
  overall: "overall view",
  left: "left side",
  right: "right side",
  front: "front",
  rear: "rear",
  top: "valve cover / top",
  bottom: "oil pan / bottom",
  induction: "intake / turbo / exhaust",
  condition: "damage detail",
};

export const SUGGESTED_READY_COVERAGE_PERCENT = 85;
export const ENGINE_INTAKE_STAGING_LOCATION_ID = "engine-intake-staging";
export const ENGINE_INTAKE_STAGING_LOCATION_CODE = "WAREHOUSE";

const CATEGORY_FACETS: Record<IntakePhotoCategory, readonly DocumentationFacet[]> = {
  serial_plate: ["identity"],
  overview: ["overall"],
  overview_front: ["front", "overall"],
  overview_rear: ["rear", "overall"],
  overview_left: ["left", "overall"],
  overview_right: ["right", "overall"],
  overview_top: ["top"],
  valve_cover: ["top"],
  oil_pan: ["bottom"],
  turbo: ["induction"],
  intake: ["induction"],
  exhaust: ["induction"],
  damage: ["condition"],
  harness: ["condition"],
  mounts: ["condition"],
  accessories: ["condition"],
  temporary_tag: ["identity"],
  other: [],
};

export type CoveragePhotoInput = {
  category: IntakePhotoCategory;
  reviewDecision?: "accepted" | "rejected" | "retake_requested" | null;
  deletedAt?: string | null;
  /** Near-duplicates contribute ~0 to coverage. */
  duplicateOfPhotoId?: string | null;
};

export type DocumentationCoverage = {
  percent: number;
  satisfiedFacets: DocumentationFacet[];
  missingFacets: DocumentationFacet[];
  whisper: string | null;
  readySuggested: boolean;
};

export function facetsForCategory(
  category: IntakePhotoCategory,
): readonly DocumentationFacet[] {
  return CATEGORY_FACETS[category] ?? [];
}

export function deriveDocumentationCoverage(
  photos: readonly CoveragePhotoInput[],
  options: { serialConfirmed?: boolean } = {},
): DocumentationCoverage {
  const active = photos.filter(
    (photo) =>
      photo.deletedAt == null &&
      photo.reviewDecision !== "rejected" &&
      photo.reviewDecision !== "retake_requested" &&
      !photo.duplicateOfPhotoId,
  );

  const satisfied = new Set<DocumentationFacet>();
  if (options.serialConfirmed) {
    satisfied.add("identity");
  }

  for (const photo of active) {
    for (const facet of facetsForCategory(photo.category)) {
      satisfied.add(facet);
    }
  }

  let earned = 0;
  let total = 0;
  for (const facet of DOCUMENTATION_FACETS) {
    const weight = DOCUMENTATION_FACET_WEIGHTS[facet];
    total += weight;
    if (satisfied.has(facet)) earned += weight;
  }

  const percent = total <= 0 ? 0 : Math.round(Math.min(1, Math.max(0, earned / total)) * 100);
  const missingFacets = DOCUMENTATION_FACETS.filter((facet) => !satisfied.has(facet));
  const whisperFacet = missingFacets.find(
    (facet) => facet !== "induction" && facet !== "condition",
  );
  const whisper = whisperFacet
    ? `Try a ${DOCUMENTATION_FACET_LABELS[whisperFacet]}`
    : missingFacets[0]
      ? `Optional: ${DOCUMENTATION_FACET_LABELS[missingFacets[0]]}`
      : null;

  return {
    percent,
    satisfiedFacets: DOCUMENTATION_FACETS.filter((facet) => satisfied.has(facet)),
    missingFacets,
    whisper,
    readySuggested: percent >= SUGGESTED_READY_COVERAGE_PERCENT,
  };
}

export function canFinishWarehouseCapture(input: {
  serialCode: string;
  photoCount: number;
}): boolean {
  return Boolean(input.serialCode.trim()) && input.photoCount >= 1;
}

export function canReleaseWarehouseToMotors(input: {
  state: string;
  serialCode: string;
  photoCount: number;
  coveragePercent: number;
  overrideReason?: string | null;
  hardBlocked?: boolean;
}): boolean {
  if (input.state !== "awaiting_verification") return false;
  if (!input.serialCode.trim()) return false;
  if (input.photoCount < 1) return false;
  if (input.hardBlocked) return false;
  if (input.coveragePercent >= SUGGESTED_READY_COVERAGE_PERCENT) return true;
  return Boolean(input.overrideReason?.trim());
}
