import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, EllipsisIcon } from '@/assets/icons';
import { Skeleton, Text } from '@/components/ui';
import {
  presentNativeMenu,
  type NativeContextMenuAction,
} from '@/components/ui/native-context-menu';
import { useTheme } from '@/hooks';
import { getColors, haptics, spacing, tokens } from '@/theme';

import { EngineGlyph } from './engine-glyph';
import { eng } from '../layout';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

/**
 * Chrome that always sits on a photo reads against the image, not the page, so
 * it takes the dark scheme's ink in both themes — the light theme's near-black
 * foreground would vanish into a dark shot.
 */
const onPhotoInk = getColors('dark').foreground;

/** 4:3 is the field camera's native frame; the cap protects short screens. */
function heroHeight(width: number, windowHeight: number): number {
  return Math.min(Math.round((width * 3) / 4), Math.round(windowHeight * 0.52));
}

function HeroSlide({
  url,
  width,
  height,
  index,
  scrollX,
  onPress,
}: {
  url: string;
  width: number;
  height: number;
  index: number;
  scrollX: SharedValue<number>;
  onPress: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  const slideStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.96, 1, 0.96], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[{ width, height }, slideStyle]}>
      <TouchableOpacity
        accessibilityRole="imagebutton"
        accessibilityLabel="Open photo gallery"
        activeOpacity={0.96}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        style={{ flex: 1 }}
      >
        <Image
          source={{ uri: url }}
          style={{ width, height }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={220}
          alt=""
          accessibilityIgnoresInvertColors
          onLoadEnd={() => setLoaded(true)}
        />
        {loaded ? null : (
          <Skeleton
            width={width}
            height={height}
            rounded="none"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Round nav control. Frosted over a photo, solid card when the hero is empty —
 * a dark scrim floating on the page background reads as a rendering fault.
 */
function HeroNavButton({
  onPress,
  accessibilityLabel,
  onPhoto,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  onPhoto: boolean;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  const face = (
    <View
      style={{
        width: eng.nav,
        height: eng.nav,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: onPhoto ? colors.overlay : colors.card,
        borderWidth: onPhoto ? 0 : eng.rule,
        borderColor: colors.border,
      }}
    >
      {children}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // The 36pt face keeps the photo readable; hitSlop carries it to 44pt.
      hitSlop={(eng.hit - eng.nav) / 2}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={{
        width: eng.nav,
        height: eng.nav,
        borderRadius: eng.pillRadius,
        overflow: 'hidden',
        opacity: pressed ? tokens.opacity.pressed : 1,
      }}
    >
      {onPhoto ? (
        // Always the dark tint, in both themes: this sits on a photo, not on the
        // page. A light frost would swallow the white glyph. On Android the
        // default blurMethod is 'none', so the scrim under it carries the
        // contrast on its own.
        <BlurView intensity={28} tint="dark" style={{ flex: 1 }}>
          {face}
        </BlurView>
      ) : (
        face
      )}
    </Pressable>
  );
}

/**
 * The photo field — edge-to-edge 4:3 pager with Apple Photos motion.
 *
 * Swipe between shots in place; tap opens the immersive viewer. Position is a
 * counter in the corner rather than a dot row, because eight dots is a smear
 * and the intake sets run well past eight.
 */
export function EngineHero({
  urls,
  onBack,
  onOpenPhoto,
  onIndexChange,
  actions,
  onAction,
}: {
  urls: string[];
  onBack: () => void;
  onOpenPhoto: (index: number) => void;
  onIndexChange?: (index: number) => void;
  actions?: NativeContextMenuAction[];
  onAction?: (id: string) => void;
}) {
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);

  const empty = urls.length === 0;
  const height = empty ? insets.top + eng.nav + spacing[2] : heroHeight(width, windowHeight);

  const reportIndex = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), Math.max(0, urls.length - 1));
      setIndex(clamped);
      onIndexChange?.(clamped);
    },
    [onIndexChange, urls.length],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      const next = Math.round(event.contentOffset.x / width);
      runOnJS(reportIndex)(next);
    },
  });

  const openMenu = useCallback(() => {
    if (!actions || actions.length === 0 || !onAction) return;
    presentNativeMenu({ actions, onPressAction: onAction });
  }, [actions, onAction]);

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View style={{ width, height, backgroundColor: empty ? colors.background : colors.surface }}>
        {empty ? null : (
          <AnimatedScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            decelerationRate="fast"
            onScroll={scrollHandler}
            style={{ width, height }}
          >
            {urls.map((url, slide) => (
              <HeroSlide
                key={url}
                url={url}
                width={width}
                height={height}
                index={slide}
                scrollX={scrollX}
                onPress={() => onOpenPhoto(slide)}
              />
            ))}
          </AnimatedScrollView>
        )}

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + spacing[2],
            left: eng.pad,
            right: eng.pad,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <HeroNavButton accessibilityLabel="Back" onPress={onBack} onPhoto={!empty}>
            <ArrowLeftIcon
              size="sm"
              color={empty ? colors.foreground : onPhotoInk}
              strokeWidth={1.9}
            />
          </HeroNavButton>

          {actions && actions.length > 0 && onAction ? (
            <HeroNavButton accessibilityLabel="More actions" onPress={openMenu} onPhoto={!empty}>
              <EngineGlyph
                sf="ellipsis"
                fallback={EllipsisIcon}
                size={17}
                color={empty ? colors.foreground : onPhotoInk}
                weight="semibold"
              />
            </HeroNavButton>
          ) : (
            <View style={{ width: eng.nav }} />
          )}
        </View>

        {!empty && urls.length > 1 ? (
          <View
            pointerEvents="none"
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Photo ${index + 1} of ${urls.length}`}
            style={{
              position: 'absolute',
              right: eng.pad,
              bottom: eng.stack,
              borderRadius: eng.pillRadius,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: spacing[2],
                paddingVertical: spacing[1],
                backgroundColor: colors.overlay,
              }}
            >
              <Text
                variant="caption2"
                maxFontSizeMultiplier={1.15}
                style={{
                  color: onPhotoInk,
                  fontWeight: '600',
                  fontVariant: ['tabular-nums'],
                  letterSpacing: 0.2,
                }}
              >
                {index + 1}/{urls.length}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
