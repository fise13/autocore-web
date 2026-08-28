import { memo, useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useNavigateTab, type TabNavigateTarget } from '@/components/navigation/use-navigate-tab';
import { ProductScreenShell, ScreenGate, ScreenScroll } from '@/components/ui';
import { guardedPush } from '@/lib/navigation/guarded-push';
import { useRealtimeReconnect } from '@/hooks/use-realtime-reconnect';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useMoneyFormatRevision } from '@/store/money-format-store';
import { tokens } from '@/theme/tokens';

import {
  home,
  HomeActivity,
  HomeAttention,
  HomeHeader,
  HomeQuickActions,
  HomeSkeleton,
  HomeSummary,
  HomeTrends,
} from './components';
import { attentionInterrupts } from './lib/attention';
import type { HomeGreetingSignal } from './lib/greeting';
import { resolveHomeNotice } from './lib/notice';
import type { HomeDestination } from './types';
import { useHomeQuickActionRunner } from './use-home-quick-actions';
import { useHomeViewModel } from './use-home-view-model';

const WORK_HREF = '/(tabs)/work';
const FINANCE_METRIC_PATH = '/(tabs)/accounting/metric/[id]';

function toTarget(destination: HomeDestination): TabNavigateTarget {
  if (destination.params) {
    return { pathname: destination.pathname, params: destination.params };
  }
  return destination.pathname;
}

/**
 * Home — Dynamic Business Summary.
 *
 * Read top to bottom it is one argument: where you are → what matters most right
 * now → what changed → what needs a person → what you might start → what just
 * happened. Sections with nothing to say are not rendered, so the length of this
 * screen is itself a reading of the business.
 *
 * The order is fixed except for one case: a genuinely blocked condition is
 * allowed to break in above the Summary. Warnings are not, because a screen that
 * opens with a banner every morning trains the reader to skip it.
 */
const HomeBody = memo(function HomeBody() {
  useMoneyFormatRevision();
  const { model, setTrendPeriod } = useHomeViewModel();
  const navigateTab = useNavigateTab();
  const router = useRouter();
  // Quick actions run commands; they are the one section that does not `open`.
  const quickActions = useHomeQuickActionRunner();

  const open = useCallback(
    (destination: HomeDestination | null) => {
      if (!destination) return;

      if (destination.pathname === FINANCE_METRIC_PATH && destination.params?.id) {
        guardedPush(router, {
          pathname: destination.pathname,
          params: { id: destination.params.id, returnTo: 'home' },
        } as unknown as Href);
        return;
      }

      navigateTab(toTarget(destination));
    },
    [navigateTab, router],
  );

  const openWork = useCallback(() => navigateTab(WORK_HREF), [navigateTab]);

  const interrupts = attentionInterrupts(model.attention);
  const showSkeleton = !model.meta.ready && model.summary.length === 0;

  /**
   * The greeting reads the reader's clock, not the data's. While the brief is
   * live those are the same instant, and `generatedAt` moving is exactly the
   * cadence the line should follow. A restored brief carries an old timestamp,
   * so a fresh one is taken instead — "Good morning" at 9pm is a bug.
   */
  const greetingNow = useMemo(
    () => (model.meta.fromCache ? new Date() : model.meta.generatedAt),
    [model.meta.fromCache, model.meta.generatedAt],
  );

  /**
   * A greeting may only react to whether something is waiting — never to what.
   * Until the listeners land it says neither, because claiming everything is
   * under control over a skeleton is a claim the screen cannot back.
   */
  const greetingSignal: HomeGreetingSignal = !model.meta.ready
    ? 'unknown'
    : model.attention.length > 0
      ? 'attention'
      : 'calm';

  const attention = (
    <HomeAttention items={model.attention} onOpen={(item) => open(item.destination)} />
  );

  return (
    <>
      <HomeHeader
        dateLabel={model.context.dateLabel}
        now={greetingNow}
        signal={greetingSignal}
        notice={resolveHomeNotice(model)}
      />

      {showSkeleton ? (
        <HomeSkeleton />
      ) : (
        <View style={{ gap: home.section }}>
          {interrupts ? attention : null}

          <HomeSummary
            metrics={model.summary}
            note={model.summaryNote}
            ready={model.meta.ready}
            onOpen={(metric) => open(metric.destination)}
            onOpenWork={openWork}
          />

          <HomeTrends
            trends={model.trends}
            period={model.meta.trendPeriod}
            onPeriodChange={setTrendPeriod}
            onOpen={(trend) => open(trend.destination)}
            available={model.trendsAvailable}
          />

          {interrupts ? null : attention}

          <HomeQuickActions
            actions={model.quickActions}
            busyId={quickActions.busyId}
            onRun={quickActions.run}
          />

          <HomeActivity
            rows={model.activity}
            onOpen={(row) => open(row.destination)}
            onOpenWork={openWork}
          />
        </View>
      )}
    </>
  );
});

export function HomeScreen() {
  const rbac = useRbacPolicy();
  const reconnectRealtime = useRealtimeReconnect();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reconnectRealtime();
    setRefreshing(false);
  }, [reconnectRealtime]);

  if (!rbac.nav.canAccessOverview) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Home"
        description="Your role cannot open this screen."
      />
    );
  }

  return (
    <ProductScreenShell animateEnter={false}>
      <ScreenScroll
        tabBarInset
        // `tabBarInset` already reserves the dock height plus the safe area;
        // this is added on top of it. The dock floats over the canvas, so the
        // last row has to be able to travel clear of the glass rather than stop
        // underneath it.
        contentStyle={{ paddingBottom: tokens.space.section }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <HomeBody />
      </ScreenScroll>
    </ProductScreenShell>
  );
}
