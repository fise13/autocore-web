import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type {
  EngineIntakeCommand,
  EngineIntakeJob,
  EngineIntakeJobState,
} from '@autocore/engine-intake';
import { isEngineIntakeSessionStale } from '@autocore/engine-intake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, CameraIcon, PlusIcon } from '@/assets/icons';
import {
  Button,
  ContentState,
  FlashList,
  IconButton,
  Screen,
  ScreenGate,
  SegmentedControl,
  Text,
  toast,
} from '@/components/ui';
import { useFloatingTabBarInset, useSession, useTheme } from '@/hooks';
import { goBackOrReplace } from '@/lib/navigation/stack-back';
import { haptics, rhythm, spacing } from '@/theme';

import { IntakeCreateSerialSheet, type IntakeCreateSerialSheetRef } from './components/intake-create-serial-sheet';
import { IntakeJobRow } from './components/intake-job-row';
import { IntakeOutboxBanner } from './components/intake-outbox-banner';
import { useEngineIntakeJobs } from './hooks/use-engine-intake-data';
import {
  drainIntakeOutbox,
  humanizeIntakeOutboxError,
  retryIntakeOutboxItem,
  sendOrQueueIntakeCommand,
  useEngineIntakeOutbox,
} from './store/intake-outbox';
import {
  engineIntakeId,
  getEngineIntakeDeviceId,
  getEngineIntakeDeviceName,
} from './lib/device';

const ACTIVE_STATES = new Set<EngineIntakeJobState>([
  'open',
  'in_session',
  'paused',
  'rework',
]);

type BayFilter = 'active' | 'ready' | 'all';

function isPermissionError(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('missing or insufficient permissions') ||
    normalized.includes('permission-denied') ||
    normalized.includes('permission denied')
  );
}

function createClaimCommand(jobId: string, sessionId: string): EngineIntakeCommand {
  return {
    type: 'claim_job',
    idempotencyKey: engineIntakeId('claim'),
    client: 'mobile',
    clientAt: new Date().toISOString(),
    deviceId: getEngineIntakeDeviceId(),
    payload: {
      jobId,
      sessionId,
      deviceName: getEngineIntakeDeviceName(),
    },
  };
}

function isWorkerScoped(
  job: EngineIntakeJob,
  uid: string | null | undefined,
  deviceId: string,
): boolean {
  if (job.state === 'paused') {
    return Boolean(
      job.assignment.activeSessionId &&
        job.assignment.claimedByUid === uid &&
        job.assignment.claimDeviceId === deviceId,
    );
  }
  if (ACTIVE_STATES.has(job.state)) {
    return (
      job.assignment.assigneeUid === uid ||
      job.assignment.claimedByUid === uid ||
      (!job.assignment.assigneeUid && (job.state === 'open' || job.state === 'rework'))
    );
  }
  if (job.state === 'awaiting_verification') {
    return job.assignment.assigneeUid === uid || job.assignment.claimedByUid === uid;
  }
  return false;
}

function sortJobs(left: EngineIntakeJob, right: EngineIntakeJob): number {
  const rank = { urgent: 0, high: 1, normal: 2 } as const;
  return rank[left.priority] - rank[right.priority];
}

export function EngineIntakeJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollBottom } = useFloatingTabBarInset();
  const { companyId, uid, profile, can } = useSession();
  const { colors } = useTheme();
  const { jobs, loading, error } = useEngineIntakeJobs(companyId);
  const outbox = useEngineIntakeOutbox(companyId);
  const createSheetRef = useRef<IntakeCreateSerialSheetRef>(null);
  const [starting, setStarting] = useState(false);
  const [claimClock, setClaimClock] = useState(() => Date.now());
  const [deviceId] = useState(getEngineIntakeDeviceId);
  const [filter, setFilter] = useState<BayFilter>('active');

  useEffect(() => {
    const timer = setInterval(() => setClaimClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const scopedJobs = useMemo(() => {
    return jobs
      .filter((job) => isWorkerScoped(job, uid, deviceId))
      .sort(sortJobs);
  }, [deviceId, jobs, uid]);

  const activeJobs = useMemo(
    () => scopedJobs.filter((job) => ACTIVE_STATES.has(job.state)),
    [scopedJobs],
  );
  const readyJobs = useMemo(
    () => scopedJobs.filter((job) => job.state === 'awaiting_verification'),
    [scopedJobs],
  );
  const visibleJobs =
    filter === 'active' ? activeJobs : filter === 'ready' ? readyJobs : scopedJobs;

  const openCreateSheet = useCallback(() => {
    createSheetRef.current?.present();
  }, []);

  const openSession = useCallback(
    (jobId: string, sessionId: string) => {
      router.push(
        {
          pathname: '/intake/[jobId]',
          params: { jobId, sessionId },
        } as unknown as Href,
      );
    },
    [router],
  );

  const claimAndOpen = useCallback(
    async (job: EngineIntakeJob) => {
      if (!companyId || !uid || !can('engine_intake_execute')) return;
      if (
        job.assignment.activeSessionId &&
        job.assignment.claimedByUid === uid &&
        job.assignment.claimDeviceId === deviceId
      ) {
        openSession(job.id, job.assignment.activeSessionId);
        return;
      }
      if (job.state === 'awaiting_verification') {
        toast({
          title: 'Already in Warehouse',
          description: 'This engine is waiting for review. Start a new engine to capture more.',
          variant: 'default',
        });
        return;
      }
      const sessionId = engineIntakeId('session');
      setStarting(true);
      try {
        const claimed = await sendOrQueueIntakeCommand(
          companyId,
          createClaimCommand(job.id, sessionId),
        );
        if (!claimed?.sessionId) {
          toast({
            title: 'Claim saved for sync',
            description: 'Open the engine after the server confirms the exclusive claim.',
            variant: 'warning',
          });
          return;
        }
        haptics.success();
        openSession(job.id, claimed.sessionId);
      } catch (claimError) {
        haptics.error();
        toast({
          title: 'Engine could not be opened',
          description: claimError instanceof Error ? claimError.message : undefined,
          variant: 'destructive',
        });
      } finally {
        setStarting(false);
      }
    },
    [can, companyId, deviceId, openSession, uid],
  );

  const startWithSerial = useCallback(
    async (serialCode: string) => {
      if (!companyId || !uid || !can('engine_intake_execute')) return;
      if (!serialCode.trim()) {
        toast({ title: 'Serial is required', variant: 'warning' });
        return;
      }
      const jobId = engineIntakeId('job');
      const sessionId = engineIntakeId('session');
      const createCommand: EngineIntakeCommand = {
        type: 'create_job',
        idempotencyKey: engineIntakeId('create'),
        client: 'mobile',
        clientAt: new Date().toISOString(),
        deviceId: getEngineIntakeDeviceId(),
        payload: {
          jobId,
          source: 'ad_hoc',
          priority: 'normal',
          expectedIdentity: { serialCode },
          assigneeUid: uid,
          assigneeName: profile?.displayName ?? null,
        },
      };
      const claimCommand = createClaimCommand(jobId, sessionId);

      setStarting(true);
      try {
        const created = await sendOrQueueIntakeCommand(companyId, createCommand);
        if (!created) {
          toast({
            title: 'Cannot open camera yet',
            description:
              'Engine draft could not reach the server. Fix sync (banner above), then try again.',
            variant: 'destructive',
          });
          return;
        }
        const claimed = await sendOrQueueIntakeCommand(companyId, claimCommand);
        if (!claimed?.sessionId) {
          toast({
            title: 'Engine created — claim failed',
            description: 'Open it from the Warehouse list after sync completes.',
            variant: 'warning',
          });
          createSheetRef.current?.dismiss();
          return;
        }
        createSheetRef.current?.dismiss();
        haptics.success();
        openSession(created.jobId || jobId, claimed.sessionId);
      } catch (startError) {
        haptics.error();
        toast({
          title: 'Engine could not start',
          description:
            startError instanceof Error
              ? humanizeIntakeOutboxError(startError.message)
              : undefined,
          variant: 'destructive',
        });
      } finally {
        setStarting(false);
      }
    },
    [can, companyId, openSession, profile?.displayName, uid],
  );

  const retryOutbox = useCallback(() => {
    if (!companyId) return;
    for (const item of [...outbox.commands, ...outbox.photos]) {
      if (item.companyId === companyId && item.state === 'failed') {
        retryIntakeOutboxItem(item.id);
      }
    }
    void drainIntakeOutbox(companyId);
  }, [companyId, outbox.commands, outbox.photos]);

  const jobHasPendingSync = useCallback(
    (jobId: string) =>
      outbox.photos.some(
        (photo) =>
          photo.companyId === companyId &&
          photo.jobId === jobId &&
          (photo.state === 'pending' || photo.state === 'syncing'),
      ) ||
      outbox.commands.some(
        (item) =>
          item.companyId === companyId &&
          (item.state === 'pending' || item.state === 'syncing') &&
          'jobId' in item.command.payload &&
          item.command.payload.jobId === jobId,
      ),
    [companyId, outbox.commands, outbox.photos],
  );

  const rawOutboxIssue =
    [...outbox.commands, ...outbox.photos]
      .filter((item) => item.companyId === companyId && item.lastError)
      .map((item) => item.lastError)
      .find(Boolean) ?? null;
  const outboxIssue = rawOutboxIssue ? humanizeIntakeOutboxError(rawOutboxIssue) : null;
  const outboxNeedsDeploy =
    typeof outboxIssue === 'string' &&
    (outboxIssue.toLowerCase().includes('deploy the web app') ||
      outboxIssue.toLowerCase().includes('upload api is missing'));

  if (!can('engine_intake_view')) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Engine intake"
        description="Your role cannot open Engine intake documentation."
      />
    );
  }

  const subtitle =
    filter === 'ready'
      ? `${readyJobs.length} ready for review`
      : filter === 'all'
        ? `${scopedJobs.length} in Warehouse`
        : `${activeJobs.length} documenting`;

  const listHeader = (
    <View style={{ gap: spacing[2], paddingBottom: spacing[2] }}>
      <View style={{ paddingHorizontal: spacing[4] }}>
        <SegmentedControl
          accessibilityLabel="Engine intake filter"
          value={filter}
          onValueChange={(value) => setFilter(value as BayFilter)}
          segments={[
            { value: 'active', label: `Active ${activeJobs.length}` },
            { value: 'ready', label: `Ready ${readyJobs.length}` },
            { value: 'all', label: `All ${scopedJobs.length}` },
          ]}
        />
      </View>

      <IntakeOutboxBanner
        pendingCount={outbox.pendingCount}
        failedCount={outbox.failedCount}
        syncing={outbox.syncing}
        issue={outboxIssue}
        needsDeploy={outboxNeedsDeploy}
        onPress={retryOutbox}
      />

      {loading ? <ContentState state="loading">{null}</ContentState> : null}

      {!loading && error && visibleJobs.length === 0 ? (
        <ContentState
          state={isPermissionError(error) ? 'empty' : 'error'}
          emptyIcon={isPermissionError(error) ? CameraIcon : undefined}
          emptyTitle={
            isPermissionError(error) ? 'No engines documenting yet' : undefined
          }
          emptyDescription={
            isPermissionError(error)
              ? outbox.pendingCount > 0
                ? `${outbox.pendingCount} local items are waiting to sync. Start a new engine or wait for the queue.`
                : 'New engines you photograph will appear here.'
              : undefined
          }
          emptyActionLabel={can('engine_intake_execute') ? 'New engine' : undefined}
          onEmptyAction={can('engine_intake_execute') ? openCreateSheet : undefined}
          errorTitle="Warehouse unavailable"
          errorDescription={
            isPermissionError(error)
              ? 'Live list could not be loaded. You can still start a new engine.'
              : error
          }
          onRetry={
            companyId
              ? () => {
                  void drainIntakeOutbox(companyId);
                }
              : undefined
          }
        >
          {null}
        </ContentState>
      ) : null}

      {!loading && !error && visibleJobs.length === 0 ? (
        <ContentState
          state="empty"
          emptyIcon={CameraIcon}
          emptyTitle={
            filter === 'ready' ? 'Nothing ready yet' : 'Put an engine in the phone'
          }
          emptyDescription={
            filter === 'ready'
              ? 'Finished engines waiting for Warehouse review show up here.'
              : 'Enter the serial, then photograph freely. Autocore builds Warehouse inventory.'
          }
          emptyActionLabel={
            can('engine_intake_execute') && filter !== 'ready' ? 'New engine' : undefined
          }
          onEmptyAction={
            can('engine_intake_execute') && filter !== 'ready' ? openCreateSheet : undefined
          }
        >
          {null}
        </ContentState>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <IntakeCreateSerialSheet
        ref={createSheetRef}
        loading={starting}
        onSubmit={startWithSerial}
      />

      <View
        style={{
          paddingTop: insets.top + rhythm.headerTop,
          paddingHorizontal: rhythm.pad,
          paddingBottom: rhythm.headerBottom,
          flexDirection: 'row',
          alignItems: 'center',
          gap: rhythm.inline,
        }}
      >
        <IconButton
          accessibilityLabel="Back"
          variant="ghost"
          size="sm"
          onPress={() => goBackOrReplace(router, '/(tabs)' as Href)}
        >
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            variant="heading"
            style={{ fontSize: 17, fontWeight: '600', lineHeight: 22, color: colors.foreground }}
          >
            Engine intake
          </Text>
          <Text
            variant="caption"
            style={{ fontSize: 12, lineHeight: 16, color: colors.mutedForeground }}
          >
            {subtitle}
          </Text>
        </View>
        {can('engine_intake_execute') ? (
          <Button
            size="icon-sm"
            accessibilityLabel="New engine"
            loading={starting}
            onPress={openCreateSheet}
          >
            <PlusIcon size={20} color={colors.primaryForeground} />
          </Button>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <FlashList
          data={visibleJobs}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListFooterComponent={
            can('engine_intake_execute') && visibleJobs.length > 0 ? (
              <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2] }}>
                <Button size="xl" loading={starting} onPress={openCreateSheet}>
                  New engine
                </Button>
              </View>
            ) : null
          }
          contentContainerStyle={{
            paddingBottom: scrollBottom + rhythm.tabBarBreathing + spacing[4],
            paddingTop: spacing[1],
          }}
          renderItem={({ item, index }) => {
            const claimExpired =
              !item.assignment.claimExpiresAt ||
              Date.parse(item.assignment.claimExpiresAt) <= claimClock;
            const claimStale =
              claimExpired ||
              isEngineIntakeSessionStale(item.assignment.lastHeartbeatAt, claimClock);
            const claimedByAnother =
              Boolean(item.assignment.claimedByUid) &&
              item.assignment.claimedByUid !== uid &&
              !claimStale &&
              ACTIVE_STATES.has(item.state);
            return (
              <IntakeJobRow
                job={item}
                index={index}
                claimedByAnother={claimedByAnother}
                claimedByName={item.assignment.claimedByName}
                syncPending={jobHasPendingSync(item.id)}
                disabled={starting}
                onPress={() => void claimAndOpen(item)}
              />
            );
          }}
        />
      </View>
    </Screen>
  );
}
