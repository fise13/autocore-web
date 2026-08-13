import { useEffect } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const MAX_SCALE = 6;
const DOUBLE_TAP_SCALE = 2.5;
/** Past this drag, letting go closes the viewer. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;
/** Drag distance that fades the backdrop to fully transparent. */
const DISMISS_FADE_RANGE = 320;

export type EnginePhotoPageProps = {
  url: string;
  alt: string;
  width: number;
  height: number;
  imageHeight: number;
  active: boolean;
  /** Written by the active page; the viewer fades its chrome against it. */
  dismissProgress: SharedValue<number>;
  onZoomChange: (zoomed: boolean) => void;
  onRequestClose: () => void;
};

/**
 * One zoomable page of the photo viewer.
 *
 * Pinch and double-tap zoom; panning moves the image once zoomed and otherwise
 * drags the whole viewer away, which is the gesture people already expect from
 * Photos.
 */
export function EnginePhotoPage({
  url,
  alt,
  width,
  height,
  imageHeight,
  active,
  dismissProgress,
  onZoomChange,
  onRequestClose,
}: EnginePhotoPageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Paging away must not leave a page parked zoomed and off-centre.
  useEffect(() => {
    if (active) return;
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
  }, [active, savedScale, savedTx, savedTy, scale, tx, ty]);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      const next = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(next, 0.85), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        scale.value = withTiming(1, { duration: 160 });
        tx.value = withTiming(0, { duration: 160 });
        ty.value = withTiming(0, { duration: 160 });
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(onZoomChange)(false);
        return;
      }
      savedScale.value = scale.value;
      runOnJS(onZoomChange)(true);
    });

  const pan = Gesture.Pan()
    .minDistance(6)
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        tx.value = savedTx.value + event.translationX;
        ty.value = savedTy.value + event.translationY;
        return;
      }
      // Not zoomed: the drag pulls the whole viewer away.
      ty.value = event.translationY;
      tx.value = event.translationX * 0.35;
      dismissProgress.value = Math.min(1, Math.abs(event.translationY) / DISMISS_FADE_RANGE);
    })
    .onEnd((event) => {
      if (scale.value > 1) {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
        return;
      }
      const shouldClose =
        Math.abs(event.translationY) > DISMISS_DISTANCE ||
        Math.abs(event.velocityY) > DISMISS_VELOCITY;
      if (shouldClose) {
        runOnJS(onRequestClose)();
        return;
      }
      tx.value = withTiming(0, { duration: 180 });
      ty.value = withTiming(0, { duration: 180 });
      dismissProgress.value = withTiming(0, { duration: 180 });
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(260)
    .onEnd((_event, success) => {
      if (!success) return;
      if (scale.value > 1) {
        scale.value = withTiming(1, { duration: 180 });
        tx.value = withTiming(0, { duration: 180 });
        ty.value = withTiming(0, { duration: 180 });
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(onZoomChange)(false);
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: 180 });
      savedScale.value = DOUBLE_TAP_SCALE;
      runOnJS(onZoomChange)(true);
    });

  // No long-press here: full screen is for looking, and holding a photo you
  // are mid-pinch on fought the zoom. Photo actions live on the strip below
  // the card, where a hold is unambiguous.
  const gesture = Gesture.Simultaneous(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={imageStyle}>
          <Image
            source={{ uri: url }}
            style={{ width, height: imageHeight }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={160}
            alt={alt}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
