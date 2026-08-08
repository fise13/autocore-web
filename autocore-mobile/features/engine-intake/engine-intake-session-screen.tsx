import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Linking,
  Pressable,
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

import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CloudIcon,
  FlashlightIcon,
  ImagesIcon,
} from '@/assets/icons';
import { Button, ScreenGate, Text, toast } from '@/components/ui';
import { useSession, useTheme } from '@/hooks';
import {
  getColors,
  haptics,
  minTouchTarget,
  spacing,
  tokens,
} from '@/theme';

import { IntakeCamera, type IntakeCameraHandle } from './components/intake-camera';
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
  const { colors } = useTheme();
  const chrome = getColors('dark');
  const cameraRef = useRef<IntakeCameraHandle>(null);
  const [flashOpacity] = useState(() => new Animated.Value(0));
  const [progressMotion] = useState(() => new Animated.Value(1));
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
  // Failed uploads still count — they are on this phone.
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
  const guidance =
    photoCount === 0
      ? 'Shoot the engine condition from a few angles'
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

  useEffect(() => {
    Animated.sequence([
      Animated.timing(progressMotion, {
        toValue: 1.04,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(progressMotion, {
        toValue: 1,
        damping: 14,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [progressMotion, photoCount, unsyncedCount]);

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
    const synced = isServerComplete;
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing[10],
          paddingBottom: insets.bottom + spacing[6],
          paddingHorizontal: spacing[6],
          justifyContent: 'space-between',
          backgroundColor: colors.background,
        }}
      >
        <View style={{ gap: spacing[5], alignItems: 'center' }}>
          {synced ? (
            <CheckCircle2Icon size={56} color={colors.success} />
          ) : (
            <CloudIcon size={56} color={colors.primary} />
          )}
          <View style={{ gap: spacing[2], alignItems: 'center' }}>
            <Text variant="displayTitle" style={{ color: colors.foreground, textAlign: 'center' }}>
              {synced ? 'In Warehouse' : 'Saved on this phone'}
            </Text>
            <Text variant="body" style={{ color: colors.mutedForeground, textAlign: 'center' }}>
              {synced
                ? 'Condition photos are in Warehouse for the team to review.'
                : `${jobOutboxCount || 1} items will sync when the connection returns.`}
            </Text>
          </View>
        </View>
        <Button size="xl" onPress={() => router.replace('/intake' as Href)}>
          Back to Warehouse
        </Button>
      </View>
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

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[4],
          gap: spacing[3],
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pause capture"
            onPress={() => void pauseAndLeave()}
            style={{
              width: minTouchTarget,
              height: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.control,
              backgroundColor: chrome.overlay,
            }}
          >
            <ArrowLeftIcon size={24} color={chrome.foreground} />
          </Pressable>
          <Animated.View
            style={{
              minHeight: minTouchTarget,
              minWidth: minTouchTarget + spacing[6],
              maxWidth: 200,
              paddingHorizontal: spacing[4],
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: tokens.radius.full,
              backgroundColor:
                failedPhotos.length > 0 ? chrome.dangerSubtle : chrome.overlay,
              transform: [{ scale: progressMotion }],
            }}
          >
            <Text
              variant="caption"
              numberOfLines={1}
              style={{
                color:
                  failedPhotos.length > 0 ? chrome.dangerOnSubtle : chrome.foreground,
                fontWeight: '800',
              }}
            >
              {statusPill}
            </Text>
          </Animated.View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
            onPress={() => {
              setTorch((value) => !value);
              haptics.toggle();
            }}
            style={{
              width: minTouchTarget,
              height: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.control,
              backgroundColor: torch ? chrome.primary : chrome.overlay,
            }}
          >
            <FlashlightIcon
              size={22}
              color={torch ? chrome.primaryForeground : chrome.foreground}
            />
          </Pressable>
        </View>
        <Text
          variant="caption"
          numberOfLines={1}
          style={{ color: chrome.foreground, textAlign: 'center', fontWeight: '800' }}
        >
          {serial}
        </Text>
        {guidance ? (
          <Text
            variant="caption"
            numberOfLines={2}
            style={{ color: chrome.mutedForeground, textAlign: 'center' }}
          >
            {guidance}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          left: 0,
          paddingHorizontal: spacing[5],
          paddingBottom: insets.bottom + spacing[5],
          paddingTop: spacing[6],
          gap: spacing[4],
          backgroundColor: chrome.overlay,
        }}
      >
        <View style={{ gap: spacing[1], alignItems: 'center' }}>
          <Text variant="heading" style={{ color: chrome.foreground, textAlign: 'center' }}>
            Engine condition
          </Text>
          <Text variant="caption" style={{ color: chrome.mutedForeground, textAlign: 'center' }}>
            {photoCount} photo{photoCount === 1 ? '' : 's'}
            {failedPhotos.length > 0
              ? ` · ${failedPhotos.length} not uploaded`
              : unsyncedCount > 0
                ? ` · ${unsyncedCount} syncing`
                : ' · Camera or Photos'}
          </Text>
        </View>

        {failedPhotos.length > 0 ? (
          <View
            style={{
              gap: spacing[3],
              padding: spacing[3],
              borderRadius: tokens.radius.control,
              backgroundColor: chrome.dangerSubtle,
            }}
          >
            <Text
              variant="caption"
              style={{ color: chrome.dangerOnSubtle, fontWeight: '700', textAlign: 'center' }}
            >
              Could not upload {failedPhotos.length} photo
              {failedPhotos.length === 1 ? '' : 's'}
            </Text>
            <Text
              variant="caption"
              style={{ color: chrome.dangerOnSubtle, textAlign: 'center' }}
            >
              {syncErrorText}
            </Text>
            <Text
              variant="caption"
              style={{ color: chrome.dangerOnSubtle, textAlign: 'center' }}
            >
              Saved on this phone — you can keep shooting or finish anyway.
            </Text>
            <Button
              variant="outline"
              onPress={() => {
                for (const photo of failedPhotos) retryIntakeOutboxItem(photo.id);
                void drainIntakeOutbox(companyId);
              }}
            >
              Retry upload
            </Button>
          </View>
        ) : null}

        <View
          style={{
            minHeight: 88,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[2],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add photos from library"
            disabled={capturing}
            onPress={() => void pickFromGallery()}
            style={{
              width: minTouchTarget + spacing[2],
              height: minTouchTarget + spacing[2],
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.control,
              backgroundColor: chrome.overlay,
              opacity: capturing ? 0.55 : 1,
            }}
          >
            <ImagesIcon size={24} color={chrome.foreground} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            disabled={capturing}
            onPress={() => void takePhoto()}
            style={{
              width: 84,
              height: 84,
              borderRadius: tokens.radius.full,
              borderWidth: 5,
              borderColor: chrome.foreground,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: capturing ? 0.55 : 1,
            }}
          >
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: tokens.radius.full,
                backgroundColor: chrome.foreground,
              }}
            />
          </Pressable>

          {/* Balance the gallery control so the shutter stays centered. */}
          <View style={{ width: minTouchTarget + spacing[2] }} />
        </View>

        <Button size="xl" disabled={photoCount < 1} onPress={requestFinish}>
          Finish
        </Button>
      </View>
    </View>
  );
}
