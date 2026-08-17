import { useMemo } from 'react';

import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useOperationsRealtime } from '@/hooks/use-operations-realtime';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useSession } from '@/hooks/use-session';
import { useWorkOrdersRealtime } from '@/hooks/use-work-orders-realtime';
import { useAuthStore } from '@/store/auth-store';
import type { FinancialOperation } from '@/types/financial-operation';

import { buildFinanceModel } from '../lib/build-finance-model';
import { datedOperations } from '../lib/series';
import { useFinancePeriodStore } from '../store/finance-period-store';
import type { FinanceModel, FinancePeriodId } from '../types';

export type UseFinanceModelResult = {
  model: FinanceModel;
  period: FinancePeriodId;
  setPeriod: (period: FinancePeriodId) => void;
  /** Every profit-affecting operation, newest first — the ledger drill-downs read this. */
  operations: FinancialOperation[];
  workOrderNumbers: Record<string, string>;
  isBootstrapping: boolean;
  /** No operations at all, ever — not just none in the selected window. */
  isEmptyLedger: boolean;
  errorMessage: string | null;
  isOnline: boolean;
  canView: boolean;
  canEdit: boolean;
  moduleEnabled: boolean;
  companyId: string | null;
};

/**
 * Single entry point for every Finance surface. The realtime queries underneath
 * are keyed and kept alive by react-query, so a drill-down joins the listeners
 * the overview already opened rather than starting its own.
 */
export function useFinanceModel(): UseFinanceModelResult {
  const { companyId, uid, can } = useSession();
  const rbac = useRbacPolicy();
  const moduleEnabled = useCompanyModuleEnabled('accounting');
  const canView = can('accounting_view') && moduleEnabled;
  const canEdit = can('accounting_edit');
  const isOnline = useAuthStore((state) => state.isOnline);

  const period = useFinancePeriodStore((state) => state.period);
  const setPeriod = useFinancePeriodStore((state) => state.setPeriod);

  const liveCompanyId = canView && companyId ? companyId : null;

  const {
    operations,
    isBootstrapping: operationsBootstrapping,
    errorMessage,
  } = useOperationsRealtime(liveCompanyId, { keepAlive: true });

  const { payroll } = usePayrollTransactionsRealtime(liveCompanyId, {
    keepAlive: true,
    scope: rbac.scopes.payroll,
    employeeId: uid,
  });

  const { domainOrders } = useWorkOrdersRealtime(liveCompanyId, { keepAlive: true });

  const workOrderNumbers = useMemo(() => {
    const map: Record<string, string> = {};
    for (const order of domainOrders) {
      map[order.id] = order.number ? `№${order.number}` : order.id;
    }
    return map;
  }, [domainOrders]);

  const model = useMemo(
    () =>
      buildFinanceModel({
        operations,
        payroll,
        orders: domainOrders,
        workOrderNumbers,
        period,
      }),
    [domainOrders, operations, payroll, period, workOrderNumbers],
  );

  return {
    model,
    period,
    setPeriod,
    operations,
    workOrderNumbers,
    isBootstrapping: Boolean(liveCompanyId) && operationsBootstrapping && operations.length === 0,
    isEmptyLedger: !operationsBootstrapping && operations.length === 0,
    errorMessage,
    isOnline,
    canView,
    canEdit,
    moduleEnabled,
    companyId: companyId ?? null,
  };
}

/** Window-scoped operations for a drill-down, newest first. */
export function useWindowOperations(model: FinanceModel, operations: FinancialOperation[]) {
  return useMemo(() => {
    const from = model.window.from.getTime();
    const to = model.window.to.getTime();
    return datedOperations(operations)
      .filter((entry) => {
        const ts = entry.at.getTime();
        return ts >= from && ts < to;
      })
      .sort((left, right) => right.at.getTime() - left.at.getTime());
  }, [model.window.from, model.window.to, operations]);
}
