import type { ReactNode } from 'react';
import { StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ArrowLeftIcon } from '@/assets/icons';
import { useFloatingTabBarInset, useReleaseStackNavigationOnFocus, useTheme } from '@/hooks';
import { goBackOrReplace, PROFILE_SETTINGS_HUB_HREF } from '@/lib/navigation/stack-back';
import { useMoneyFormatRevision } from '@/store/money-format-store';
import { withAlpha } from '@/theme/color-utils';
import { rhythm, spacing } from '@/theme';

import { IconButton } from './icon-button';
import { ScrollEdgeChrome } from './scroll-edge-chrome';
import { Text } from './text';

type ScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Full-bleed screen background. */
export function Screen({ children, style }: ScreenProps) {
  const { colors } = useTheme();
  useMoneyFormatRevision();
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</View>;
}

type ScreenScrollProps = ScrollViewProps & {
  children: ReactNode;
  /** Reserve space for floating tab bar */
  tabBarInset?: boolean;
  /** Horizontal page padding */
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Soft edge fade under the status bar once content scrolls up.
   * Defaults on for tab hubs (`tabBarInset`), off for nested stacks.
   */
  topFade?: boolean;
  /**
   * Apple-style compact blur bar + centered title after the large title scrolls away.
   * Enables scroll tracking even when `topFade` is off.
   */
  edgeTitle?: string;
  /** Trailing control in the compact edge bar (e.g. search). */
  edgeTrailing?: ReactNode;
};

/** Scrollable screen body with consistent bottom inset + optional top scroll fade. */
export function ScreenScroll({
  children,
  tabBarInset = false,
  padded = false,
  contentStyle,
  topFade,
  edgeTitle,
  edgeTrailing,
  ...props
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  useMoneyFormatRevision();
  const { scrollBottom } = useFloatingTabBarInset();
  const fadeEnabled = topFade ?? tabBarInset;
  const trackScroll = fadeEnabled || Boolean(edgeTitle);
  const scrollY = useSharedValue(0);

  const flattenedContent = StyleSheet.flatten(contentStyle) ?? {};
  const extraBottom =
    typeof flattenedContent.paddingBottom === 'number' ? flattenedContent.paddingBottom : 0;
  const { paddingBottom: _contentPaddingBottom, ...restContentStyle } = flattenedContent;

  const paddingBottom =
    (tabBarInset
      ? scrollBottom + rhythm.tabBarBreathing
      : Math.max(insets.bottom, rhythm.stack) + rhythm.section) + extraBottom;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 10, 36], [0, 0.65, 1], Extrapolation.CLAMP),
  }));

  const fadeHeight = Math.max(insets.top + 20, 44);

  return (
    <View style={styles.scrollShell}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        style={styles.scrollView}
        {...props}
        onScroll={trackScroll ? onScroll : props.onScroll}
        contentContainerStyle={[
          {
            paddingBottom,
            ...(padded ? { paddingHorizontal: rhythm.pad } : null),
          },
          restContentStyle,
        ]}
      >
        {children}
      </Animated.ScrollView>

      {fadeEnabled ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.topFade, { height: fadeHeight }, fadeStyle]}
        >
          <LinearGradient
            colors={[
              colors.background,
              withAlpha(colors.background, 0.92),
              withAlpha(colors.background, 0.45),
              withAlpha(colors.background, 0),
            ]}
            locations={[0, 0.35, 0.72, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      {edgeTitle ? (
        <ScrollEdgeChrome title={edgeTitle} scrollY={scrollY} trailing={edgeTrailing} />
      ) : null}
    </View>
  );
}

type StackScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Gap between child blocks */
  gap?: number;
  refreshControl?: ScrollViewProps['refreshControl'];
  /** Route when stack history is empty (deep links, bell → inbox). */
  backFallbackHref?: Href;
  /** Override default back behaviour (e.g. cross-tab inbox). */
  onBack?: () => void;
  /** Trailing control in the header row (e.g. "Mark all read"). */
  headerAction?: ReactNode;
};

/** Stack sub-screen: back chevron, title, scroll body. Section cards provide horizontal inset. */
export function StackScreen({
  title,
  subtitle,
  children,
  gap = spacing[3],
  refreshControl,
  backFallbackHref = PROFILE_SETTINGS_HUB_HREF,
  onBack,
  headerAction,
}: StackScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useReleaseStackNavigationOnFocus();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    goBackOrReplace(router, backFallbackHref);
  };

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
        <IconButton
          accessibilityLabel="Back"
          variant="ghost"
          size="sm"
          onPress={handleBack}
        >
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
        {headerAction}
      </View>

      <ScreenScroll tabBarInset refreshControl={refreshControl} topFade={false}>
        <View style={{ gap }}>{children}</View>
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollShell: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 8,
  },
});
