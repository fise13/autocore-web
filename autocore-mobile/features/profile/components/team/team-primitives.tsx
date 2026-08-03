import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';
import { Pressable } from 'react-native';

type TeamSectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Section label aligned with ListSection titles on the Settings hub. */
export function TeamSectionHeader({ title, actionLabel, onAction }: TeamSectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: tokens.space.inline + 2,
        marginHorizontal: tokens.space.screenX + tokens.space.stack,
      }}
    >
      <Text
        variant="footnote"
        style={{
          fontSize: 13,
          lineHeight: 18,
          fontWeight: '500',
          letterSpacing: -0.08,
          color: colors.mutedForeground,
        }}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.light();
            onAction();
          }}
          hitSlop={8}
        >
          <Text variant="meta" style={{ fontWeight: '500', color: colors.primary }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type TeamBadgeProps = {
  label: string;
  tone?: 'default' | 'primary' | 'muted' | 'success' | 'warning';
};

export function TeamBadge({ label, tone = 'default' }: TeamBadgeProps) {
  const variant =
    tone === 'primary'
      ? 'default'
      : tone === 'muted'
        ? 'ghost'
        : tone === 'success'
          ? 'success'
          : tone === 'warning'
            ? 'warning'
            : 'secondary';

  return <Badge variant={variant}>{label}</Badge>;
}

type TeamInlineActionsProps = {
  children: ReactNode;
};

export function TeamInlineActions({ children }: TeamInlineActionsProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingTop: 4,
      }}
    >
      {children}
    </View>
  );
}
