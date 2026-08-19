import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { haptics, spacing } from '@/theme';

import { eng } from '../layout';

const THUMB = 52;
const GAP = 6;

/**
 * Bottom filmstrip — the Apple Photos row of thumbnails that tracks the pager.
 */
export function EnginePhotoFilmstrip({
  urls,
  index,
  scrollX,
  pageWidth,
  onSelect,
  bottomInset,
}: {
  urls: string[];
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  onSelect: (next: number) => void;
  bottomInset: number;
}) {
  const stripRef = useRef<ScrollView>(null);
  const { colors } = useTheme();

  useEffect(() => {
    if (urls.length < 2) return;
    const x = Math.max(0, index * (THUMB + GAP) - 40);
    stripRef.current?.scrollTo({ x, animated: true });
  }, [index, urls.length]);

  if (urls.length < 2) return null;

  return (
    <View
      style={{
        paddingBottom: Math.max(bottomInset, spacing[2]),
        paddingTop: spacing[2],
      }}
    >
      <ScrollView
        ref={stripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: eng.pad,
          gap: GAP,
          alignItems: 'center',
        }}
      >
        {urls.map((url, thumbIndex) => (
          <FilmstripThumb
            key={url}
            url={url}
            thumbIndex={thumbIndex}
            scrollX={scrollX}
            pageWidth={pageWidth}
            selected={thumbIndex === index}
            ring={colors.primary}
            surface={colors.card}
            onPress={() => {
              haptics.selection();
              onSelect(thumbIndex);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FilmstripThumb({
  url,
  thumbIndex,
  scrollX,
  pageWidth,
  selected,
  ring,
  surface,
  onPress,
}: {
  url: string;
  thumbIndex: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  selected: boolean;
  ring: string;
  surface: string;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(thumbIndex - 1) * pageWidth, thumbIndex * pageWidth, (thumbIndex + 1) * pageWidth];
    const scale = interpolate(scrollX.value, inputRange, [0.92, 1.06, 0.92], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.55, 1, 0.55], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Photo ${thumbIndex + 1}`}
      accessibilityState={{ selected }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          {
            width: THUMB,
            height: THUMB,
            borderRadius: eng.thumbRadius,
            overflow: 'hidden',
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? ring : 'transparent',
            backgroundColor: surface,
          },
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: url }}
          style={{ width: THUMB, height: THUMB }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          alt=""
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </Pressable>
  );
}
