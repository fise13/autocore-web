import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { View } from 'react-native';

import { ArrowRightIcon, DownloadIcon } from '@/assets/icons';
import { Screen, ScreenScroll, Text, toast } from '@/components/ui';
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

import {
  AcMotorSaleDocumentsSheet,
  type AcMotorSaleDocumentsSheetRef,
} from '@/features/accounting/components/ac-motor-sale-documents-sheet';
import {
  AcTransferSheet,
  type AcTransferSheetRef,
} from '@/features/accounting/components/ac-transfer-sheet';

import { FinDetailHeader } from './components/fin-detail-header';
import {
  LedgerAdvanceDirection,
  LedgerAdvancesOverview,
  LedgerAttention,
  LedgerOperationsList,
  LedgerPayrollList,
  LedgerSummary,
  LedgerTabBar,
  type LedgerTab,
} from './components/ledger';
import { FinPressable, FinSheet } from './components/fin-primitives';
import { useFinanceModel } from './hooks/use-finance-model';
import { fin, finType } from './layout';

/**
 * The record itself — every row the business ever logged, grouped like Health
 * activity: summary card, attention, category pills, then day-by-day timelines.
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

  const pendingPayrollCount = useMemo(
    () => payroll.filter((entry) => entry.status === 'pending').length,
    [payroll],
  );

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

  const openPayrollTab = useCallback(() => setTab('payroll'), []);

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
          subtitle={`${operations.length} recorded ${operations.length === 1 ? 'operation' : 'operations'}`}
        />

        <View style={{ gap: fin.block }}>
          <LedgerSummary
            model={model}
            operations={operations}
            pendingPayrollCount={pendingPayrollCount}
          />

          {model.attention.length > 0 ? (
            <LedgerAttention items={model.attention} onOpenPayroll={openPayrollTab} />
          ) : null}

          <FinSheet padded>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: fin.inline }}>
              {canEdit ? (
                <ActionChip
                  label="Move funds"
                  icon={<ArrowRightIcon size={15} color={colors.foreground} strokeWidth={2} />}
                  onPress={handleTransfer}
                />
              ) : null}
              <ActionChip
                label="Export CSV"
                icon={<DownloadIcon size={15} color={colors.foreground} strokeWidth={2} />}
                onPress={() => void handleExport()}
              />
            </View>
          </FinSheet>

          <LedgerTabBar value={tab} onChange={setTab} />

          {tab === 'all' ? (
            <LedgerOperationsList
              title="All operations"
              caption="Every income and cost record, newest first"
              rows={operations}
              {...listProps}
            />
          ) : null}

          {tab === 'cashbox' ? (
            <LedgerOperationsList
              title="Cash box"
              caption="Operations that moved physical cash"
              rows={filterCashboxOperations(operations)}
              {...listProps}
            />
          ) : null}

          {tab === 'expenses' ? (
            <LedgerOperationsList
              title="Expenses"
              caption="Everything the company spent"
              rows={filterExpenseOperations(operations)}
              {...listProps}
            />
          ) : null}

          {tab === 'work_orders' ? (
            <LedgerOperationsList
              title="Work orders"
              caption="Income and parts cost booked against orders"
              rows={filterWorkOrderOperations(operations)}
              showWorkOrder
              workOrderNumbers={workOrderNumbers}
              {...listProps}
            />
          ) : null}

          {tab === 'payroll' ? (
            <View style={{ gap: fin.stack }}>
              <LedgerPayrollList
                rows={payroll}
                employeeNames={employeeNames}
                workOrderNumbers={workOrderNumbers}
                canEdit={canEdit}
                updatingId={payrollUpdatingId}
                onStatusChange={(id, status) => void handlePayrollStatusChange(id, status)}
              />
              {filterPayrollExpenseOperations(operations).length > 0 ? (
                <LedgerOperationsList
                  title="Payroll expenses"
                  caption="Payroll paid out of the accounts"
                  rows={filterPayrollExpenseOperations(operations)}
                  showWorkOrder
                  workOrderNumbers={workOrderNumbers}
                  {...listProps}
                />
              ) : null}
            </View>
          ) : null}

          {tab === 'advances' ? (
            <View style={{ gap: fin.stack }}>
              <LedgerAdvancesOverview snapshot={advanceSnapshot} />
              <LedgerAdvanceDirection value={advanceDirection} onChange={setAdvanceDirection} />
              <LedgerOperationsList
                title="Advances"
                caption={advanceDirectionLabel(advanceDirection)}
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

function ActionChip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <FinPressable
      onPress={onPress}
      haptic="light"
      accessibilityLabel={label}
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
      {icon}
      <Text style={{ ...finType.label, fontWeight: '600' }}>{label}</Text>
    </FinPressable>
  );
}
