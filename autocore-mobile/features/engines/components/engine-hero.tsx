import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, CameraIcon } from '@/assets/icons';
import { Skeleton, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, spacing } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

const CONTROL = 'rgba(0, 0, 0, 0.42)';

function HeroSlide({
  url,
  width,
  height,
  onPress,
}: {
  url: string;
  width: number;
  height: number;
  onPress: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Open photo full screen"
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={{ width, height }}
    >
      <Image
        source={{ uri: url }}
        style={{ width, height }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={180}
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
    </Pressable>
  );
}

/**
 * The engine itself, full bleed, at the top of the card — and a gallery.
 *
 * A photo of the block tells a person more in one glance than every field on
 * this screen combined, so it leads rather than sitting in a section halfway
 * down, and you page through the set right here instead of having to open the
 * viewer first. The back control floats over it — no separate header bar
 * stealing the first 90pt of a screen whose whole point is the image.
 */
export function EngineHero({
  urls,
  onBack,
  onOpenPhoto,
}: {
  urls: string[];
  onBack: () => void;
  onOpenPhoto: (index: number) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [index, setIndex] = useState(0);

  const empty = urls.length === 0;
  // A photo earns a tall hero; an empty slot does not get to eat a third of
  // the screen just to say "no photos yet".
  const height = Math.round(width * (empty ? 0.42 : 0.78));

  const onMomentumEnd = useCallback(
    (offsetX: number) => {
      const next = Math.round(offsetX / width);
      setIndex(Math.min(Math.max(next, 0), Math.max(0, urls.length - 1)));
    },
    [urls.length, width],
  );

  return (
    <View style={{ width, height, backgroundColor: colors.surfaceElevated }}>
      {empty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[2] }}>
          <CameraIcon size="lg" color={withAlpha(colors.mutedForeground, 0.5)} strokeWidth={1.4} />
          <Text variant="footnote" color="muted">
            No photos yet
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => onMomentumEnd(event.nativeEvent.contentOffset.x)}
          style={{ width, height }}
        >
          {urls.map((url, slide) => (
            <HeroSlide
              key={url}
              url={url}
              width={width}
              height={height}
              onPress={() => onOpenPhoto(slide)}
            />
          ))}
        </ScrollView>
      )}

      {/* Keeps the floating back control legible over a bright photo. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.45)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 72 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', withAlpha(colors.background, isDark ? 0.9 : 0.75)]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 96 }}
      />

      <View style={{ position: 'absolute', top: insets.top + spacing[1], left: spacing[3] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={onBack}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: CONTROL,
          }}
        >
          <ArrowLeftIcon size="sm" color="#ffffff" strokeWidth={2.2} />
        </Pressable>
      </View>

      {urls.length > 1 ? (
        <View
          pointerEvents="none"
          accessibilityRole="text"
          accessibilityLabel={`Photo ${index + 1} of ${urls.length}`}
          style={{
            position: 'absolute',
            bottom: spacing[4],
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing[1.5],
          }}
        >
          {urls.map((url, dot) => (
            <View
              key={url}
              style={{
                width: dot === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  dot === index ? '#ffffff' : withAlpha('#ffffff', 0.45),
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
