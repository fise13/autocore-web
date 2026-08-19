import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Share2Icon, XIcon } from '@/assets/icons';
import { IconButton, Text, toast } from '@/components/ui';
import { useMotion, useTheme } from '@/hooks';
import { haptics, spacing } from '@/theme';

import { EngineGlyph } from './engine-glyph';
import { EnginePhotoDots } from './engine-photo-dots';
import { EnginePhotoFilmstrip } from './engine-photo-filmstrip';
import { EnginePhotoPage } from './engine-photo-page';
import { eng } from '../layout';
import { shareEnginePhoto } from '../lib/engine-photo-file';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const FILMSTRIP_H = 52 + spacing[2] * 2;
const DOTS_H = 18 + spacing[3];
const pagerNative = Gesture.Native();

/**
 * Immersive photo gallery — Apple Photos paging, filmstrip, pinch, swipe down.
 */
export function EnginePhotoViewer({
  urls,
  serial,
  initialIndex,
  onClose,
}: {
  urls: string[];
  serial: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const motion = useMotion();
  const pagerRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(initialIndex * width);
  const dismissProgress = useSharedValue(0);
  const enter = useSharedValue(0);

  const [index, setIndex] = useState(initialIndex);
  const [saving, setSaving] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    enter.value = motion.reduced
      ? 1
      : withSpring(1, motion.springs.settle);
  }, [enter, motion.reduced, motion.springs.settle]);

  const chromeBottom = useMemo(() => {
    if (zoomed || urls.length < 2) return Math.max(insets.bottom, spacing[2]);
    return Math.max(insets.bottom, spacing[2]) + FILMSTRIP_H + DOTS_H;
  }, [insets.bottom, urls.length, zoomed]);

  const topInset = insets.top + spacing[2];
  const topChromeHeight = topInset + eng.nav + spacing[2];
  const imageHeight = height - topChromeHeight - chromeBottom;

  const canvas = colors.background;

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value * (1 - dismissProgress.value * 0.9),
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: enter.value * (1 - dismissProgress.value * 0.85),
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: (1 - dismissProgress.value) * (zoomed ? 0 : 1),
  }));

  const reportIndex = useCallback((next: number) => {
    const clamped = Math.min(Math.max(next, 0), urls.length - 1);
    setIndex((current) => (current === clamped ? current : clamped));
  }, [urls.length]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      const next = Math.round(event.contentOffset.x / width);
      runOnJS(reportIndex)(next);
    },
  });

  const jumpTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), urls.length - 1);
      pagerRef.current?.scrollTo({ x: clamped * width, animated: true });
      scrollX.value = motion.reduced
        ? clamped * width
        : withTiming(clamped * width, { duration: motion.duration.normal, easing: motion.ease });
      reportIndex(clamped);
    },
    [motion.duration.normal, motion.ease, motion.reduced, reportIndex, scrollX, urls.length, width],
  );

  const close = useCallback(() => {
    haptics.light();
    onClose();
  }, [onClose]);

  const share = useCallback(async () => {
    const url = urls[index];
    if (!url || saving) return;
    setSaving(true);
    try {
      await shareEnginePhoto(url, serial, index);
      haptics.success();
    } catch (error) {
      haptics.error();
      toast({
        title: 'Could not share the photo',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [index, saving, serial, urls]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: canvas }, backdropStyle]} />

      <Animated.View style={[StyleSheet.absoluteFill, shellStyle]}>
        <GestureDetector gesture={pagerNative}>
          <AnimatedScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: initialIndex * width, y: 0 }}
            scrollEventThrottle={16}
            decelerationRate="fast"
            onScroll={scrollHandler}
            style={StyleSheet.absoluteFill}
          >
            {urls.map((url, pageIndex) => (
              <EnginePhotoPage
                key={url}
                url={url}
                alt={`Engine ${serial}, photo ${pageIndex + 1} of ${urls.length}`}
                width={width}
                height={height}
                imageHeight={imageHeight}
                active={pageIndex === index}
                dismissProgress={dismissProgress}
                onZoomChange={setZoomed}
                onRequestClose={close}
              />
            ))}
          </AnimatedScrollView>
        </GestureDetector>

        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              position: 'absolute',
              top: topInset,
              left: eng.pad,
              right: eng.pad,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            chromeStyle,
          ]}
        >
          <IconButton
            size="sm"
            variant="outline"
            accessibilityLabel="Close photo"
            onPress={close}
            style={{ backgroundColor: colors.card }}
          >
            <EngineGlyph
              sf="xmark"
              fallback={XIcon}
              size={15}
              color={colors.foreground}
              weight="semibold"
            />
          </IconButton>

          <Text
            variant="subheadline"
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}
            style={{
              flex: 1,
              textAlign: 'center',
              marginHorizontal: spacing[2],
              color: colors.foreground,
              fontWeight: '600',
            }}
          >
            {serial}
          </Text>

          <IconButton
            size="sm"
            variant="outline"
            accessibilityLabel="Share photo"
            onPress={() => void share()}
            style={{ backgroundColor: colors.card }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <EngineGlyph
                sf="square.and.arrow.up"
                fallback={Share2Icon}
                size={17}
                color={colors.foreground}
                weight="medium"
              />
            )}
          </IconButton>
        </Animated.View>

        {!zoomed && urls.length > 1 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: Math.max(insets.bottom, spacing[2]) + FILMSTRIP_H,
                alignItems: 'center',
              },
              chromeStyle,
            ]}
          >
            <EnginePhotoDots count={urls.length} scrollX={scrollX} pageWidth={width} />
          </Animated.View>
        ) : null}

        {!zoomed && urls.length > 1 ? (
          <Animated.View
            pointerEvents="box-none"
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
              },
              chromeStyle,
            ]}
          >
            <EnginePhotoFilmstrip
              urls={urls}
              index={index}
              scrollX={scrollX}
              pageWidth={width}
              bottomInset={insets.bottom}
              onSelect={jumpTo}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}
