import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/assets/icons';
import { useFloatingTabBarInset, useReleaseStackNavigationOnFocus, useTheme } from '@/hooks';
import { rhythm, spacing } from '@/theme';

import { IconButton } from './icon-button';
import { Text } from './text';

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Full-bleed screen background. */
export function Screen({ children, style }: ScreenProps) {
  const { colors } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</View>;
}

type ScreenScrollProps = ScrollViewProps & {
  children: ReactNode;
  /** Reserve space for floating tab bar */
  tabBarInset?: boolean;
  /** Horizontal page padding */
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Scrollable screen body with consistent bottom inset. */
export function ScreenScroll({
  children,
  tabBarInset = false,
  padded = false,
  contentStyle,
  ...props
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();
  const { scrollBottom } = useFloatingTabBarInset();
  const flattenedContent = StyleSheet.flatten(contentStyle) ?? {};
  const extraBottom =
    typeof flattenedContent.paddingBottom === 'number' ? flattenedContent.paddingBottom : 0;
  const { paddingBottom: _contentPaddingBottom, ...restContentStyle } = flattenedContent;

  const paddingBottom =
    (tabBarInset
      ? scrollBottom + rhythm.tabBarBreathing
      : Math.max(insets.bottom, rhythm.stack) + rhythm.section) + extraBottom;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...props}
      contentContainerStyle={[
        {
          paddingBottom,
          ...(padded ? { paddingHorizontal: rhythm.pad } : null),
        },
        restContentStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

type StackScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Gap between child blocks */
  gap?: number;
};

/** Stack sub-screen: back chevron, title, scroll body. Section cards provide horizontal inset. */
export function StackScreen({ title, subtitle, children, gap = spacing[3] }: StackScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useReleaseStackNavigationOnFocus();

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + rhythm.headerTop,
          paddingHorizontal: rhythm.pad,
          paddingBottom: rhythm.headerBottom,
          flexDirection: 'row',
          alignItems: 'center',
          gap: rhythm.inline,
        }}
      >
        <IconButton accessibilityLabel="Назад" variant="ghost" size="sm" onPress={() => router.back()}>
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            variant="heading"
            style={{ fontSize: 17, fontWeight: '600', lineHeight: 22, color: colors.foreground }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              variant="caption"
              style={{ fontSize: 12, lineHeight: 16, color: colors.mutedForeground }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <ScreenScroll>
        <View style={{ gap }}>{children}</View>
      </ScreenScroll>
    </Screen>
  );
}
