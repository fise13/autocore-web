import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

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
 * Web-style settings section: one card per section, header once, rows inside.
 * Stripe / Efferd / AutoCore web preferences pattern.
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

  return (
    <View
      style={[
        styles.card,
        {
          marginHorizontal: inset ? rhythm.pad : 0,
          borderRadius: rhythm.cardRadius,
          borderColor: isDanger ? toneBackground(colors.destructive, 0.22) : colors.border,
          backgroundColor: isDanger ? toneBackground(colors.destructive, 0.06) : colors.card,
        },
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            {Icon ? (
              <Icon
                size="sm"
                color={isDanger ? colors.destructive : colors.primary}
                strokeWidth={1.85}
              />
            ) : null}
            <Text
              variant="body"
              style={[
                styles.headerTitle,
                { color: isDanger ? colors.destructive : colors.foreground },
              ]}
            >
              {title}
            </Text>
          </View>
          {description ? (
            <Text
              variant="caption"
              style={[styles.headerDescription, { color: colors.mutedForeground }]}
            >
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
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
          marginHorizontal: embedded ? rhythm.cardPadX : rhythm.pad,
          marginBottom: embedded ? rhythm.cardPadX : 0,
          borderRadius: rhythm.cardRadius,
          borderColor: colors.border,
          backgroundColor: toneBackground(colors.foreground, 0.04),
          padding: rhythm.cardPadX,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: rhythm.cardPadX,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  headerDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  body: {
    paddingBottom: 2,
  },
  inset: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: rhythm.stack,
  },
});
