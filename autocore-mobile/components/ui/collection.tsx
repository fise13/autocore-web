import { Children, Fragment, memo, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { CheckIcon, ChevronRightIcon } from '@/assets/icons';
import { useMotion, useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { withAlpha } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

import { Switch } from './switch';
import { Text } from './text';

type CollectionListProps = {
  children: ReactNode;
  style?: ViewStyle;
};

const ROW_PAD_X = tokens.space.stack + 2;
const ICON_SLOT = 20;
/** Inset after leading icon column so hairlines start at the label. */
const DIVIDER_INSET = ROW_PAD_X + ICON_SLOT + tokens.space.stack;

const pressTiming = {
  duration: 140,
  easing: Easing.out(Easing.cubic),
};

/** Grouped collection container — Claude/Notion inset islands. */
export function ListSection({
  title,
  children,
  style,
  footer,
  /** When false, no horizontal page inset (use inside Sheet / already-padded parents). */
  inset = true,
}: {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  style?: ViewStyle;
  inset?: boolean;
}) {
  const { colors } = useTheme();
  const side = inset ? tokens.space.screenX : 0;
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={[{ marginBottom: inset ? tokens.space.section : 0 }, style]}>
      {title ? (
        <Text
          variant="sectionLabel"
          color="muted"
          style={{
            marginBottom: tokens.space.inline + 2,
            marginHorizontal: side + tokens.space.stack,
          }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          marginHorizontal: side,
          backgroundColor: colors.card,
          borderRadius: tokens.radius.group,
          overflow: 'hidden',
        }}
      >
        {items.map((child, index) => (
          <Fragment key={(child as { key?: string | null }).key ?? `row-${index}`}>
            {index > 0 ? (
              <View
                style={{
                  height: tokens.control.hairline,
                  backgroundColor: colors.border,
                  marginLeft: DIVIDER_INSET,
                  opacity: 0.65,
                }}
              />
            ) : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text
          variant="caption1"
          color="muted"
          style={{
            marginTop: tokens.space.inline,
            marginHorizontal: side + tokens.space.stack,
            letterSpacing: -0.05,
          }}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function CollectionList({ children, style }: CollectionListProps) {
  return <View style={[{ gap: 0 }, style]}>{children}</View>;
}

export type CollectionRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
  /** Leading selection check affordance */
  selectable?: boolean;
};

/**
 * Interactive collection row.
 * Press feedback only — no enter/layout springs (those cause list jump).
 */
export const CollectionRow = memo(function CollectionRow({
  title,
  subtitle,
  value,
  icon: Icon,
  tone = 'default',
  showChevron = true,
  selected = false,
  disabled = false,
  onPress,
  trailing,
  selectable = false,
}: CollectionRowProps) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const press = useSharedValue(0);
  const isDanger = tone === 'danger';
  const interactive = Boolean(onPress) && !disabled;
  const chevron = showChevron && interactive && !selectable;
  const iconColor = isDanger
    ? colors.destructive
    : withAlpha(colors.mutedForeground, isDark ? 0.72 : 0.78);
  const chevronColor = withAlpha(colors.mutedForeground, isDark ? 0.4 : 0.45);
  const pressedFill = isDark ? withAlpha(colors.muted, 0.55) : withAlpha(colors.muted, 0.85);

  const pressStyle = useAnimatedStyle(() => {
    if (motion.reduced) {
      return {
        backgroundColor: press.value > 0.5 ? pressedFill : 'transparent',
      };
    }
    return {
      backgroundColor: interpolateColor(press.value, [0, 1], ['transparent', pressedFill]),
      opacity: interpolate(press.value, [0, 1], [1, 0.96]),
    };
  });

  const setPressed = (next: number) => {
    if (motion.reduced) {
      press.value = withTiming(next, { duration: 80 });
      return;
    }
    press.value = withTiming(next, pressTiming);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      disabled={!interactive}
      onPressIn={() => {
        if (!interactive) return;
        setPressed(1);
      }}
      onPressOut={() => setPressed(0)}
      onPress={() => {
        if (!onPress || disabled) return;
        haptics.selection();
        onPress();
      }}
      style={{ minHeight: tokens.control.hitTarget }}
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space.stack,
            paddingHorizontal: ROW_PAD_X,
            paddingVertical: 13,
            minHeight: 52,
            opacity: disabled ? tokens.opacity.disabled : 1,
          },
          pressStyle,
        ]}
      >
        {selectable ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 1.5,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected ? <CheckIcon size="xs" color={colors.primaryForeground} strokeWidth={2.4} /> : null}
          </View>
        ) : null}

        {Icon ? (
          <View style={{ width: ICON_SLOT, height: ICON_SLOT, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size="lg" color={iconColor} strokeWidth={1.5} />
          </View>
        ) : null}

        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text
            variant="body"
            numberOfLines={1}
            style={{
              fontSize: 16,
              lineHeight: 21,
              fontWeight: '400',
              letterSpacing: -0.24,
              color: isDanger ? colors.destructive : colors.foreground,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              variant="footnote"
              color="muted"
              numberOfLines={2}
              style={{ fontSize: 13, lineHeight: 17, letterSpacing: -0.08 }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {value ? (
          <Text
            variant="footnote"
            color="muted"
            numberOfLines={1}
            style={{ fontSize: 15, lineHeight: 20, letterSpacing: -0.12, fontWeight: '400' }}
          >
            {value}
          </Text>
        ) : null}

        {trailing}

        {chevron ? <ChevronRightIcon size="sm" color={chevronColor} strokeWidth={1.75} /> : null}
      </Animated.View>
    </Pressable>
  );
});

export type CollectionSwitchRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: CollectionRowProps['icon'];
};

/** Settings toggle row — same island rhythm as CollectionRow (no enter motion). */
export const CollectionSwitchRow = memo(function CollectionSwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  icon: Icon,
}: CollectionSwitchRowProps) {
  const { colors, isDark } = useTheme();
  const iconColor = withAlpha(colors.mutedForeground, isDark ? 0.72 : 0.78);

  return (
    <View
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.stack,
        paddingHorizontal: ROW_PAD_X,
        paddingVertical: 13,
        minHeight: 52,
        opacity: disabled ? tokens.opacity.disabled : 1,
      }}
    >
      {Icon ? (
        <View style={{ width: ICON_SLOT, height: ICON_SLOT, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size="lg" color={iconColor} strokeWidth={1.5} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text
          variant="body"
          numberOfLines={1}
          style={{
            fontSize: 16,
            lineHeight: 21,
            fontWeight: '400',
            letterSpacing: -0.24,
            color: colors.foreground,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="footnote"
            color="muted"
            numberOfLines={2}
            style={{ fontSize: 13, lineHeight: 17, letterSpacing: -0.08 }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onValueChange} />
    </View>
  );
});

type SwipeAction = {
  label: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

/**
 * Lightweight swipe-to-reveal actions.
 * Uses horizontal pan; keep actions to 1–2 for clarity.
 */
export function SwipeableRow({
  children,
  rightActions = [],
}: {
  children: ReactNode;
  rightActions?: SwipeAction[];
}) {
  const { colors } = useTheme();
  const motion = useMotion();
  const tx = useSharedValue(0);
  const openWidth = rightActions.length * 76;

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      const next = Math.min(0, Math.max(-openWidth, event.translationX));
      tx.value = next;
    })
    .onEnd((event) => {
      const shouldOpen = event.translationX < -openWidth / 3 || event.velocityX < -500;
      tx.value = withSpring(shouldOpen ? -openWidth : 0, {
        damping: motion.springs.list.damping,
        stiffness: motion.springs.list.stiffness,
        mass: motion.springs.list.mass,
      });
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  if (rightActions.length === 0) {
    return <>{children}</>;
  }

  return (
    <View style={{ overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          flexDirection: 'row',
        }}
      >
        {rightActions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => {
              haptics.medium();
              tx.value = withSpring(0, {
                damping: motion.springs.list.damping,
                stiffness: motion.springs.list.stiffness,
                mass: motion.springs.list.mass,
              });
              action.onPress();
            }}
            style={{
              width: 76,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: action.tone === 'danger' ? colors.destructive : colors.secondary,
              paddingHorizontal: 8,
            }}
          >
            <Text
              variant="caption1"
              style={{
                color:
                  action.tone === 'danger' ? colors.destructiveForeground : colors.foreground,
                textAlign: 'center',
                fontWeight: '600',
              }}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: colors.card }, style]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
