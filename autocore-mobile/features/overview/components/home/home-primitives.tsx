import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Svg, { Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { tokens } from '@/theme/tokens';

import { home } from '../../layout';

/** Large Health-style section title. */
export function HomeSectionTitle({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: tokens.space[3],
        marginBottom: tokens.space[2.5],
      }}
    >
      <Text
        style={{
          fontSize: home.sectionTitleSize,
          lineHeight: home.sectionTitleLineHeight,
          fontWeight: '700',
          letterSpacing: -0.45,
          color: colors.foreground,
          flexShrink: 1,
        }}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}

/** Elevated dark card — fill only, no shadow stack. */
export function HomeCard({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const body = (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: home.cardRadius,
        padding: home.cardPad,
        gap: tokens.space[2.5],
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? tokens.opacity.pressed : 1 })}
    >
      {body}
    </Pressable>
  );
}

/** Category row: tinted SF symbol + title | meta + chevron */
export function HomeCardHeader({
  title,
  accent,
  sf,
  meta,
  showChevron = true,
}: {
  title: string;
  accent: string;
  sf: string;
  meta?: string;
  showChevron?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.space[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        <SymbolView name={sf as 'heart.fill'} size={15} tintColor={accent} weight="semibold" />
        <Text
          variant="subheadline"
          numberOfLines={1}
          style={{ fontWeight: '600', color: accent, flexShrink: 1 }}
        >
          {title}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {meta ? (
          <Text variant="footnote" color="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {showChevron ? (
          <SymbolView
            name="chevron.right"
            size={11}
            tintColor={colors.mutedForeground}
            weight="semibold"
          />
        ) : null}
      </View>
    </View>
  );
}

/** Mini vertical bars — Health steps sparkline. */
export function HomeMiniBars({
  values,
  accent,
  height = 44,
  width = 96,
}: {
  values: number[];
  accent: string;
  height?: number;
  width?: number;
}) {
  const { colors } = useTheme();
  const max = Math.max(...values, 1);
  const gap = 2.5;
  const barW = Math.max(3, (width - gap * (values.length - 1)) / Math.max(values.length, 1));

  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * (height - 2));
        const x = i * (barW + gap);
        const y = height - h;
        const isLast = i === values.length - 1;
        return (
          <Rect
            key={`${i}-${v}`}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={1.5}
            fill={isLast ? accent : colors.mutedForeground}
            opacity={isLast ? 1 : 0.35}
          />
        );
      })}
    </Svg>
  );
}

/** Slim secondary navigation row under a section. */
export function HomeShowAllRow({
  label,
  sf,
  onPress,
}: {
  label: string;
  sf: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        marginTop: tokens.space[2.5],
        backgroundColor: colors.card,
        borderRadius: home.cardRadius,
        paddingHorizontal: home.cardPad,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[2.5],
        opacity: pressed ? tokens.opacity.pressed : 1,
      })}
    >
      <SymbolView name={sf as 'heart.fill'} size={18} tintColor={colors.primary} weight="medium" />
      <Text variant="body" style={{ flex: 1, fontWeight: '500' }} numberOfLines={1}>
        {label}
      </Text>
      <SymbolView
        name="chevron.right"
        size={12}
        tintColor={colors.mutedForeground}
        weight="semibold"
      />
    </Pressable>
  );
}
