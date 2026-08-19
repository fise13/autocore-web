import { useCallback, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

import { ArrowLeftIcon, EllipsisIcon, LayoutGridIcon } from '@/assets/icons';
import { Button, IconButton, Skeleton, Text } from '@/components/ui';
import {
  presentNativeMenu,
  type NativeContextMenuAction,
} from '@/components/ui/native-context-menu';
import { useTheme } from '@/hooks';
import { haptics, spacing } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import { EngineGlyph } from './engine-glyph';
import { EnginePhotoDots } from './engine-photo-dots';
import { eng, engType } from '../layout';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

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
 * The photo field — edge-to-edge pager with Apple Photos motion.
 *
 * Swipe between shots in-place; tap or "All photos" opens the immersive viewer.
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
  const { colors, isDark } = useTheme();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);

  const empty = urls.length === 0;
  const height = empty
    ? insets.top + eng.nav + spacing[2]
    : Math.min(Math.round(width * 0.78), Math.round(windowHeight * 0.42));

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

  const openGallery = useCallback(() => {
    haptics.light();
    onOpenPhoto(index);
  }, [index, onOpenPhoto]);

  const scrimTop = withAlpha(colors.background, isDark ? 0.72 : 0.55);
  const scrimBottom = withAlpha(colors.background, isDark ? 0.82 : 0.62);

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

        {!empty ? (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={[scrimTop, 'transparent']}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: insets.top + eng.nav + spacing[6],
              }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', scrimBottom]}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: spacing[16] }}
            />
          </>
        ) : null}

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
          <IconButton
            size="sm"
            variant="outline"
            accessibilityLabel="Back"
            onPress={onBack}
            style={{ backgroundColor: colors.card }}
          >
            <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={1.9} />
          </IconButton>

          {actions && actions.length > 0 && onAction ? (
            <IconButton
              size="sm"
              variant="outline"
              accessibilityLabel="More actions"
              onPress={openMenu}
              style={{ backgroundColor: colors.card }}
            >
              <EngineGlyph
                sf="ellipsis"
                fallback={EllipsisIcon}
                size={17}
                color={colors.foreground}
                weight="semibold"
              />
            </IconButton>
          ) : (
            <View style={{ width: eng.nav }} />
          )}
        </View>

        {!empty && urls.length > 1 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: spacing[3],
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <EnginePhotoDots count={urls.length} scrollX={scrollX} pageWidth={width} tone="overlay" />
          </View>
        ) : null}
      </View>

      {!empty ? (
        <View
          style={{
            paddingHorizontal: eng.pad,
            paddingTop: eng.inline,
            paddingBottom: urls.length > 1 ? 0 : eng.micro,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: eng.stack,
            }}
          >
            {urls.length > 1 ? (
              <Text
                variant="caption1"
                color="muted"
                style={engType.count}
                accessibilityRole="text"
                accessibilityLabel={`Photo ${index + 1} of ${urls.length}`}
              >
                Photo {index + 1} of {urls.length}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <Button
              variant="outline"
              size="sm"
              inline
              accessibilityLabel={urls.length > 1 ? `Open all ${urls.length} photos` : 'View photo full screen'}
              leftIcon={<LayoutGridIcon size="sm" color={colors.foreground} strokeWidth={1.85} />}
              onPress={openGallery}
            >
              {urls.length > 1 ? 'All photos' : 'View photo'}
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
