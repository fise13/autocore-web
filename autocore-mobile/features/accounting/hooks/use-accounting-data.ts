import { useMemo } from 'react';

import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useOperationsRealtime } from '@/hooks/use-operations-realtime';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useSession } from '@/hooks/use-session';
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import { computeAccountingSnapshot } from '@/lib/accounting/compute-accounting-snapshot';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransaction } from '@/types/payroll-transaction';

import type { AccountingSnapshot } from '../types';
import type { BalanceSnapshot } from '@/lib/accounting/calculate-cash-balance';

export type UseAccountingDataResult = {
  data: AccountingSnapshot;
  operations: FinancialOperation[];
  payroll: PayrollTransaction[];
  operationCount: number;
  balanceSnapshot: BalanceSnapshot;
  isBootstrapping: boolean;
  isEmpty: boolean;
  isDemo: boolean;
  errorMessage: string | null;
  enabled: boolean;
  canView: boolean;
  canEdit: boolean;
};

/**
 * Live accounting only — never silently fill demo balances.
 * Companies without data show empty state, not fake numbers.
 */
export function useAccountingData(): UseAccountingDataResult {
  const { companyId, can } = useSession();
  const accountingEnabled = useCompanyModuleEnabled('accounting');
  const canView = can('accounting_view') && accountingEnabled;

  const {
    operations,
    isBootstrapping: operationsLoading,
    errorMessage: operationsError,
    enabled: operationsEnabled,
  } = useOperationsRealtime(companyId);

  const {
    payroll,
    isBootstrapping: payrollLoading,
    errorMessage: payrollError,
    enabled: payrollEnabled,
  } = usePayrollTransactionsRealtime(companyId);

  const isDemo = false;
  const isBootstrapping = Boolean(companyId) && (operationsLoading || payrollLoading);
  const isEmpty = !isBootstrapping && operations.length === 0 && payroll.length === 0;
  const errorMessage = operationsError ?? payrollError;
  const canEdit = can('accounting_edit');

  const balanceSnapshot = useMemo<BalanceSnapshot>(() => {
    if (!companyId) return { cashbox: 0, kaspi: 0, total: 0 };
    return calculateCashBalance(operations);
  }, [companyId, operations]);

  const data = useMemo(
    () => computeAccountingSnapshot({ operations, payroll }),
    [operations, payroll],
  );

  return {
    data,
    operations,
    payroll,
    operationCount: operations.length,
    balanceSnapshot,
    isBootstrapping,
    isEmpty,
    isDemo,
    errorMessage,
    enabled: operationsEnabled && payrollEnabled,
    canView,
    canEdit,
  };
}
