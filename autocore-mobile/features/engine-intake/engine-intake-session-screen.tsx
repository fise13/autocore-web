import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Linking,
  View,
  type AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  emptyEngineIntakeProgress,
  type EngineIntakeCommand,
} from '@autocore/engine-intake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenGate, toast } from '@/components/ui';
import { useSession } from '@/hooks';
import { getColors, haptics } from '@/theme';

import { IntakeCamera, type IntakeCameraHandle } from './components/intake-camera';
import { IntakeCaptureChrome } from './components/intake-capture-chrome';
import { IntakeCaptureDock } from './components/intake-capture-dock';
import {
  EngineIntakeCamera,
  isNativeEngineIntakeCameraAvailable,
  useEngineIntakeCameraCapture,
} from './components/engine-intake-native-camera';
import { IntakeSessionDone } from './components/intake-session-done';
import {
  useEngineIntakeJobDetail,
  useEngineIntakeJobs,
} from './hooks/use-engine-intake-data';
import { canShowSessionForLocalClaim, isSessionClaimLost, shouldPauseIntakeSession } from './lib/claim-outcome';
import { useIntakeOverlay } from './store/intake-local-overlay';
import { useVolumeShutter } from './hooks/use-volume-shutter';
import {
  drainIntakeOutbox,
  enqueueIntakeCommand,
  humanizeIntakeOutboxError,
  retryIntakeOutboxItem,
  saveIntakePhotoLocally,
  sendOrQueueIntakeCommand,
  useEngineIntakeOutbox,
} from './store/intake-outbox';
import { engineIntakeId, getEngineIntakeDeviceId } from './lib/device';
import { cancelIntakeJob } from './lib/cancel-intake-job';
import { countVisibleIntakePhotos, isIntakePhotoConflict } from './lib/count-visible-intake-photos';
import { evidenceGuidance } from './lib/evidence-labels';
import { openEngineIntakeBay } from './lib/open-engine-intake';
import { toastIntakeFailure } from './lib/toast-intake-failure';

function makeWorkerCommand(command: {
  type: EngineIntakeCommand['type'];
  payload: EngineIntakeCommand['payload'];
}): EngineIntakeCommand {
  return {
    ...command,
    idempotencyKey: engineIntakeId(command.type),
    client: 'mobile',
    clientAt: new Date().toISOString(),
    deviceId: getEngineIntakeDeviceId(),
  } as EngineIntakeCommand;
}

export function EngineIntakeSessionScreen() {
  const params = useLocalSearchParams<{ jobId?: string; sessionId?: string }>();
  const jobId = typeof params.jobId === 'string' ? params.jobId : '';
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { companyId, uid, can } = useSession();
  const chrome = getColors('dark');
  const cameraRef = useRef<IntakeCameraHandle>(null);
  const nativeCamera = isNativeEngineIntakeCameraAvailable();
  const { captureTrigger, requestCapture } = useEngineIntakeCameraCapture();
  const leftForClaimLossRef = useRef(false);
  const [flashOpacity] = useState(() => new Animated.Value(0));
  const [torch, setTorch] = useState(false);
  const capturing = useRef(false);
  const [capturingUi, setCapturingUi] = useState(false);
  const inFlightRef = useRef(0);
  const takePhotoRef = useRef<() => void>(() => undefined);
  const [completedLocal, setCompletedLocal] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  /** In-flight shutter count; read from the ref so ingest cannot double-count. */
  const [, setCaptureEpoch] = useState(0);
  const finishOnceRef = useRef(false);
  const completionLockedRef = useRef(false);
  const finishCaptureRef = useRef<(reason?: string) => Promise<void>>(async () => undefined);
  const { jobs, loading: jobsLoading } = useEngineIntakeJobs(companyId);
  const overlay = useIntakeOverlay(companyId);
  const listedJob = jobs.find((item) => item.id === jobId);
  const jobHeld = useRef(listedJob);
  if (listedJob) jobHeld.current = listedJob;
  const job = listedJob ?? (overlay.cancelledJobIds.includes(jobId) ? jobHeld.current : undefined);
  const detail = useEngineIntakeJobDetail(companyId, jobId || null, {
    sessions: true,
    photos: false,
  });
  const activeSession = detail.sessions.find((session) => session.id === sessionId) ?? null;
  const sessionState = activeSession?.state ?? 'active';
  const outbox = useEngineIntakeOutbox(companyId);
  const serverProgress = job?.progress ?? emptyEngineIntakeProgress();
  const localPhotos = outbox.photos.filter(
    (photo) => photo.companyId === companyId && photo.jobId === jobId,
  );
  const visiblePhotos = countVisibleIntakePhotos({
    serverCaptured: serverProgress.capturedCount,
    photos: localPhotos,
  });
  const photoCount = visiblePhotos.total + inFlightRef.current;
  const failedPhotos = localPhotos.filter(
    (photo) =>
      (photo.status === 'failed' || photo.state === 'failed') &&
      !isIntakePhotoConflict(photo),
  );
  const hasQueuedFieldCompletion = outbox.commands.some(
    (item) =>
      item.companyId === companyId &&
      item.command.type === 'field_complete' &&
      item.command.payload.jobId === jobId,
  );
  const completionPending = completedLocal || hasQueuedFieldCompletion;

  const unsyncedCount =
    visiblePhotos.pending + visiblePhotos.failed + inFlightRef.current;
  const syncError =
    failedPhotos.map((photo) => photo.lastError).find(Boolean) ??
    outbox.commands
      .filter(
        (item) =>
          item.companyId === companyId &&
          item.state === 'failed' &&
          'jobId' in item.command.payload &&
          item.command.payload.jobId === jobId,
      )
      .map((item) => item.lastError)
      .find(Boolean) ??
    null;
  const syncErrorText = humanizeIntakeOutboxError(syncError);
  const evidenceHint = evidenceGuidance(serverProgress);
  // Guidance is about the engine in front of them, never about the network.
  const guidance =
    photoCount === 0 ? 'Photograph the engine — capture freely' : (evidenceHint ?? null);
  const jobOutboxCount = unsyncedCount;
  const isTerminal =
    job?.state === 'verified' ||
    job?.state === 'quarantine' ||
    job?.state === 'rejected';
  completionLockedRef.current = completionPending || isTerminal;
  const serial =
    job?.expectedIdentity.serialCode ||
    job?.expectedIdentity.engineCode ||
    'Engine';

  useVolumeShutter(() => {
    takePhotoRef.current();
  }, appState === 'active' && !completionPending && !isTerminal);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (
        !companyId ||
        !jobId ||
        !sessionId ||
        previous !== 'active' ||
        next === 'active'
      ) {
        previous = next;
        return;
      }
      previous = next;
      if (completionLockedRef.current || finishOnceRef.current) return;
      if (!shouldPauseIntakeSession(next)) return;
      // Queue, do not live-send. A live pause races the photo PUTs and the
      // current production API then rejects them ("Resume the session before
      // taking photos"). Killing the app never sends pause — leaving must
      // match that: photos first, pause after the files are on the wire.
      enqueueIntakeCommand(
        companyId,
        makeWorkerCommand({
          type: 'pause_session',
          payload: { jobId, sessionId, reason: 'App moved to background' },
        }),
      );
      void drainIntakeOutbox(companyId);
    });
    return () => subscription.remove();
  }, [companyId, jobId, sessionId]);

  useEffect(() => {
    if (
      !companyId ||
      !jobId ||
      !sessionId ||
      completionPending ||
      isTerminal ||
      appState !== 'active' ||
      sessionState !== 'paused'
    ) {
      return;
    }
    void sendOrQueueIntakeCommand(
      companyId,
      makeWorkerCommand({
        type: 'resume_session',
        payload: { jobId, sessionId },
      }),
    );
  }, [
    sessionState,
    appState,
    companyId,
    completionPending,
    isTerminal,
    jobId,
    sessionId,
  ]);

  useEffect(() => {
    if (
      !companyId ||
      !jobId ||
      !sessionId ||
      completionPending ||
      isTerminal ||
      appState !== 'active' ||
      sessionState !== 'active'
    ) {
      return;
    }
    const heartbeat = () => {
      void sendOrQueueIntakeCommand(
        companyId,
        makeWorkerCommand({
          type: 'heartbeat_session',
          payload: { jobId, sessionId },
        }),
      );
    };
    heartbeat();
    const timer = setInterval(heartbeat, 25_000);
    return () => clearInterval(timer);
  }, [
    sessionState,
    appState,
    companyId,
    completionPending,
    isTerminal,
    jobId,
    sessionId,
  ]);

  useEffect(() => {
    if (!job) return;
    // Finish clears the claim on purpose — do not treat that as a lost session.
    if (completionPending) return;
    const pendingLocalClaim = outbox.commands.some(
      (item) =>
        item.companyId === companyId &&
        (item.command.type === 'claim_job' || item.command.type === 'create_job') &&
        'jobId' in item.command.payload &&
        item.command.payload.jobId === jobId,
    );
    const overlaySessionIds = (overlay.sessions[jobId] ?? []).map((item) => item.id);
    const claimLost = isSessionClaimLost({
      jobState: job.state,
      sessionState: activeSession?.state,
      assignmentSessionId: job.assignment.activeSessionId,
      claimedByUid: job.assignment.claimedByUid,
      uid: uid ?? '',
      routeSessionId: sessionId,
      overlaySessionIds,
      hasPendingClaimCommand: pendingLocalClaim,
    });
    if (!claimLost) {
      leftForClaimLossRef.current = false;
      return;
    }
    // One leave per claim-loss — job snapshots must not re-open the bay repeatedly.
    if (leftForClaimLossRef.current) return;
    leftForClaimLossRef.current = true;
    toast({
      title: job.state === 'cancelled' ? 'Engine cancelled' : 'Session claim was released',
      description: 'Your photos are safe on this phone.',
      variant: 'warning',
    });
    openEngineIntakeBay(router);
  }, [activeSession, companyId, completionPending, job, jobId, outbox.commands, overlay.sessions, router, sessionId, uid]);

  useEffect(() => {
    if (!jobId || !overlay.cancelledJobIds.includes(jobId)) return;
    if (leftForClaimLossRef.current) return;
    leftForClaimLossRef.current = true;
    openEngineIntakeBay(router);
  }, [jobId, overlay.cancelledJobIds, router]);

  const toastedFailureIds = useRef(new Set<string>());
  useEffect(() => {
    if (!companyId || !jobId) return;
    for (const item of outbox.commands) {
      if (item.companyId !== companyId || item.status !== 'failed') continue;
      if (!('jobId' in item.command.payload) || item.command.payload.jobId !== jobId) {
        continue;
      }
      if (item.command.type !== 'create_job' && item.command.type !== 'claim_job') {
        continue;
      }
      if (toastedFailureIds.current.has(item.id)) continue;
      toastedFailureIds.current.add(item.id);
      toastIntakeFailure({
        title:
          item.command.type === 'create_job'
            ? 'Engine is not on the server yet'
            : 'Could not open this engine',
        error: item.lastError,
        retry: () => {
          retryIntakeOutboxItem(item.id);
          void drainIntakeOutbox(companyId);
        },
      });
    }
  }, [companyId, jobId, outbox.commands]);

  if (!can('engine_intake_execute')) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Engines"
        description="Your role cannot document engines."
      />
    );
  }

  if (!companyId || !jobId || !sessionId) {
    return (
      <ScreenGate
        variant="custom"
        title="Session unavailable"
        description="The intake link is incomplete."
      />
    );
  }

  if (!job) {
    return (
      <ScreenGate
        variant="custom"
        title={jobsLoading ? 'Opening camera' : 'Session unavailable'}
        description={
          jobsLoading
            ? 'Loading this engine from the local cache.'
            : 'Return to Engines and open this engine again.'
        }
      />
    );
  }

  if (
    job.assignment.activeSessionId !== sessionId ||
    job.assignment.claimedByUid !== uid
  ) {
    const hasPendingClaimCommand = outbox.commands.some(
      (item) =>
        item.companyId === companyId &&
        (item.command.type === 'claim_job' || item.command.type === 'create_job') &&
        'jobId' in item.command.payload &&
        item.command.payload.jobId === jobId,
    );
    if (
      !canShowSessionForLocalClaim({
        sessionId,
        overlaySessionIds: (overlay.sessions[jobId] ?? []).map((item) => item.id),
        hasPendingClaimCommand,
      })
    ) {
      return (
        <ScreenGate
          variant="custom"
          title="Session claim unavailable"
          description="Return to Engines and open this engine again."
        />
      );
    }
  }

  const ingestPhotoUris = (
    uris: string[],
    options?: { feedback?: boolean },
  ) => {
    let saved = 0;
    for (const uri of uris) {
      try {
        saveIntakePhotoLocally({
          companyId,
          jobId,
          sessionId,
          deviceId: getEngineIntakeDeviceId(),
          requirementId: null,
          category: 'other',
          sourceUri: uri,
        });
        saved += 1;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Storage full')) {
          throw error;
        }
        // Skip assets that disappeared between pick and copy.
      }
    }
    if (saved === 0) {
      throw new Error('Selected photos could not be saved');
    }
    if (options?.feedback !== false) {
      haptics.success();
      flashOpacity.setValue(0.55);
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
    requestAnimationFrame(() => {
      void drainIntakeOutbox(companyId);
    });
    return saved;
  };

  const takePhoto = () => {
    if (nativeCamera) {
      haptics.medium();
      flashOpacity.setValue(0.55);
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
      requestCapture();
      return;
    }

    if (inFlightRef.current >= 4) return;
    const camera = cameraRef.current;
    if (!camera) return;

    inFlightRef.current += 1;
    setCaptureEpoch((epoch) => epoch + 1);
    haptics.medium();
    flashOpacity.setValue(0.55);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start();

    let settled = false;
    const onSaved = (captured: { uri?: string } | null) => {
      if (settled) return;
      settled = true;
      inFlightRef.current = Math.max(0, inFlightRef.current - 1);
      if (!captured?.uri) {
        setCaptureEpoch((epoch) => epoch + 1);
        haptics.error();
        toast({ title: 'Camera did not capture a photo', variant: 'warning' });
        return;
      }
      try {
        ingestPhotoUris([captured.uri], { feedback: false });
      } catch (error) {
        setCaptureEpoch((epoch) => epoch + 1);
        haptics.error();
        toast({
          title: 'Photo could not be saved',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }
    };

    void camera.capturePhoto(onSaved);
  };

  takePhotoRef.current = () => {
    void takePhoto();
  };

  const onNativeCapture = (event: { uri: string | null; success: boolean }) => {
    if (!event.success || !event.uri) {
      haptics.error();
      toast({ title: 'Camera did not capture a photo', variant: 'warning' });
      return;
    }
    try {
      ingestPhotoUris([event.uri], { feedback: false });
    } catch (error) {
      haptics.error();
      toast({
        title: 'Photo could not be saved',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const pickFromGallery = async () => {
    if (capturing.current) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast({
        title: 'No photo access',
        description: 'Allow Photos access in Settings to add engine photos from the library.',
        variant: 'warning',
      });
      void Linking.openSettings();
      return;
    }

    capturing.current = true;
    setCapturingUi(true);
    try {
      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        // Match camera quality — smaller files sync much faster over cellular.
        quality: 0.72,
        allowsMultipleSelection: true,
        selectionLimit: 24,
        orderedSelection: true,
      });
      if (pick.canceled || !pick.assets?.length) return;
      const uris = pick.assets.map((asset) => asset.uri).filter(Boolean);
      if (uris.length === 0) return;
      const saved = ingestPhotoUris(uris);
      if (saved < uris.length) {
        toast({
          title: `${saved} of ${uris.length} photos added`,
          description: 'Some library files could not be copied. Try those again.',
          variant: 'warning',
        });
      }
    } catch (error) {
      haptics.error();
      toast({
        title: 'Could not add from Photos',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      capturing.current = false;
      setCapturingUi(false);
    }
  };

  const requestCancelEngine = () => {
    if (!companyId || !job || !can('engine_intake_execute')) return;
    Alert.alert('Cancel engine?', `${serial} will leave the intake bay.`, [
      { text: 'Keep shooting', style: 'cancel' },
      {
        text: 'Cancel engine',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await cancelIntakeJob(companyId, job);
              haptics.success();
              toast({ title: 'Engine cancelled', variant: 'default' });
              openEngineIntakeBay(router);
            } catch (error) {
              haptics.error();
              toastIntakeFailure({
                title: 'Could not cancel',
                error,
              });
            }
          })();
        },
      },
    ]);
  };

  const finishCapture = async (overrideReason?: string) => {
    if (photoCount < 1) return;
    finishOnceRef.current = true;
    // Prefer the live bay claim — reclaim can rewrite outbox sessionIds while
    // the camera route still carries the original param. Always enqueue so
    // drain can reclaim + retry; sendOrQueue treated 409 as terminal and
    // dropped Finish after photos had already left the phone.
    /**
     * `.find()` cannot carry the discriminant narrowing out of its predicate,
     * so the sessionId is read inside a loop where `field_complete` has already
     * been established and `payload.sessionId` is typed.
     */
    const queuedFieldCompleteSessionId = (): string | null => {
      for (const item of outbox.commands) {
        if (item.companyId !== companyId) continue;
        const queued = item.command;
        if (queued.type !== 'field_complete') continue;
        if (queued.payload.jobId !== jobId) continue;
        if (queued.payload.sessionId) return queued.payload.sessionId;
      }
      return null;
    };

    const liveSessionId =
      (typeof job?.assignment.activeSessionId === 'string' &&
      job.assignment.activeSessionId.length > 0
        ? job.assignment.activeSessionId
        : null) ??
      outbox.photos.find(
        (photo) => photo.companyId === companyId && photo.jobId === jobId,
      )?.sessionId ??
      queuedFieldCompleteSessionId() ??
      sessionId;
    const command = makeWorkerCommand({
      type: 'field_complete',
      payload: {
        jobId,
        sessionId: liveSessionId,
        ...(overrideReason ? { overrideReason } : {}),
      },
    });
    try {
      enqueueIntakeCommand(companyId, command);
      openEngineIntakeBay(router, { filter: 'ready' });
      setCompletedLocal(true);
      haptics.success();
      void drainIntakeOutbox(companyId);
    } catch (error) {
      finishOnceRef.current = false;
      haptics.error();
      toastIntakeFailure({
        title: 'Could not finish',
        error,
      });
    }
  };
  finishCaptureRef.current = finishCapture;

  const pauseAndLeave = () => {
    if (completionPending) {
      openEngineIntakeBay(router, { filter: 'ready' });
      return;
    }
    if (!isTerminal) {
      enqueueIntakeCommand(
        companyId,
        makeWorkerCommand({
          type: 'pause_session',
          payload: { jobId, sessionId, reason: 'Worker left the camera session' },
        }),
      );
      void drainIntakeOutbox(companyId);
    }
    openEngineIntakeBay(router);
  };

  const requestFinish = () => {
    if (photoCount < 1) {
      toast({ title: 'Take at least one photo', variant: 'warning' });
      return;
    }
    if (failedPhotos.length > 0) {
      Alert.alert(
        failedPhotos.length === 1 ? '1 photo needs you' : `${failedPhotos.length} photos need you`,
        `${syncErrorText}\n\nYou can finish anyway — nothing is lost.`,
        [
          { text: 'Keep shooting', style: 'cancel' },
          {
            text: 'Finish anyway',
            onPress: () =>
              void finishCapture('Finished with photos still on the device'),
          },
        ],
      );
      return;
    }
    void finishCapture();
  };

  if (completionPending || isTerminal) {
    return (
      <IntakeSessionDone
        synced={
          jobOutboxCount === 0 &&
          (job.state === 'awaiting_verification' || isTerminal)
        }
        pendingCount={jobOutboxCount}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onBack={() => openEngineIntakeBay(router, { filter: 'ready' })}
      />
    );
  }

  /**
   * The pill counts shots, not transfers.
   *
   * It used to read "4 failed" the moment the yard Wi-Fi dropped — a red alarm
   * over four photos that were sitting safely on the phone and would upload on
   * their own. The only thing worth interrupting the shoot for is a photo that
   * needs the person, and `failedPhotos` is now exactly that set.
   */
  const statusPill =
    failedPhotos.length > 0
      ? failedPhotos.length === 1
        ? '1 photo needs you'
        : `${failedPhotos.length} photos need you`
      : photoCount > 0
        ? `${photoCount} photo${photoCount === 1 ? '' : 's'}`
        : 'Ready to shoot';

  return (
    <View style={{ flex: 1, backgroundColor: chrome.background }}>
      {nativeCamera ? (
        <EngineIntakeCamera
          style={{ flex: 1 }}
          active={appState === 'active'}
          title={statusPill}
          serial={serial}
          statusMessage={guidance ?? (photoCount === 0 ? 'Ready for Scan' : statusPill)}
          failed={failedPhotos.length > 0}
          canFinish={photoCount >= 1}
          tintColor={chrome.primary}
          captureTrigger={captureTrigger}
          onClose={() => pauseAndLeave()}
          onCapture={onNativeCapture}
          onPickGallery={() => void pickFromGallery()}
          onFinish={requestFinish}
          onTitleLongPress={
            !completionPending && !isTerminal && can('engine_intake_execute')
              ? requestCancelEngine
              : undefined
          }
        />
      ) : (
        <IntakeCamera ref={cameraRef} active={appState === 'active'} torch={torch} />
      )}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: flashOpacity,
          backgroundColor: chrome.foreground,
        }}
      />

      {nativeCamera ? null : (
        <IntakeCaptureChrome
          chrome={chrome}
          topInset={insets.top}
          serial={serial}
          statusPill={statusPill}
          failed={failedPhotos.length > 0}
          guidance={guidance}
          photoCount={photoCount}
          unsyncedCount={unsyncedCount}
          torch={torch}
          onBack={() => pauseAndLeave()}
          onToggleTorch={() => setTorch((value) => !value)}
          onSerialLongPress={
            !completionPending && !isTerminal && can('engine_intake_execute')
              ? requestCancelEngine
              : undefined
          }
        />
      )}

      <IntakeCaptureDock
        chrome={chrome}
        bottomInset={insets.bottom}
        photoCount={photoCount}
        failedCount={failedPhotos.length}
        syncErrorText={syncErrorText}
        capturing={capturingUi}
        variant={nativeCamera ? 'companion' : 'full'}
        photoThumbs={localPhotos
          .filter((photo) => !isIntakePhotoConflict(photo))
          .map((photo) => ({
            id: photo.id,
            uri: photo.localUri,
            status: photo.status,
          }))}
        onPickGallery={() => void pickFromGallery()}
        onShutter={() => void takePhoto()}
        onFinish={requestFinish}
        onRetryUpload={() => {
          for (const photo of failedPhotos) retryIntakeOutboxItem(photo.id);
          void drainIntakeOutbox(companyId);
        }}
      />
    </View>
  );
}
