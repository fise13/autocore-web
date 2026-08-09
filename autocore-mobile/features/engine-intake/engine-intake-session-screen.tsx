import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Linking,
  View,
  type AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
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
import { IntakeSessionDone } from './components/intake-session-done';
import {
  useEngineIntakeJobDetail,
  useEngineIntakeJobs,
} from './hooks/use-engine-intake-data';
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
import { evidenceGuidance } from './lib/evidence-labels';

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
  const [flashOpacity] = useState(() => new Animated.Value(0));
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [completedLocal, setCompletedLocal] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const { jobs, loading: jobsLoading } = useEngineIntakeJobs(companyId);
  const job = jobs.find((item) => item.id === jobId);
  const detail = useEngineIntakeJobDetail(companyId, jobId || null);
  const activeSession = detail.sessions.find((session) => session.id === sessionId) ?? null;
  const outbox = useEngineIntakeOutbox(companyId);
  const serverProgress = job?.progress ?? emptyEngineIntakeProgress();
  const localPhotos = outbox.photos.filter(
    (photo) => photo.companyId === companyId && photo.jobId === jobId,
  );
  const pendingLocalPhotos = localPhotos.filter((photo) => photo.state !== 'failed');
  const failedPhotos = localPhotos.filter((photo) => photo.state === 'failed');
  const hasQueuedFieldCompletion = outbox.commands.some(
    (item) =>
      item.companyId === companyId &&
      item.command.type === 'field_complete' &&
      item.command.payload.jobId === jobId &&
      item.command.payload.sessionId === sessionId,
  );
  const completionPending = completedLocal || hasQueuedFieldCompletion;
  const photoCount = serverProgress.capturedCount + localPhotos.length;
  const unsyncedCount = pendingLocalPhotos.length + failedPhotos.length;
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
  const guidance =
    photoCount === 0
      ? 'Photograph naturally — AI organizes later'
      : evidenceHint
        ? evidenceHint
        : unsyncedCount > 0
          ? 'Photos stay on this phone until they sync'
          : null;
  const jobOutboxCount = unsyncedCount;
  const isServerComplete =
    job?.state === 'awaiting_verification' ||
    job?.state === 'verified' ||
    job?.state === 'quarantine' ||
    job?.state === 'rejected';
  const serial =
    job?.expectedIdentity.serialCode ||
    job?.expectedIdentity.engineCode ||
    'Engine';

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (
        companyId &&
        jobId &&
        sessionId &&
        !completionPending &&
        !isServerComplete &&
        previous === 'active' &&
        next !== 'active' &&
        activeSession?.state === 'active'
      ) {
        void sendOrQueueIntakeCommand(
          companyId,
          makeWorkerCommand({
            type: 'pause_session',
            payload: { jobId, sessionId, reason: 'App moved to background' },
          }),
        );
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [
    activeSession?.state,
    companyId,
    completionPending,
    isServerComplete,
    jobId,
    sessionId,
  ]);

  useEffect(() => {
    if (
      !companyId ||
      !jobId ||
      !sessionId ||
      completionPending ||
      isServerComplete ||
      appState !== 'active' ||
      activeSession?.state !== 'paused'
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
    activeSession?.state,
    appState,
    companyId,
    completionPending,
    isServerComplete,
    jobId,
    sessionId,
  ]);

  useEffect(() => {
    if (
      !companyId ||
      !jobId ||
      !sessionId ||
      completionPending ||
      isServerComplete ||
      appState !== 'active' ||
      activeSession?.state !== 'active'
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
    activeSession?.state,
    appState,
    companyId,
    completionPending,
    isServerComplete,
    jobId,
    sessionId,
  ]);

  useEffect(() => {
    if (!job || !activeSession) return;
    const claimLost =
      job.state === 'cancelled' ||
      job.assignment.activeSessionId !== sessionId ||
      job.assignment.claimedByUid !== uid ||
      activeSession.state === 'stale' ||
      activeSession.state === 'cancelled';
    if (!claimLost) return;
    toast({
      title: job.state === 'cancelled' ? 'Engine cancelled' : 'Session claim was released',
      description: 'Your saved photos remain in the sync queue.',
      variant: 'warning',
    });
    router.replace('/intake' as Href);
  }, [activeSession, job, router, sessionId, uid]);

  if (!can('engine_intake_execute')) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Engine intake"
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

  if (jobsLoading || !job || !activeSession) {
    return (
      <ScreenGate
        variant="custom"
        title="Opening camera"
        description="Waiting for the Engine intake draft and exclusive claim."
      />
    );
  }

  if (
    job.assignment.activeSessionId !== sessionId ||
    job.assignment.claimedByUid !== uid
  ) {
    return (
      <ScreenGate
        variant="custom"
        title="Session claim unavailable"
        description="Return to Engine intake and open this engine again."
      />
    );
  }

  const ingestPhotoUris = (uris: string[]) => {
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
      } catch {
        // Skip assets that disappeared between pick and copy.
      }
    }
    if (saved === 0) {
      throw new Error('Selected photos could not be saved');
    }
    haptics.success();
    flashOpacity.setValue(0.55);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
    void drainIntakeOutbox(companyId);
    return saved;
  };

  const takePhoto = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const captured = await cameraRef.current?.takePicture();
      if (!captured?.uri) {
        haptics.error();
        toast({ title: 'Camera did not capture a photo', variant: 'warning' });
        return;
      }
      ingestPhotoUris([captured.uri]);
    } catch (error) {
      haptics.error();
      toast({
        title: 'Photo could not be saved',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    if (capturing) return;
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

    setCapturing(true);
    try {
      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
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
      setCapturing(false);
    }
  };

  const pauseAndLeave = async () => {
    if (!completionPending && !isServerComplete) {
      await sendOrQueueIntakeCommand(
        companyId,
        makeWorkerCommand({
          type: 'pause_session',
          payload: { jobId, sessionId, reason: 'Worker left the camera session' },
        }),
      ).catch(() => null);
    }
    router.replace('/intake' as Href);
  };

  const finishCapture = async (overrideReason?: string) => {
    if (photoCount < 1) return;
    const command = makeWorkerCommand({
      type: 'field_complete',
      payload: {
        jobId,
        sessionId,
        ...(overrideReason ? { overrideReason } : {}),
      },
    });
    try {
      if (jobOutboxCount > 0 || failedPhotos.length > 0) {
        enqueueIntakeCommand(companyId, command);
        void drainIntakeOutbox(companyId);
      } else {
        await sendOrQueueIntakeCommand(companyId, command);
      }
      setCompletedLocal(true);
      haptics.success();
    } catch (error) {
      haptics.error();
      toast({
        title: 'Could not finish',
        description: humanizeIntakeOutboxError(
          error instanceof Error ? error.message : undefined,
        ),
        variant: 'destructive',
      });
    }
  };

  const requestFinish = () => {
    if (photoCount < 1) {
      toast({ title: 'Take at least one photo', variant: 'warning' });
      return;
    }
    if (failedPhotos.length > 0) {
      Alert.alert(
        'Photos not synced yet',
        `${syncErrorText}\n\nFinish anyway? They stay on this phone and will upload when sync works.`,
        [
          { text: 'Keep shooting', style: 'cancel' },
          {
            text: 'Finish anyway',
            onPress: () =>
              void finishCapture('Finished with unsynced photos still on device'),
          },
        ],
      );
      return;
    }
    void finishCapture();
  };

  if (completionPending || isServerComplete) {
    return (
      <IntakeSessionDone
        synced={isServerComplete}
        pendingCount={jobOutboxCount}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onBack={() => router.replace('/intake' as Href)}
      />
    );
  }

  const statusPill =
    failedPhotos.length > 0
      ? `${failedPhotos.length} failed`
      : unsyncedCount > 0
        ? `${photoCount} photos · ${unsyncedCount} syncing`
        : photoCount > 0
          ? `${photoCount} photos`
          : 'Ready to shoot';

  return (
    <View style={{ flex: 1, backgroundColor: chrome.background }}>
      <IntakeCamera ref={cameraRef} active={appState === 'active'} torch={torch} />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: flashOpacity,
          backgroundColor: chrome.foreground,
        }}
      />

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
        onBack={() => void pauseAndLeave()}
        onToggleTorch={() => setTorch((value) => !value)}
      />

      <IntakeCaptureDock
        chrome={chrome}
        bottomInset={insets.bottom}
        photoCount={photoCount}
        unsyncedCount={unsyncedCount}
        failedCount={failedPhotos.length}
        syncErrorText={syncErrorText}
        capturing={capturing}
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
