import type { KnowledgeEventDraft, KnowledgePatternKind } from "@/domain/knowledge/types";

function compactRecord(record: Record<string, string | undefined | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

function dedupeTrimmed(values: (string | undefined | null)[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) out.add(trimmed);
  }
  return [...out];
}

export type WorkOrderCompletedFact = {
  companyId: string;
  workOrderId: string;
  actorUserId?: string;
  clientId?: string;
  vehicleId?: string;
  mechanicIds?: string[];
  engineCode?: string;
  brandName?: string;
  partSkus?: string[];
  partNames?: Record<string, string>;
  laborTitles?: string[];
  fieldValues?: Record<string, string | undefined | null>;
};

/** A completed work order is the richest signal: parts, labor and field values used together. */
export function fromWorkOrderCompleted(fact: WorkOrderCompletedFact): KnowledgeEventDraft {
  const mechanicIds = dedupeTrimmed(fact.mechanicIds ?? []);
  return {
    companyId: fact.companyId,
    type: "wo.completed",
    actorUserId: fact.actorUserId,
    clientId: fact.clientId,
    mechanicId: mechanicIds[0],
    vehicleId: fact.vehicleId,
    workOrderId: fact.workOrderId,
    engineCode: fact.engineCode,
    brandName: fact.brandName,
    payload: {
      engineCode: fact.engineCode,
      brandName: fact.brandName,
      mechanicIds,
      partSkus: dedupeTrimmed(fact.partSkus ?? []),
      partNames: fact.partNames ?? {},
      laborTitles: dedupeTrimmed(fact.laborTitles ?? []),
      fieldValues: compactRecord(fact.fieldValues ?? {}),
    },
  };
}

export type WorkOrderCreatedFact = {
  companyId: string;
  workOrderId: string;
  actorUserId?: string;
  clientId?: string;
  vehicleId?: string;
  engineCode?: string;
};

/** Recorded for funnel visibility (created → completed); no counters yet in E0–E1. */
export function fromWorkOrderCreated(fact: WorkOrderCreatedFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "wo.created",
    actorUserId: fact.actorUserId,
    clientId: fact.clientId,
    vehicleId: fact.vehicleId,
    workOrderId: fact.workOrderId,
    engineCode: fact.engineCode,
    payload: { engineCode: fact.engineCode },
  };
}

export type MotorSoldFact = {
  companyId: string;
  motorId: string;
  actorUserId?: string;
  clientId?: string;
  mechanicId?: string;
  workOrderId?: string;
  engineCode?: string;
  brandName?: string;
  price?: number;
};

export function fromMotorSold(fact: MotorSoldFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "motor.sold",
    actorUserId: fact.actorUserId,
    clientId: fact.clientId,
    mechanicId: fact.mechanicId,
    workOrderId: fact.workOrderId,
    engineCode: fact.engineCode,
    brandName: fact.brandName,
    payload: {
      motorId: fact.motorId,
      engineCode: fact.engineCode,
      brandName: fact.brandName,
      price: typeof fact.price === "number" ? fact.price : undefined,
    },
  };
}

export type FieldCommitFact = {
  companyId: string;
  actorUserId?: string;
  workOrderId?: string;
  fieldKey: string;
  fieldValue: string;
  /** Narrows the field pattern to a subject, e.g. an engine code or doc type. */
  contextKey?: string;
  /** "personal" ties the pattern to `actorUserId`; default is company-wide. */
  scope?: "personal" | "company";
};

export function fromFieldCommit(fact: FieldCommitFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "field.committed",
    actorUserId: fact.actorUserId,
    workOrderId: fact.workOrderId,
    payload: {
      fieldKey: fact.fieldKey,
      fieldValue: fact.fieldValue,
      contextKey: fact.contextKey,
      scope: fact.scope ?? "company",
    },
  };
}

export type SuggestionFeedbackFact = {
  companyId: string;
  actorUserId?: string;
  suggestionId: string;
  patternId: string;
  kind: KnowledgePatternKind;
  accepted: boolean;
};

export function fromSuggestionFeedback(fact: SuggestionFeedbackFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: fact.accepted ? "suggestion.accepted" : "suggestion.rejected",
    actorUserId: fact.actorUserId,
    payload: {
      suggestionId: fact.suggestionId,
      patternId: fact.patternId,
      kind: fact.kind,
    },
  };
}

export type DocumentPrintedFact = {
  companyId: string;
  actorUserId?: string;
  workOrderId?: string;
  engineCode?: string;
  docTypes: string[];
};

export function fromDocumentPrinted(fact: DocumentPrintedFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "document.printed",
    actorUserId: fact.actorUserId,
    workOrderId: fact.workOrderId,
    engineCode: fact.engineCode,
    payload: {
      docTypes: dedupeTrimmed(fact.docTypes),
      engineCode: fact.engineCode,
    },
  };
}

export type ImportCorrectionFact = {
  companyId: string;
  actorUserId?: string;
  column: string;
  fromValue: string;
  toValue: string;
  sheet?: string;
};

export function fromImportCorrection(fact: ImportCorrectionFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "import.cell_corrected",
    actorUserId: fact.actorUserId,
    payload: {
      column: fact.column,
      fromValue: fact.fromValue,
      toValue: fact.toValue,
      sheet: fact.sheet,
    },
  };
}

export type OcrConfirmFact = {
  companyId: string;
  actorUserId?: string;
  fieldKey: string;
  rawText: string;
  confirmedValue: string;
};

export function fromOcrConfirm(fact: OcrConfirmFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "ocr.line_confirmed",
    actorUserId: fact.actorUserId,
    payload: {
      fieldKey: fact.fieldKey,
      rawText: fact.rawText,
      confirmedValue: fact.confirmedValue,
    },
  };
}

export type SearchQueryFact = {
  companyId: string;
  actorUserId?: string;
  query: string;
  selectedResultId?: string;
  resultType?: string;
};

export function fromSearchQuery(fact: SearchQueryFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "search.query",
    actorUserId: fact.actorUserId,
    payload: {
      query: fact.query,
      selectedResultId: fact.selectedResultId,
      resultType: fact.resultType,
    },
  };
}

export type StockDepletionFact = {
  companyId: string;
  sku: string;
  /** SKUs that also ran dry in the same window — feeds `stock_codeplete` patterns. */
  coDepletedSkus?: string[];
};

export function fromStockDepletion(fact: StockDepletionFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "stock.depleted",
    payload: {
      sku: fact.sku,
      coDepletedSkus: dedupeTrimmed(fact.coDepletedSkus ?? []),
    },
  };
}

export type InventorySoldTogetherFact = {
  companyId: string;
  workOrderId?: string;
  actorUserId?: string;
  skus: string[];
};

/** Two or more items rang up (or were consumed on a work order) in the same transaction. */
export function fromInventorySoldTogether(fact: InventorySoldTogetherFact): KnowledgeEventDraft {
  return {
    companyId: fact.companyId,
    type: "inventory.sold_together",
    actorUserId: fact.actorUserId,
    workOrderId: fact.workOrderId,
    payload: {
      skus: dedupeTrimmed(fact.skus),
    },
  };
}
