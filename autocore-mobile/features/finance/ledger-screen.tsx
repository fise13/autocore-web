import { useCallback, useMemo, useRef, useState } from 'react';

import { View } from 'react-native';

import { DownloadIcon, ArrowRightIcon } from '@/assets/icons';
import { HorizontalFilterBar, Screen, ScreenScroll, Text, toast } from '@/components/ui';
import { useEmployeesRealtime, useSession, useTheme } from '@/hooks';
import { useMoneyFormatRevision } from '@/store/money-format-store';
import { usePayrollTransactionsRealtime } from '@/hooks/use-payroll-transactions-realtime';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import {
  advanceDirectionLabel,
  buildAdvanceSnapshot,
  filterAdvanceOperations,
  type AdvanceDirection,
} from '@/lib/accounting/advances';
import {
  filterCashboxOperations,
  filterExpenseOperations,
  filterPayrollExpenseOperations,
  filterWorkOrderOperations,
} from '@/lib/accounting/operation-filters';
import { shareOperationsCsv } from '@/lib/accounting/export-operations-csv';
import { financialOperationRepository } from '@/services/firestore/financial-operation-repository';
import { payrollTransactionRepository } from '@/services/firestore/payroll-transaction-repository';
import { haptics } from '@/theme';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransactionStatus } from '@/types/payroll-transaction';

import { AcAdvancesOverview } from '@/features/accounting/components/ac-advances-overview';
import {
  AcMotorSaleDocumentsSheet,
  type AcMotorSaleDocumentsSheetRef,
} from '@/features/accounting/components/ac-motor-sale-documents-sheet';
import { AcOperationsList } from '@/features/accounting/components/ac-operations-list';
import {
  AcTransferSheet,
  type AcTransferSheetRef,
} from '@/features/accounting/components/ac-transfer-sheet';
import { AcPayrollList } from '@/features/accounting/components/ac-payroll-list';
import { ProfileSegmentedControl } from '@/features/profile/components/profile-animated-section';

import { FinDetailHeader } from './components/fin-detail-header';
import { FinPressable } from './components/fin-primitives';
import { useFinanceModel } from './hooks/use-finance-model';
import { fin, finType } from './layout';

const LEDGER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'cashbox', label: 'Cash box' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'work_orders', label: 'Work orders' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'advances', label: 'Advances' },
] as const;

type LedgerTab = (typeof LEDGER_TABS)[number]['value'];

/**
 * The record itself.
 *
 * Finance answers "how is the business doing"; this screen answers "show me
 * the rows". It keeps the existing operations, payroll and advances lists
 * intact rather than reimplementing them, so nothing an operator relied on in
 * the old tabbed accounting screen was dropped in the redesign.
 */
export function FinanceLedgerScreen() {
  const { companyId, uid, profile } = useSession();
  const { colors } = useTheme();
  useMoneyFormatRevision();
  const rbac = useRbacPolicy();
  const { model, operations, workOrderNumbers, canEdit } = useFinanceModel();
  const [tab, setTab] = useState<LedgerTab>('all');
  const [advanceDirection, setAdvanceDirection] = useState<AdvanceDirection>('all');
  const [payrollUpdatingId, setPayrollUpdatingId] = useState<string | null>(null);
  const motorSaleSheetRef = useRef<AcMotorSaleDocumentsSheetRef>(null);
  const transferSheetRef = useRef<AcTransferSheetRef>(null);

  const { employees } = useEmployeesRealtime(companyId, Boolean(companyId));
  const { payroll } = usePayrollTransactionsRealtime(companyId, {
    keepAlive: true,
    scope: rbac.scopes.payroll,
    employeeId: uid,
  });

  const employeeNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const employee of employees) {
      const label = employee.fullName || employee.email || 'Employee';
      map[employee.id] = label;
      map[employee.uid] = label;
    }
    return map;
  }, [employees]);

  const advanceSnapshot = useMemo(() => buildAdvanceSnapshot(operations), [operations]);
  const advanceRows = useMemo(
    () => filterAdvanceOperations(operations, advanceDirection),
    [advanceDirection, operations],
  );

  const handleDelete = useCallback(
    async (operation: FinancialOperation) => {
      if (!canEdit) {
        toast({ title: 'You don’t have permission to delete', variant: 'warning' });
        return;
      }
      try {
        await financialOperationRepository.delete(operation.id);
        haptics.success();
        toast({ title: 'Operation deleted', variant: 'success' });
      } catch (error) {
        haptics.warning();
        toast({
          title: 'Failed to delete',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    },
    [canEdit],
  );

  const handlePayrollStatusChange = useCallback(
    async (id: string, status: PayrollTransactionStatus) => {
      if (!canEdit || !companyId) {
        toast({ title: 'You don’t have permission to change payroll', variant: 'warning' });
        return;
      }
      setPayrollUpdatingId(id);
      try {
        haptics.light();
        await payrollTransactionRepository.updateStatus(companyId, id, status);
        haptics.success();
        toast({ title: 'Payroll updated', variant: 'success' });
      } catch (error) {
        haptics.warning();
        toast({
          title: 'Failed to update payroll',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      } finally {
        setPayrollUpdatingId(null);
      }
    },
    [canEdit, companyId],
  );

  const handleExport = useCallback(async () => {
    if (operations.length === 0) {
      toast({ title: 'No operations to export', variant: 'warning' });
      return;
    }
    try {
      await shareOperationsCsv(operations);
      haptics.success();
    } catch (error) {
      haptics.warning();
      toast({
        title: 'Failed to export',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  }, [operations]);

  const handleTransfer = useCallback(() => {
    if (!canEdit) {
      toast({ title: 'You don’t have permission to move funds', variant: 'warning' });
      return;
    }
    transferSheetRef.current?.present();
  }, [canEdit]);

  const listProps = {
    canEdit,
    onDelete: (operation: FinancialOperation) => void handleDelete(operation),
    onMotorSaleSelect: (operation: FinancialOperation) =>
      motorSaleSheetRef.current?.present(operation),
  };

  return (
    <Screen>
      <ScreenScroll tabBarInset topFade={false}>
        <FinDetailHeader
          title="Ledger"
          subtitle={`${operations.length} recorded ${operations.length === 1 ? 'operation' : 'operations'} · ${model.window.period.longLabel} on the overview`}
        />

        <View style={{ paddingHorizontal: fin.pad, gap: fin.block }}>
          <View style={{ flexDirection: 'row', gap: fin.inline }}>
            {canEdit ? (
              <FinPressable
                onPress={handleTransfer}
                haptic="light"
                accessibilityLabel="Move funds between accounts"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: fin.pillRadius,
                  backgroundColor: colors.secondary,
                }}
              >
                <ArrowRightIcon size={15} color={colors.foreground} strokeWidth={2} />
                <Text style={{ ...finType.label, fontWeight: '600' }}>Move funds</Text>
              </FinPressable>
            ) : null}

            <FinPressable
              onPress={() => void handleExport()}
              haptic="light"
              accessibilityLabel="Export operations as CSV"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: fin.pillRadius,
                backgroundColor: colors.secondary,
              }}
            >
              <DownloadIcon size={15} color={colors.foreground} strokeWidth={2} />
              <Text style={{ ...finType.label, fontWeight: '600' }}>Export CSV</Text>
            </FinPressable>
          </View>

          <HorizontalFilterBar options={LEDGER_TABS} value={tab} onChange={setTab} />

          {tab === 'all' ? (
            <AcOperationsList
              title="All operations"
              description="Every income and cost record, newest first"
              rows={operations}
              {...listProps}
            />
          ) : null}

          {tab === 'cashbox' ? (
            <AcOperationsList
              title="Cash box"
              description="Operations that moved physical cash"
              rows={filterCashboxOperations(operations)}
              {...listProps}
            />
          ) : null}

          {tab === 'expenses' ? (
            <AcOperationsList
              title="Expenses"
              description="Everything the company spent"
              rows={filterExpenseOperations(operations)}
              {...listProps}
            />
          ) : null}

          {tab === 'work_orders' ? (
            <AcOperationsList
              title="Work orders"
              description="Income and parts cost booked against orders"
              rows={filterWorkOrderOperations(operations)}
              showWorkOrder
              workOrderNumbers={workOrderNumbers}
              {...listProps}
            />
          ) : null}

          {tab === 'payroll' ? (
            <View style={{ gap: fin.block }}>
              <AcPayrollList
                rows={payroll}
                employeeNames={employeeNames}
                workOrderNumbers={workOrderNumbers}
                canEdit={canEdit}
                updatingId={payrollUpdatingId}
                onStatusChange={(id, status) => void handlePayrollStatusChange(id, status)}
              />
              {filterPayrollExpenseOperations(operations).length > 0 ? (
                <AcOperationsList
                  title="Payroll expenses"
                  description="Payroll paid out of the accounts"
                  rows={filterPayrollExpenseOperations(operations)}
                  showWorkOrder
                  workOrderNumbers={workOrderNumbers}
                  {...listProps}
                />
              ) : null}
            </View>
          ) : null}

          {tab === 'advances' ? (
            <View style={{ gap: fin.block }}>
              <AcAdvancesOverview snapshot={advanceSnapshot} />
              <ProfileSegmentedControl
                value={advanceDirection}
                onChange={setAdvanceDirection}
                options={(['all', 'received', 'paid'] as const).map((value) => ({
                  value,
                  label: advanceDirectionLabel(value),
                }))}
                delay={0}
              />
              <AcOperationsList
                title="Advances"
                description="Operations flagged as advances"
                rows={advanceRows}
                emptyLabel="No advance operations yet"
                {...listProps}
              />
            </View>
          ) : null}
        </View>
      </ScreenScroll>

      {profile?.id && profile.companyId ? (
        <AcTransferSheet
          ref={transferSheetRef}
          companyId={profile.companyId}
          userId={profile.id}
          disabled={!canEdit}
        />
      ) : null}
      <AcMotorSaleDocumentsSheet ref={motorSaleSheetRef} />
    </Screen>
  );
}
