import { memo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
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
 * `title` carries the name, `meta` the count, right-aligned and quiet.
 */
export function CatalogSectionHeader({ title, meta }: { title: string; meta?: string }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing[3],
        marginHorizontal: rhythm.pad + spacing[1],
        marginTop: spacing[6],
        marginBottom: spacing[2],
      }}
    >
      <Text
        variant="headline"
        numberOfLines={1}
        style={{ flex: 1, color: colors.foreground }}
      >
        {title}
      </Text>
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
  /** Right-aligned quiet label (type, count). */
  value?: string;
  /** Thumbnail or glyph. `leadingWidth` keeps the divider aligned to the text. */
  leading?: ReactNode;
  leadingWidth?: number;
  accessibilityLabel: string;
  onPress: () => void;
};

export const CatalogRow = memo(function CatalogRow({
  position,
  title,
  monoTitle = false,
  subtitle,
  value,
  leading,
  leadingWidth = 0,
  accessibilityLabel,
  onPress,
}: CatalogRowProps) {
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

  const roundTop = position === 'first' || position === 'only';
  const roundBottom = position === 'last' || position === 'only';
  const showDivider = position === 'middle' || position === 'last';
  const dividerInset = ROW_PAD_X + (leadingWidth > 0 ? leadingWidth + spacing[3] : 0);

  return (
    <View
      style={{
        marginHorizontal: rhythm.pad,
        backgroundColor: colors.card,
        borderTopLeftRadius: roundTop ? CATALOG_CARD_RADIUS : 0,
        borderTopRightRadius: roundTop ? CATALOG_CARD_RADIUS : 0,
        borderBottomLeftRadius: roundBottom ? CATALOG_CARD_RADIUS : 0,
        borderBottomRightRadius: roundBottom ? CATALOG_CARD_RADIUS : 0,
        overflow: 'hidden',
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
        onPressIn={() => setPressed(1)}
        onPressOut={() => setPressed(0)}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
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

          {value ? (
            <Text variant="footnote" color="muted" numberOfLines={1}>
              {value}
            </Text>
          ) : null}

          <ChevronRightIcon
            size="sm"
            color={withAlpha(colors.mutedForeground, isDark ? 0.4 : 0.45)}
            strokeWidth={1.75}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
});

/**
 * Fixed header for a catalog screen: back affordance, large title, count, and
 * a filter field that stays put — on a 250-row catalog, search you have to
 * scroll back to find is search you do not use.
 */
export function CatalogScreenHeader({
  title,
  subtitle,
  onBack,
  search,
  action,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  search?: ReactNode;
  /** Primary action beside the title (e.g. Add), as on the Finance header. */
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + tokens.space.micro }}>
      <View style={{ paddingHorizontal: spacing[2], paddingBottom: tokens.space.micro }}>
        <IconButton accessibilityLabel="Back" variant="ghost" size="sm" onPress={onBack}>
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>
      </View>

      <View
        style={{
          paddingHorizontal: rhythm.pad,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: tokens.space.stack,
        }}
      >
        {/* The title column shrinks so a long catalog name ellipsizes rather
            than pushing the action off the screen. */}
        <View style={{ flex: 1, gap: spacing[1] }}>
          <Text variant="displayTitle" numberOfLines={1} style={{ color: colors.foreground }}>
            {title}
          </Text>
          <Text variant="subheadline" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {action}
      </View>

      {search ? (
        <View style={{ paddingHorizontal: rhythm.pad, paddingTop: spacing[3] }}>{search}</View>
      ) : null}
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
}: {
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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
        opacity: pressed ? 0.85 : 1,
      }}
    >
      <PlusIcon size={17} color={colors.primaryForeground} strokeWidth={2.5} />
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
