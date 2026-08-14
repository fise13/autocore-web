import { useMemo } from 'react';

import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useOperationsRealtime } from '@/hooks/use-operations-realtime';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useSession } from '@/hooks/use-session';
import { calculateCashBalance, type BalanceSnapshot } from '@/lib/accounting/calculate-cash-balance';
import { computeAccountingSnapshot } from '@/lib/accounting/compute-accounting-snapshot';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransaction } from '@/types/payroll-transaction';

import type { AccountingSnapshot } from '../types';

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
 * Finance opens the operations listener itself (shared keepAlive registry).
 * Mirroring SessionRealtimeHead cache alone never re-rendered when the first
 * snapshot was empty or untrusted, so the tab stayed on skeleton forever.
 */
export function useAccountingData(): UseAccountingDataResult {
  const { companyId, uid, can } = useSession();
  const rbac = useRbacPolicy();
  const accountingEnabled = useCompanyModuleEnabled('accounting');
  const canView = can('accounting_view') && accountingEnabled;
  const canEdit = can('accounting_edit');
  const liveCompanyId = canView && companyId ? companyId : null;

  const {
    operations,
    isBootstrapping: opsBootstrapping,
    errorMessage,
    enabled,
  } = useOperationsRealtime(liveCompanyId, { keepAlive: true });

  const { payroll } = usePayrollTransactionsRealtime(liveCompanyId, {
    keepAlive: true,
    scope: rbac.scopes.payroll,
    employeeId: uid,
  });

  const isBootstrapping = Boolean(liveCompanyId) && opsBootstrapping;
  const isEmpty = !opsBootstrapping && operations.length === 0 && payroll.length === 0;

  const balanceSnapshot = useMemo<BalanceSnapshot>(() => {
    if (!liveCompanyId) return { cashbox: 0, kaspi: 0, total: 0 };
    return calculateCashBalance(operations);
  }, [liveCompanyId, operations]);

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
    isDemo: false,
    errorMessage,
    enabled,
    canView,
    canEdit,
  };
}
