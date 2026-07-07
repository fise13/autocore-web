import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { INVITE_STATUS_LABELS, normalizeInviteStatus } from '@autocore/org';
import { formatRole } from '@/lib/team/format';
import type { InviteDocument } from '@/types/rbac';
import { rhythm } from '@/theme';
import { coerceToDate } from '@/lib/firestore-timestamp';

import { TeamBadge, TeamInlineActions } from './team-primitives';

type TeamInviteCardProps = {
  invite: InviteDocument;
  bordered?: boolean;
  onShareCode: (code: string) => void;
  onShareLink: (url: string) => void;
  onDelete: () => void;
  onResend?: () => void;
  buildJoinUrl: (token: string) => string;
};

function inviteStatusTone(status: ReturnType<typeof normalizeInviteStatus>) {
  if (status === 'pending') return 'primary' as const;
  if (status === 'accepted') return 'success' as const;
  if (status === 'expired' || status === 'cancelled' || status === 'declined') return 'muted' as const;
  return 'default' as const;
}

export const TeamInviteRow = memo(function TeamInviteRow({
  invite,
  bordered = false,
  onShareCode,
  onShareLink,
  onDelete,
  onResend,
  buildJoinUrl,
}: TeamInviteCardProps) {
  const { colors } = useTheme();
  const status = normalizeInviteStatus({
    status: invite.status,
    used: invite.used,
    expiresAt: coerceToDate(invite.expiresAt)?.toISOString() ?? new Date(0).toISOString(),
  });
  const canManage = status === 'pending';

  return (
    <View>
      {bordered ? (
        <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: rhythm.cardPadX }]} />
      ) : null}
      <View style={styles.row}>
        <View style={styles.header}>
          <Text variant="body" style={styles.code} numberOfLines={1}>
            {invite.code}
          </Text>
          <TeamBadge label={INVITE_STATUS_LABELS[status]} tone={inviteStatusTone(status)} />
        </View>

        <Text variant="caption" color="muted" numberOfLines={2} style={styles.meta}>
          {invite.email ? `${invite.email} · ` : ''}
          {formatRole(invite.role)}
        </Text>

        {canManage ? (
          <TeamInlineActions>
            <Button variant="secondary" size="sm" onPress={() => onShareCode(invite.code)}>
              Код
            </Button>
            {invite.token ? (
              <Button variant="secondary" size="sm" onPress={() => onShareLink(buildJoinUrl(invite.token!))}>
                Ссылка
              </Button>
            ) : null}
            {onResend && invite.email ? (
              <Button variant="secondary" size="sm" onPress={onResend}>
                Повтор
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onPress={onDelete}>
              Отменить
            </Button>
          </TeamInlineActions>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    paddingHorizontal: rhythm.cardPadX,
    paddingVertical: 10,
    gap: rhythm.tight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  code: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    lineHeight: 18,
  },
});
