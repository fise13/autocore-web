import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme';

/** Sentence-case section label above an inset group (iOS Settings / Music). */
export function GroupedSection({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: tokens.space.inline }, style]}>
      {title ? (
        <Text
          variant="footnote"
          color="muted"
          style={{
            paddingHorizontal: tokens.space.stack,
            fontSize: 13,
            fontWeight: '400',
            letterSpacing: -0.08,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Continuous inset group — one surface, hairline row separators. */
export function GroupedList({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: tokens.radius.sheet,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Single form row inside a GroupedList. */
export function FormListRow({
  label,
  required,
  children,
  last = false,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  last?: boolean;
  hint?: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: tokens.space.stack + 2,
        paddingTop: tokens.space.stack,
        paddingBottom: tokens.space.stack,
        gap: tokens.space.micro + 2,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        minHeight: tokens.control.hitTarget + 18,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.space.inline,
        }}
      >
        <Text
          variant="caption1"
          color="muted"
          style={{ fontSize: 13, fontWeight: '500', letterSpacing: -0.08 }}
        >
          {label}
          {required ? (
            <Text style={{ color: colors.destructive }}> *</Text>
          ) : null}
        </Text>
        {hint ? (
          <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Two labeled fields side-by-side (Make | Model). */
export function FormListSplitRow({
  leftLabel,
  rightLabel,
  left,
  right,
  last = false,
}: {
  leftLabel: string;
  rightLabel: string;
  left: ReactNode;
  right: ReactNode;
  last?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: tokens.space.stack + 2,
          paddingVertical: tokens.space.stack,
          gap: tokens.space.micro + 2,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderRightColor: colors.border,
        }}
      >
        <Text variant="caption1" color="muted" style={{ fontSize: 13, fontWeight: '500' }}>
          {leftLabel}
        </Text>
        {left}
      </View>
      <View
        style={{
          flex: 1,
          paddingHorizontal: tokens.space.stack + 2,
          paddingVertical: tokens.space.stack,
          gap: tokens.space.micro + 2,
        }}
      >
        <Text variant="caption1" color="muted" style={{ fontSize: 13, fontWeight: '500' }}>
          {rightLabel}
        </Text>
        {right}
      </View>
    </View>
  );
}
