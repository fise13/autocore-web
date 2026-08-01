import { Pressable, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { autocoreEase, duration, haptics } from '@/theme';

import { scanLayout } from '../layout';

export function ScanSheetTitle({ children }: { children: string }) {
  return (
    <Text
      variant="heading"
      style={{
        fontSize: scanLayout.sheetTitleSize,
        fontWeight: '700',
        letterSpacing: -0.45,
        lineHeight: 28,
      }}
    >
      {children}
    </Text>
  );
}

export function ScanSheetMeta({ children }: { children: React.ReactNode }) {
  return (
    <Text
      variant="caption"
      color="muted"
      style={{ fontSize: scanLayout.sheetMetaSize, lineHeight: 20 }}
    >
      {children}
    </Text>
  );
}

export function ScanSheetHeader({
  title,
  meta,
}: {
  title: string;
  meta?: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? undefined
    : FadeInUp.duration(duration.normal).easing(autocoreEase);

  return (
    <Animated.View entering={entering} style={{ gap: 4, marginBottom: 4 }}>
      <ScanSheetTitle>{title}</ScanSheetTitle>
      {meta ? <ScanSheetMeta>{meta}</ScanSheetMeta> : null}
    </Animated.View>
  );
}

export function ScanSheetPrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        if (disabled || loading) return;
        haptics.light();
        onPress();
      }}
      style={{
        minHeight: scanLayout.primaryButtonHeight,
        borderRadius: scanLayout.primaryButtonRadius,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 18,
        opacity: disabled || loading ? 0.45 : 1,
        backgroundColor: colors.primary,
      }}
    >
      <Text
        variant="body"
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: colors.primaryForeground,
        }}
      >
        {loading ? '…' : label}
      </Text>
    </Pressable>
  );
}

export function ScanSheetRow({
  label,
  detail,
  onPress,
  destructive,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          variant="body"
          style={{
            fontSize: 16,
            fontWeight: '500',
            color: destructive ? colors.destructive : colors.foreground,
          }}
        >
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" color="muted" style={{ fontSize: 13 }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
    </Pressable>
  );
}

export function ScanSheetHairline() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.7 }} />;
}

export function ScanSheetMetaRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 16,
        paddingVertical: 10,
      }}
    >
      <Text variant="caption" color="muted" style={{ fontSize: 14 }}>
        {label}
      </Text>
      <Text
        variant="body"
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: 15,
          fontWeight: '500',
          color: colors.foreground,
          textAlign: 'right',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
