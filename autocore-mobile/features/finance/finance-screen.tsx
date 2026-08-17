import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { BarChart3Icon, LockIcon } from '@/assets/icons';
import { Screen, ScreenScroll, toast } from '@/components/ui';
import { isProductionCompanyId } from '@/lib/company-id';
import { openFinanceSettings } from '@/lib/navigation/open-finance-settings';
import { newOperationHref } from '@/features/accounting/navigation';

import { FinHeader } from './components/fin-header';
import {
  FinanceOverview,
  type FinanceOverviewHandlers,
} from './components/fin-overview';
import { FinSkeleton } from './components/fin-skeleton';
import { FinFullState, FinNotice } from './components/fin-states';
import { useFinanceModel } from './hooks/use-finance-model';
import { fin } from './layout';
import { FINANCE_LEDGER_HREF, financeFlowHref, financeMetricHref } from './navigation';

/**
 * Finance reads as one argument, top to bottom:
 *
 *   how healthy is the business → how much did it actually make → which
 *   measures moved → what caused the move → where the money ran → which
 *   engines and orders carried it → what happened, transaction by transaction.
 *
 * Each chapter answers the question the one above it raises, so five seconds at
 * the top gives the state and two taps give the cause.
 */
export function FinanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    model,
    period,
    setPeriod,
    isBootstrapping,
    isEmptyLedger,
    errorMessage,
    isOnline,
    canView,
    canEdit,
    moduleEnabled,
    companyId,
  } = useFinanceModel();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['realtime'] });
    setRefreshing(false);
  }, [queryClient]);

  const openNewOperation = useCallback(() => {
    if (!canEdit) {
      toast({ title: 'You don’t have permission to record operations', variant: 'warning' });
      return;
    }
    router.push(newOperationHref('expense'));
  }, [canEdit, router]);

  const openSettings = useCallback(() => {
    openFinanceSettings(router, { returnTo: 'accounting' });
  }, [router]);

  const handlers = useMemo<FinanceOverviewHandlers>(
    () => ({
      onPeriodChange: setPeriod,
      onOpenHealth: () => router.push(financeMetricHref('health')),
      onOpenMetric: (id) => router.push(financeMetricHref(id)),
      onOpenFlow: (id) => router.push(financeFlowHref(id)),
      onOpenLedger: () => router.push(FINANCE_LEDGER_HREF),
    }),
    [router, setPeriod],
  );

  if (!moduleEnabled) {
    return (
      <CenteredScreen>
        <FinFullState
          icon={BarChart3Icon}
          title="Finance is switched off"
          description="This company has the finance module disabled. An administrator can turn it back on in company settings."
        />
      </CenteredScreen>
    );
  }

  if (!canView) {
    return (
      <CenteredScreen>
        <FinFullState
          icon={LockIcon}
          title="No access to finance"
          description="Your role can’t see company money. Ask an administrator if you need it."
        />
      </CenteredScreen>
    );
  }

  const connected = Boolean(companyId) && isProductionCompanyId(companyId);
  const subtitle = !companyId
    ? 'Loading ledger'
    : isBootstrapping
      ? `${model.window.period.longLabel} · syncing`
      : connected
        ? `${model.window.period.longLabel} · ${model.totals.operationCount} ${
            model.totals.operationCount === 1 ? 'operation' : 'operations'
          }`
        : 'No company connected';

  return (
    <Screen>
      <ScreenScroll
        tabBarInset
        edgeTitle="Finance"
        decelerationRate="normal"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <FinHeader
          subtitle={subtitle}
          canEdit={canEdit}
          onNewOperation={openNewOperation}
          onSettings={openSettings}
        />

        {!companyId || isBootstrapping ? (
          <FinSkeleton />
        ) : (
          <View style={{ paddingHorizontal: fin.pad, gap: fin.chapter }}>
          {(!isOnline || errorMessage || !connected) && (
            <View style={{ gap: fin.inline }}>
              {!connected ? (
                <FinNotice
                  tone="warning"
                  title="No company connected"
                  detail="Join or create a company and Finance starts reading its ledger."
                />
              ) : null}
              {!isOnline ? (
                <FinNotice
                  tone="offline"
                  title="Offline — showing the last synced ledger"
                  detail="Figures are as of your last connection. Nothing here is estimated."
                />
              ) : null}
              {errorMessage ? (
                <FinNotice
                  tone="danger"
                  title="Some operations failed to load"
                  detail={`${errorMessage} Totals below may be incomplete.`}
                  actionLabel="Try again"
                  onAction={() => void onRefresh()}
                />
              ) : null}
            </View>
          )}

          {!isEmptyLedger && model.attention.length > 0 ? (
            <View style={{ gap: fin.inline }}>
              {model.attention.map((item) => (
                <FinNotice
                  key={item.id}
                  tone={item.id === 'negative_cash' ? 'danger' : 'warning'}
                  title={item.title}
                  detail={item.detail}
                  actionLabel="Open ledger"
                  onAction={() => router.push(FINANCE_LEDGER_HREF)}
                />
              ))}
            </View>
          ) : null}

          {isEmptyLedger ? (
            <View style={{ paddingTop: fin.chapter }}>
              <FinFullState
                title="No money recorded yet"
                description="Finance builds itself from your operations. Record the first sale or expense and the health index, the profit curve and the breakdowns start filling in."
                actionLabel={canEdit ? 'Record an operation' : undefined}
                onAction={canEdit ? openNewOperation : undefined}
              />
            </View>
          ) : (
            <FinanceOverview model={model} period={period} handlers={handlers} />
          )}
        </View>
        )}
      </ScreenScroll>
    </Screen>
  );
}

function CenteredScreen({ children }: { children: React.ReactNode }) {
  return <Screen style={{ justifyContent: 'center' }}>{children}</Screen>;
}
