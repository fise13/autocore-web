/**
 * Business Knowledge Engine — domain types (E0–E1 core).
 *
 * The engine turns everyday operational activity (work orders, sales, field
 * edits, import corrections, OCR confirmations, searches, prints, stock
 * depletion) into `KnowledgeEvent`s. Those events are folded into
 * `KnowledgePattern`s (counters with a Wilson-scored confidence), which in
 * turn power `KnowledgeSuggestion`s surfaced back into the product (kits,
 * frequently-bought-together, doc packs, client/mechanic defaults, search
 * boosts, import/OCR autocorrections).
 */

export const KNOWLEDGE_EVENT_TYPES = [
  "wo.completed",
  "wo.created",
  "motor.sold",
  "inventory.sold_together",
  "field.committed",
  "suggestion.accepted",
  "suggestion.rejected",
  "import.cell_corrected",
  "ocr.line_confirmed",
  "search.query",
  "document.printed",
  "stock.depleted",
] as const;

export type KnowledgeEventType = (typeof KNOWLEDGE_EVENT_TYPES)[number];

export const KNOWLEDGE_PATTERN_KINDS = [
  "field",
  "kit",
  "cooccur",
  "fbt",
  "client_prefs",
  "mechanic",
  "docpack",
  "import_rule",
  "ocr_confirm",
  "search_boost",
  "stock_codeplete",
] as const;

export type KnowledgePatternKind = (typeof KNOWLEDGE_PATTERN_KINDS)[number];

/** Who a pattern (or suggestion derived from it) belongs to. Ranked personal > client > mechanic > company. */
export const KNOWLEDGE_SCOPES = ["personal", "client", "mechanic", "company"] as const;

export type KnowledgeScope = (typeof KNOWLEDGE_SCOPES)[number];

/**
 * A single observed fact. `payload` is intentionally a loose bag (mirrors
 * `NotificationEventContext`) — collectors in `@/lib/knowledge/collector`
 * populate it with well-known keys per `type`, and the learning engine reads
 * those keys back out defensively.
 */
export type KnowledgeEvent = {
  id: string;
  companyId: string;
  type: KnowledgeEventType;
  actorUserId?: string;
  clientId?: string;
  mechanicId?: string;
  vehicleId?: string;
  workOrderId?: string;
  engineCode?: string;
  brandName?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  /** Set by `processEvent` once the learning engine has folded it into patterns. */
  processedAt?: Date;
};

/** Event shape before persistence — repository/admin layer assigns `id`/`createdAt`. */
export type KnowledgeEventDraft = Omit<KnowledgeEvent, "id" | "createdAt" | "processedAt">;

export type KnowledgePattern = {
  id: string;
  companyId: string;
  kind: KnowledgePatternKind;
  scope: KnowledgeScope;
  /** userId / clientId / mechanicId for personal|client|mechanic scopes; absent for company scope. */
  scopeId?: string;
  /** Normalized semantic keys that produced `id` (see `buildPatternId`). */
  keys: string[];
  /** Human-readable label for the outcome side of the pattern (e.g. resolved value, sku name). */
  label?: string;
  /** How many observations confirmed the outcome (successes). */
  support: number;
  /** How many observations were made in total (denominator). */
  total: number;
  /** support / total, kept denormalized for cheap reads. */
  rate: number;
  /** Wilson lower-bound confidence in [0, 1], recency-decayed. */
  confidence: number;
  /** Rolling window this pattern is scored over, if bounded. */
  windowDays?: number;
  metadata?: Record<string, unknown>;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export type KnowledgePatternUpsertOp = {
  id: string;
  kind: KnowledgePatternKind;
  scope: KnowledgeScope;
  scopeId?: string;
  keys: string[];
  label?: string;
  incrementSupport: number;
  incrementTotal: number;
  metadata?: Record<string, unknown>;
  windowDays?: number;
};

export type KnowledgeProfileScope = "client" | "mechanic" | "vehicle";

/** Rolled-up per-client/mechanic/vehicle preferences, refreshed as facts arrive. */
export type KnowledgeProfile = {
  id: string;
  companyId: string;
  scope: KnowledgeProfileScope;
  scopeId: string;
  preferredFields: Record<string, string>;
  favoriteSkus: string[];
  favoriteEngineCodes: string[];
  totalOrders: number;
  lastOrderAt?: Date;
  updatedAt: Date;
};

export type KnowledgeFeedbackAction = "accepted" | "rejected" | "dismissed" | "edited";

export type KnowledgeFeedback = {
  id: string;
  companyId: string;
  suggestionId: string;
  patternId?: string;
  kind: KnowledgePatternKind;
  action: KnowledgeFeedbackAction;
  actorUserId?: string;
  context?: Record<string, unknown>;
  createdAt: Date;
};

export type KnowledgeSuggestion = {
  id: string;
  kind: KnowledgePatternKind;
  scope: KnowledgeScope;
  patternId: string;
  title: string;
  explanation: string;
  confidence: number;
  support: number;
  total: number;
  /** Actionable data the UI needs to apply the suggestion (sku, fieldKey/value, docTypes, ...). */
  payload: Record<string, unknown>;
};

export type KnowledgeSuggestContext = {
  companyId: string;
  actorUserId?: string;
  clientId?: string;
  mechanicId?: string;
  vehicleId?: string;
  engineCode?: string;
  brandName?: string;
  fieldKey?: string;
  query?: string;
  limit?: number;
};

export type KnowledgeSuggestResponse = {
  suggestions: KnowledgeSuggestion[];
  generatedAt: Date;
};

export const KNOWLEDGE_FLAG_KEYS = [
  "suggestions",
  "kits",
  "clientProfiles",
  "fbt",
  "docPacks",
  "searchBoost",
  "importLearning",
] as const;

export type KnowledgeFlagKey = (typeof KNOWLEDGE_FLAG_KEYS)[number];

/** Gradual-rollout flags — `undefined` means "enabled" (see `isKnowledgeFeatureEnabled`). */
export type KnowledgeFlags = Partial<Record<KnowledgeFlagKey, boolean>>;

export const COMPANY_DICTIONARY_CATEGORIES = [
  "brand",
  "engine_code",
  "part_name",
  "labor_title",
  "field_value",
] as const;

export type CompanyDictionaryCategory = (typeof COMPANY_DICTIONARY_CATEGORIES)[number];

/** Company-scoped canonicalization entries (e.g. "субару" → "Subaru") learned over time. */
export type CompanyDictionaryEntry = {
  id: string;
  companyId: string;
  category: CompanyDictionaryCategory;
  /** Normalized lookup key (see `normalizeKey`). */
  key: string;
  canonicalValue: string;
  aliases: string[];
  occurrences: number;
  createdAt: Date;
  updatedAt: Date;
};
