import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { EngineIntakeCommand, EngineIntakeJob } from '@autocore/engine-intake';

import { toast } from '@/components/ui';
import { useSession } from '@/hooks';
import { haptics } from '@/theme';

import {
  IntakeAcceptSheet,
  type IntakeAcceptDraft,
  type IntakeAcceptSheetRef,
} from '../components/intake-accept-sheet';
import {
  IntakeCreateSerialSheet,
  type IntakeCreateIdentityDraft,
  type IntakeCreateSerialSheetRef,
} from '../components/intake-create-serial-sheet';
import { useEngineIntakeJobDetail } from './use-engine-intake-data';
import {
  canOpenSessionImmediately,
  isJobStateMismatchError,
} from '../lib/claim-outcome';
import { cancelIntakeJob } from '../lib/cancel-intake-job';
import {
  engineIntakeId,
  getEngineIntakeDeviceId,
} from '../lib/device';
import {
  intakePhotoPreviewUri,
  mergeIntakePhotos,
} from '../lib/merge-intake-photos';
import { openEngineIntakeSession } from '../lib/open-engine-intake';
import { queueOptimisticIntakeClaim } from '../lib/start-intake-session';
import { toastIntakeFailure } from '../lib/toast-intake-failure';
import {
  markIntakeJobVerified,
  patchOptimisticIntakeIdentity,
  restoreIntakeJobReady,
  restoreIntakeJobVerified,
} from '../store/intake-local-overlay';
import {
  drainIntakeOutbox,
  enqueueIntakeCommand,
  resolveFailedIntakeOutbox,
  sendOrQueueIntakeCommand,
  useEngineIntakeOutbox,
} from '../store/intake-outbox';

/**
 * Claim / photograph / accept / identity / cancel — the former intake bay
 * actions, now driven from Engines Incoming rows.
 */
export function useIntakeJobActions(companyId: string | null | undefined) {
  const router = useRouter();
  const { uid, profile, can } = useSession();
  const scopedCompanyId = companyId ?? null;
  const outbox = useEngineIntakeOutbox(scopedCompanyId);
  const createSheetRef = useRef<IntakeCreateSerialSheetRef>(null);
  const acceptSheetRef = useRef<IntakeAcceptSheetRef>(null);
  const acceptLockHeld = useRef(false);
  const [reviewJob, setReviewJob] = useState<EngineIntakeJob | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{ urls: string[]; index: number } | null>(
    null,
  );
  const [deviceId] = useState(getEngineIntakeDeviceId);

  const { photos: reviewPhotos } = useEngineIntakeJobDetail(
    scopedCompanyId,
    reviewJob?.id ?? null,
    {
    sessions: false,
    photos: true,
  });

  const reviewPhotoUrls = (() => {
    if (!reviewJob) return [] as string[];
    const local = outbox.photos
      .filter((photo) => photo.jobId === reviewJob.id)
      .map((photo) => ({
        id: photo.id,
        companyId: photo.companyId,
        jobId: photo.jobId,
        sessionId: photo.sessionId,
        requirementId: photo.requirementId,
        category: photo.category,
        localUri: photo.localUri,
        capturedAt: photo.capturedAt,
        status: photo.status,
      }));
    return mergeIntakePhotos(reviewPhotos, local, reviewJob.engineId)
      .map(intakePhotoPreviewUri)
      .filter((uri): uri is string => Boolean(uri));
  })();

  const openSession = useCallback(
    (jobId: string, sessionId: string) => {
      openEngineIntakeSession(router, jobId, sessionId);
    },
    [router],
  );

  const claimAndOpen = useCallback(
    (job: EngineIntakeJob) => {
      if (!companyId || !uid || !can('engine_intake_execute')) return;
      if (
        canOpenSessionImmediately({
          activeSessionId: job.assignment.activeSessionId,
          claimedByUid: job.assignment.claimedByUid,
          claimDeviceId: job.assignment.claimDeviceId,
          uid,
          deviceId,
        })
      ) {
        openSession(job.id, job.assignment.activeSessionId!);
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
      const { sessionId } = queueOptimisticIntakeClaim({
        companyId,
        job,
        uid,
        displayName: profile?.displayName ?? null,
        deviceId,
      });
      haptics.success();
      openSession(job.id, sessionId);
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
    (job: EngineIntakeJob) => {
      if (!companyId || !can('engine_intake_verify')) return;
      if (job.state !== 'awaiting_verification') return;
      setReviewJob(job);
      acceptLockHeld.current = true;
      acceptSheetRef.current?.present(job);
      enqueueIntakeCommand(
        companyId,
        makeVerifyCommand('start_verification', { jobId: job.id }),
      );
      void drainIntakeOutbox(companyId);
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
    (draft: IntakeAcceptDraft) => {
      if (!companyId || !reviewJob) return;
      const job = reviewJob;
      const jobId = job.id;
      const hasBlockingFlags = job.blockingAiFlags.length > 0;
      markIntakeJobVerified(companyId, jobId);
      acceptLockHeld.current = false;
      acceptSheetRef.current?.dismiss();
      setReviewJob(null);
      setPhotoViewer(null);
      haptics.success();
      toast({ title: 'Released to Motors Grid', variant: 'success' });
      void sendOrQueueIntakeCommand(
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
                aiOverrideReason: draft.note || 'Manager override for release',
              }
            : {}),
        }),
      )
        .then(() => {
          void drainIntakeOutbox(companyId);
        })
        .catch((error) => {
          restoreIntakeJobVerified(companyId, jobId);
          if (isJobStateMismatchError(error)) {
            restoreIntakeJobReady(companyId, jobId);
            haptics.warning();
            toast({
              title: 'This engine went back to photos',
              description: 'Release it once it is waiting for review again.',
              variant: 'warning',
            });
            return;
          }
          haptics.error();
          toastIntakeFailure({
            title: 'Could not release engine',
            error,
            retry: () => {
              setReviewJob(job);
              submitAccept(draft);
            },
          });
        });
    },
    [companyId, makeVerifyCommand, reviewJob],
  );

  const handleIncomingPress = useCallback(
    (job: EngineIntakeJob) => {
      if (job.state === 'awaiting_verification' && can('engine_intake_verify')) {
        void openAcceptSheet(job);
        return;
      }
      claimAndOpen(job);
    },
    [can, claimAndOpen, openAcceptSheet],
  );

  const saveIdentityEdit = useCallback(
    (jobId: string, identity: IntakeCreateIdentityDraft) => {
      if (!companyId || !can('engine_intake_execute')) return;
      const nextIdentity = {
        serialCode: identity.serialCode.trim(),
        brandName: identity.brandName.trim(),
        engineCode: identity.engineCode.trim(),
      };
      patchOptimisticIntakeIdentity(companyId, jobId, nextIdentity);
      createSheetRef.current?.dismiss();
      haptics.success();
      toast({ title: 'Engine updated', variant: 'success' });
      const command: EngineIntakeCommand = {
        type: 'update_identity',
        idempotencyKey: engineIntakeId('identity'),
        client: 'mobile',
        clientAt: new Date().toISOString(),
        deviceId: getEngineIntakeDeviceId(),
        payload: {
          jobId,
          identity: nextIdentity,
        },
      };
      void sendOrQueueIntakeCommand(companyId, command)
        .then(() => {
          void drainIntakeOutbox(companyId);
        })
        .catch((error) => {
          haptics.error();
          toastIntakeFailure({
            title: 'Could not update engine',
            error,
            retry: () => saveIdentityEdit(jobId, identity),
          });
        });
    },
    [can, companyId],
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
      Alert.alert('Cancel engine?', `${serial} will leave incoming.`, [
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
                toastIntakeFailure({
                  title: 'Could not cancel',
                  error,
                  retry: () => cancelJob(job),
                });
              }
            })();
          },
        },
      ]);
    },
    [can, companyId],
  );

  /**
   * The banner's only action, and it only exists for photos that need a person.
   *
   * The copy speaks about photos, never about a queue: "Retrying sync…" and
   * "Nothing left to sync" described machinery the worker has no model of and
   * no way to influence.
   */
  const retryOutbox = useCallback(() => {
    if (!companyId) return;
    void (async () => {
      const { discarded, retried } = await resolveFailedIntakeOutbox(companyId);
      if (discarded > 0 && retried === 0) {
        toast({
          title:
            discarded === 1
              ? '1 photo is no longer on this phone'
              : `${discarded} photos are no longer on this phone`,
          description: 'Shoot those angles again.',
          variant: 'warning',
        });
        return;
      }
      if (retried > 0 && discarded > 0) {
        toast({
          title: 'Trying those photos again',
          description:
            discarded === 1
              ? '1 photo is no longer on this phone — shoot it again.'
              : `${discarded} photos are no longer on this phone — shoot them again.`,
          variant: 'warning',
        });
        return;
      }
      if (retried > 0) {
        toast({ title: 'Trying those photos again', variant: 'default' });
        return;
      }
      if (outbox.pendingCount > 0) {
        void drainIntakeOutbox(companyId);
        return;
      }
      toast({ title: 'Every photo is on the server', variant: 'success' });
    })();
  }, [companyId, outbox.pendingCount]);

  return {
    outbox,
    createSheetRef,
    acceptSheetRef,
    reviewJob,
    reviewPhotoUrls,
    photoViewer,
    setPhotoViewer,
    claimAndOpen,
    openAcceptSheet,
    releaseAcceptLock,
    submitAccept,
    handleIncomingPress,
    saveIdentityEdit,
    openEditSheet,
    cancelJob,
    retryOutbox,
  };
}
