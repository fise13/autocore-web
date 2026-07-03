import type { ComponentType } from 'react';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart3Icon, type IconProps } from '@/assets/icons';
import { EmptyState, Tabs, Text } from '@/components/ui';
import {
  useEmployeesRealtime,
  useSession,
  useTheme,
  useWorkOrdersRealtime,
} from '@/hooks';
import { buildAdvanceSnapshot, filterAdvanceOperations, advanceDirectionLabel, type AdvanceDirection } from '@/lib/accounting/advances';
import {
  filterCashboxOperations,
  filterExpenseOperations,
  filterPayrollExpenseOperations,
  filterWorkOrderOperations,
} from '@/lib/accounting/operation-filters';
import { ProfileSegmentedControl } from '@/features/profile/components/profile-animated-section';

import { AcAccountingEmptyState } from './components/ac-accounting-empty-state';
import { AcAccountingSkeleton } from './components/ac-accounting-skeleton';
import { AcAdvancesOverview } from './components/ac-advances-overview';
import { AcAttention } from './components/ac-attention';
import { AcBalanceHero } from './components/ac-balance-hero';
import { AcCashFlow } from './components/ac-cash-flow';
import { AcExpenses } from './components/ac-expenses';
import { AcFinanceToolbar } from './components/ac-finance-toolbar';
import { AcHeader } from './components/ac-header';
import { AcInvoices } from './components/ac-invoices';
import { AcNewOperationSheet, type AcNewOperationSheetRef } from './components/ac-new-operation-sheet';
import { AcOperationsList } from './components/ac-operations-list';
import { AcPayrollList } from './components/ac-payroll-list';
import { AcQuickActions } from './components/ac-quick-actions';
import { AcSummaryGrid } from './components/ac-summary-grid';
import { AcTopCustomers } from './components/ac-top-customers';
import { AcTransactions } from './components/ac-transactions';
import { ACCOUNTING_TABS, type AccountingTab } from './constants/tabs';
import { useAccountingData } from './hooks/use-accounting-data';
import { ac } from './layout';

export function AccountingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, companyId } = useSession();
  const [activeTab, setActiveTab] = useState<AccountingTab>('overview');
  const [advanceDirection, setAdvanceDirection] = useState<AdvanceDirection>('all');
  const newOperationRef = useRef<AcNewOperationSheetRef>(null);

  const {
    data,
    operations,
    payroll,
    operationCount,
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

  const openNewOperation = (type: 'expense' | 'income' = 'expense') => {
    newOperationRef.current?.present(type);
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

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AcAccountingSkeleton />
      </View>
    );
  }

  const showDetailSections = !isEmpty || isDemo;

  return (
    <BottomSheetModalProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 12) + 96,
          }}
        >
          <AcHeader balance={data.balance.available} />

          <View style={{ paddingHorizontal: ac.pad, gap: ac.section }}>
            {isDemo ? (
              <Text variant="caption" color="muted" style={{ textAlign: 'center', marginBottom: -8 }}>
                Демо-данные · подключите компанию для live-синхронизации
              </Text>
            ) : null}

            <AcFinanceToolbar
              operationCount={operationCount}
              canEdit={canEdit && !isDemo}
              onNewOperation={() => openNewOperation('expense')}
            />

            {errorMessage ? (
              <Text variant="caption" color="destructive">
                {errorMessage}
              </Text>
            ) : null}

            <Tabs
              tabs={[...ACCOUNTING_TABS]}
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as AccountingTab)}
            >
              {activeTab === 'overview' ? (
                <View style={{ gap: ac.section }}>
                  <AcBalanceHero balance={data.balance} />
                  <AcSummaryGrid items={data.summary} />
                  <AcQuickActions
                    actions={data.quickActions}
                    onAction={(id) => {
                      if (id === 'expense' || id === 'payment') openNewOperation('expense');
                      if (id === 'invoice') openNewOperation('income');
                    }}
                  />
                  {isEmpty ? (
                    <AcAccountingEmptyState canEdit={canEdit && !isDemo} onAddExpense={() => openNewOperation('expense')} />
                  ) : null}
                  {showDetailSections ? (
                    <>
                      {!isDemo ? <AcAdvancesOverview snapshot={advanceSnapshot} /> : null}
                      {data.attention.length > 0 ? <AcAttention items={data.attention} /> : null}
                      {data.transactions.length > 0 ? (
                        <AcTransactions items={data.transactions} onShowAll={() => setActiveTab('operations')} />
                      ) : null}
                      <AcCashFlow data={data.cashFlow} />
                      {data.invoices.length > 0 ? <AcInvoices items={data.invoices} /> : null}
                      {data.topCustomers.length > 0 ? <AcTopCustomers items={data.topCustomers} /> : null}
                      {data.expenses.length > 0 ? <AcExpenses items={data.expenses} /> : null}
                    </>
                  ) : null}
                </View>
              ) : null}

              {activeTab === 'cashbox' ? (
                <AcOperationsList
                  title="Касса"
                  description="Операции по счёту «Касса»."
                  rows={filterCashboxOperations(operations)}
                />
              ) : null}

              {activeTab === 'expenses' ? (
                <AcOperationsList
                  title="Расходы"
                  description="Все расходные операции компании."
                  rows={filterExpenseOperations(operations)}
                />
              ) : null}

              {activeTab === 'operations' ? (
                <AcOperationsList
                  title="Все операции"
                  description="Полный журнал финансовых записей."
                  rows={operations}
                />
              ) : null}

              {activeTab === 'work_orders' ? (
                <AcOperationsList
                  title="Заказ-наряды"
                  description="Доход, себестоимость запчастей и зарплата по заказ-нарядам."
                  rows={filterWorkOrderOperations(operations)}
                  showWorkOrder
                  workOrderNumbers={workOrderNumbers}
                />
              ) : null}

              {activeTab === 'payroll' ? (
                <View style={{ gap: ac.section }}>
                  <AcPayrollList
                    rows={payroll}
                    employeeNames={employeeNames}
                    workOrderNumbers={workOrderNumbers}
                  />
                  {filterPayrollExpenseOperations(operations).length > 0 ? (
                    <AcOperationsList
                      title="Расходы на зарплату"
                      description="Проводки по зарплате в бухгалтерии."
                      rows={filterPayrollExpenseOperations(operations)}
                      showWorkOrder
                      workOrderNumbers={workOrderNumbers}
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
                    options={(
                      ['all', 'received', 'paid'] as const
                    ).map((value) => ({
                      value,
                      label: advanceDirectionLabel(value),
                    }))}
                    delay={0}
                  />
                  <AcOperationsList
                    title="Журнал авансов"
                    description="Операции с признаками аванса в категории или комментарии."
                    rows={advancesRows}
                    emptyLabel="Авансовых операций пока нет"
                  />
                </View>
              ) : null}
            </Tabs>
          </View>
        </ScrollView>

        {profile?.id ? (
          <AcNewOperationSheet
            ref={newOperationRef}
            companyId={profile.companyId}
            userId={profile.id}
            disabled={!canEdit || isDemo}
          />
        ) : null}
      </View>
    </BottomSheetModalProvider>
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <EmptyState icon={icon} title={title} description={description} />
    </View>
  );
}
