import type { FinancialOperation } from '@/types/financial-operation';
import { accumulateOperationBalance } from '@/lib/accounting/mixed-payment';

export type BalanceSnapshot = {
  cashbox: number;
  kaspi: number;
  total: number;
};

export function calculateCashBalance(operations: FinancialOperation[]): BalanceSnapshot {
  const balances = { cashbox: 0, kaspi: 0 };

  for (const operation of operations) {
    accumulateOperationBalance(operation, balances);
  }

  return {
    cashbox: balances.cashbox,
    kaspi: balances.kaspi,
    total: balances.cashbox + balances.kaspi,
  };
}
