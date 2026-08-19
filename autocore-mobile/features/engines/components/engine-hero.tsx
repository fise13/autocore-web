import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, EllipsisIcon } from '@/assets/icons';
import { Skeleton, Text } from '@/components/ui';
import {
  presentNativeMenu,
  type NativeContextMenuAction,
} from '@/components/ui/native-context-menu';
import { useTheme } from '@/hooks';
import { haptics, spacing } from '@/theme';

import { EngineGlyph } from './engine-glyph';
import { EngineNavButton } from './engine-surface';
import { eng, engType } from '../layout';

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
 * The photo field.
 *
 * Edge-to-edge, paged like a document, with the count sitting under the image
 * rather than on it. Identity lives below, so the picture stays evidence
 * someone may need to read.
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
  const [index, setIndex] = useState(0);

  const empty = urls.length === 0;
  const height = empty
    ? insets.top + eng.nav + spacing[2]
    : Math.min(Math.round(width * 0.78), Math.round(windowHeight * 0.38));

  const onMomentumEnd = useCallback(
    (offsetX: number) => {
      const next = Math.round(offsetX / width);
      const clamped = Math.min(Math.max(next, 0), Math.max(0, urls.length - 1));
      setIndex(clamped);
      onIndexChange?.(clamped);
    },
    [onIndexChange, urls.length, width],
  );

  const openMenu = useCallback(() => {
    if (!actions || actions.length === 0 || !onAction) return;
    presentNativeMenu({ actions, onPressAction: onAction });
  }, [actions, onAction]);

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View style={{ width, height, backgroundColor: empty ? colors.background : colors.surface }}>
        {empty ? null : (
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

        <View
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
          <EngineNavButton accessibilityLabel="Back" onPress={onBack}>
            <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={1.9} />
          </EngineNavButton>

          {actions && actions.length > 0 && onAction ? (
            <EngineNavButton accessibilityLabel="More actions" onPress={openMenu}>
              <EngineGlyph
                sf="ellipsis"
                fallback={EllipsisIcon}
                size={17}
                color={colors.foreground}
                weight="semibold"
              />
            </EngineNavButton>
          ) : (
            <View style={{ width: eng.nav }} />
          )}
        </View>
      </View>

      {empty || urls.length < 2 ? null : (
        <View
          accessibilityRole="text"
          accessibilityLabel={`Photo ${index + 1} of ${urls.length}`}
          style={{
            paddingHorizontal: eng.pad,
            paddingTop: eng.inline,
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <Text variant="caption1" color="muted" style={engType.count}>
            Photo {index + 1} of {urls.length}
          </Text>
        </View>
      )}
    </View>
  );
}
