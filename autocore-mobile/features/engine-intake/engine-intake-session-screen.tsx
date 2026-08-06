import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Pressable,
  View,
  type AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  DEFAULT_ENGINE_INTAKE_REQUIREMENTS,
  emptyEngineIntakeProgress,
  type EngineIntakeCommand,
  type IntakePhotoCategory,
  type PhotoRequirement,
} from '@autocore/engine-intake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CloudIcon,
  FlashlightIcon,
  ImagesIcon,
  MapPinIcon,
  XIcon,
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
  retryIntakeOutboxItem,
  saveIntakePhotoLocally,
  sendOrQueueIntakeCommand,
  useEngineIntakeOutbox,
} from './store/intake-outbox';
import { engineIntakeId, getEngineIntakeDeviceId } from './lib/device';

type ScannedLocation = {
  locationId: string;
  code: string;
  warehouseId?: string;
};

function parseLocationPayload(raw: string): ScannedLocation | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as {
      type?: string;
      locationId?: string;
      id?: string;
      code?: string;
      warehouseId?: string;
    };
    const locationId = parsed.locationId?.trim() || parsed.id?.trim();
    const code = parsed.code?.trim();
    if (
      locationId &&
      code &&
      (!parsed.type || parsed.type === 'warehouse_location' || parsed.type === 'autocore.location')
    ) {
      return {
        locationId,
        code,
        ...(parsed.warehouseId?.trim() ? { warehouseId: parsed.warehouseId.trim() } : {}),
      };
    }
  } catch {
    // Try compact physical-label format below.
  }
  const parts = value.split('|').map((part) => part.trim());
  if (parts[0] === 'autocore-location' && parts[1] && parts[2]) {
    return {
      locationId: parts[1],
      code: parts[2],
      ...(parts[3] ? { warehouseId: parts[3] } : {}),
    };
  }
  return null;
}

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
  const [scanLocation, setScanLocation] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [localLocation, setLocalLocation] = useState<ScannedLocation | null>(null);
  const [extraCategory, setExtraCategory] = useState<IntakePhotoCategory | null>(null);
  const [completedLocal, setCompletedLocal] = useState(false);
  const [locallyConfirmedRevision, setLocallyConfirmedRevision] = useState<number | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const { jobs, loading: jobsLoading } = useEngineIntakeJobs(companyId);
  const job = jobs.find((item) => item.id === jobId);
  const detail = useEngineIntakeJobDetail(companyId, jobId || null);
  const activeSession = detail.sessions.find((session) => session.id === sessionId) ?? null;
  const outbox = useEngineIntakeOutbox(companyId);
  const requirements: readonly PhotoRequirement[] =
    job?.requirements?.length ? job.requirements : DEFAULT_ENGINE_INTAKE_REQUIREMENTS;
  const serverProgress = job?.progress ?? emptyEngineIntakeProgress(requirements);
  const localPhotos = outbox.photos.filter(
    (photo) => photo.companyId === companyId && photo.jobId === jobId,
  );
  const activeLocalPhotos = localPhotos.filter((photo) => photo.state !== 'failed');
  const failedPhotos = localPhotos.filter((photo) => photo.state === 'failed');
  const hasQueuedFieldCompletion = outbox.commands.some(
    (item) =>
      item.companyId === companyId &&
      item.command.type === 'field_complete' &&
      item.command.payload.jobId === jobId &&
      item.command.payload.sessionId === sessionId,
  );
  const completionPending = completedLocal || hasQueuedFieldCompletion;
  const activeReworkRequest =
    detail.reworkRequests.find((request) => request.id === job?.activeReworkRequestId) ?? null;
  const resolvedReworkRequirementIds = new Set(
    activeReworkRequest?.resolvedRequirementIds ?? [],
  );
  const unresolvedReworkRequirementIds = new Set(
    (activeReworkRequest?.gaps ?? [])
      .map((gap) => gap.requirementId)
      .filter(
        (requirementId) =>
          !resolvedReworkRequirementIds.has(requirementId) &&
          !localPhotos.some((photo) => photo.requirementId === requirementId),
      ),
  );
  const countFor = (requirementId: string): number =>
    Number(serverProgress.requirementCounts?.[requirementId] ?? 0) +
    activeLocalPhotos.filter((photo) => photo.requirementId === requirementId).length;
  const missingRequirements = requirements.filter(
    (requirement) =>
      (requirement.required && countFor(requirement.id) < requirement.minCount) ||
      unresolvedReworkRequirementIds.has(requirement.id),
  );
  const fieldMissingRequirements = missingRequirements.filter(
    (requirement) =>
      requirement.strictness === 'field' ||
      unresolvedReworkRequirementIds.has(requirement.id),
  );
  const currentRequirement = extraCategory
    ? requirements.find((requirement) => requirement.category === extraCategory) ?? null
    : missingRequirements[0] ?? null;
  const requiredCount = requirements.filter((requirement) => requirement.required).length;
  const satisfiedCount = requiredCount - missingRequirements.length;
  const effectiveLocation =
    localLocation ??
    (job?.location
      ? {
          locationId: job.location.locationId,
          code: job.location.code,
          ...(job.location.warehouseId ? { warehouseId: job.location.warehouseId } : {}),
        }
      : null);
  const jobOutboxCount =
    outbox.commands.filter(
      (item) =>
        item.companyId === companyId &&
        'jobId' in item.command.payload &&
        item.command.payload.jobId === jobId,
    ).length + localPhotos.length;
  const isServerComplete =
    job?.state === 'awaiting_verification' ||
    job?.state === 'verified' ||
    job?.state === 'quarantine' ||
    job?.state === 'rejected';
  const identityConfirmed =
    job?.identityConfirmation?.sessionId === sessionId ||
    (job != null && locallyConfirmedRevision === job.revision);

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
      const command = makeWorkerCommand({
        type: 'heartbeat_session',
        payload: { jobId, sessionId },
      });
      void sendOrQueueIntakeCommand(companyId, command);
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
      title: job.state === 'cancelled' ? 'Intake job was cancelled' : 'Session claim was released',
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
  }, [progressMotion, satisfiedCount]);

  if (!can('engine_intake_execute')) {
    return (
      <ScreenGate
        variant="no-permission"
        title="Engine intake"
        description="Your role cannot perform engine intake."
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
        title="Opening intake session"
        description="Waiting for the server-confirmed job and exclusive claim."
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
        description="Return to the intake queue and claim this engine again."
      />
    );
  }

  const confirmPhysicalEngine = async () => {
    try {
      const result = await sendOrQueueIntakeCommand(
        companyId,
        makeWorkerCommand({
          type: 'confirm_identity',
          payload: { jobId, sessionId },
        }),
      );
      setLocallyConfirmedRevision(job.revision);
      haptics.success();
      if (result) return;
      toast({
        title: 'Identity confirmation saved on this phone',
        description: 'Photos will sync after the confirmation command.',
        variant: 'warning',
      });
    } catch (error) {
      haptics.error();
      toast({
        title: 'Identity could not be confirmed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const reportPhysicalMismatch = async () => {
    try {
      await sendOrQueueIntakeCommand(
        companyId,
        makeWorkerCommand({
          type: 'report_identity_mismatch',
          payload: {
            jobId,
            sessionId,
            reason: 'Physical engine does not match the expected job identity',
          },
        }),
      );
      haptics.warning();
      router.replace('/intake' as Href);
    } catch (error) {
      haptics.error();
      toast({
        title: 'Mismatch report could not be saved',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  if (!identityConfirmed) {
    const expectedIdentity = [
      job.expectedIdentity.brandName,
      job.expectedIdentity.engineCode,
      job.expectedIdentity.serialCode,
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing[8],
          paddingBottom: insets.bottom + spacing[6],
          paddingHorizontal: spacing[6],
          justifyContent: 'space-between',
          backgroundColor: colors.background,
        }}
      >
        <View style={{ gap: spacing[4] }}>
          <Text variant="displayTitle" style={{ color: colors.foreground }}>
            Confirm the physical engine
          </Text>
          <Text variant="body" style={{ color: colors.mutedForeground }}>
            {expectedIdentity || job.sourceReference || 'Unidentified engine job'}
          </Text>
          <Text variant="caption" style={{ color: colors.mutedForeground }}>
            Check the temporary tag, serial plate, or donor reference before documenting this
            engine.
          </Text>
          {activeReworkRequest ? (
            <View style={{ padding: spacing[4], backgroundColor: colors.warningSubtle }}>
              <Text variant="body" style={{ color: colors.warningOnSubtle, fontWeight: '700' }}>
                Rework: {activeReworkRequest.note}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ gap: spacing[3] }}>
          <Button size="xl" onPress={() => void confirmPhysicalEngine()}>
            This is the engine
          </Button>
          <Button
            size="xl"
            variant="outline"
            onPress={() => void reportPhysicalMismatch()}
          >
            Wrong engine or job
          </Button>
        </View>
      </View>
    );
  }

  const setLocation = async (location: ScannedLocation, isStaging = false) => {
    setLocalLocation(location);
    setScanLocation(false);
    haptics.success();
    const command = makeWorkerCommand({
      type: 'set_location',
      payload: {
        jobId,
        sessionId,
        locationId: location.locationId,
        code: location.code,
        ...(location.warehouseId ? { warehouseId: location.warehouseId } : {}),
        isStaging,
      },
    });
    try {
      await sendOrQueueIntakeCommand(companyId, command);
    } catch (error) {
      setLocalLocation(null);
      haptics.error();
      toast({
        title: 'Location could not be set',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleLocationCode = (value: string) => {
    const location = parseLocationPayload(value);
    if (!location) {
      haptics.warning();
      toast({ title: 'This is not an AutoCore location label', variant: 'warning' });
      return;
    }
    void setLocation(location);
  };

  const takePhoto = async () => {
    if (!currentRequirement || capturing) return;
    setCapturing(true);
    try {
      const captured = await cameraRef.current?.takePicture();
      if (!captured?.uri) {
        haptics.error();
        toast({ title: 'Camera did not capture a photo', variant: 'warning' });
        return;
      }
      saveIntakePhotoLocally({
        companyId,
        jobId,
        sessionId,
        deviceId: getEngineIntakeDeviceId(),
        requirementId: currentRequirement.id,
        category: currentRequirement.category,
        sourceUri: captured.uri,
      });
      setExtraCategory(null);
      haptics.success();
      flashOpacity.setValue(0.82);
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
      void drainIntakeOutbox(companyId);
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

  const pauseAndLeave = async () => {
    if (!completionPending && !isServerComplete) {
      const command = makeWorkerCommand({
        type: 'pause_session',
        payload: { jobId, sessionId, reason: 'Worker left the camera session' },
      });
      await sendOrQueueIntakeCommand(companyId, command).catch(() => null);
    }
    router.replace('/intake' as Href);
  };

  const finishFieldWork = async () => {
    if (fieldMissingRequirements.length > 0 || !effectiveLocation || failedPhotos.length > 0) {
      return;
    }
    const command = makeWorkerCommand({
      type: 'field_complete',
      payload: { jobId, sessionId },
    });
    try {
      if (jobOutboxCount > 0) {
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
        title: 'Field work could not be completed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
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
              {synced ? 'Ready for verification' : 'Saved on this phone'}
            </Text>
            <Text variant="body" style={{ color: colors.mutedForeground, textAlign: 'center' }}>
              {synced
                ? 'The office can verify the engine and release it for sale.'
                : `${jobOutboxCount || 1} items will sync automatically when the connection returns.`}
            </Text>
          </View>
        </View>
        <Button size="xl" onPress={() => router.replace('/intake' as Href)}>
          Back to intake jobs
        </Button>
      </View>
    );
  }

  const instruction = scanLocation
    ? 'Point at a warehouse location label'
    : activeReworkRequest?.gaps.find(
          (gap) => gap.requirementId === currentRequirement?.id,
        )?.reason ??
      currentRequirement?.guidance ??
      'Required photos complete';

  return (
    <View style={{ flex: 1, backgroundColor: chrome.background }}>
      <IntakeCamera
        ref={cameraRef}
        active={appState === 'active'}
        torch={torch}
        scanLocation={scanLocation}
        onLocationCode={handleLocationCode}
      />
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
            accessibilityLabel="Pause intake"
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
              paddingHorizontal: spacing[4],
              justifyContent: 'center',
              borderRadius: tokens.radius.control,
              backgroundColor: chrome.overlay,
              transform: [{ scale: progressMotion }],
            }}
          >
            <Text variant="caption" style={{ color: chrome.foreground, fontWeight: '800' }}>
              {satisfiedCount}/{requiredCount}
              {jobOutboxCount > 0 ? ` · ${jobOutboxCount} syncing` : ''}
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
          {job.expectedIdentity.engineCode ||
            job.expectedIdentity.serialCode ||
            job.sourceReference ||
            'Unidentified engine'}
        </Text>
        <View
          style={{
            height: 4,
            overflow: 'hidden',
            borderRadius: tokens.radius.full,
            backgroundColor: chrome.border,
          }}
        >
          <View
            style={{
              width: `${requiredCount ? (satisfiedCount / requiredCount) * 100 : 100}%`,
              height: '100%',
              backgroundColor: chrome.primary,
            }}
          />
        </View>
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
            {scanLocation
              ? 'Scan location'
              : currentRequirement?.label ?? 'Photo package complete'}
          </Text>
          <Text variant="caption" style={{ color: chrome.mutedForeground, textAlign: 'center' }}>
            {instruction}
          </Text>
        </View>

        {failedPhotos.length > 0 ? (
          <Button
            variant="outline"
            onPress={() => {
              for (const photo of failedPhotos) retryIntakeOutboxItem(photo.id);
              void drainIntakeOutbox(companyId);
            }}
          >
            Retry {failedPhotos.length} failed photo
            {failedPhotos.length === 1 ? '' : 's'}
          </Button>
        ) : null}

        <View
          style={{
            minHeight: 80,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={scanLocation ? 'Cancel location scan' : 'Scan engine location'}
            onPress={() => {
              setScanLocation((value) => !value);
              setExtraCategory(null);
              haptics.toggle();
            }}
            style={{
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.control,
              backgroundColor: scanLocation ? chrome.primary : chrome.surfaceElevated,
            }}
          >
            {scanLocation ? (
              <XIcon size={24} color={chrome.primaryForeground} />
            ) : (
              <MapPinIcon size={24} color={chrome.foreground} />
            )}
          </Pressable>

          {!scanLocation && currentRequirement ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Capture ${currentRequirement.label}`}
              disabled={capturing}
              onPress={() => void takePhoto()}
              style={{
                width: 78,
                height: 78,
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
                  width: 58,
                  height: 58,
                  borderRadius: tokens.radius.full,
                  backgroundColor: chrome.foreground,
                }}
              />
            </Pressable>
          ) : (
            <View style={{ width: 78, height: 78 }} />
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add damage photo"
            disabled={scanLocation}
            onPress={() => {
              setExtraCategory('damage');
              haptics.selection();
            }}
            style={{
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.control,
              backgroundColor:
                extraCategory === 'damage' ? chrome.primary : chrome.surfaceElevated,
              opacity: scanLocation ? 0.45 : 1,
            }}
          >
            <ImagesIcon
              size={24}
              color={
                extraCategory === 'damage' ? chrome.primaryForeground : chrome.foreground
              }
            />
          </Pressable>
        </View>

        {scanLocation ? (
          <Button
            variant="outline"
            onPress={() =>
              void setLocation(
                {
                  locationId: 'engine-intake-staging',
                  code: 'STAGE-INTAKE',
                },
                true,
              )
            }
          >
            Use staging area
          </Button>
        ) : fieldMissingRequirements.length === 0 ? (
          <Button
            size="xl"
            disabled={!effectiveLocation || failedPhotos.length > 0}
            onPress={() => void finishFieldWork()}
          >
            {effectiveLocation ? `Finish at ${effectiveLocation.code}` : 'Scan location to finish'}
          </Button>
        ) : null}
      </View>
    </View>
  );
}
