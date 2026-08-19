import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ScanSearchIcon, SearchIcon, XIcon } from '@/assets/icons';
import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { EngineGlyph } from './engine-glyph';
import { eng } from '../layout';

/**
 * Yard search — find a serial, a motor code, a shelf, or a quality.
 *
 * A ruled field on the canvas, with the scanner beside it rather than inside
 * it: on the lot you point the camera, you don't type, and a capture button
 * hiding inside a text field is a button nobody finds.
 */
export function EngineYardSearch({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { colors } = useTheme();
  const motion = useMotion();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const focused = useSharedValue(0);

  const restBorder = colors.border;
  const focusBorder = colors.foreground;

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], [restBorder, focusBorder]),
  }));

  const setFocused = (next: boolean) => {
    focused.value = motion.reduced
      ? next
        ? 1
        : 0
      : withTiming(next ? 1 : 0, { duration: motion.duration.normal, easing: motion.ease });
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: eng.inline }}>
      <Animated.View
        style={[
          {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            height: eng.control,
            borderRadius: eng.radius,
            borderWidth: eng.rule,
            backgroundColor: colors.card,
            paddingLeft: 12,
            paddingRight: 6,
            gap: 8,
          },
          fieldStyle,
        ]}
      >
        <EngineGlyph
          sf="magnifyingglass"
          fallback={SearchIcon}
          size={15}
          color={colors.mutedForeground}
          weight="medium"
        />

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Serial, motor, shelf, quality"
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel="Find an engine"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          returnKeyType="search"
          clearButtonMode="never"
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 21,
            letterSpacing: -0.2,
            color: colors.foreground,
            paddingVertical: 0,
          }}
        />

        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
            onPress={() => {
              haptics.selection();
              onChangeText('');
              inputRef.current?.focus();
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: eng.radius,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EngineGlyph
              sf="xmark"
              fallback={XIcon}
              size={13}
              color={colors.mutedForeground}
              weight="medium"
            />
          </Pressable>
        ) : null}
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan a serial"
        hitSlop={6}
        onPress={() => {
          haptics.light();
          router.navigate('/(tabs)/scan');
        }}
        style={{
          width: eng.control,
          height: eng.control,
          borderRadius: eng.radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.foreground,
        }}
      >
        <EngineGlyph
          sf="barcode.viewfinder"
          fallback={ScanSearchIcon}
          size={18}
          color={colors.background}
          weight="medium"
        />
      </Pressable>
    </View>
  );
}
