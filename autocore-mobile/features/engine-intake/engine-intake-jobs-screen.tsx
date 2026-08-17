import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
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
import { EnginePhotoViewer } from '@/features/engines/components/engine-photo-viewer';
import { haptics, rhythm, spacing } from '@/theme';

import {
  IntakeAcceptSheet,
  type IntakeAcceptDraft,
  type IntakeAcceptSheetRef,
} from './components/intake-accept-sheet';
import {
  IntakeCreateSerialSheet,
  type IntakeCreateIdentityDraft,
  type IntakeCreateSerialSheetRef,
} from './components/intake-create-serial-sheet';
import { IntakeJobRow } from './components/intake-job-row';
import { IntakeOutboxBanner } from './components/intake-outbox-banner';
import { useEngineIntakeJobDetail, useEngineIntakeJobs } from './hooks/use-engine-intake-data';
import {
  drainIntakeOutbox,
  humanizeIntakeOutboxError,
  resolveFailedIntakeOutbox,
  sendOrQueueIntakeCommand,
  useEngineIntakeOutbox,
} from './store/intake-outbox';
import {
  engineIntakeId,
  getEngineIntakeDeviceId,
  getEngineIntakeDeviceName,
} from './lib/device';
import { openEngineIntakeSession } from './lib/open-engine-intake';
import { cancelIntakeJob } from './lib/cancel-intake-job';
import {
  dropOptimisticIntakeClaim,
  markIntakeJobVerified,
  restoreIntakeJobVerified,
  seedOptimisticIntakeClaim,
  seedOptimisticIntakeCreate,
} from './store/intake-local-overlay';

const ACTIVE_STATES = new Set<EngineIntakeJobState>([
  'open',
  'in_session',
  'paused',
  'rework',
]);

/** Ready ≈ web "In review" — Finish clears the claim, so do not require claimer. */
const READY_STATES = new Set<EngineIntakeJobState>([
  'awaiting_verification',
  'quarantine',
]);

/** All ≈ web "All" — include released / cancelled so the bay matches desktop. */
const ALL_STATES = new Set<EngineIntakeJobState>([
  'open',
  'in_session',
  'paused',
  'rework',
  'awaiting_verification',
  'quarantine',
  'verified',
  'closed',
  'rejected',
  'cancelled',
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

/**
 * Active tab: jobs this worker can pick up or is documenting.
 * Ready / All are company-wide like the web bay — Finish clears claimedByUid,
 * so requiring the claimer hid every Ready engine after a successful sync.
 */
function isActiveBayJob(
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
  if (!ACTIVE_STATES.has(job.state)) return false;
  return (
    job.assignment.assigneeUid === uid ||
    job.assignment.claimedByUid === uid ||
    (!job.assignment.assigneeUid && (job.state === 'open' || job.state === 'rework'))
  );
}

function sortJobs(left: EngineIntakeJob, right: EngineIntakeJob): number {
  const rank = { urgent: 0, high: 1, normal: 2 } as const;
  return rank[left.priority] - rank[right.priority];
}

function parseBayFilter(value: string | string[] | undefined): BayFilter | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'active' || raw === 'ready' || raw === 'all') return raw;
  return null;
}

export function EngineIntakeJobsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string | string[]; new?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { scrollBottom } = useFloatingTabBarInset();
  const { companyId, uid, profile, can } = useSession();
  const { colors } = useTheme();
  const { jobs, loading, error } = useEngineIntakeJobs(companyId);
  const outbox = useEngineIntakeOutbox(companyId);
  const createSheetRef = useRef<IntakeCreateSerialSheetRef>(null);
  const acceptSheetRef = useRef<IntakeAcceptSheetRef>(null);
  const acceptLockHeld = useRef(false);
  const [reviewJob, setReviewJob] = useState<EngineIntakeJob | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{ urls: string[]; index: number } | null>(
    null,
  );
  const [starting, setStarting] = useState(false);
  const [claimClock, setClaimClock] = useState(() => Date.now());
  const [deviceId] = useState(getEngineIntakeDeviceId);
  const [filter, setFilter] = useState<BayFilter>(
    () => parseBayFilter(params.filter) ?? 'active',
  );

  useEffect(() => {
    const next = parseBayFilter(params.filter);
    if (next) setFilter(next);
  }, [params.filter]);

  useEffect(() => {
    const timer = setInterval(() => setClaimClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const activeJobs = useMemo(
    () => jobs.filter((job) => isActiveBayJob(job, uid, deviceId)).sort(sortJobs),
    [deviceId, jobs, uid],
  );
  const readyJobs = useMemo(
    () => jobs.filter((job) => READY_STATES.has(job.state)).sort(sortJobs),
    [jobs],
  );
  const allJobs = useMemo(
    () => jobs.filter((job) => ALL_STATES.has(job.state)).sort(sortJobs),
    [jobs],
  );
  const visibleJobs =
    filter === 'active' ? activeJobs : filter === 'ready' ? readyJobs : allJobs;
  const { photos: reviewPhotos } = useEngineIntakeJobDetail(companyId, reviewJob?.id ?? null);
  const reviewPhotoUrls = useMemo(
    () =>
      reviewPhotos
        .filter((photo) => !photo.deletedAt)
        .map((photo) => photo.url || photo.localUri)
        .filter((uri): uri is string => Boolean(uri)),
    [reviewPhotos],
  );

  const openCreateSheet = useCallback(() => {
    createSheetRef.current?.present();
  }, []);

  useEffect(() => {
    const flag = Array.isArray(params.new) ? params.new[0] : params.new;
    if (flag !== '1' && flag !== 'true') return;
    if (!can('engine_intake_execute')) return;
    const timer = setTimeout(() => {
      createSheetRef.current?.present();
      router.setParams({ new: undefined });
    }, 160);
    return () => clearTimeout(timer);
  }, [can, params.new, router]);

  const openSession = useCallback(
    (jobId: string, sessionId: string) => {
      openEngineIntakeSession(router, jobId, sessionId);
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
      if (job.state === 'quarantine') {
        toast({
          title: 'On hold',
          description: 'This engine is in quarantine. Ask a reviewer before capturing more.',
          variant: 'default',
        });
        return;
      }
      const wasReady = job.state === 'awaiting_verification';
      const sessionId = engineIntakeId('session');
      setStarting(true);
      try {
        seedOptimisticIntakeClaim({
          companyId,
          job,
          sessionId,
          uid,
          displayName: profile?.displayName ?? null,
          deviceId,
          deviceName: getEngineIntakeDeviceName(),
        });
        await sendOrQueueIntakeCommand(companyId, createClaimCommand(job.id, sessionId));
        haptics.success();
        openSession(job.id, sessionId);
      } catch (claimError) {
        dropOptimisticIntakeClaim(companyId, job.id, wasReady);
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
    [can, companyId, deviceId, openSession, profile?.displayName, uid],
  );

  const makeVerifyCommand = useCallback(
    (
      type: 'start_verification' | 'release_verification' | 'approve_job',
      payload: EngineIntakeCommand['payload'],
    ): EngineIntakeCommand =>
      ({
        type,
        idempotencyKey: engineIntakeId(type.replace('_', '-')),
        client: 'mobile',
        clientAt: new Date().toISOString(),
        deviceId: getEngineIntakeDeviceId(),
        payload,
      }) as EngineIntakeCommand,
    [],
  );

  const openAcceptSheet = useCallback(
    async (job: EngineIntakeJob) => {
      if (!companyId || !can('engine_intake_verify')) return;
      if (job.state !== 'awaiting_verification') return;
      setStarting(true);
      setReviewJob(job);
      try {
        await sendOrQueueIntakeCommand(
          companyId,
          makeVerifyCommand('start_verification', { jobId: job.id }),
        );
        acceptLockHeld.current = true;
        acceptSheetRef.current?.present(job);
      } catch (error) {
        acceptLockHeld.current = false;
        setReviewJob(null);
        haptics.error();
        toast({
          title: 'Could not open review',
          description:
            error instanceof Error ? humanizeIntakeOutboxError(error.message) : undefined,
          variant: 'destructive',
        });
      } finally {
        setStarting(false);
      }
    },
    [can, companyId, makeVerifyCommand],
  );

  const releaseAcceptLock = useCallback(() => {
    const jobId = reviewJob?.id;
    const held = acceptLockHeld.current;
    acceptLockHeld.current = false;
    setReviewJob(null);
    setPhotoViewer(null);
    if (!companyId || !jobId || !held) return;
    void sendOrQueueIntakeCommand(
      companyId,
      makeVerifyCommand('release_verification', { jobId }),
    ).catch(() => null);
  }, [companyId, makeVerifyCommand, reviewJob?.id]);

  const submitAccept = useCallback(
    async (draft: IntakeAcceptDraft) => {
      if (!companyId || !reviewJob) return;
      const jobId = reviewJob.id;
      const hasBlockingFlags = reviewJob.blockingAiFlags.length > 0;
      markIntakeJobVerified(companyId, jobId);
      setStarting(true);
      try {
        await sendOrQueueIntakeCommand(
          companyId,
          makeVerifyCommand('approve_job', {
            jobId,
            note: draft.note || 'Checklist ready',
            identity: {
              serialCode: draft.serialCode,
              brandName: draft.brandName,
              engineCode: draft.engineCode,
            },
            quality: draft.quality,
            ...(hasBlockingFlags || draft.note
              ? {
                  aiOverrideReason:
                    draft.note || 'Manager override for release',
                }
              : {}),
          }),
        );
        acceptLockHeld.current = false;
        acceptSheetRef.current?.dismiss();
        setReviewJob(null);
        setPhotoViewer(null);
        haptics.success();
        toast({ title: 'Released to Motors Grid', variant: 'success' });
        void drainIntakeOutbox(companyId);
      } catch (error) {
        restoreIntakeJobVerified(companyId, jobId);
        haptics.error();
        toast({
          title: 'Could not release engine',
          description:
            error instanceof Error ? humanizeIntakeOutboxError(error.message) : undefined,
          variant: 'destructive',
        });
      } finally {
        setStarting(false);
      }
    },
    [companyId, makeVerifyCommand, reviewJob],
  );

  const handleRowPress = useCallback(
    (job: EngineIntakeJob) => {
      if (job.state === 'awaiting_verification' && can('engine_intake_verify')) {
        void openAcceptSheet(job);
        return;
      }
      void claimAndOpen(job);
    },
    [can, claimAndOpen, openAcceptSheet],
  );

  const startWithSerial = useCallback(
    async (identity: IntakeCreateIdentityDraft) => {
      if (!companyId || !uid || !can('engine_intake_execute')) return;
      const serialCode = identity.serialCode.trim();
      if (!serialCode) {
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
          expectedIdentity: {
            serialCode,
            brandName: identity.brandName.trim(),
            engineCode: identity.engineCode.trim(),
          },
          assigneeUid: uid,
          assigneeName: profile?.displayName ?? null,
        },
      };
      const claimCommand = createClaimCommand(jobId, sessionId);

      setStarting(true);
      try {
        seedOptimisticIntakeCreate({
          companyId,
          jobId,
          sessionId,
          uid,
          displayName: profile?.displayName ?? null,
          deviceId: getEngineIntakeDeviceId(),
          deviceName: getEngineIntakeDeviceName(),
          identity: {
            serialCode,
            brandName: identity.brandName.trim(),
            engineCode: identity.engineCode.trim(),
          },
        });
        await sendOrQueueIntakeCommand(companyId, createCommand);
        await sendOrQueueIntakeCommand(companyId, claimCommand);
        createSheetRef.current?.dismiss();
        haptics.success();
        openSession(jobId, sessionId);
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

  const saveIdentityEdit = useCallback(
    async (jobId: string, identity: IntakeCreateIdentityDraft) => {
      if (!companyId || !can('engine_intake_execute')) return;
      setStarting(true);
      try {
        const command: EngineIntakeCommand = {
          type: 'update_identity',
          idempotencyKey: engineIntakeId('identity'),
          client: 'mobile',
          clientAt: new Date().toISOString(),
          deviceId: getEngineIntakeDeviceId(),
          payload: {
            jobId,
            identity: {
              serialCode: identity.serialCode.trim(),
              brandName: identity.brandName.trim(),
              engineCode: identity.engineCode.trim(),
            },
          },
        };
        await sendOrQueueIntakeCommand(companyId, command);
        createSheetRef.current?.dismiss();
        haptics.success();
        toast({ title: 'Engine updated', variant: 'success' });
        void drainIntakeOutbox(companyId);
      } catch (error) {
        haptics.error();
        toast({
          title: 'Could not update engine',
          description:
            error instanceof Error ? humanizeIntakeOutboxError(error.message) : undefined,
          variant: 'destructive',
        });
      } finally {
        setStarting(false);
      }
    },
    [can, companyId],
  );

  const handleSheetSubmit = useCallback(
    async (
      identity: IntakeCreateIdentityDraft,
      meta: { mode: 'create' } | { mode: 'edit'; jobId: string },
    ) => {
      if (meta.mode === 'edit') {
        await saveIdentityEdit(meta.jobId, identity);
        return;
      }
      await startWithSerial(identity);
    },
    [saveIdentityEdit, startWithSerial],
  );

  const openEditSheet = useCallback((job: EngineIntakeJob) => {
    createSheetRef.current?.present({
      mode: 'edit',
      jobId: job.id,
      identity: {
        serialCode: job.expectedIdentity.serialCode || '',
        brandName: job.expectedIdentity.brandName || '',
        engineCode: job.expectedIdentity.engineCode || '',
      },
    });
  }, []);

  const cancelJob = useCallback(
    (job: EngineIntakeJob) => {
      if (!companyId || !can('engine_intake_execute')) return;
      const serial =
        job.expectedIdentity.serialCode ||
        job.expectedIdentity.engineCode ||
        'this engine';
      Alert.alert('Cancel engine?', `${serial} will leave the intake bay.`, [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel engine',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await cancelIntakeJob(companyId, job);
                haptics.success();
                toast({ title: 'Engine cancelled', variant: 'default' });
              } catch (error) {
                haptics.error();
                toast({
                  title: 'Could not cancel',
                  description:
                    error instanceof Error
                      ? humanizeIntakeOutboxError(error.message)
                      : undefined,
                  variant: 'destructive',
                });
              }
            })();
          },
        },
      ]);
    },
    [can, companyId],
  );

  const retryOutbox = useCallback(() => {
    if (!companyId) return;
    void (async () => {
      const { discarded, retried } = await resolveFailedIntakeOutbox(companyId);
      if (discarded > 0 && retried === 0) {
        toast({
          title: `Cleared ${discarded} dead sync item${discarded === 1 ? '' : 's'}`,
          variant: 'default',
        });
        return;
      }
      if (retried > 0 && discarded > 0) {
        toast({
          title: 'Sync cleaned up',
          description: `Retried ${retried}, cleared ${discarded} that could not sync.`,
          variant: 'default',
        });
        return;
      }
      if (retried > 0) {
        toast({ title: 'Retrying sync…', variant: 'default' });
        return;
      }
      if (outbox.pendingCount > 0) {
        void drainIntakeOutbox(companyId);
        toast({ title: 'Syncing…', variant: 'default' });
        return;
      }
      toast({ title: 'Nothing left to sync', variant: 'default' });
    })();
  }, [companyId, outbox.pendingCount]);

  const jobHasPendingSync = useCallback(
    (jobId: string) =>
      outbox.photos.some(
        (photo) =>
          photo.companyId === companyId &&
          photo.jobId === jobId &&
          (photo.state === 'pending' || photo.state === 'syncing') &&
          photo.errorInfo?.code !== 'CONFLICT',
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
      .filter((item) => {
        if (item.companyId !== companyId || !item.lastError) return false;
        if ('errorInfo' in item && item.errorInfo?.code === 'CONFLICT') return false;
        const lower = item.lastError.toLowerCase();
        if (lower.includes('already on the server') || lower.includes('already recorded')) {
          return false;
        }
        return true;
      })
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
        ? `${allJobs.length} in intake`
        : `${activeJobs.length} documenting`;

  const listHeader = (
    <View style={{ gap: spacing[2], paddingBottom: spacing[2] }}>
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
          errorTitle="Intake unavailable"
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
              ? 'Finished engines waiting for verification show up here.'
              : 'Enter the engine serial, then photograph freely. Review happens later.'
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
        <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[2] }}>
          <SegmentedControl
            accessibilityLabel="Engine intake filter"
            value={filter}
            onValueChange={(value) => setFilter(value as BayFilter)}
            segments={[
              { value: 'active', label: `Active ${activeJobs.length}` },
              { value: 'ready', label: `Ready ${readyJobs.length}` },
              { value: 'all', label: `All ${allJobs.length}` },
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
        <FlashList
          data={visibleJobs}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListFooterComponent={
            can('engine_intake_execute') && visibleJobs.length > 0 && filter !== 'ready' ? (
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
                localPhotoCount={
                  outbox.photos.filter(
                    (photo) =>
                      photo.companyId === companyId &&
                      photo.jobId === item.id &&
                      photo.state !== 'failed' &&
                      photo.errorInfo?.code !== 'CONFLICT',
                  ).length
                }
                disabled={starting}
                canEdit={can('engine_intake_execute')}
                canVerify={can('engine_intake_verify')}
                onPress={() => handleRowPress(item)}
                onAddPhotos={
                  can('engine_intake_execute') ? (job) => void claimAndOpen(job) : undefined
                }
                onRelease={
                  can('engine_intake_verify') ? (job) => void openAcceptSheet(job) : undefined
                }
                onEdit={openEditSheet}
                onCancel={cancelJob}
              />
            );
          }}
        />
      </View>

      {/* Last child so the absolute overlay paints above the list (no Modal). */}
      <IntakeCreateSerialSheet
        ref={createSheetRef}
        loading={starting}
        onSubmit={handleSheetSubmit}
      />
      <IntakeAcceptSheet
        ref={acceptSheetRef}
        loading={starting}
        photoUrls={reviewPhotoUrls}
        onOpenPhoto={(index) => {
          if (reviewPhotoUrls.length === 0) return;
          setPhotoViewer({ urls: reviewPhotoUrls, index });
        }}
        onDismiss={releaseAcceptLock}
        onSubmit={submitAccept}
      />
      {photoViewer ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 120 }}>
          <EnginePhotoViewer
            urls={photoViewer.urls}
            serial={
              reviewJob?.expectedIdentity.serialCode ||
              reviewJob?.expectedIdentity.engineCode ||
              'Engine'
            }
            initialIndex={photoViewer.index}
            onClose={() => setPhotoViewer(null)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
