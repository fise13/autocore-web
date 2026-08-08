import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { ArrowLeftIcon, FlashlightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { haptics, minTouchTarget, spacing, spring, tokens, type SemanticColors } from '@/theme';

export type IntakeCaptureChromeProps = {
  chrome: SemanticColors;
  topInset: number;
  serial: string;
  statusPill: string;
  failed: boolean;
  guidance: string | null;
  photoCount: number;
  unsyncedCount: number;
  torch: boolean;
  onBack: () => void;
  onToggleTorch: () => void;
};

export function IntakeCaptureChrome({
  chrome,
  topInset,
  serial,
  statusPill,
  failed,
  guidance,
  photoCount,
  unsyncedCount,
  torch,
  onBack,
  onToggleTorch,
}: IntakeCaptureChromeProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withSequence(
      withTiming(1.05, { duration: 110 }),
      withSpring(1, spring.snappy),
    );
  }, [photoCount, reducedMotion, scale, unsyncedCount]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        paddingTop: topInset + spacing[2],
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
          hitSlop={8}
          onPress={onBack}
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
          style={[
            {
              minHeight: minTouchTarget,
              minWidth: minTouchTarget + spacing[6],
              maxWidth: 220,
              paddingHorizontal: spacing[4],
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: tokens.radius.full,
              backgroundColor: failed ? chrome.dangerSubtle : chrome.overlay,
            },
            pillStyle,
          ]}
        >
          <Text
            variant="caption"
            numberOfLines={1}
            style={{
              color: failed ? chrome.dangerOnSubtle : chrome.foreground,
              fontWeight: '800',
            }}
          >
            {statusPill}
          </Text>
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
          hitSlop={8}
          onPress={() => {
            onToggleTorch();
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
        style={{
          color: chrome.foreground,
          textAlign: 'center',
          fontWeight: '800',
          letterSpacing: 0.6,
          fontVariant: ['tabular-nums'],
        }}
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
  );
}
