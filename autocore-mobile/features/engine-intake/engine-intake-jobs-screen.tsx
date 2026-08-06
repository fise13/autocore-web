import { useDeferredValue, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type {
  EngineIntakeCommand,
  EngineIntakeJob,
  EngineIntakeJobState,
} from '@autocore/engine-intake';
import { isEngineIntakeSessionStale } from '@autocore/engine-intake';

import {
  AlertTriangleIcon,
  CameraIcon,
  ChevronRightIcon,
  CloudIcon,
  PlusIcon,
} from '@/assets/icons';
import { Button, ContentState, ScreenGate, StackScreen, Text, toast } from '@/components/ui';
import { useSession, useTheme } from '@/hooks';
import { haptics, minTouchTarget, spacing, tokens } from '@/theme';

import { useEngineIntakeJobs } from './hooks/use-engine-intake-data';
import {
  drainIntakeOutbox,
  enqueueIntakeCommand,
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

function jobTitle(job: EngineIntakeJob): string {
  return (
    job.expectedIdentity.engineCode ||
    job.expectedIdentity.serialCode ||
    job.sourceReference ||
    'Unidentified engine'
  );
}

function stateLabel(state: EngineIntakeJobState): string {
  const labels: Record<EngineIntakeJobState, string> = {
    open: 'Ready',
    in_session: 'In progress',
    paused: 'Paused',
    awaiting_verification: 'Verification',
    rework: 'Retake requested',
    verified: 'Verified',
    quarantine: 'Quarantine',
    rejected: 'Rejected',
    closed: 'Closed',
    cancelled: 'Cancelled',
  };
  return labels[state];
}

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

export function EngineIntakeJobsScreen() {
  const router = useRouter();
  const { companyId, uid, profile, can } = useSession();
  const { colors } = useTheme();
  const { jobs, loading, error } = useEngineIntakeJobs(companyId);
  const deferredJobs = useDeferredValue(jobs);
  const outbox = useEngineIntakeOutbox(companyId);
  const [starting, setStarting] = useState(false);
  const [claimClock, setClaimClock] = useState(() => Date.now());
  const [deviceId] = useState(getEngineIntakeDeviceId);

  useEffect(() => {
    const timer = setInterval(() => setClaimClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!can('engine_intake_view')) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Engine intake"
        description="Your role cannot open engine intake."
      />
    );
  }

  const visibleJobs = deferredJobs
    .filter((job) => {
      if (!ACTIVE_STATES.has(job.state)) return false;
      if (job.state === 'paused') {
        return Boolean(
          job.assignment.activeSessionId &&
            job.assignment.claimedByUid === uid &&
            job.assignment.claimDeviceId === deviceId,
        );
      }
      return (
        job.assignment.assigneeUid === uid ||
        job.assignment.claimedByUid === uid ||
        (!job.assignment.assigneeUid && (job.state === 'open' || job.state === 'rework'))
      );
    })
    .sort((left, right) => {
      const rank = { urgent: 0, high: 1, normal: 2 } as const;
      return rank[left.priority] - rank[right.priority];
    });

  const openSession = (jobId: string, sessionId: string) => {
    router.push(
      {
        pathname: '/intake/[jobId]',
        params: { jobId, sessionId },
      } as unknown as Href,
    );
  };

  const claimAndOpen = async (job: EngineIntakeJob) => {
    if (!companyId || !uid || !can('engine_intake_execute')) return;
    if (
      job.assignment.activeSessionId &&
      job.assignment.claimedByUid === uid &&
      job.assignment.claimDeviceId === deviceId
    ) {
      openSession(job.id, job.assignment.activeSessionId);
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
          description: 'Open the job after the server confirms the exclusive claim.',
          variant: 'warning',
        });
        return;
      }
      haptics.success();
      openSession(job.id, claimed.sessionId);
    } catch (claimError) {
      haptics.error();
      toast({
        title: 'Job could not be claimed',
        description: claimError instanceof Error ? claimError.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  };

  const startUnplanned = async () => {
    if (!companyId || !uid || !can('engine_intake_execute')) return;
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
        assigneeUid: uid,
        assigneeName: profile?.displayName ?? null,
      },
    };
    const claimCommand = createClaimCommand(jobId, sessionId);

    setStarting(true);
    try {
      const created = await sendOrQueueIntakeCommand(companyId, createCommand);
      if (created) {
        const claimed = await sendOrQueueIntakeCommand(companyId, claimCommand);
        if (!claimed?.sessionId) {
          toast({
            title: 'Engine created; claim is waiting to sync',
            description: 'Open it from the queue after the exclusive claim is confirmed.',
            variant: 'warning',
          });
          return;
        }
        haptics.success();
        openSession(created.jobId, claimed.sessionId);
      } else {
        enqueueIntakeCommand(companyId, claimCommand);
        toast({
          title: 'Unplanned engine saved on this phone',
          description: 'It will appear in the queue after the server creates and claims it.',
          variant: 'warning',
        });
      }
    } catch (startError) {
      haptics.error();
      toast({
        title: 'Intake could not start',
        description: startError instanceof Error ? startError.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  };

  const outboxIssue =
    [...outbox.commands, ...outbox.photos]
      .filter((item) => item.companyId === companyId && item.lastError)
      .map((item) => item.lastError)
      .find(Boolean) ?? null;
  const outboxNeedsDeploy =
    typeof outboxIssue === 'string' &&
    outboxIssue.toLowerCase().includes('web app needs to be deployed');

  return (
    <StackScreen
      title="Engine intake"
      subtitle={`${visibleJobs.length} jobs ready for field work`}
      backFallbackHref="/(tabs)"
      headerAction={
        can('engine_intake_execute') ? (
          <Button
            size="icon-sm"
            accessibilityLabel="Start unplanned engine"
            loading={starting}
            onPress={() => void startUnplanned()}
          >
            <PlusIcon size={20} color={colors.primaryForeground} />
          </Button>
        ) : null
      }
    >
      {outbox.pendingCount > 0 || outbox.failedCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (!companyId) return;
            for (const item of [...outbox.commands, ...outbox.photos]) {
              if (item.companyId === companyId && item.state === 'failed') {
                retryIntakeOutboxItem(item.id);
              }
            }
            void drainIntakeOutbox(companyId);
          }}
          style={{
            minHeight: minTouchTarget,
            marginHorizontal: spacing[4],
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[3],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
            borderRadius: tokens.radius.group,
            backgroundColor:
              outbox.failedCount > 0 || outboxNeedsDeploy
                ? colors.dangerSubtle
                : colors.primarySubtle,
          }}
        >
          {outbox.failedCount > 0 || outboxNeedsDeploy ? (
            <AlertTriangleIcon size={20} color={colors.dangerOnSubtle} />
          ) : (
            <CloudIcon size={20} color={colors.primaryOnSubtle} />
          )}
          <View style={{ flex: 1 }}>
            <Text
              variant="caption"
              style={{
                color:
                  outbox.failedCount > 0 || outboxNeedsDeploy
                    ? colors.dangerOnSubtle
                    : colors.primaryOnSubtle,
                fontWeight: '700',
              }}
            >
              {outboxNeedsDeploy
                ? 'Web API not deployed — intake sync is blocked'
                : outbox.failedCount > 0
                  ? `${outbox.failedCount} items need attention`
                  : outbox.syncing
                    ? 'Syncing intake work'
                    : `${outbox.pendingCount} items waiting to sync`}
            </Text>
            {outboxIssue ? (
              <Text
                variant="caption"
                style={{
                  color:
                    outbox.failedCount > 0 || outboxNeedsDeploy
                      ? colors.dangerOnSubtle
                      : colors.primaryOnSubtle,
                  marginTop: 2,
                }}
                numberOfLines={2}
              >
                {outboxIssue}
              </Text>
            ) : null}
          </View>
          <ChevronRightIcon
            size={18}
            color={
              outbox.failedCount > 0 || outboxNeedsDeploy
                ? colors.dangerOnSubtle
                : colors.primaryOnSubtle
            }
          />
        </Pressable>
      ) : null}

      {loading ? <ContentState state="loading">{null}</ContentState> : null}
      {!loading && error && visibleJobs.length === 0 ? (
        <ContentState
          state={isPermissionError(error) ? 'empty' : 'error'}
          emptyIcon={isPermissionError(error) ? CameraIcon : undefined}
          emptyTitle={
            isPermissionError(error) ? 'No assigned engines yet' : undefined
          }
          emptyDescription={
            isPermissionError(error)
              ? outbox.pendingCount > 0
                ? `${outbox.pendingCount} local items are waiting to sync. Start an unplanned engine or wait for the queue to reconnect.`
                : 'Assigned and unplanned intake work will appear here.'
              : undefined
          }
          emptyActionLabel={
            can('engine_intake_execute') ? 'Start unplanned engine' : undefined
          }
          onEmptyAction={
            can('engine_intake_execute') ? () => void startUnplanned() : undefined
          }
          errorTitle="Jobs unavailable"
          errorDescription={
            isPermissionError(error)
              ? 'Live job list could not be loaded. You can still start an unplanned engine.'
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
          emptyTitle="No assigned engines"
          emptyDescription="Assigned and unplanned intake work will appear here."
          emptyActionLabel={
            can('engine_intake_execute') ? 'Start unplanned engine' : undefined
          }
          onEmptyAction={
            can('engine_intake_execute') ? () => void startUnplanned() : undefined
          }
        >
          {null}
        </ContentState>
      ) : null}

      {visibleJobs.length > 0 ? (
        <View
          style={{
            marginHorizontal: spacing[4],
            overflow: 'hidden',
            borderRadius: tokens.radius.group,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderMuted,
          }}
        >
          {visibleJobs.map((job, index) => {
            const claimExpired =
              !job.assignment.claimExpiresAt ||
              Date.parse(job.assignment.claimExpiresAt) <= claimClock;
            const claimStale =
              claimExpired ||
              isEngineIntakeSessionStale(job.assignment.lastHeartbeatAt, claimClock);
            const claimedByAnother =
              Boolean(job.assignment.claimedByUid) &&
              job.assignment.claimedByUid !== uid &&
              !claimStale;
            return (
              <Pressable
                key={job.id}
                accessibilityRole="button"
                disabled={claimedByAnother || starting}
                onPress={() => void claimAndOpen(job)}
              >
                {({ pressed }) => (
                  <View
                    style={{
                      minHeight: 76,
                      paddingHorizontal: spacing[4],
                      paddingVertical: spacing[3],
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing[3],
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.borderMuted,
                      backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                      opacity: claimedByAnother ? 0.55 : 1,
                    }}
                  >
                    <CameraIcon size={22} color={colors.primary} />
                    <View style={{ flex: 1, gap: spacing[1] }}>
                      <Text variant="body" style={{ color: colors.foreground, fontWeight: '700' }}>
                        {jobTitle(job)}
                      </Text>
                      <Text variant="caption" style={{ color: colors.mutedForeground }}>
                        {claimedByAnother
                          ? `Claimed by ${job.assignment.claimedByName ?? 'another worker'}`
                          : `${stateLabel(job.state)} · ${job.progress.capturedCount}/${job.progress.requiredCount} photos`}
                      </Text>
                    </View>
                    {!claimedByAnother ? (
                      <ChevronRightIcon size={20} color={colors.mutedForeground} />
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {can('engine_intake_execute') && visibleJobs.length > 0 ? (
        <View style={{ paddingHorizontal: spacing[4] }}>
          <Button
            size="xl"
            variant="outline"
            loading={starting}
            onPress={() => void startUnplanned()}
          >
            Start unplanned engine
          </Button>
        </View>
      ) : null}
    </StackScreen>
  );
}
