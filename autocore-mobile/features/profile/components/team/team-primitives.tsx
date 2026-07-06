import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Badge, SectionHeader } from '@/components/ui';

type TeamSectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function TeamSectionHeader({ title, actionLabel, onAction }: TeamSectionHeaderProps) {
  return <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} inset />;
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
