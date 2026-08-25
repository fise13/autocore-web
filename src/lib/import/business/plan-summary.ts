import type {
  ImportEntityKind,
  ImportPlan,
  PlanAction,
  RelationshipKind,
  ReviewReason,
} from "./contracts";
import type { AiStatus } from "./pipeline";

/**
 * The plan, phrased for a person.
 *
 * The old preview was a mapping table: which column the import decided to put
 * where, row after row. Nobody has ever wanted to know that. The question
 * being asked at that moment is "what is about to appear in my database", and
 * this answers it — counts by entity, what will be updated rather than
 * created, how the records connect, and the short list of things that
 * genuinely need a human.
 *
 * Pure — the UI renders this, it does not compute it.
 */

export type PlanHeadline = {
  kind: ImportEntityKind;
  label: string;
  create: number;
  update: number;
  review: number;
  total: number;
};

export type PlanRelationshipLine = {
  kind: RelationshipKind;
  label: string;
  count: number;
};

export type ReviewItem = {
  entityId: string;
  kind: ImportEntityKind;
  title: string;
  reasons: ReviewReason[];
  /** Where in the file this came from, so a person can go and look. */
  sources: string[];
  confidencePercent: number;
};

export type PlanPresentation = {
  headlines: PlanHeadline[];
  relationships: PlanRelationshipLine[];
  /** Rows discovery refused to treat as data — totals, headings, notes. */
  ignoredRows: number;
  createTotal: number;
  updateTotal: number;
  reviewTotal: number;
  /** Understood but not writable yet, named rather than silently dropped. */
  deferred: Array<{ kind: ImportEntityKind; label: string; count: number }>;
  reviewItems: ReviewItem[];
  ai: {
    used: boolean;
    /** True when a provider was configured but contributed nothing. */
    degraded: boolean;
    provider: string;
    sheetSummaries: Array<{ table: string; summary: string }>;
  };
};

const ENTITY_LABELS: Record<ImportEntityKind, string> = {
  donor: "Доноры",
  engine: "Двигатели",
  usedPart: "Б/у детали",
  stockItem: "Склад",
  sale: "Продажи",
  customer: "Клиенты",
  supplier: "Поставщики",
  expense: "Расходы",
  unknown: "Не определено",
};

const RELATIONSHIP_LABELS: Record<RelationshipKind, string> = {
  "part-of-donor": "деталей привязано к донорам",
  "engine-of-donor": "двигателей привязано к донорам",
  "sale-of-part": "продаж привязано к деталям",
  "sale-to-customer": "продаж привязано к клиентам",
};

function titleFor(plan: ImportPlan, action: PlanAction): string {
  const entity = plan.entities[action.entityId];
  if (!entity) return action.entityId;
  const parts = ["name", "brand", "model", "year", "serial", "vin"] as const;
  const summary = parts
    .map((field) => entity.values[field]?.normalized)
    .filter(Boolean)
    .join(" · ");
  return summary || ENTITY_LABELS[entity.kind];
}

export function presentPlan(plan: ImportPlan, ai?: AiStatus): PlanPresentation {
  const headlines: PlanHeadline[] = [];
  let createTotal = 0;
  let updateTotal = 0;
  let reviewTotal = 0;

  for (const [kind, tally] of Object.entries(plan.summary.byKind) as Array<
    [ImportEntityKind, ImportPlan["summary"]["byKind"][ImportEntityKind]]
  >) {
    const total = tally.create + tally.update + tally.merge + tally.review;
    if (total === 0) continue;
    createTotal += tally.create;
    updateTotal += tally.update;
    reviewTotal += tally.review;
    headlines.push({
      kind,
      label: ENTITY_LABELS[kind],
      create: tally.create,
      update: tally.update,
      review: tally.review,
      total,
    });
  }
  headlines.sort((a, b) => b.total - a.total);

  const relationships: PlanRelationshipLine[] = (
    Object.entries(plan.summary.relationships) as Array<[RelationshipKind, number]>
  )
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({ kind, label: RELATIONSHIP_LABELS[kind], count }));

  const deferred = plan.summary.deferred.map((kind) => ({
    kind,
    label: ENTITY_LABELS[kind],
    count: plan.actions.filter((action) => action.kind === kind).length,
  }));

  // Exception-based: a record is here because something about it is genuinely
  // undecidable, not because its score fell under an arbitrary line.
  const reviewItems: ReviewItem[] = plan.actions
    .filter((action) => action.verb === "review" && action.review.length > 0)
    .map((action) => ({
      entityId: action.entityId,
      kind: action.kind,
      title: titleFor(plan, action),
      reasons: action.review,
      sources: (plan.entities[action.entityId]?.sources ?? []).map(
        (source) => `${source.table}, строка ${source.index + 1}`,
      ),
      confidencePercent: Math.round(action.decision.confidence * 100),
    }));

  return {
    headlines,
    relationships,
    ignoredRows: plan.summary.ignoredRows,
    createTotal,
    updateTotal,
    reviewTotal,
    deferred,
    reviewItems,
    ai: {
      used: Boolean(ai?.configured && !ai.degraded),
      degraded: Boolean(ai?.degraded),
      provider: ai?.provider ?? "none",
      sheetSummaries: (ai?.sheetSummaries ?? []).map((entry) => ({
        table: entry.table,
        summary: entry.summary,
      })),
    },
  };
}
