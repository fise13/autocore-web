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

  const shellStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], [colors.border, colors.primary]),
    backgroundColor: interpolateColor(focused.value, [0, 1], [colors.background, colors.surfaceElevated]),
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
            borderRadius: searchLayout.radius + 2,
            borderWidth: searchLayout.hairline,
            paddingLeft: 14,
            paddingRight: 6,
            gap: 8,
          },
          shellStyle,
        ]}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <SearchIcon size="sm" color={colors.primary} strokeWidth={2} />
        </View>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Артикул, VIN, клиент, наряд…"
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
            accessibilityLabel="Очистить"
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
              backgroundColor: colors.sidebarAccent,
            }}
          >
            <XIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Сканировать код"
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
            borderRadius: 10,
            backgroundColor: toneBackground(colors.primary, 0.12),
          }}
        >
          <ScanSearchIcon size="sm" color={colors.primary} strokeWidth={2} />
        </Pressable>
      </Reanimated.View>
    </Reanimated.View>
  );
}
