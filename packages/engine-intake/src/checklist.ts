import type { IntakePhotoCategory } from "./types";

export const DOCUMENTATION_CHECKLIST_ITEM_STATES = [
  "completed",
  "missing",
  "uncertain",
  "not_applicable",
] as const;

export type DocumentationChecklistItemState =
  (typeof DOCUMENTATION_CHECKLIST_ITEM_STATES)[number];

export const DOCUMENTATION_CHECKLIST_GROUPS = [
  "identity",
  "exterior",
  "bottom",
  "internals",
  "per_cylinder",
  "special",
] as const;

export type DocumentationChecklistGroup =
  (typeof DOCUMENTATION_CHECKLIST_GROUPS)[number];

export const DOCUMENTATION_CHECKLIST_GROUP_LABELS: Record<
  DocumentationChecklistGroup,
  string
> = {
  identity: "Identity",
  exterior: "Exterior",
  bottom: "Bottom",
  internals: "Internals",
  per_cylinder: "Per-cylinder",
  special: "Special",
};

export type DocumentationChecklistItemId =
  | "serial_visible"
  | "overall_engine"
  | "valve_cover"
  | "oil_pan_external"
  | "left_side"
  | "right_side"
  | "front"
  | "rear"
  | "turbo"
  | "oil_pan_removed"
  | "crankshaft_visible"
  | "connecting_rods"
  | "cylinder_1"
  | "cylinder_2"
  | "cylinder_3"
  | "cylinder_4"
  | "cylinder_5"
  | "cylinder_6"
  | "cylinder_7"
  | "cylinder_8"
  | "endoscope";

export type DocumentationChecklistItem = {
  id: DocumentationChecklistItemId;
  label: string;
  group: DocumentationChecklistGroup;
  state: DocumentationChecklistItemState;
  confidence: number;
  evidencePhotoIds: string[];
  saleGate: boolean;
  source: "ai" | "manager_override" | "system_seed";
  rationale: string;
};

export type DocumentationChecklistSummary = {
  completedCount: number;
  missingCount: number;
  uncertainCount: number;
  notApplicableCount: number;
  saleGateMissingCount: number;
  ready: boolean;
  whisper: string | null;
};

export type DocumentationChecklist = {
  items: DocumentationChecklistItem[];
  summary: DocumentationChecklistSummary;
  updatedAt: string | null;
  understandingState: "pending" | "understanding" | "ready";
};

export type ChecklistPhotoEvidence = {
  id: string;
  category: IntakePhotoCategory;
  reviewDecision?: "accepted" | "rejected" | "retake_requested" | null;
  deletedAt?: string | null;
  checklistHits?: readonly DocumentationChecklistItemId[];
  hitConfidence?: number;
};

export type ChecklistEngineHints = {
  serialConfirmed?: boolean;
  cylinderCount?: number | null;
  hasTurbo?: boolean | null;
  oilPanRemoved?: boolean | null;
  endoscopeRequired?: boolean;
};

type ItemDef = {
  id: DocumentationChecklistItemId;
  label: string;
  group: DocumentationChecklistGroup;
  saleGate: boolean;
  seed: boolean;
};

const ITEM_DEFS: readonly ItemDef[] = [
  // Mobile captures freely; desktop AI (+ manager overrides) map photos to these gates.
  { id: "serial_visible", label: "Engine serial visible", group: "identity", saleGate: true, seed: true },
  { id: "overall_engine", label: "Overall engine", group: "exterior", saleGate: true, seed: true },
  { id: "valve_cover", label: "Valve cover", group: "exterior", saleGate: true, seed: true },
  { id: "oil_pan_external", label: "Oil pan (external)", group: "bottom", saleGate: true, seed: true },
  { id: "left_side", label: "Left side", group: "exterior", saleGate: true, seed: true },
  { id: "right_side", label: "Right side", group: "exterior", saleGate: true, seed: true },
  { id: "front", label: "Front", group: "exterior", saleGate: true, seed: true },
  { id: "rear", label: "Rear", group: "exterior", saleGate: true, seed: true },
  { id: "turbo", label: "Turbo", group: "special", saleGate: false, seed: false },
  { id: "oil_pan_removed", label: "Oil pan removed", group: "bottom", saleGate: false, seed: false },
  { id: "crankshaft_visible", label: "Crankshaft visible", group: "internals", saleGate: false, seed: false },
  { id: "connecting_rods", label: "Connecting rods documented", group: "internals", saleGate: false, seed: false },
  { id: "cylinder_1", label: "Cylinder 1", group: "per_cylinder", saleGate: false, seed: false },
  { id: "cylinder_2", label: "Cylinder 2", group: "per_cylinder", saleGate: false, seed: false },
  { id: "cylinder_3", label: "Cylinder 3", group: "per_cylinder", saleGate: false, seed: false },
  { id: "cylinder_4", label: "Cylinder 4", group: "per_cylinder", saleGate: false, seed: false },
  { id: "cylinder_5", label: "Cylinder 5", group: "per_cylinder", saleGate: false, seed: false },
  { id: "cylinder_6", label: "Cylinder 6", group: "per_cylinder", saleGate: false, seed: false },
  { id: "cylinder_7", label: "Cylinder 7", group: "per_cylinder", saleGate: false, seed: false },
  { id: "cylinder_8", label: "Cylinder 8", group: "per_cylinder", saleGate: false, seed: false },
  { id: "endoscope", label: "Endoscope inspection", group: "special", saleGate: false, seed: false },
] as const;

const CATEGORY_TO_ITEMS: Partial<
  Record<IntakePhotoCategory, readonly DocumentationChecklistItemId[]>
> = {
  serial_plate: ["serial_visible"],
  temporary_tag: ["serial_visible"],
  overview: ["overall_engine"],
  overview_front: ["front", "overall_engine"],
  overview_rear: ["rear", "overall_engine"],
  overview_left: ["left_side", "overall_engine"],
  overview_right: ["right_side", "overall_engine"],
  overview_top: ["valve_cover"],
  valve_cover: ["valve_cover"],
  oil_pan: ["oil_pan_external"],
  turbo: ["turbo"],
  intake: ["turbo"],
  exhaust: ["turbo"],
  // Free-capture `other` must NOT auto-complete checklist items — desktop AI
  // assigns angles. Otherwise every phone photo farms "Overall engine".
};

const CYLINDER_IDS: DocumentationChecklistItemId[] = [
  "cylinder_1",
  "cylinder_2",
  "cylinder_3",
  "cylinder_4",
  "cylinder_5",
  "cylinder_6",
  "cylinder_7",
  "cylinder_8",
];

function defFor(id: DocumentationChecklistItemId): ItemDef {
  const found = ITEM_DEFS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown checklist item ${id}`);
  return found;
}

function makeItem(
  id: DocumentationChecklistItemId,
  patch: Partial<DocumentationChecklistItem> = {},
): DocumentationChecklistItem {
  const def = defFor(id);
  return {
    id,
    label: def.label,
    group: def.group,
    state: "missing",
    confidence: 0,
    evidencePhotoIds: [],
    saleGate: def.saleGate,
    source: "system_seed",
    rationale: "",
    ...patch,
  };
}

export function summarizeDocumentationChecklist(
  items: readonly DocumentationChecklistItem[],
): DocumentationChecklistSummary {
  const active = items.filter((item) => item.state !== "not_applicable");
  const completedCount = active.filter((item) => item.state === "completed").length;
  const missingCount = active.filter((item) => item.state === "missing").length;
  const uncertainCount = active.filter((item) => item.state === "uncertain").length;
  const notApplicableCount = items.filter((item) => item.state === "not_applicable").length;
  const saleGateMissing = active.filter(
    (item) => item.saleGate && (item.state === "missing" || item.state === "uncertain"),
  );
  const whisperItem = saleGateMissing[0] ?? active.find((item) => item.state === "missing");
  return {
    completedCount,
    missingCount,
    uncertainCount,
    notApplicableCount,
    saleGateMissingCount: saleGateMissing.length,
    ready: saleGateMissing.length === 0 && completedCount > 0,
    whisper: whisperItem ? `Missing: ${whisperItem.label}` : null,
  };
}

export function seedDocumentationChecklist(
  options: { serialConfirmed?: boolean } = {},
): DocumentationChecklist {
  const items = ITEM_DEFS.filter((def) => def.seed).map((def) => {
    if (def.id === "serial_visible" && options.serialConfirmed) {
      return makeItem(def.id, {
        state: "completed",
        confidence: 1,
        source: "system_seed",
        rationale: "Serial confirmed by worker",
      });
    }
    return makeItem(def.id);
  });
  return {
    items,
    summary: summarizeDocumentationChecklist(items),
    updatedAt: null,
    understandingState: "pending",
  };
}

/** Hydrate Firestore / legacy jobs that predate documentationChecklist. */
export function normalizeDocumentationChecklist(
  value: unknown,
  options: { serialConfirmed?: boolean } = {},
): DocumentationChecklist {
  if (!value || typeof value !== "object") {
    return seedDocumentationChecklist(options);
  }
  const raw = value as Partial<DocumentationChecklist>;
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    return seedDocumentationChecklist(options);
  }
  const items = raw.items.filter(
    (item): item is DocumentationChecklistItem =>
      Boolean(item && typeof item === "object" && typeof item.id === "string"),
  );
  if (items.length === 0) {
    return seedDocumentationChecklist(options);
  }
  return {
    items,
    summary: summarizeDocumentationChecklist(items),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    understandingState:
      raw.understandingState === "pending" ||
      raw.understandingState === "understanding" ||
      raw.understandingState === "ready"
        ? raw.understandingState
        : "pending",
  };
}

function itemsFromCategory(category: IntakePhotoCategory): DocumentationChecklistItemId[] {
  return [...(CATEGORY_TO_ITEMS[category] ?? [])];
}

export function reconcileDocumentationChecklist(input: {
  previous?: DocumentationChecklist | null;
  photos: readonly ChecklistPhotoEvidence[];
  hints?: ChecklistEngineHints;
}): DocumentationChecklist {
  const previousById = new Map(
    (input.previous?.items ?? []).map((item) => [item.id, item] as const),
  );
  const hints = input.hints ?? {};
  const activePhotos = input.photos.filter(
    (photo) =>
      photo.deletedAt == null &&
      photo.reviewDecision !== "rejected" &&
      photo.reviewDecision !== "retake_requested",
  );

  const evidence = new Map<DocumentationChecklistItemId, { ids: string[]; confidence: number }>();
  const bump = (id: DocumentationChecklistItemId, photoId: string, confidence: number) => {
    const current = evidence.get(id) ?? { ids: [], confidence: 0 };
    if (!current.ids.includes(photoId)) current.ids.push(photoId);
    current.confidence = Math.max(current.confidence, confidence);
    evidence.set(id, current);
  };

  for (const photo of activePhotos) {
    const hits =
      photo.checklistHits && photo.checklistHits.length > 0
        ? photo.checklistHits
        : itemsFromCategory(photo.category);
    const confidence = photo.hitConfidence ?? (photo.checklistHits?.length ? 0.75 : 0.7);
    for (const hit of hits) bump(hit, photo.id, confidence);
  }

  if (hints.serialConfirmed) {
    bump("serial_visible", "__serial__", 1);
  }

  const cylinderCount =
    typeof hints.cylinderCount === "number" && hints.cylinderCount > 0
      ? Math.min(8, Math.max(3, Math.round(hints.cylinderCount)))
      : null;

  const oilPanRemoved =
    hints.oilPanRemoved === true ||
    evidence.has("oil_pan_removed") ||
    evidence.has("crankshaft_visible") ||
    evidence.has("connecting_rods");

  const hasTurboEvidence = evidence.has("turbo");
  const hasTurbo = hints.hasTurbo === true || hasTurboEvidence;
  const noTurbo = hints.hasTurbo === false && !hasTurboEvidence;

  const desiredIds = new Set<DocumentationChecklistItemId>();
  for (const def of ITEM_DEFS) {
    if (def.seed) desiredIds.add(def.id);
  }
  if (noTurbo) {
    desiredIds.add("turbo");
  } else if (hasTurbo || previousById.has("turbo")) {
    desiredIds.add("turbo");
  }
  if (oilPanRemoved) {
    desiredIds.add("oil_pan_removed");
    desiredIds.add("crankshaft_visible");
    desiredIds.add("connecting_rods");
  }
  if (cylinderCount) {
    for (let i = 0; i < cylinderCount; i += 1) desiredIds.add(CYLINDER_IDS[i]!);
  } else {
    for (const id of CYLINDER_IDS.slice(0, 4)) {
      if (evidence.has(id) || previousById.has(id)) desiredIds.add(id);
    }
  }
  if (hints.endoscopeRequired || evidence.has("endoscope") || previousById.has("endoscope")) {
    desiredIds.add("endoscope");
  }

  const items: DocumentationChecklistItem[] = [];
  for (const id of desiredIds) {
    const prev = previousById.get(id);
    if (prev?.source === "manager_override") {
      items.push({ ...prev });
      continue;
    }

    const def = defFor(id);
    const hit = evidence.get(id);

    if (id === "turbo" && noTurbo) {
      items.push(
        makeItem(id, {
          state: "not_applicable",
          confidence: 0.85,
          source: "ai",
          rationale: "No turbo visible across the photo set",
        }),
      );
      continue;
    }
    if (CYLINDER_IDS.includes(id) && cylinderCount) {
      const index = CYLINDER_IDS.indexOf(id) + 1;
      if (index > cylinderCount) {
        items.push(
          makeItem(id, {
            state: "not_applicable",
            confidence: 0.9,
            source: "ai",
            rationale: `Engine inferred as ${cylinderCount}-cylinder`,
          }),
        );
        continue;
      }
    }
    if (
      (id === "crankshaft_visible" || id === "connecting_rods") &&
      !oilPanRemoved &&
      !hit
    ) {
      continue;
    }

    if (hit && hit.confidence >= 0.55) {
      items.push(
        makeItem(id, {
          state: hit.confidence >= 0.7 ? "completed" : "uncertain",
          confidence: hit.confidence,
          evidencePhotoIds: hit.ids.filter((photoId) => photoId !== "__serial__"),
          source: "ai",
          rationale:
            hit.confidence >= 0.7 ? "Supported by photo evidence" : "Low confidence match",
          saleGate: def.saleGate,
        }),
      );
      continue;
    }

    if (id === "serial_visible" && hints.serialConfirmed) {
      items.push(
        makeItem(id, {
          state: "completed",
          confidence: 1,
          source: "system_seed",
          rationale: "Serial confirmed by worker",
        }),
      );
      continue;
    }

    items.push(
      makeItem(id, {
        state: "missing",
        confidence: 0,
        evidencePhotoIds: [],
        source: prev?.source === "ai" ? "ai" : "system_seed",
        rationale: prev?.rationale ?? "",
        saleGate: def.saleGate,
      }),
    );
  }

  for (const prev of previousById.values()) {
    if (prev.source === "manager_override" && !items.some((item) => item.id === prev.id)) {
      items.push({ ...prev });
    }
  }

  const ordered = ITEM_DEFS.map((def) => items.find((item) => item.id === def.id)).filter(
    (item): item is DocumentationChecklistItem => Boolean(item),
  );

  const summary = summarizeDocumentationChecklist(ordered);
  return {
    items: ordered,
    summary,
    updatedAt: new Date().toISOString(),
    understandingState:
      activePhotos.length === 0 ? "pending" : summary.ready ? "ready" : "understanding",
  };
}

export function checklistWhisper(
  checklist: DocumentationChecklist | null | undefined,
): string | null {
  return checklist?.summary.whisper ?? null;
}

export function isDocumentationChecklistReady(
  checklist: DocumentationChecklist | null | undefined,
): boolean {
  return Boolean(checklist?.summary.ready);
}

export function canReleaseWithChecklist(input: {
  state: string;
  serialCode: string;
  photoCount: number;
  checklist: DocumentationChecklist | null | undefined;
  overrideReason?: string | null;
  hardBlocked?: boolean;
}): boolean {
  if (input.state !== "awaiting_verification") return false;
  if (!input.serialCode.trim()) return false;
  if (input.photoCount < 1) return false;
  if (input.hardBlocked) return false;
  if (isDocumentationChecklistReady(input.checklist)) return true;
  return Boolean(input.overrideReason?.trim());
}

export function overrideChecklistItem(
  checklist: DocumentationChecklist,
  itemId: DocumentationChecklistItemId,
  state: DocumentationChecklistItemState,
  rationale: string,
): DocumentationChecklist {
  const items = checklist.items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          state,
          source: "manager_override" as const,
          rationale: rationale.trim() || item.rationale,
          confidence: state === "completed" || state === "not_applicable" ? 1 : item.confidence,
        }
      : item,
  );
  return {
    ...checklist,
    items,
    summary: summarizeDocumentationChecklist(items),
    updatedAt: new Date().toISOString(),
  };
}

export function checklistHitsForCategory(
  category: IntakePhotoCategory,
): readonly DocumentationChecklistItemId[] {
  return itemsFromCategory(category);
}

export const DOCUMENTATION_CHECKLIST_ITEM_IDS = ITEM_DEFS.map((def) => def.id);
