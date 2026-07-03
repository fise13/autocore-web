import { useMemo } from 'react';

import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useOperationsRealtime } from '@/hooks/use-operations-realtime';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useSession } from '@/hooks/use-session';
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import { computeAccountingSnapshot } from '@/lib/accounting/compute-accounting-snapshot';
import { isProductionCompanyId } from '@/lib/company-id';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransaction } from '@/types/payroll-transaction';

import { demoAccountingSnapshot } from '../data/demo-accounting';
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

export function useAccountingData(): UseAccountingDataResult {
  const { companyId, profile, can } = useSession();
  const accountingEnabled = useCompanyModuleEnabled('accounting');
  const production = isProductionCompanyId(companyId);
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

  const isDemo = !production;
  const isBootstrapping = production && (operationsLoading || payrollLoading);
  const isEmpty = production && !isBootstrapping && operations.length === 0 && payroll.length === 0;
  const errorMessage = operationsError ?? payrollError;
  const canEdit = can('accounting_edit');

  const balanceSnapshot = useMemo<BalanceSnapshot>(() => {
    if (production) return calculateCashBalance(operations);
    return {
      cashbox: demoAccountingSnapshot.balance.available * 0.62,
      kaspi: demoAccountingSnapshot.balance.available * 0.38,
      total: demoAccountingSnapshot.balance.available,
    };
  }, [operations, production]);

  const data = useMemo(() => {
    if (!production) return demoAccountingSnapshot;
    return computeAccountingSnapshot({ operations, payroll });
  }, [operations, payroll, production]);

  return {
    data,
    operations: production ? operations : [],
    payroll: production ? payroll : [],
    operationCount: production ? operations.length : demoAccountingSnapshot.transactions.length,
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
