import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type AnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Share2Icon, XIcon } from '@/assets/icons';
import { Text, toast } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, spacing } from '@/theme';

import { EngineGlyph } from './engine-glyph';
import { EngineNavButton } from './engine-surface';
import { EnginePhotoPage } from './engine-photo-page';
import { eng, engType } from '../layout';
import { shareEnginePhoto } from '../lib/engine-photo-file';

function ViewerCaption({
  serial,
  index,
  total,
  zoomed,
  style,
  bottomInset,
}: {
  serial: string;
  index: number;
  total: number;
  zoomed: boolean;
  style: AnimatedStyle<ViewStyle>;
  bottomInset: number;
}) {
  const { colors } = useTheme();
  const hint = zoomed
    ? 'Double-tap to zoom out'
    : total > 1
      ? 'Swipe for more photos · swipe down to close'
      : 'Swipe down to close';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: Math.max(bottomInset, spacing[2]),
          paddingTop: spacing[3],
          paddingHorizontal: eng.pad,
          gap: spacing[1],
          backgroundColor: colors.background,
          borderTopWidth: eng.hairline,
          borderTopColor: colors.border,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: eng.stack,
        }}
      >
        <Text variant="identifier" numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ flex: 1 }}>
          {serial}
        </Text>
        {total > 1 ? (
          <Text variant="identifier" maxFontSizeMultiplier={1.1} color="muted">
            {index + 1} / {total}
          </Text>
        ) : null}
      </View>
      <Text variant="footnote" color="muted" style={engType.hint}>
        {hint}
      </Text>
    </Animated.View>
  );
}

/**
 * Immersive photo route — plain canvas, ruled nav chrome, caption strip.
 * No gradients (DESIGN.md v3). Gestures unchanged: pinch, swipe down to close.
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
  const [index, setIndex] = useState(initialIndex);
  const [saving, setSaving] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const dismissProgress = useSharedValue(0);

  const captionHeight = useMemo(
    () => Math.max(insets.bottom, spacing[2]) + spacing[3] + 52,
    [insets.bottom],
  );
  const topInset = insets.top + spacing[2];
  const topChromeHeight = topInset + eng.control + spacing[3];
  const imageHeight = height - topChromeHeight - captionHeight;

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - dismissProgress.value * 0.85,
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: 1 - dismissProgress.value,
  }));

  const onScroll = useCallback(
    (offsetX: number) => {
      const next = Math.round(offsetX / width);
      const clamped = Math.min(Math.max(next, 0), urls.length - 1);
      setIndex((current) => (current === clamped ? current : clamped));
    },
    [urls.length, width],
  );

  const onMomentumEnd = useCallback(
    (offsetX: number) => {
      onScroll(offsetX);
    },
    [onScroll],
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
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }, backdropStyle]}
      />

      <ScrollView
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialIndex * width, y: 0 }}
        scrollEventThrottle={16}
        onScroll={(event) => onScroll(event.nativeEvent.contentOffset.x)}
        onMomentumScrollEnd={(event) => onMomentumEnd(event.nativeEvent.contentOffset.x)}
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
      </ScrollView>

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
        <EngineNavButton accessibilityLabel="Close photo" onPress={close}>
          <EngineGlyph
            sf="xmark"
            fallback={XIcon}
            size={15}
            color={colors.foreground}
            weight="semibold"
          />
        </EngineNavButton>

        <EngineNavButton accessibilityLabel="Share photo" onPress={() => void share()}>
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
        </EngineNavButton>
      </Animated.View>

      <ViewerCaption
        serial={serial}
        index={index}
        total={urls.length}
        zoomed={zoomed}
        style={chromeStyle}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
