import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { ScanSearchIcon, SearchIcon, XIcon } from '@/assets/icons';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase } from '@/theme/motion';
import { haptics } from '@/theme';

import { searchSpring, searchTimeline, useSearchEnter } from '../animation';
import { searchLayout } from '../layout';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function SearchBar({
  value,
  onChangeText,
  onFocus,
  onBlur,
}: SearchBarProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const focused = useSharedValue(0);
  const enterStyle = useSearchEnter({ delay: searchTimeline.searchBar, scaleFrom: 0.98, duration: 360 });

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focused.value * 0.018 }],
    borderColor: interpolateColor(focused.value, [0, 1], [colors.border, colors.primary]),
  }));

  const onFocusChange = (isFocused: boolean) => {
    if (reduced) {
      focused.value = isFocused ? 1 : 0;
      return;
    }
    focused.value = withSpring(isFocused ? 1 : 0, searchSpring.focus);
  };

  return (
    <Animated.View style={[{ paddingHorizontal: searchLayout.pad }, enterStyle]}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: searchLayout.searchHeight,
            borderRadius: searchLayout.radius,
            borderWidth: searchLayout.hairline,
            backgroundColor: colors.card,
            paddingLeft: 14,
            paddingRight: 8,
            gap: 8,
          },
          shellStyle,
        ]}
      >
        <SearchIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Поиск по VIN, двигателю, клиенту…"
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => {
            onFocusChange(true);
            onFocus?.();
          }}
          onBlur={() => {
            onFocusChange(false);
            onBlur?.();
          }}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            flex: 1,
            fontSize: 16,
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
              backgroundColor: colors.secondary,
            }}
          >
            <XIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Сканировать QR"
          onPress={() => {
            haptics.light();
            router.navigate('/(tabs)/scan');
          }}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            backgroundColor: colors.primary,
          }}
        >
          <ScanSearchIcon size="sm" color={colors.primaryForeground} strokeWidth={2} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
