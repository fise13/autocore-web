import { memo, useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { AUTOCOMPLETE_ROW_HEIGHT } from '@/lib/autocomplete/constants';
import { formatAutocompleteOption } from '@/lib/autocomplete/format-option';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { autocoreEase, haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { HighlightedText } from './highlighted-text';

type InlineAutocompleteRowProps = {
  option: AutocompleteOption;
  query: string;
  highlighted: boolean;
  isLast?: boolean;
  onPress: () => void;
};

export const InlineAutocompleteRow = memo(function InlineAutocompleteRow({
  option,
  query,
  highlighted,
  isLast = false,
  onPress,
}: InlineAutocompleteRowProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);
  const { primary, secondary } = formatAutocompleteOption(option);

  const title = option.meta?.title?.trim() || primary;
  const manufacturer = option.meta?.manufacturer?.trim();
  const generation = option.meta?.generation?.trim() || secondary;
  const badge = option.meta?.badge;
  const thumbnailUrl = option.meta?.thumbnailUrl;
  const metaLine = [manufacturer, generation].filter(Boolean).join(' · ');
  const highlightBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  useEffect(() => {
    scale.value = highlighted
      ? withTiming(1, { duration: 80, easing: autocoreEase })
      : withTiming(1, { duration: 80, easing: autocoreEase });
  }, [highlighted, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <>
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: highlighted }}
          onPressIn={() => {
            scale.value = withSpring(0.98, { damping: 18, stiffness: 420 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 16, stiffness: 320 });
          }}
          onPress={() => {
            haptics.selection();
            onPress();
          }}
          style={({ pressed }) => ({
            minHeight: AUTOCOMPLETE_ROW_HEIGHT,
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: highlighted || pressed ? highlightBg : 'transparent',
          })}
        >
          <View style={styles.row}>
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={[styles.thumb, { backgroundColor: colors.muted }]}
              />
            ) : null}

            <View style={styles.copy}>
              <HighlightedText
                text={title}
                query={query}
                ranges={option.meta?.matchRanges}
                numberOfLines={1}
                style={{
                  fontSize: 16,
                  lineHeight: 21,
                  fontWeight: '600',
                  letterSpacing: -0.3,
                  color: colors.foreground,
                }}
                highlightStyle={{
                  color: colors.primary,
                  fontWeight: '700',
                }}
              />
              {metaLine ? (
                <Text
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    lineHeight: 17,
                    color: colors.mutedForeground,
                    marginTop: 2,
                  }}
                >
                  {metaLine}
                </Text>
              ) : null}
            </View>

            {badge ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: toneBackground(colors.primary, 0.12),
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: colors.primary,
                  }}
                >
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
      {!isLast ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            marginLeft: thumbnailUrl ? 64 : 16,
            backgroundColor: colors.borderMuted,
          }}
        />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
});
