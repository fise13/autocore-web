import { useMemo } from 'react';

import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { calculateCashBalance } from '@/lib/accounting/calculate-cash-balance';
import { computeAccountingSnapshot } from '@/lib/accounting/compute-accounting-snapshot';
import { isRealtimeReady } from '@/lib/realtime/subscription-registry';
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
 * Live accounting mirrored from SessionRealtimeHead keepAlive catalogs.
 * Never opens its own Firestore listeners (avoids racing the heavy delay and
 * focus flicker that previously blanked charts / showed "No workspace").
 */
export function useAccountingData(): UseAccountingDataResult {
  const { companyId, uid, can } = useSession();
  const rbac = useRbacPolicy();
  const accountingEnabled = useCompanyModuleEnabled('accounting');
  const canView = can('accounting_view') && accountingEnabled;
  const canEdit = can('accounting_edit');
  const sessionReady = Boolean(companyId) && accountingEnabled;

  const operations = useSessionQueryData<FinancialOperation[]>(
    ['realtime', 'financial-operations', companyId],
    sessionReady,
    [],
  );
  const payroll = useSessionQueryData<PayrollTransaction[]>(
    ['realtime', 'payroll-transactions', companyId, rbac.scopes.payroll, uid],
    sessionReady,
    [],
  );

  const opsReady =
    Boolean(companyId) &&
    isRealtimeReady(['realtime', 'financial-operations', companyId]);
  const isDemo = false;
  const isBootstrapping = sessionReady && !opsReady && operations.length === 0;
  const isEmpty = opsReady && operations.length === 0 && payroll.length === 0;
  const errorMessage = null;

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
    enabled: sessionReady,
    canView,
    canEdit,
  };
}
