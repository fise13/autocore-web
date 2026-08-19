import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, tokens } from '@/theme';

import { eng, engFontCap, engType } from '../layout';

type ToneChrome = {
  bg: string;
  fg: string;
  border: string;
  solid: string;
  onSolid: string;
};

export function engineFrameStyle(colors: { card: string; border: string }): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderWidth: eng.rule,
    borderColor: colors.border,
    borderRadius: eng.cardRadius,
    overflow: 'hidden',
  };
}

/**
 * Pastel status / quality tag — the only colour on the page besides photos.
 * Pill is reserved for these chips; large containers stay 8–12px.
 */
export function EngineTag({
  label,
  chrome,
  compact = false,
  selected = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  chrome: ToneChrome;
  compact?: boolean;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const fill = selected ? chrome.solid : chrome.bg;
  const ink = selected ? chrome.onSolid : chrome.fg;
  const name = accessibilityLabel ?? label;

  const body = (
    <View
      style={{
        minHeight: compact ? 20 : eng.tag,
        paddingHorizontal: compact ? 7 : 9,
        paddingVertical: compact ? 2 : 3,
        borderRadius: eng.pillRadius,
        backgroundColor: fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant="caption2"
        maxFontSizeMultiplier={engFontCap.control}
        numberOfLines={1}
        style={{
          ...engType.tag,
          color: ink,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={name}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      hitSlop={6}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      {body}
    </Pressable>
  );
}

/** Charcoal primary — Sell, Add, scan. Not Autocore blue. */
export function EngineInkButton({
  label,
  onPress,
  loading = false,
  flex = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  flex?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy: loading }}
      disabled={loading}
      hitSlop={4}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={{
        flex: flex ? 1 : undefined,
        minHeight: eng.ink,
        paddingHorizontal: 16,
        borderRadius: eng.radius,
        backgroundColor: colors.foreground,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? tokens.opacity.pressed : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.background} />
      ) : (
        <Text
          variant="headline"
          maxFontSizeMultiplier={engFontCap.control}
          numberOfLines={1}
          style={{ color: colors.background, fontWeight: '600' }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Hairline secondary — Relocate, Add to order. */
export function EngineLineButton({
  label,
  onPress,
  loading = false,
  flex = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  flex?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy: loading }}
      disabled={loading}
      hitSlop={4}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={{
        flex: flex ? 1 : undefined,
        minHeight: eng.ink,
        paddingHorizontal: 14,
        borderRadius: eng.radius,
        borderWidth: eng.rule,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.muted : colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.foreground} />
      ) : (
        <Text
          variant="headline"
          maxFontSizeMultiplier={engFontCap.control}
          numberOfLines={1}
          style={{ color: colors.foreground, fontWeight: '600' }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Compact charcoal Add in the catalog navigation row. */
export function EngineAddControl({
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
      style={{
        minHeight: eng.nav,
        paddingHorizontal: 14,
        borderRadius: eng.radius,
        backgroundColor: colors.foreground,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? tokens.opacity.pressed : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }}
    >
      <Text
        variant="headline"
        maxFontSizeMultiplier={engFontCap.control}
        numberOfLines={1}
        style={{ color: colors.background, fontWeight: '600' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Square nav chrome on a photo or a canvas. */
export function EngineNavButton({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
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
      onPress={onPress}
      style={{
        width: eng.nav,
        height: eng.nav,
        borderRadius: eng.radius,
        borderWidth: eng.rule,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? tokens.opacity.pressed : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }}
    >
      {children}
    </Pressable>
  );
}
