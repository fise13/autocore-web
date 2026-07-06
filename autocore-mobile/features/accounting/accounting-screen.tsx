import type { ComponentType } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { BarChart3Icon, type IconProps } from '@/assets/icons';
import { EmptyState, Screen, ScreenScroll, Text, toast } from '@/components/ui';
import { useEmployeesRealtime, useSession, useWorkOrdersRealtime } from '@/hooks';
import { financialOperationRepository } from '@/services/firestore/financial-operation-repository';
import { payrollTransactionRepository } from '@/services/firestore/payroll-transaction-repository';
import type { FinancialOperation } from '@/types/financial-operation';
import type { PayrollTransactionStatus } from '@/types/payroll-transaction';
import { haptics } from '@/theme';
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
      const label = employee.fullName || employee.email || 'Сотрудник';
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
      toast({ title: 'Нет прав на создание операций', variant: 'warning' });
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
            comment: 'Выставленный счёт',
          });
          return;
        case 'payment':
          openNewOperation({
            type: 'income',
            paymentMethod: 'cash',
            comment: 'Поступление оплаты',
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
            toast({ title: 'Нет прав на перевод', variant: 'warning' });
            return;
          }
          transferSheetRef.current?.present();
          return;
        case 'export':
          if (operations.length === 0) {
            toast({ title: 'Нет операций для экспорта', variant: 'warning' });
            return;
          }
          try {
            await shareOperationsCsv(operations);
            haptics.success();
          } catch (error) {
            haptics.warning();
            toast({
              title: 'Не удалось экспортировать',
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
        toast({ title: 'Нет прав на удаление', variant: 'warning' });
        return;
      }
      try {
        await financialOperationRepository.delete(operation.id);
        haptics.success();
        toast({ title: 'Операция удалена', variant: 'success' });
      } catch (error) {
        haptics.warning();
        toast({
          title: 'Не удалось удалить',
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
        toast({ title: 'Нет прав на изменение начислений', variant: 'warning' });
        return;
      }
      setPayrollUpdatingId(id);
      try {
        haptics.light();
        await payrollTransactionRepository.updateStatus(companyId, id, status);
        haptics.success();
        toast({
          title: status === 'paid' ? 'Зарплата отмечена выплаченной' : 'Статус начисления обновлён',
          variant: 'success',
        });
      } catch (error) {
        haptics.warning();
        toast({
          title: 'Не удалось обновить начисление',
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

  if (!enabled || !profile?.companyId) {
    return (
      <ScreenPlaceholder
        icon={BarChart3Icon}
        title="Нет рабочего пространства"
        description="Выберите компанию, чтобы видеть финансы и бухгалтерские показатели."
      />
    );
  }

  if (!canView) {
    return (
      <ScreenPlaceholder
        icon={BarChart3Icon}
        title="Нет доступа"
        description="У вашей роли нет прав на просмотр финансов. Обратитесь к администратору компании."
      />
    );
  }

  if (isBootstrapping && isEmpty) {
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
          {isDemo ? (
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
              Демо-данные · подключите компанию для live-синхронизации
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
                title="Касса"
                description="Операции по счёту «Касса»"
                rows={filterCashboxOperations(operations)}
                {...operationsListProps}
              />
            ) : null}

            {activeTab === 'expenses' ? (
              <AcOperationsList
                title="Расходы"
                description="Все расходные операции компании"
                rows={filterExpenseOperations(operations)}
                {...operationsListProps}
              />
            ) : null}

            {activeTab === 'operations' ? (
              <AcOperationsList
                title="Все операции"
                description="Полный журнал финансовых записей"
                rows={operations}
                {...operationsListProps}
              />
            ) : null}

            {activeTab === 'work_orders' ? (
              <AcOperationsList
                title="Заказ-наряды"
                description="Доход и расходы по нарядам"
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
                    title="Расходы на зарплату"
                    description="Проводки по зарплате"
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
                  title="Журнал авансов"
                  description="Операции с признаками аванса"
                  rows={advancesRows}
                  emptyLabel="Авансовых операций пока нет"
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
