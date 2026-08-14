import { useCallback, useMemo, useState } from 'react';

import { toast } from '@/components/ui';
import { useEmployeesRealtime } from '@/hooks/use-employees-realtime';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useSession, useWorkOrdersRealtime } from '@/hooks';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { setEmployeeShiftOn } from '@/services/firestore/employee-rbac-service';
import { haptics } from '@/theme';
import { DEFAULT_MAX_ACTIVE_WORK_ORDERS } from '@autocore/rbac';

import { buildEarningsSnapshot } from '../lib/build-earnings-snapshot';

export function useMyEarnings() {
  const { uid } = useSession();
  const rbac = useRbacPolicy();
  const allowed = rbac.nav.canAccessMyEarnings;
  const companyId = allowed ? rbac.companyId : null;
  const [shiftBusy, setShiftBusy] = useState(false);

  const { employees, isLoading: employeesLoading } = useEmployeesRealtime(
    companyId,
    Boolean(companyId),
    { keepAlive: true },
  );
  const { payroll, isBootstrapping: payrollLoading } = usePayrollTransactionsRealtime(companyId, {
    scope: rbac.scopes.payroll,
    employeeId: uid,
    keepAlive: true,
  });
  const { domainOrders, isBootstrapping: ordersLoading } = useWorkOrdersRealtime(companyId, {
    scope: rbac.scopes.workOrders,
    uid,
    keepAlive: true,
  });

  const selfEmployee = useMemo(
    () => employees.find((entry) => entry.uid === uid),
    [employees, uid],
  );
  const shiftOn = selfEmployee?.shiftOn !== false;

  const snapshot = useMemo(
    () =>
      buildEarningsSnapshot({
        payroll,
        orders: domainOrders,
        uid,
      }),
    [domainOrders, payroll, uid],
  );

  const setShiftOn = useCallback(
    (next: boolean) => {
      if (!companyId || !uid || shiftBusy) return;
      setShiftBusy(true);
      void setEmployeeShiftOn(companyId, uid, next)
        .then(() => {
          haptics.selection();
          toast({
            title: next ? 'Shift turned on' : 'Shift turned off',
            variant: 'success',
          });
        })
        .catch((error) => {
          haptics.warning();
          toast({
            title: 'Could not update shift',
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          });
        })
        .finally(() => setShiftBusy(false));
    },
    [companyId, shiftBusy, uid],
  );

  return {
    allowed,
    companyId,
    uid,
    shiftOn,
    shiftBusy,
    setShiftOn,
    snapshot,
    maxActiveWorkOrders: DEFAULT_MAX_ACTIVE_WORK_ORDERS,
    canToggleShift: Boolean(companyId && uid),
    isLoading: Boolean(allowed && companyId && (employeesLoading || payrollLoading || ordersLoading)),
  };
}
