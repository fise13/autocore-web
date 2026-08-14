import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ImagesIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks';
import { minTouchTarget, spacing, spring, tokens, type SemanticColors } from '@/theme';

export type IntakeCaptureDockProps = {
  chrome: SemanticColors;
  bottomInset: number;
  photoCount: number;
  unsyncedCount: number;
  failedCount: number;
  syncErrorText: string | null;
  capturing: boolean;
  onPickGallery: () => void;
  onShutter: () => void;
  onFinish: () => void;
  onRetryUpload: () => void;
};

export function IntakeCaptureDock({
  chrome,
  bottomInset,
  photoCount,
  unsyncedCount,
  failedCount,
  syncErrorText,
  capturing,
  onPickGallery,
  onShutter,
  onFinish,
  onRetryUpload,
}: IntakeCaptureDockProps) {
  const reducedMotion = useReducedMotion();
  const shutterScale = useSharedValue(1);

  const pressIn = () => {
    shutterScale.value = reducedMotion
      ? 0.94
      : withTiming(0.92, { duration: 70 });
  };
  const pressOut = () => {
    shutterScale.value = reducedMotion ? 1 : withSpring(1, spring.press);
  };

  const shutterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  const sideControlSize = minTouchTarget + spacing[2];
  const syncLine =
    failedCount > 0
      ? ` · ${failedCount} not uploaded`
      : unsyncedCount > 0
        ? ` · ${unsyncedCount} syncing`
        : ' · Camera or Photos';

  return (
    <View
      style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        paddingHorizontal: spacing[5],
        paddingBottom: bottomInset + spacing[5],
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
          {syncLine}
        </Text>
      </View>

      {failedCount > 0 ? (
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
            Could not upload {failedCount} photo{failedCount === 1 ? '' : 's'}
          </Text>
          {syncErrorText ? (
            <Text
              variant="caption"
              style={{ color: chrome.dangerOnSubtle, textAlign: 'center' }}
            >
              {syncErrorText}
            </Text>
          ) : null}
          <Text
            variant="caption"
            style={{ color: chrome.dangerOnSubtle, textAlign: 'center' }}
          >
            Saved on this phone — you can keep shooting or finish anyway.
          </Text>
          <Button variant="outline" onPress={onRetryUpload}>
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
          hitSlop={6}
          onPress={onPickGallery}
          style={{
            width: sideControlSize,
            height: sideControlSize,
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
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={onShutter}
        >
          <Animated.View
            style={[
              {
                width: 84,
                height: 84,
                borderRadius: tokens.radius.full,
                borderWidth: 5,
                borderColor: chrome.foreground,
                alignItems: 'center',
                justifyContent: 'center',
              },
              shutterStyle,
            ]}
          >
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: tokens.radius.full,
                backgroundColor: chrome.foreground,
              }}
            />
          </Animated.View>
        </Pressable>

        <View style={{ width: sideControlSize }} />
      </View>

      <Button size="xl" disabled={photoCount < 1} onPress={onFinish}>
        Finish
      </Button>
    </View>
  );
}
