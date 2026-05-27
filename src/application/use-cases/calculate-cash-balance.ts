import { FinancialOperation } from "@/domain/financial-operation";

export type BalanceSnapshot = {
  cashbox: number;
  kaspi: number;
  total: number;
};

const outgoingTypes = new Set(["expense", "refund"]);
const incomingTypes = new Set(["income", "sale"]);

export function calculateCashBalanceUseCase(operations: FinancialOperation[]): BalanceSnapshot {
  let cashbox = 0;
  let kaspi = 0;

  for (const operation of operations) {
    const sign = outgoingTypes.has(operation.type)
      ? -1
      : incomingTypes.has(operation.type)
        ? 1
        : 0;

    if (operation.account === "cashbox") {
      cashbox += operation.amount * sign;
    } else if (operation.account === "kaspi") {
      kaspi += operation.amount * sign;
    }
  }

  return {
    cashbox,
    kaspi,
    total: cashbox + kaspi,
  };
}
