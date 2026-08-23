import { forwardRef, memo, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, ChevronRightIcon, PlusIcon } from '@/assets/icons';
import { useMotion, useTheme } from '@/hooks';
import { haptics, rhythm, spacing, tokens } from '@/theme';
import { withAlpha } from '@/theme/color-utils';

import { IconButton } from './icon-button';
import { Text } from './text';

/**
 * Grouped catalog list — the long-list counterpart to `ListSection`.
 *
 * `ListSection` builds its card by wrapping children, which needs every row in
 * memory. Catalogs (engines, warehouse locations) are virtualized, so each row
 * is rendered standalone and has to draw its own slice of the card: rounded
 * corners at the ends, a hairline between neighbours. `position` is what tells
 * a row which slice it is.
 */
export type CatalogRowPosition = 'only' | 'first' | 'middle' | 'last';

export const CATALOG_CARD_RADIUS = 20;
const ROW_PAD_X = spacing[3.5];
const DIVIDER_HEIGHT = 1;

export function catalogRowPosition(index: number, total: number): CatalogRowPosition {
  if (total <= 1) return 'only';
  if (index === 0) return 'first';
  if (index === total - 1) return 'last';
  return 'middle';
}

/**
 * Group heading — sits outside the card so the card reads as one object.
 *
 * `kicker` carries the qualifier a person says first and files under second
 * ("Toyota" before "2AZ-FE"); `title` is the name the group is filed by, and
 * `meta` the count, right-aligned and quiet.
 */
export function CatalogSectionHeader({
  title,
  meta,
  kicker,
}: {
  title: string;
  meta?: string;
  kicker?: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing[3],
        marginHorizontal: rhythm.pad + spacing[1],
        marginTop: spacing[6],
        marginBottom: spacing[2],
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        {kicker ? (
          <Text
            variant="caption1"
            color="muted"
            numberOfLines={1}
            style={{ fontWeight: '500' }}
          >
            {kicker}
          </Text>
        ) : null}
        <Text variant="headline" numberOfLines={1} style={{ color: colors.foreground }}>
          {title}
        </Text>
      </View>
      {meta ? (
        <Text variant="footnote" color="muted" numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

export type CatalogRowProps = {
  position: CatalogRowPosition;
  title: string;
  /** Serials, bin codes — anything a person reads off a label. */
  monoTitle?: boolean;
  subtitle?: ReactNode;
  /** Right-aligned quiet label (type, count). Ignored when `trailing` is set. */
  value?: string;
  /** Right-aligned node (quality chip). Wins over `value`. */
  trailing?: ReactNode;
  /** Thumbnail or glyph. `leadingWidth` keeps the divider aligned to the text. */
  leading?: ReactNode;
  leadingWidth?: number;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress?: () => void;
  /** Hide the live row while the lift-menu clone is on screen. */
  lifted?: boolean;
  /** Inner row only — IosLiftMenu already draws the card. */
  preview?: boolean;
};

export const CatalogRow = memo(
  forwardRef<View, CatalogRowProps>(function CatalogRow(
    {
      position,
      title,
      monoTitle = false,
      subtitle,
      value,
      trailing,
      leading,
      leadingWidth = 0,
      accessibilityLabel,
      onPress,
      onLongPress,
      lifted = false,
      preview = false,
    },
    ref,
  ) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const press = useSharedValue(0);
  const pressedFill = withAlpha(colors.muted, isDark ? 0.55 : 0.85);

  // Press feedback lives on an inner Animated.View, not on `Pressable`'s
  // function-form `style` — that form is silently dropped by this RN version
  // (the returned layout never lands), which is why `CollectionRow` is built
  // the same way.
  const pressStyle = useAnimatedStyle(() => {
    if (motion.reduced) {
      return { backgroundColor: press.value > 0.5 ? pressedFill : 'transparent' };
    }
    return {
      backgroundColor: interpolateColor(press.value, [0, 1], ['transparent', pressedFill]),
    };
  });

  const setPressed = (next: number) => {
    press.value = withTiming(next, { duration: motion.reduced ? 80 : motion.duration.fast });
  };

  const roundTop = preview || position === 'first' || position === 'only';
  const roundBottom = preview || position === 'last' || position === 'only';
  const showDivider = !preview && (position === 'middle' || position === 'last');
  const dividerInset = ROW_PAD_X + (leadingWidth > 0 ? leadingWidth + spacing[3] : 0);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        marginHorizontal: preview ? 0 : rhythm.pad,
        backgroundColor: preview ? 'transparent' : colors.card,
        borderTopLeftRadius: roundTop ? CATALOG_CARD_RADIUS : 0,
        borderTopRightRadius: roundTop ? CATALOG_CARD_RADIUS : 0,
        borderBottomLeftRadius: roundBottom ? CATALOG_CARD_RADIUS : 0,
        borderBottomRightRadius: roundBottom ? CATALOG_CARD_RADIUS : 0,
        overflow: 'hidden',
        opacity: lifted ? 0 : 1,
      }}
    >
      {showDivider ? (
        <View
          style={{
            height: DIVIDER_HEIGHT,
            marginLeft: dividerInset,
            backgroundColor: colors.border,
          }}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        delayLongPress={Platform.OS === 'ios' ? 380 : 450}
        onPressIn={() => setPressed(1)}
        onPressOut={() => setPressed(0)}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        onLongPress={onLongPress}
      >
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
              paddingHorizontal: ROW_PAD_X,
              paddingVertical: leading ? spacing[2.5] : spacing[3],
              minHeight: leading ? 76 : 58,
            },
            pressStyle,
          ]}
        >
          {leading}

          <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
            <Text
              variant={monoTitle ? 'identifier' : 'callout'}
              numberOfLines={1}
              style={{ color: colors.foreground }}
            >
              {title}
            </Text>
            {subtitle}
          </View>

          {trailing ? (
            <View style={{ flexShrink: 0 }}>{trailing}</View>
          ) : value ? (
            <Text variant="footnote" color="muted" numberOfLines={1}>
              {value}
            </Text>
          ) : null}

          {preview ? null : (
            <ChevronRightIcon
              size="sm"
              color={withAlpha(colors.mutedForeground, isDark ? 0.4 : 0.45)}
              strokeWidth={1.75}
            />
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
  }),
);
CatalogRow.displayName = 'CatalogRow';

/**
 * Fixed header for a catalog screen.
 *
 * A navigation row that always holds the back affordance and the screen's one
 * primary action, a large title under it, and a filter field that stays put —
 * on a 250-row catalog, search you have to scroll back to find is search you
 * do not use.
 *
 * `collapsed` is the Apple navigation-bar move: once the list has scrolled the
 * large title condenses into the nav row and a hairline appears, so the field
 * and the filter keep their place while the page title stops taking a third of
 * the screen. Screens that do not track scroll simply never set it.
 */
export function CatalogScreenHeader({
  title,
  subtitle,
  onBack,
  search,
  action,
  collapsed = false,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  search?: ReactNode;
  /** Primary action for the screen (e.g. Add), pinned in the navigation row. */
  action?: ReactNode;
  /** Condense the large title — drive it from the list's scroll offset. */
  collapsed?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const progress = useSharedValue(collapsed ? 1 : 0);
  // Measured from the natural (unanimated) inner block, so Dynamic Type sets
  // the travel instead of a hardcoded height that clips at larger sizes.
  const [titleHeight, setTitleHeight] = useState(0);

  useEffect(() => {
    const target = collapsed ? 1 : 0;
    progress.value = motion.reduced
      ? target
      : withTiming(target, { duration: motion.duration.normal, easing: motion.ease });
  }, [collapsed, motion.duration.normal, motion.ease, motion.reduced, progress]);

  const largeStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -6 * progress.value }],
    ...(titleHeight > 0 ? { height: titleHeight * (1 - progress.value) } : null),
  }));

  const inlineStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const hairlineStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View style={{ paddingTop: insets.top + tokens.space.micro, backgroundColor: colors.background }}>
      <View
        style={{
          height: tokens.control.hitTarget,
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

        {/* Absolute so the condensed title is centred on the screen rather than
            on whatever space the action leaves behind. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 64,
              right: 64,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            },
            inlineStyle,
          ]}
        >
          <Text variant="headline" numberOfLines={1} style={{ color: colors.foreground }}>
            {title}
          </Text>
        </Animated.View>

        {action}
      </View>

      <Animated.View style={[{ overflow: 'hidden' }, largeStyle]}>
        <View
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.height);
            setTitleHeight((current) => (Math.abs(current - next) < 1 ? current : next));
          }}
          style={{ paddingHorizontal: rhythm.pad, paddingTop: spacing[1], gap: 2 }}
        >
          <Text
            variant="displayTitle"
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={{ color: colors.foreground }}
          >
            {title}
          </Text>
          <Text variant="subheadline" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Animated.View>

      {search ? (
        <View
          style={{
            paddingHorizontal: rhythm.pad,
            paddingTop: spacing[3],
            paddingBottom: spacing[2.5],
          }}
        >
          {search}
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          { height: tokens.control.hairline, backgroundColor: colors.border },
          hairlineStyle,
        ]}
      />
    </View>
  );
}

/**
 * Accent pill for `CatalogScreenHeader`'s action slot — the same affordance
 * Finance uses to open its composer, so "add one of these" looks and behaves
 * identically wherever a catalog offers it.
 */
export function CatalogAddButton({
  label = 'Add',
  accessibilityLabel,
  onPress,
  disabled = false,
  loading = false,
}: {
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
  /** Dimmed and inert — the thing it would add is not ready yet. */
  disabled?: boolean;
  /** Mid-commit: spinner replaces the glyph, press is refused. */
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);
  const inert = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      hitSlop={6}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      // Static object, not the `({ pressed }) => …` form — this RN version
      // drops the function style silently, as `CatalogRow` above notes.
      style={{
        minHeight: tokens.control.hitTarget,
        paddingHorizontal: 14,
        borderRadius: tokens.radius.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: colors.primary,
        opacity: inert ? tokens.opacity.disabled : pressed ? 0.85 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primaryForeground} />
      ) : (
        <PlusIcon size={17} color={colors.primaryForeground} strokeWidth={2.5} />
      )}
      <Text
        variant="button"
        maxFontSizeMultiplier={1.2}
        style={{ color: colors.primaryForeground, fontWeight: '600' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
