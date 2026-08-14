import type { ComponentType } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { BarChart3Icon, type IconProps } from '@/assets/icons';
import { EmptyState, Screen, ScreenScroll, Text, toast, DemoModeBanner } from '@/components/ui';
import { useEmployeesRealtime, useSession, useWorkOrdersRealtime } from '@/hooks';
import { financialOperationRepository } from '@/services/firestore/financial-operation-repository';
import { payrollTransactionRepository } from '@/services/firestore/payroll-transaction-repository';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransactionStatus } from '@/types/payroll-transaction';
import { haptics } from '@/theme';
import { isProductionCompanyId } from '@/lib/company-id';
import { buildAdvanceSnapshot, filterAdvanceOperations, advanceDirectionLabel, type AdvanceDirection } from '@/lib/accounting/advances';
import { shareOperationsCsv } from '@/lib/accounting/export-operations-csv';
import {
  filterCashboxOperations,
  filterExpenseOperations,
  filterPayrollExpenseOperations,
  filterWorkOrderOperations,
} from '@/lib/accounting/operation-filters';
import { ProfileSegmentedControl } from '@/features/profile/components/profile-animated-section';

import { AcAccountingEmptyState } from './components/ac-accounting-empty-state';
import { AcAccountingSkeleton } from './components/ac-accounting-skeleton';
import { AcAccountTiles } from './components/ac-account-tiles';
import { AcAdvancesOverview } from './components/ac-advances-overview';
import { AcAttention } from './components/ac-attention';
import { AcBalanceCard } from './components/ac-balance-card';
import { AcHeader } from './components/ac-header';
import {
  AcMotorSaleDocumentsSheet,
  type AcMotorSaleDocumentsSheetRef,
} from './components/ac-motor-sale-documents-sheet';
import { AcOperationsList } from './components/ac-operations-list';
import { AcPayrollList } from './components/ac-payroll-list';
import { AcQuickActions } from './components/ac-quick-actions';
import { AcTabBar, AcTabPanel } from './components/ac-tab-bar';
import { AcTransactions } from './components/ac-transactions';
import { AcTransferSheet, type AcTransferSheetRef } from './components/ac-transfer-sheet';
import type { AccountingTab } from './constants/tabs';
import { useAccountingData } from './hooks/use-accounting-data';
import { newOperationHref, type NewOperationPreset } from './navigation';
import type { AccountingAttentionAction, AccountingQuickActionId } from './types';
import { ac } from './layout';

export function AccountingScreen() {
  const { profile, companyId } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AccountingTab>('overview');
  const [advanceDirection, setAdvanceDirection] = useState<AdvanceDirection>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [payrollUpdatingId, setPayrollUpdatingId] = useState<string | null>(null);
  const transferSheetRef = useRef<AcTransferSheetRef>(null);
  const motorSaleSheetRef = useRef<AcMotorSaleDocumentsSheetRef>(null);

  const {
    data,
    operations,
    payroll,
    operationCount,
    balanceSnapshot,
    isBootstrapping,
    isEmpty,
    isDemo,
    errorMessage,
    enabled,
    canView,
    canEdit,
  } = useAccountingData();

  const { employees } = useEmployeesRealtime(companyId, enabled && canView);
  const { domainOrders } = useWorkOrdersRealtime(companyId);

  const workOrderNumbers = useMemo(() => {
    const map: Record<string, string> = {};
    for (const order of domainOrders) {
      map[order.id] = order.number ? `№${order.number}` : order.id;
    }
    return map;
  }, [domainOrders]);

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
  const advancesRows = useMemo(
    () => filterAdvanceOperations(operations, advanceDirection),
    [advanceDirection, operations],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['realtime'] });
    setRefreshing(false);
  }, [queryClient]);

  const openNewOperation = useCallback((preset?: NewOperationPreset | 'expense' | 'income') => {
    if (!canEdit || isDemo) {
      toast({ title: 'You don’t have permission to create operations', variant: 'warning' });
      return;
    }
    router.push(newOperationHref(preset ?? 'expense'));
  }, [canEdit, isDemo, router]);

  const handleAttentionPress = useCallback((action: AccountingAttentionAction) => {
    setActiveTab(action);
  }, []);

  const handleQuickAction = useCallback(
    async (id: AccountingQuickActionId) => {
      switch (id) {
        case 'invoice':
          openNewOperation({
            type: 'income',
            paymentMethod: 'transfer',
            comment: 'Invoice issued',
          });
          return;
        case 'payment':
          openNewOperation({
            type: 'income',
            paymentMethod: 'cash',
            comment: 'Payment received',
          });
          return;
        case 'expense':
          openNewOperation({ type: 'expense' });
          return;
        case 'salary':
          setActiveTab('payroll');
          return;
        case 'transfer':
          if (!canEdit || isDemo) {
            toast({ title: 'You don’t have permission to transfer funds', variant: 'warning' });
            return;
          }
          transferSheetRef.current?.present();
          return;
        case 'export':
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
          return;
        default:
          return;
      }
    },
    [canEdit, isDemo, openNewOperation, operations],
  );

  const handleDeleteOperation = useCallback(
    async (operation: FinancialOperation) => {
      if (!canEdit || isDemo) {
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
    [canEdit, isDemo],
  );

  const handlePayrollStatusChange = useCallback(
    async (id: string, status: PayrollTransactionStatus) => {
      if (!canEdit || isDemo || !companyId) {
        toast({ title: 'You don’t have permission to change payroll entries', variant: 'warning' });
        return;
      }
      setPayrollUpdatingId(id);
      try {
        haptics.light();
        await payrollTransactionRepository.updateStatus(companyId, id, status);
        haptics.success();
        toast({
          title: status === 'paid' ? 'Payroll marked as paid' : 'Payroll status updated',
          variant: 'success',
        });
      } catch (error) {
        haptics.warning();
        toast({
          title: 'Failed to update payroll entry',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      } finally {
        setPayrollUpdatingId(null);
      }
    },
    [canEdit, companyId, isDemo],
  );

  const handleMotorSaleSelect = useCallback((operation: FinancialOperation) => {
    motorSaleSheetRef.current?.present(operation);
  }, []);

  const operationsListProps = {
    canEdit: canEdit && !isDemo,
    onDelete: handleDeleteOperation,
    onMotorSaleSelect: handleMotorSaleSelect,
  };

  if (!canView) {
    return (
      <ScreenPlaceholder
        icon={BarChart3Icon}
        title="No access"
        description="Your role doesn't have permission to view finances. Contact your company administrator."
      />
    );
  }

  if (!companyId || isBootstrapping) {
    return (
      <Screen>
        <AcAccountingSkeleton />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenScroll
        tabBarInset
        decelerationRate="normal"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <AcHeader
          operationCount={operationCount}
          canEdit={canEdit && !isDemo}
          onNewOperation={() => openNewOperation('expense')}
        />

        <View style={{ paddingHorizontal: ac.pad, gap: ac.section, paddingBottom: ac.section }}>
          {isDemo ? <DemoModeBanner /> : !isProductionCompanyId(companyId) ? (
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
              Connect a company to see financial data
            </Text>
          ) : null}

          {errorMessage ? (
            <Text variant="caption" color="destructive">
              {errorMessage}
            </Text>
          ) : null}

          <AcTabBar value={activeTab} onChange={setActiveTab} />

          <AcTabPanel tab={activeTab}>
            {activeTab === 'overview' ? (
              <View style={{ gap: ac.section }}>
                <AcBalanceCard
                  balance={balanceSnapshot}
                  profit={data.balance}
                  cashFlow7d={data.cashFlow['7d']}
                  operations={operations}
                />
                <AcAccountTiles balance={balanceSnapshot} />
                <AcQuickActions actions={data.quickActions} onAction={handleQuickAction} />
                {isEmpty ? (
                  <AcAccountingEmptyState canEdit={canEdit && !isDemo} onAddExpense={() => openNewOperation('expense')} />
                ) : null}
                {data.attention.length > 0 ? (
                  <AcAttention items={data.attention} onItemPress={handleAttentionPress} />
                ) : null}
                {data.transactions.length > 0 ? (
                  <AcTransactions items={data.transactions} onShowAll={() => setActiveTab('operations')} />
                ) : null}
                {!isDemo && advanceSnapshot.totalCount > 0 ? (
                  <AcAdvancesOverview snapshot={advanceSnapshot} />
                ) : null}
              </View>
            ) : null}

            {activeTab === 'cashbox' ? (
              <AcOperationsList
                title="Cash Register"
                description="Operations on the “Cash Register” account"
                rows={filterCashboxOperations(operations)}
                {...operationsListProps}
              />
            ) : null}

            {activeTab === 'expenses' ? (
              <AcOperationsList
                title="Expenses"
                description="All company expense operations"
                rows={filterExpenseOperations(operations)}
                {...operationsListProps}
              />
            ) : null}

            {activeTab === 'operations' ? (
              <AcOperationsList
                title="All Operations"
                description="Full log of financial records"
                rows={operations}
                {...operationsListProps}
              />
            ) : null}

            {activeTab === 'work_orders' ? (
              <AcOperationsList
                title="Work Orders"
                description="Income and expenses by work order"
                rows={filterWorkOrderOperations(operations)}
                showWorkOrder
                workOrderNumbers={workOrderNumbers}
                {...operationsListProps}
              />
            ) : null}

            {activeTab === 'payroll' ? (
              <View style={{ gap: ac.section }}>
                <AcPayrollList
                  rows={payroll}
                  employeeNames={employeeNames}
                  workOrderNumbers={workOrderNumbers}
                  canEdit={canEdit && !isDemo}
                  updatingId={payrollUpdatingId}
                  onStatusChange={(id, status) => void handlePayrollStatusChange(id, status)}
                />
                {filterPayrollExpenseOperations(operations).length > 0 ? (
                  <AcOperationsList
                    title="Payroll Expenses"
                    description="Payroll entries"
                    rows={filterPayrollExpenseOperations(operations)}
                    showWorkOrder
                    workOrderNumbers={workOrderNumbers}
                    {...operationsListProps}
                  />
                ) : null}
              </View>
            ) : null}

            {activeTab === 'advances' ? (
              <View style={{ gap: ac.section }}>
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
                  title="Advances Log"
                  description="Operations flagged as advances"
                  rows={advancesRows}
                  emptyLabel="No advance operations yet"
                  {...operationsListProps}
                />
              </View>
            ) : null}
          </AcTabPanel>
        </View>
      </ScreenScroll>

      {profile?.id ? (
        <AcTransferSheet
          ref={transferSheetRef}
          companyId={profile.companyId}
          userId={profile.id}
          disabled={!canEdit || isDemo}
        />
      ) : null}
      <AcMotorSaleDocumentsSheet ref={motorSaleSheetRef} />
    </Screen>
  );
}

function ScreenPlaceholder({
  icon,
  title,
  description,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
}) {
  return (
    <Screen style={{ justifyContent: 'center', paddingHorizontal: ac.pad }}>
      <EmptyState icon={icon} title={title} description={description} />
    </Screen>
  );
}
