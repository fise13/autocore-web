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

import { IntakePhotoThumbs, type IntakePhotoThumbItem } from './intake-photo-thumbs';

export type IntakeCaptureDockProps = {
  chrome: SemanticColors;
  bottomInset: number;
  photoCount: number;
  failedCount: number;
  syncErrorText: string | null;
  capturing: boolean;
  photoThumbs?: readonly IntakePhotoThumbItem[];
  onPickGallery: () => void;
  onShutter: () => void;
  onFinish: () => void;
  onRetryUpload: () => void;
  /**
   * `companion` sits above the native Camera chrome: thumbs + retry only,
   * no shutter / gallery / finish (those live in SwiftUI).
   */
  variant?: 'full' | 'companion';
};

export function IntakeCaptureDock({
  chrome,
  bottomInset,
  photoCount,
  failedCount,
  syncErrorText,
  capturing,
  photoThumbs = [],
  onPickGallery,
  onShutter,
  onFinish,
  onRetryUpload,
  variant = 'full',
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
  // How many photos are on the server is not the worker's problem, and saying
  // it here only ever produced an anxious number that changed while they were
  // reading it. The count of shots taken is the honest, useful fact.
  const companion = variant === 'companion';
  const hint = failedCount > 0 ? ' · needs you' : ' · Camera or Photos';

  return (
    <View
      pointerEvents={companion ? 'box-none' : 'auto'}
      style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        paddingHorizontal: spacing[5],
        // Native Camera chrome (zoom + shutter + Finish pill) sits in the
        // bottom safe area; keep thumbs just above the zoom cluster.
        paddingBottom: companion ? bottomInset + 200 : bottomInset + spacing[5],
        paddingTop: companion ? spacing[3] : spacing[6],
        gap: spacing[4],
        backgroundColor: companion ? 'transparent' : chrome.overlay,
      }}
    >
      <IntakePhotoThumbs items={photoThumbs} chrome={chrome} />

      {companion ? null : (
        <View style={{ gap: spacing[1], alignItems: 'center' }}>
          <Text variant="heading" style={{ color: chrome.foreground, textAlign: 'center' }}>
            Engine condition
          </Text>
          <Text variant="caption" style={{ color: chrome.mutedForeground, textAlign: 'center' }}>
            {photoCount} photo{photoCount === 1 ? '' : 's'}
            {hint}
          </Text>
        </View>
      )}

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
            {failedCount === 1 ? '1 photo needs you' : `${failedCount} photos need you`}
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
            Keep shooting or finish — nothing is lost either way.
          </Text>
          <Button variant="outline" onPress={onRetryUpload}>
            Try again
          </Button>
        </View>
      ) : null}

      {companion ? null : (
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
      )}

      {companion ? null : (
      <Button size="xl" disabled={photoCount < 1} onPress={onFinish}>
        Finish
      </Button>
      )}
    </View>
  );
}
