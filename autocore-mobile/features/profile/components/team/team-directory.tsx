import { memo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { PlusIcon, UsersIcon } from '@/assets/icons';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import type { DirectoryPerson } from '@/types/rbac';
import { withAlpha } from '@/theme/color-utils';
import { haptics, rhythm } from '@/theme';
import { tokens } from '@/theme/tokens';

import { TeamBadge, TeamInlineActions } from './team-primitives';

type TeamDirectoryComposerProps = {
  canManage: boolean;
  busy?: boolean;
  onAdd: (name: string) => Promise<void> | void;
};

export function TeamDirectoryComposer({ canManage, busy, onAdd }: TeamDirectoryComposerProps) {
  const { colors, isDark } = useTheme();
  const [draft, setDraft] = useState('');
  const canAdd = canManage && draft.trim().length > 0 && !busy;

  if (!canManage) return null;

  return (
    <View
      style={{
        marginHorizontal: rhythm.pad,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: tokens.radius.full,
        backgroundColor: withAlpha(colors.mutedForeground, isDark ? 0.12 : 0.06),
        borderWidth: 1,
        borderColor: withAlpha(colors.border, isDark ? 0.5 : 0.8),
      }}
    >
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Add a name"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!busy}
        onSubmitEditing={() => {
          if (!canAdd) return;
          const name = draft.trim();
          setDraft('');
          void onAdd(name);
        }}
        style={{
          flex: 1,
          minHeight: 36,
          color: colors.foreground,
          fontSize: 15,
          fontWeight: '500',
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add name"
        disabled={!canAdd}
        onPress={() => {
          if (!canAdd) return;
          haptics.light();
          const name = draft.trim();
          setDraft('');
          void onAdd(name);
        }}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: canAdd ? colors.primary : withAlpha(colors.mutedForeground, 0.18),
          opacity: canAdd ? 1 : 0.55,
        }}
      >
        <PlusIcon size="sm" color={canAdd ? colors.primaryForeground : colors.mutedForeground} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

type TeamDirectoryRowProps = {
  person: DirectoryPerson;
  bordered?: boolean;
  canManage: boolean;
  onInvite: (person: DirectoryPerson) => void;
  onRemove: (person: DirectoryPerson) => void;
};

export const TeamDirectoryRow = memo(function TeamDirectoryRow({
  person,
  bordered,
  canManage,
  onInvite,
  onRemove,
}: TeamDirectoryRowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: rhythm.cardPadX,
        paddingVertical: 12,
        gap: rhythm.stack,
        borderTopWidth: bordered ? 1 : 0,
        borderTopColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', gap: rhythm.stack, alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(colors.mutedForeground, 0.12),
          }}
        >
          <UsersIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }} numberOfLines={1}>
              {person.name}
            </Text>
            <TeamBadge
              label={person.status === 'invited' ? 'Invited' : 'Name only'}
              tone={person.status === 'invited' ? 'primary' : 'muted'}
            />
          </View>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {person.status === 'invited' ? 'Invite sent — waiting to join' : 'Not on AutoCore yet'}
          </Text>
        </View>
      </View>

      {canManage ? (
        <TeamInlineActions>
          <Button native={false} variant="secondary" size="sm" onPress={() => onInvite(person)}>
            Invite
          </Button>
          <Button native={false} variant="ghost" size="sm" onPress={() => onRemove(person)}>
            Remove
          </Button>
        </TeamInlineActions>
      ) : null}
    </View>
  );
});
