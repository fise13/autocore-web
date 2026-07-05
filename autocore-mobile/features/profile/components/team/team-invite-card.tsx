import { memo } from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { formatInviteExpiry, formatRole } from '@/lib/team/format';
import type { InviteDocument } from '@/types/rbac';
import { rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { useTheme } from '@/hooks';
import { radius } from '@/theme/radius';

type TeamInviteCardProps = {
  invite: InviteDocument;
  onShareCode: (code: string) => void;
  onShareLink: (url: string) => void;
  onDelete: () => void;
  buildJoinUrl: (token: string) => string;
};

export const TeamInviteRow = memo(function TeamInviteRow({
  invite,
  onShareCode,
  onShareLink,
  onDelete,
  buildJoinUrl,
}: TeamInviteCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: radius['2xl'],
        backgroundColor: toneBackground(colors.primary, 0.06),
        padding: rhythm.stack + 2,
        gap: rhythm.tight,
      }}
    >
      <Text
        variant="title"
        style={{
          fontSize: 22,
          fontWeight: '700',
          letterSpacing: 3,
          fontVariant: ['tabular-nums'],
        }}
      >
        {invite.code}
      </Text>
      <Text variant="meta" color="muted">
        {invite.email ? `${invite.email} · ` : ''}
        {formatRole(invite.role)} · до {formatInviteExpiry(invite.expiresAt)}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button variant="secondary" size="sm" onPress={() => onShareCode(invite.code)}>
          Код
        </Button>
        {invite.token ? (
          <Button variant="secondary" size="sm" onPress={() => onShareLink(buildJoinUrl(invite.token!))}>
            Ссылка
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onPress={onDelete}>
          Удалить
        </Button>
      </View>
    </View>
  );
});
