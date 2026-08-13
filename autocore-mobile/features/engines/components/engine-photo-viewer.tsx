import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DownloadIcon, XIcon } from '@/assets/icons';
import { Text, toast } from '@/components/ui';
import { haptics, spacing } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import { EnginePhotoPage } from './engine-photo-page';
import { shareEnginePhoto } from '../lib/engine-photo-file';

const CHROME_BG = '#000000';
const CONTROL_BG = 'rgba(255, 255, 255, 0.16)';

const styles = StyleSheet.create({
  // Static, not `Pressable`'s function-form `style` — that form is silently
  // dropped by this RN version, taking the whole layout with it.
  control: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CONTROL_BG,
  },
  controlBusy: { opacity: 0.7 },
});

/**
 * Full-screen engine photo viewer.
 *
 * Plain absolute overlay rather than an RN `Modal` — the app already learned
 * that stacking a Modal over the gesture/keyboard providers is where dismissal
 * races come from. Paging stays a horizontal ScrollView, disabled while a page
 * is zoomed so a pan moves the image instead of turning the page.
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
  const [index, setIndex] = useState(initialIndex);
  const [saving, setSaving] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const dismissProgress = useSharedValue(0);

  const imageHeight = Math.round(height * 0.72);

  // Backdrop and chrome thin out as the photo is dragged away.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - dismissProgress.value * 0.85,
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: 1 - dismissProgress.value,
  }));

  const onMomentumEnd = useCallback(
    (offsetX: number) => {
      const next = Math.round(offsetX / width);
      setIndex(Math.min(Math.max(next, 0), urls.length - 1));
    },
    [urls.length, width],
  );

  const close = useCallback(() => {
    haptics.light();
    onClose();
  }, [onClose]);

  const save = useCallback(async () => {
    const url = urls[index];
    if (!url || saving) return;
    setSaving(true);
    try {
      await shareEnginePhoto(url, serial, index);
      haptics.success();
    } catch (error) {
      haptics.error();
      toast({
        title: 'Could not save the photo',
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
        style={[StyleSheet.absoluteFill, { backgroundColor: CHROME_BG }, backdropStyle]}
      />

      <ScrollView
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialIndex * width, y: 0 }}
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
            top: insets.top + spacing[2],
            left: spacing[4],
            right: spacing[4],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
          },
          chromeStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          hitSlop={10}
          onPress={close}
          style={styles.control}
        >
          <XIcon size="sm" color="#ffffff" strokeWidth={2} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="footnote" style={{ color: withAlpha('#ffffff', 0.86) }}>
            {serial}
          </Text>
          {urls.length > 1 ? (
            <Text variant="caption1" style={{ color: withAlpha('#ffffff', 0.6) }}>
              {index + 1} of {urls.length}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save photo"
          accessibilityState={{ busy: saving }}
          hitSlop={10}
          disabled={saving}
          onPress={() => void save()}
          style={[styles.control, saving ? styles.controlBusy : null]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <DownloadIcon size="sm" color="#ffffff" strokeWidth={2} />
          )}
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', bottom: insets.bottom + spacing[5], left: 0, right: 0 },
          chromeStyle,
        ]}
      >
        <Text
          variant="caption1"
          style={{ color: withAlpha('#ffffff', 0.45), textAlign: 'center' }}
        >
          {zoomed ? 'Double-tap to zoom out' : 'Swipe to browse · pinch to zoom · swipe down to close'}
        </Text>
      </Animated.View>

    </View>
  );
}
