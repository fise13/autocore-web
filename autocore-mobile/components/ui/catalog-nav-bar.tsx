import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { ArrowLeftIcon } from '@/assets/icons';
import { useMotion, useTheme } from '@/hooks';
import { tokens, spacing, rhythm } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import { IconButton } from './icon-button';
import { Text } from './text';

/** Bar height under the status bar — the standard iOS navigation row. */
export const CATALOG_NAV_BAR_ROW = tokens.control.hitTarget;

/**
 * Height a pinned catalog bar occupies, for the spacer the list puts above its
 * own content. Constant for a given device: it does not change with scrolling,
 * which is the entire point of this arrangement.
 */
export function useCatalogNavBarHeight(): number {
  const insets = useSafeAreaInsets();
  return insets.top + tokens.space.micro + CATALOG_NAV_BAR_ROW;
}

/**
 * The pinned bar of a catalog screen — back, the screen's name, one action.
 *
 * Unlike `CatalogScreenHeader`, this bar owns *only* the chrome. The large
 * title, the search field and the filters live inside the list and scroll away
 * with the rows, which is how every Apple app is built and why none of them
 * have to reflow their content while a finger is on the screen: the bar's
 * height never changes, so the list underneath is laid out exactly once.
 *
 * The two transitions are Apple's. Material and hairline appear the moment
 * anything passes under the bar, so it stops looking like it is floating over
 * the page. The name arrives later, once the large title has actually gone —
 * `catalogBarState` decides both.
 */
export function CatalogNavBar({
  title,
  material,
  inlineTitle,
  onBack,
  action,
}: {
  title: string;
  /** Content has gone under the bar. */
  material: boolean;
  /** The large title has gone under the bar; show the name here instead. */
  inlineTitle: boolean;
  onBack: () => void;
  /** Primary action for the screen (e.g. Add). */
  action?: ReactNode;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion();

  const materialProgress = useSharedValue(material ? 1 : 0);
  const titleProgress = useSharedValue(inlineTitle ? 1 : 0);

  useEffect(() => {
    const target = material ? 1 : 0;
    materialProgress.value = motion.reduced
      ? target
      : withTiming(target, { duration: motion.duration.fast, easing: motion.ease });
  }, [material, materialProgress, motion.duration.fast, motion.ease, motion.reduced]);

  useEffect(() => {
    const target = inlineTitle ? 1 : 0;
    titleProgress.value = motion.reduced
      ? target
      : withTiming(target, { duration: motion.duration.normal, easing: motion.ease });
  }, [inlineTitle, motion.duration.normal, motion.ease, motion.reduced, titleProgress]);

  const materialStyle = useAnimatedStyle(() => ({ opacity: materialProgress.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: 8 * (1 - titleProgress.value) }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
    >
      {/* Blur, then a wash of the page colour over it: glass alone lets a
          bright engine photo tint the bar as it slides under. */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
          materialStyle,
        ]}
      >
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={{ flex: 1 }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: withAlpha(colors.background, isDark ? 0.55 : 0.65),
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: tokens.control.hairline,
            backgroundColor: colors.border,
          }}
        />
      </Animated.View>

      <View
        style={{
          paddingTop: insets.top + tokens.space.micro,
          height: insets.top + tokens.space.micro + CATALOG_NAV_BAR_ROW,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: spacing[2],
          paddingRight: rhythm.pad,
        }}
      >
        <IconButton accessibilityLabel="Back" variant="ghost" size="sm" onPress={onBack}>
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>

        {/* Absolute so the name is centred on the screen rather than on
            whatever space the action leaves behind. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 64,
              right: 64,
              top: insets.top + tokens.space.micro,
              height: CATALOG_NAV_BAR_ROW,
              alignItems: 'center',
              justifyContent: 'center',
            },
            titleStyle,
          ]}
        >
          <Text variant="headline" numberOfLines={1} style={{ color: colors.foreground }}>
            {title}
          </Text>
        </Animated.View>

        {action}
      </View>
    </View>
  );
}
