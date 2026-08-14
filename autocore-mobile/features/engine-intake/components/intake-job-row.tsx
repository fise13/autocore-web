import { useCallback, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Button as SwiftButton,
  ContextMenu,
  Host,
  RNHostView,
} from '@expo/ui/swift-ui';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { EngineIntakeJob } from '@autocore/engine-intake';
import { warehouseLifecycleLabel } from '@autocore/engine-intake';

import { CameraIcon, ChevronRightIcon, CloudIcon } from '@/assets/icons';
import { Badge, presentNativeMenu, Text, toast, useListStaggerDelay } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, haptics, minTouchTarget, spacing, tokens } from '@/theme';

export type IntakeJobRowProps = {
  job: EngineIntakeJob;
  index: number;
  claimedByAnother: boolean;
  claimedByName?: string | null;
  syncPending?: boolean;
  localPhotoCount?: number;
  disabled?: boolean;
  canEdit?: boolean;
  canVerify?: boolean;
  onPress: () => void;
  onAddPhotos?: (job: EngineIntakeJob) => void;
  onRelease?: (job: EngineIntakeJob) => void;
  onEdit: (job: EngineIntakeJob) => void;
  onCancel: (job: EngineIntakeJob) => void;
};

function jobSerial(job: EngineIntakeJob): string {
  return (
    job.expectedIdentity.serialCode ||
    job.expectedIdentity.engineCode ||
    job.sourceReference ||
    'Unnamed engine'
  );
}

function jobSubtitle(job: EngineIntakeJob): string {
  const brand = [job.expectedIdentity.brandName, job.expectedIdentity.engineCode]
    .filter(Boolean)
    .join(' · ');
  return brand || 'No brand yet';
}

function lifecycleBadgeVariant(
  state: EngineIntakeJob['state'],
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  switch (state) {
    case 'awaiting_verification':
      return 'success';
    case 'rework':
    case 'quarantine':
      return 'warning';
    case 'in_session':
    case 'paused':
      return 'default';
    default:
      return 'secondary';
  }
}

function canEditIdentity(job: EngineIntakeJob): boolean {
  return (
    job.state === 'open' ||
    job.state === 'in_session' ||
    job.state === 'paused' ||
    job.state === 'rework'
  );
}

function canCancelJob(job: EngineIntakeJob): boolean {
  return (
    job.state === 'open' ||
    job.state === 'in_session' ||
    job.state === 'paused' ||
    job.state === 'rework' ||
    job.state === 'awaiting_verification'
  );
}

function canReleaseJob(job: EngineIntakeJob, canVerify: boolean): boolean {
  return canVerify && job.state === 'awaiting_verification';
}

function openActionLabel(job: EngineIntakeJob, canVerify: boolean): string {
  if (canReleaseJob(job, canVerify)) return 'Release to grid';
  if (job.state === 'awaiting_verification') return 'Add photos';
  if (job.state === 'paused' || job.state === 'in_session') return 'Continue';
  return 'Open camera';
}

function IntakeJobRowBody({
  job,
  claimedByAnother,
  claimedByName,
  syncPending = false,
  localPhotoCount = 0,
  pressed = false,
}: {
  job: EngineIntakeJob;
  claimedByAnother: boolean;
  claimedByName?: string | null;
  syncPending?: boolean;
  localPhotoCount?: number;
  pressed?: boolean;
}) {
  const { colors } = useTheme();
  const photoCount = job.progress.capturedCount + localPhotoCount;
  const photoLine =
    photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? '' : 's'}` : 'No photos';

  return (
    <View
      style={{
        minHeight: Math.max(76, minTouchTarget + spacing[6]),
        marginHorizontal: spacing[4],
        marginBottom: spacing[2],
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        borderRadius: tokens.radius.group,
        borderWidth: 1,
        borderColor: colors.borderMuted,
        backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
        opacity: claimedByAnother ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: tokens.radius.control,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primarySubtle,
        }}
      >
        <CameraIcon size={20} color={colors.primaryOnSubtle} />
      </View>

      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text
          variant="body"
          numberOfLines={1}
          style={{
            color: colors.foreground,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            letterSpacing: 0.4,
          }}
        >
          {jobSerial(job)}
        </Text>
        <Text variant="caption" numberOfLines={1} style={{ color: colors.mutedForeground }}>
          {claimedByAnother
            ? `Claimed by ${claimedByName ?? 'another worker'}`
            : jobSubtitle(job)}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            marginTop: 2,
            flexWrap: 'wrap',
          }}
        >
          <Badge variant={lifecycleBadgeVariant(job.state)} emphasis="subtle">
            {warehouseLifecycleLabel(job.state)}
          </Badge>
          <Text variant="caption" style={{ color: colors.mutedForeground, fontWeight: '600' }}>
            {photoLine}
          </Text>
          {syncPending ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CloudIcon size={14} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Syncing
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {!claimedByAnother ? (
        <ChevronRightIcon size={20} color={colors.mutedForeground} />
      ) : null}
    </View>
  );
}

function RowPressable({
  disabled,
  onPress,
  onLongPress,
  children,
}: {
  disabled: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  children: (pressed: boolean) => ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Hold for edit and cancel"
      accessibilityState={{ disabled }}
      disabled={disabled}
      delayLongPress={350}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {({ pressed }) => children(pressed)}
    </Pressable>
  );
}

/**
 * Real UIKit context menu — hold, lift, blur, haptic from iOS.
 * Row stays RN, hosted in SwiftUI via `RNHostView` (same as photos / WO).
 */
function NativeMenuRow({
  job,
  claimedByAnother,
  claimedByName,
  syncPending,
  localPhotoCount,
  canEdit,
  canVerify,
  onPress,
  onAddPhotos,
  onRelease,
  onEdit,
  onCancel,
  onCopy,
}: {
  job: EngineIntakeJob;
  claimedByAnother: boolean;
  claimedByName?: string | null;
  syncPending: boolean;
  localPhotoCount: number;
  canEdit: boolean;
  canVerify: boolean;
  onPress: () => void;
  onAddPhotos?: () => void;
  onRelease?: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onCopy: () => void;
}) {
  const { colors, isDark } = useTheme();
  const showRelease = !claimedByAnother && canReleaseJob(job, canVerify) && Boolean(onRelease);
  const showAddPhotos =
    !claimedByAnother && job.state === 'awaiting_verification' && Boolean(onAddPhotos);
  const showOpen = !claimedByAnother && !showRelease && !showAddPhotos;
  const showEdit = canEdit && !claimedByAnother && canEditIdentity(job);
  const showCancel = canEdit && !claimedByAnother && canCancelJob(job);

  return (
    <Host
      matchContents
      colorScheme={isDark ? 'dark' : 'light'}
      seedColor={colors.primary}
      style={{ width: '100%' }}
    >
      <ContextMenu>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <RowPressable disabled={claimedByAnother} onPress={onPress}>
              {(pressed) => (
                <IntakeJobRowBody
                  job={job}
                  claimedByAnother={claimedByAnother}
                  claimedByName={claimedByName}
                  syncPending={syncPending}
                  localPhotoCount={localPhotoCount}
                  pressed={pressed}
                />
              )}
            </RowPressable>
          </RNHostView>
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          {showRelease ? (
            <SwiftButton
              label="Release to grid"
              systemImage="checkmark.seal.fill"
              onPress={() => {
                haptics.selection();
                onRelease?.();
              }}
            />
          ) : null}
          {showAddPhotos ? (
            <SwiftButton
              label="Add photos"
              systemImage="camera.fill"
              onPress={() => {
                haptics.selection();
                onAddPhotos?.();
              }}
            />
          ) : null}
          {showOpen ? (
            <SwiftButton
              label={openActionLabel(job, canVerify)}
              systemImage="camera.fill"
              onPress={() => {
                haptics.selection();
                onPress();
              }}
            />
          ) : null}
          {showEdit ? (
            <SwiftButton
              label="Edit"
              systemImage="pencil"
              onPress={() => {
                haptics.selection();
                onEdit();
              }}
            />
          ) : null}
          <SwiftButton
            label="Copy serial"
            systemImage="doc.on.doc"
            onPress={() => {
              haptics.selection();
              onCopy();
            }}
          />
          {showCancel ? (
            <SwiftButton
              label="Cancel engine"
              systemImage="trash"
              role="destructive"
              onPress={() => {
                haptics.selection();
                onCancel();
              }}
            />
          ) : null}
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
}

export function IntakeJobRow({
  job,
  index,
  claimedByAnother,
  claimedByName,
  syncPending = false,
  localPhotoCount = 0,
  disabled = false,
  canEdit = true,
  canVerify = false,
  onPress,
  onAddPhotos,
  onRelease,
  onEdit,
  onCancel,
}: IntakeJobRowProps) {
  const reducedMotion = useReducedMotion();
  const staggerMs = useListStaggerDelay(index);
  const rowDisabled = claimedByAnother || disabled;

  const entering = reducedMotion
    ? undefined
    : FadeInDown.delay(staggerMs)
        .duration(duration.medium)
        .easing(autocoreEase);

  const copySerial = useCallback(async () => {
    const serial = jobSerial(job);
    await Clipboard.setStringAsync(serial);
    toast({ title: `${serial} copied`, variant: 'success' });
  }, [job]);

  const handleAction = useCallback(
    (id: string) => {
      haptics.selection();
      switch (id) {
        case 'open':
          onPress();
          return;
        case 'release':
          onRelease?.(job);
          return;
        case 'photos':
          onAddPhotos?.(job);
          return;
        case 'edit':
          onEdit(job);
          return;
        case 'copy':
          void copySerial();
          return;
        case 'cancel':
          onCancel(job);
          return;
        default:
          return;
      }
    },
    [copySerial, job, onAddPhotos, onCancel, onEdit, onPress, onRelease],
  );

  const openFallbackMenu = useCallback(() => {
    if (rowDisabled) return;
    presentNativeMenu({
      title: jobSerial(job),
      actions: [
        ...(!claimedByAnother && canVerify && canReleaseJob(job, canVerify)
          ? [{ id: 'release', title: 'Release to grid', systemImage: 'checkmark.seal.fill' as const }]
          : []),
        ...(!claimedByAnother && job.state === 'awaiting_verification' && onAddPhotos
          ? [{ id: 'photos', title: 'Add photos', systemImage: 'camera.fill' as const }]
          : []),
        ...(!claimedByAnother && job.state !== 'awaiting_verification'
          ? [{ id: 'open', title: openActionLabel(job, canVerify), systemImage: 'camera.fill' as const }]
          : []),
        ...(canEdit && !claimedByAnother && canEditIdentity(job)
          ? [{ id: 'edit', title: 'Edit', systemImage: 'pencil' as const }]
          : []),
        { id: 'copy', title: 'Copy serial', systemImage: 'doc.on.doc' as const },
        ...(canEdit && !claimedByAnother && canCancelJob(job)
          ? [
              {
                id: 'cancel',
                title: 'Cancel engine',
                systemImage: 'trash' as const,
                destructive: true,
              },
            ]
          : []),
      ],
      onPressAction: handleAction,
    });
  }, [canEdit, canVerify, claimedByAnother, handleAction, job, onAddPhotos, onRelease, rowDisabled]);

  const useNativeMenu = Platform.OS === 'ios' && !rowDisabled;

  return (
    <Animated.View entering={entering}>
      {useNativeMenu ? (
        <NativeMenuRow
          job={job}
          claimedByAnother={claimedByAnother}
          claimedByName={claimedByName}
          syncPending={syncPending}
          localPhotoCount={localPhotoCount}
          canEdit={canEdit}
          canVerify={canVerify}
          onPress={onPress}
          onAddPhotos={onAddPhotos ? () => onAddPhotos(job) : undefined}
          onRelease={onRelease ? () => onRelease(job) : undefined}
          onEdit={() => onEdit(job)}
          onCancel={() => onCancel(job)}
          onCopy={() => {
            void copySerial();
          }}
        />
      ) : (
        <RowPressable
          disabled={rowDisabled}
          onPress={onPress}
          onLongPress={rowDisabled ? undefined : openFallbackMenu}
        >
          {(pressed) => (
            <IntakeJobRowBody
              job={job}
              claimedByAnother={claimedByAnother}
              claimedByName={claimedByName}
              syncPending={syncPending}
              localPhotoCount={localPhotoCount}
              pressed={pressed}
            />
          )}
        </RowPressable>
      )}
    </Animated.View>
  );
}
