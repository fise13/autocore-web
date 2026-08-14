import { LockIcon } from '@/assets/icons';
import { EmptyState, PageHeader, Screen, ScreenScroll, StackScreen } from '@/components/ui';
import { useGuardedRouter } from '@/hooks/use-guarded-router';
import { tokens } from '@/theme/tokens';

import { EarningsHero } from '../components/earnings-hero';
import { EarningsJobList } from '../components/earnings-job-list';
import { EarningsPayoutList } from '../components/earnings-payout-list';
import { EarningsShiftPill } from '../components/earnings-shift-pill';
import { EarningsSkeleton } from '../components/earnings-skeleton';
import { EarningsWeekTally } from '../components/earnings-week-tally';
import { useMyEarnings } from '../hooks/use-my-earnings';

type MyEarningsScreenProps = {
  variant?: 'tab' | 'stack';
};

export function MyEarningsScreen({ variant = 'stack' }: MyEarningsScreenProps) {
  const router = useGuardedRouter();
  const earnings = useMyEarnings();
  const isShiftHub = variant === 'tab';
  const title = isShiftHub ? 'Shift' : 'Earnings';
  const shiftPill = earnings.allowed && !earnings.isLoading ? <EarningsShiftPill on={earnings.shiftOn} /> : null;

  const openJob = (id: string) => {
    router.push(`/orders/${id}`);
  };

  const openAllOrders = () => {
    router.push('/orders');
  };

  const body = (() => {
    if (!earnings.allowed) {
      return (
        <EmptyState
          icon={LockIcon}
          title="Earnings are hidden"
          description="This section needs permission to view your own payouts."
        />
      );
    }

    if (earnings.isLoading) {
      return <EarningsSkeleton />;
    }

    const { snapshot } = earnings;

    return (
      <>
        <EarningsHero
          pending={snapshot.pending}
          paid={snapshot.paid}
          openCount={snapshot.myOpen}
          shiftOn={earnings.shiftOn}
          shiftBusy={earnings.shiftBusy}
          maxActive={earnings.maxActiveWorkOrders}
          canToggleShift={earnings.canToggleShift}
          onShiftChange={earnings.setShiftOn}
        />

        <EarningsWeekTally days={snapshot.weekDays} closedCount={snapshot.weekClosedCount} />

        {snapshot.myOpenJobs.length > 0 ? (
          <EarningsJobList
            title="On your board"
            meta={snapshot.myOpen === 1 ? '1 open' : `${snapshot.myOpen} open`}
            jobs={snapshot.myOpenJobs}
            onOpenJob={openJob}
            onOpenAll={snapshot.claimableJobs.length === 0 ? openAllOrders : undefined}
          />
        ) : null}

        {snapshot.claimableJobs.length > 0 ? (
          <EarningsJobList
            title="Available to claim"
            meta={snapshot.freePool === 1 ? '1 in the pool' : `${snapshot.freePool} in the pool`}
            jobs={snapshot.claimableJobs}
            onOpenJob={openJob}
            onOpenAll={openAllOrders}
          />
        ) : null}

        <EarningsPayoutList
          payouts={snapshot.payouts}
          onOpenPayout={(workOrderId) => {
            if (workOrderId) openJob(workOrderId);
          }}
        />
      </>
    );
  })();

  if (variant === 'tab') {
    return (
      <Screen>
        <PageHeader title={title} logo={null} align="start" trailing={shiftPill} />
        <ScreenScroll tabBarInset contentStyle={{ gap: tokens.space.section, paddingTop: tokens.space.stack }}>
          {body}
        </ScreenScroll>
      </Screen>
    );
  }

  return (
    <StackScreen
      title={title}
      gap={tokens.space.section}
      headerAction={shiftPill}
      backFallbackHref="/(tabs)/work"
    >
      {body}
    </StackScreen>
  );
}
