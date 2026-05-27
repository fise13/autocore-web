import { FinancialOperation, OperationType } from "@/domain/financial-operation";

const ADVANCE_KEYWORDS = ["аванс", "предоплата", "prepayment", "advance", "задаток", "депозит"];

export type AdvanceDirection = "all" | "received" | "paid";

export type AdvanceSnapshot = {
  received: number;
  paid: number;
  balance: number;
  operations: FinancialOperation[];
  totalCount: number;
};

function isAdvanceText(value: string | null | undefined): boolean {
  const lower = (value ?? "").trim().toLowerCase();
  if (!lower) return false;
  return ADVANCE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function isAdvanceOperation(operation: FinancialOperation): boolean {
  return (
    isAdvanceText(operation.category) ||
    isAdvanceText(operation.comment) ||
    isAdvanceText(operation.description) ||
    isAdvanceText(operation.details) ||
    isAdvanceText(operation.source)
  );
}

export function isAdvanceReceived(operation: FinancialOperation): boolean {
  return operation.type === "income" || operation.type === "sale";
}

export function isAdvancePaid(operation: FinancialOperation): boolean {
  return operation.type === "expense" || operation.type === "refund";
}

export function filterAdvanceOperations(
  operations: FinancialOperation[],
  direction: AdvanceDirection = "all",
): FinancialOperation[] {
  const advances = operations.filter(isAdvanceOperation);
  if (direction === "received") {
    return advances.filter(isAdvanceReceived);
  }
  if (direction === "paid") {
    return advances.filter(isAdvancePaid);
  }
  return advances;
}

export function buildAdvanceSnapshot(operations: FinancialOperation[]): AdvanceSnapshot {
  const advanceOps = operations.filter(isAdvanceOperation);
  const receivedOps = advanceOps.filter(isAdvanceReceived);
  const paidOps = advanceOps.filter(isAdvancePaid);

  const received = receivedOps.reduce((sum, item) => sum + item.amount, 0);
  const paid = paidOps.reduce((sum, item) => sum + item.amount, 0);

  return {
    received,
    paid,
    balance: received - paid,
    operations: advanceOps,
    totalCount: advanceOps.length,
  };
}

export function appendAdvanceMarker(category: string, comment: string): {
  category: string;
  comment: string;
} {
  const trimmedCategory = category.trim();
  const trimmedComment = comment.trim();
  const categoryHasMarker = isAdvanceText(trimmedCategory);
  const commentHasMarker = isAdvanceText(trimmedComment);

  return {
    category:
      trimmedCategory && !categoryHasMarker ? `${trimmedCategory} · аванс` : trimmedCategory || "аванс",
    comment: commentHasMarker
      ? trimmedComment
      : [trimmedComment, "аванс"].filter(Boolean).join(trimmedCategory ? " · " : ""),
  };
}

export function advanceDirectionLabel(direction: AdvanceDirection): string {
  switch (direction) {
    case "received":
      return "Полученные";
    case "paid":
      return "Выданные";
    default:
      return "Все";
  }
}

export function isIncomingOperationType(type: OperationType): boolean {
  return type === "income" || type === "sale";
}
