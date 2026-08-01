import { type RefObject, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ScanSearchIcon, SearchIcon, XIcon } from '@/assets/icons';
import { useReducedMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { autocoreEase, duration } from '@/theme/motion';

import { searchTimeline, useSearchEnter } from '../animation';
import { searchLayout } from '../layout';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  inputRef?: RefObject<TextInput | null>;
};

export function SearchBar({
  value,
  onChangeText,
  onFocus,
  onBlur,
  onSubmit,
  inputRef: externalRef,
}: SearchBarProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const router = useRouter();
  const internalRef = useRef<TextInput>(null);
  const inputRef = externalRef ?? internalRef;
  const focused = useSharedValue(0);
  const enterStyle = useSearchEnter({ delay: searchTimeline.searchBar, translateY: 6, scaleFrom: 0.99, duration: 240 });
  const focusedBorderColor = toneBackground(colors.primary, 0.26);
  const clearButtonColor = toneBackground(colors.foreground, 0.05);
  const scanButtonColor = toneBackground(colors.primary, 0.1);

  const shellStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], [colors.border, focusedBorderColor]),
    backgroundColor: interpolateColor(focused.value, [0, 1], [colors.card, colors.card]),
  }));

  const onFocusChange = (isFocused: boolean) => {
    focused.value = reduced
      ? isFocused
        ? 1
        : 0
      : withTiming(isFocused ? 1 : 0, { duration: duration.normal, easing: autocoreEase });
  };

  return (
    <Reanimated.View style={enterStyle}>
      <Reanimated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: searchLayout.searchHeight,
            borderRadius: 18,
            borderWidth: searchLayout.hairline,
            paddingLeft: 12,
            paddingRight: 8,
            gap: 8,
          },
          shellStyle,
        ]}
      >
        <SearchIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Search"
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => {
            onFocusChange(true);
            onFocus?.();
          }}
          onBlur={() => {
            onFocusChange(false);
            onBlur?.();
          }}
          onSubmitEditing={onSubmit}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="never"
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 20,
            fontWeight: '500',
            color: colors.foreground,
            paddingVertical: 0,
          }}
        />

        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear"
            onPress={() => {
              haptics.selection();
              onChangeText('');
              inputRef.current?.focus();
            }}
            hitSlop={8}
            style={{
              width: 28,
              height: 28,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              backgroundColor: clearButtonColor,
            }}
          >
            <XIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan code"
          onPress={() => {
            haptics.light();
            router.navigate('/(tabs)/scan');
          }}
          hitSlop={4}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            backgroundColor: scanButtonColor,
          }}
        >
          <ScanSearchIcon size="sm" color={colors.primary} strokeWidth={2} />
        </Pressable>
      </Reanimated.View>
    </Reanimated.View>
  );
}
