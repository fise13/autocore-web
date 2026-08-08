import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { EngineIntakeJob } from '@autocore/engine-intake';
import { warehouseLifecycleLabel } from '@autocore/engine-intake';

import { CameraIcon, ChevronRightIcon, CloudIcon } from '@/assets/icons';
import { Badge, Text, useListStaggerDelay } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, minTouchTarget, spacing, tokens } from '@/theme';

export type IntakeJobRowProps = {
  job: EngineIntakeJob;
  index: number;
  claimedByAnother: boolean;
  claimedByName?: string | null;
  syncPending?: boolean;
  disabled?: boolean;
  onPress: () => void;
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

export function IntakeJobRow({
  job,
  index,
  claimedByAnother,
  claimedByName,
  syncPending = false,
  disabled = false,
  onPress,
}: IntakeJobRowProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const staggerMs = useListStaggerDelay(index);
  const photoCount = job.progress.capturedCount;
  const photoLine =
    photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? '' : 's'}` : 'No photos';

  const entering = reducedMotion
    ? undefined
    : FadeInDown.delay(staggerMs)
        .duration(duration.medium)
        .easing(autocoreEase);

  return (
    <Animated.View entering={entering}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: claimedByAnother || disabled }}
        disabled={claimedByAnother || disabled}
        onPress={onPress}
      >
        {({ pressed }) => (
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
        )}
      </Pressable>
    </Animated.View>
  );
}
