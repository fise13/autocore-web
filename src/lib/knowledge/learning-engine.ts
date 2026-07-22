import type {
  KnowledgeEvent,
  KnowledgePatternKind,
  KnowledgePatternUpsertOp,
} from "@/domain/knowledge/types";
import { buildPatternId, buildScopedPatternId } from "@/lib/knowledge/pattern-ids";

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function readStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return out;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function fieldOpsFromRecord(
  fields: Record<string, string>,
  scope: "company" = "company",
): KnowledgePatternUpsertOp[] {
  return Object.entries(fields).map(([fieldKey, fieldValue]) => ({
    id: buildPatternId("field", [fieldKey, fieldValue]),
    kind: "field",
    scope,
    keys: [fieldKey, fieldValue],
    label: fieldValue,
    incrementSupport: 1,
    incrementTotal: 1,
    metadata: { fieldKey },
  }));
}

function patternsFromWorkOrderCompleted(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const engineCode = readString(payload.engineCode) ?? fact.engineCode;
  const partSkus = [...new Set(readStringArray(payload.partSkus))];
  const partNames = readStringRecord(payload.partNames);
  const laborTitles = [...new Set(readStringArray(payload.laborTitles))];
  const explicitMechanicIds = readStringArray(payload.mechanicIds);
  const mechanicIds =
    explicitMechanicIds.length > 0 ? explicitMechanicIds : fact.mechanicId ? [fact.mechanicId] : [];

  const ops: KnowledgePatternUpsertOp[] = [];

  if (engineCode) {
    for (const sku of partSkus) {
      ops.push({
        id: buildPatternId("kit", [engineCode, sku]),
        kind: "kit",
        scope: "company",
        keys: [engineCode, sku],
        label: partNames[sku] ?? sku,
        incrementSupport: 1,
        incrementTotal: 1,
        metadata: { engineCode, sku },
      });
    }
    for (const title of laborTitles) {
      ops.push({
        id: buildPatternId("kit", [engineCode, `labor:${title}`]),
        kind: "kit",
        scope: "company",
        keys: [engineCode, `labor:${title}`],
        label: title,
        incrementSupport: 1,
        incrementTotal: 1,
        metadata: { engineCode, laborTitle: title },
      });
    }
  }

  for (let i = 0; i < partSkus.length; i += 1) {
    for (let j = i + 1; j < partSkus.length; j += 1) {
      const pair = [partSkus[i], partSkus[j]].sort();
      ops.push({
        id: buildPatternId("cooccur", pair),
        kind: "cooccur",
        scope: "company",
        keys: pair,
        label: `${partNames[pair[0]] ?? pair[0]} + ${partNames[pair[1]] ?? pair[1]}`,
        incrementSupport: 1,
        incrementTotal: 1,
        metadata: { skus: pair },
      });
    }
  }

  if (fact.clientId) {
    if (engineCode) {
      ops.push({
        id: buildScopedPatternId("client_prefs", "client", fact.clientId, [engineCode]),
        kind: "client_prefs",
        scope: "client",
        scopeId: fact.clientId,
        keys: [engineCode],
        label: engineCode,
        incrementSupport: 1,
        incrementTotal: 1,
      });
    }
    for (const sku of partSkus) {
      ops.push({
        id: buildScopedPatternId("client_prefs", "client", fact.clientId, [sku]),
        kind: "client_prefs",
        scope: "client",
        scopeId: fact.clientId,
        keys: [sku],
        label: partNames[sku] ?? sku,
        incrementSupport: 1,
        incrementTotal: 1,
      });
    }
  }

  if (engineCode) {
    for (const mechanicId of mechanicIds) {
      for (const sku of partSkus) {
        ops.push({
          id: buildScopedPatternId("mechanic", "mechanic", mechanicId, [engineCode, sku]),
          kind: "mechanic",
          scope: "mechanic",
          scopeId: mechanicId,
          keys: [engineCode, sku],
          label: partNames[sku] ?? sku,
          incrementSupport: 1,
          incrementTotal: 1,
        });
      }
    }
  }

  ops.push(...fieldOpsFromRecord(readStringRecord(payload.fieldValues)));

  return ops;
}

function patternsFromMotorSold(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const engineCode = readString(payload.engineCode) ?? fact.engineCode;
  if (!engineCode) return [];

  const ops: KnowledgePatternUpsertOp[] = [];

  if (fact.clientId) {
    ops.push({
      id: buildScopedPatternId("client_prefs", "client", fact.clientId, [engineCode]),
      kind: "client_prefs",
      scope: "client",
      scopeId: fact.clientId,
      keys: [engineCode],
      label: engineCode,
      incrementSupport: 1,
      incrementTotal: 1,
    });
  }

  if (fact.mechanicId) {
    ops.push({
      id: buildScopedPatternId("mechanic", "mechanic", fact.mechanicId, [engineCode, "sale"]),
      kind: "mechanic",
      scope: "mechanic",
      scopeId: fact.mechanicId,
      keys: [engineCode, "sale"],
      label: engineCode,
      incrementSupport: 1,
      incrementTotal: 1,
    });
  }

  return ops;
}

function patternsFromInventorySoldTogether(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const skus = [...new Set(readStringArray(fact.payload?.skus))];
  const ops: KnowledgePatternUpsertOp[] = [];

  for (let i = 0; i < skus.length; i += 1) {
    for (let j = i + 1; j < skus.length; j += 1) {
      const pair = [skus[i], skus[j]].sort();
      ops.push({
        id: buildPatternId("fbt", pair),
        kind: "fbt",
        scope: "company",
        keys: pair,
        label: pair.join(" + "),
        incrementSupport: 1,
        incrementTotal: 1,
        metadata: { skus: pair },
      });
    }
  }

  return ops;
}

function patternsFromFieldCommitted(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const fieldKey = readString(payload.fieldKey);
  const fieldValue = readString(payload.fieldValue);
  if (!fieldKey || !fieldValue) return [];

  const contextKey = readString(payload.contextKey);
  const keys = contextKey ? [fieldKey, contextKey, fieldValue] : [fieldKey, fieldValue];
  const isPersonal = payload.scope === "personal" && Boolean(fact.actorUserId);

  if (isPersonal && fact.actorUserId) {
    return [
      {
        id: buildScopedPatternId("field", "personal", fact.actorUserId, keys),
        kind: "field",
        scope: "personal",
        scopeId: fact.actorUserId,
        keys,
        label: fieldValue,
        incrementSupport: 1,
        incrementTotal: 1,
        metadata: { fieldKey, contextKey },
      },
    ];
  }

  return [
    {
      id: buildPatternId("field", keys),
      kind: "field",
      scope: "company",
      keys,
      label: fieldValue,
      incrementSupport: 1,
      incrementTotal: 1,
      metadata: { fieldKey, contextKey },
    },
  ];
}

function patternsFromSuggestionFeedback(fact: KnowledgeEvent, accepted: boolean): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const patternId = readString(payload.patternId);
  const kind = readString(payload.kind) as KnowledgePatternKind | undefined;
  if (!patternId || !kind) return [];

  // Reinforce the exact pattern behind the suggestion: acceptance is a success,
  // rejection only grows the denominator (drags confidence down without deleting history).
  // scope/keys/label are ignored by the repository when the pattern doc already exists.
  return [
    {
      id: patternId,
      kind,
      scope: "company",
      keys: [],
      incrementSupport: accepted ? 1 : 0,
      incrementTotal: 1,
    },
  ];
}

function patternsFromImportCorrection(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const column = readString(payload.column);
  const fromValue = readString(payload.fromValue);
  const toValue = readString(payload.toValue);
  if (!column || !fromValue || !toValue) return [];

  const keys = [column, fromValue];
  return [
    {
      id: buildPatternId("import_rule", keys),
      kind: "import_rule",
      scope: "company",
      keys,
      label: toValue,
      incrementSupport: 1,
      incrementTotal: 1,
      metadata: { column, fromValue, toValue, sheet: readString(payload.sheet) },
    },
  ];
}

function patternsFromOcrConfirm(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const fieldKey = readString(payload.fieldKey);
  const rawText = readString(payload.rawText);
  const confirmedValue = readString(payload.confirmedValue);
  if (!fieldKey || !rawText || !confirmedValue) return [];

  const keys = [fieldKey, rawText];
  return [
    {
      id: buildPatternId("ocr_confirm", keys),
      kind: "ocr_confirm",
      scope: "company",
      keys,
      label: confirmedValue,
      incrementSupport: 1,
      incrementTotal: 1,
      metadata: { fieldKey },
    },
  ];
}

function patternsFromSearchQuery(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const query = readString(payload.query);
  const selectedResultId = readString(payload.selectedResultId);
  if (!query || !selectedResultId) return [];

  const resultType = readString(payload.resultType);
  return [
    {
      id: buildPatternId("search_boost", [query, selectedResultId]),
      kind: "search_boost",
      scope: "company",
      keys: [query, selectedResultId],
      label: resultType ?? selectedResultId,
      incrementSupport: 1,
      incrementTotal: 1,
      metadata: { query, resultType },
    },
  ];
}

function patternsFromDocumentPrinted(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const docTypes = [...new Set(readStringArray(payload.docTypes))].sort();
  if (docTypes.length < 2) return [];

  const engineCode = readString(payload.engineCode) ?? fact.engineCode;
  const keys = engineCode ? [engineCode, ...docTypes] : docTypes;
  return [
    {
      id: buildPatternId("docpack", keys),
      kind: "docpack",
      scope: "company",
      keys,
      label: docTypes.join(" + "),
      incrementSupport: 1,
      incrementTotal: 1,
      metadata: { docTypes, engineCode },
    },
  ];
}

function patternsFromStockDepletion(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  const payload = fact.payload ?? {};
  const sku = readString(payload.sku);
  const coDepleted = readStringArray(payload.coDepletedSkus);
  if (!sku || coDepleted.length === 0) return [];

  return coDepleted.map((other) => {
    const pair = [sku, other].sort();
    return {
      id: buildPatternId("stock_codeplete", pair),
      kind: "stock_codeplete",
      scope: "company",
      keys: pair,
      label: pair.join(" + "),
      incrementSupport: 1,
      incrementTotal: 1,
      metadata: { skus: pair },
    };
  });
}

/**
 * Translate one observed `KnowledgeEvent` into the set of pattern counter
 * increments it supports. Pure and side-effect free — callers (the admin
 * `processEvent` pipeline) are responsible for persisting the resulting ops.
 */
export function applyFactToPatterns(fact: KnowledgeEvent): KnowledgePatternUpsertOp[] {
  switch (fact.type) {
    case "wo.completed":
      return patternsFromWorkOrderCompleted(fact);
    case "motor.sold":
      return patternsFromMotorSold(fact);
    case "inventory.sold_together":
      return patternsFromInventorySoldTogether(fact);
    case "field.committed":
      return patternsFromFieldCommitted(fact);
    case "suggestion.accepted":
      return patternsFromSuggestionFeedback(fact, true);
    case "suggestion.rejected":
      return patternsFromSuggestionFeedback(fact, false);
    case "import.cell_corrected":
      return patternsFromImportCorrection(fact);
    case "ocr.line_confirmed":
      return patternsFromOcrConfirm(fact);
    case "search.query":
      return patternsFromSearchQuery(fact);
    case "document.printed":
      return patternsFromDocumentPrinted(fact);
    case "stock.depleted":
      return patternsFromStockDepletion(fact);
    case "wo.created":
      // Signal-only for now — no counters until the order actually completes.
      return [];
    default:
      return [];
  }
}
