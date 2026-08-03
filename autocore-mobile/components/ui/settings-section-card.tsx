import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { tokens } from '@/theme/tokens';

import { Text } from './text';

type SettingsSectionCardProps = {
  title?: string;
  description?: string;
  icon?: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  tone?: 'default' | 'danger';
  /** Horizontal page inset (default true) */
  inset?: boolean;
  children: ReactNode;
};

/**
 * Domain settings island — same surface language as ListSection for Team / Earnings.
 */
export function SettingsSectionCard({
  title,
  description,
  icon: Icon,
  tone = 'default',
  inset = true,
  children,
}: SettingsSectionCardProps) {
  const { colors } = useTheme();
  const isDanger = tone === 'danger';
  const side = inset ? tokens.space.screenX : 0;

  return (
    <View style={{ marginBottom: inset ? tokens.space.section : 0 }}>
      {title ? (
        <View
          style={{
            marginHorizontal: side + tokens.space.stack,
            marginBottom: tokens.space.inline + 2,
            gap: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {Icon ? (
              <Icon
                size="sm"
                color={isDanger ? colors.destructive : colors.mutedForeground}
                strokeWidth={1.6}
              />
            ) : null}
            <Text
              variant="footnote"
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontWeight: '500',
                letterSpacing: -0.08,
                color: isDanger ? colors.destructive : colors.mutedForeground,
              }}
            >
              {title}
            </Text>
          </View>
          {description ? (
            <Text variant="caption1" color="muted">
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={{
          marginHorizontal: side,
          borderRadius: tokens.radius.sheet,
          overflow: 'hidden',
          backgroundColor: isDanger
            ? toneBackground(colors.destructive, 0.06)
            : colors.card,
        }}
      >
        {children}
      </View>
    </View>
  );
}

type SettingsInsetProps = {
  children: ReactNode;
  /** When true, no outer horizontal margin (use inside a section card) */
  embedded?: boolean;
};

/** Soft inset panel for identity / meta — one nest level only. */
export function SettingsInset({ children, embedded = false }: SettingsInsetProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.inset,
        {
          marginHorizontal: embedded ? tokens.space.stack + 2 : tokens.space.screenX,
          marginBottom: embedded ? tokens.space.stack + 2 : 0,
          borderRadius: tokens.radius.sheet,
          backgroundColor: colors.card,
          padding: tokens.space.stack + 2,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  inset: {
    gap: tokens.space.stack,
  },
});
