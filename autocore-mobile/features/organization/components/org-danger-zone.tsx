import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { useAuth } from '@/authentication/auth-provider';
import { Button, Input, Text } from '@/components/ui';
import { useSession, useTheme } from '@/hooks';
import { deleteOrganization, leaveOrganization } from '@/services/api/org-api';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';

type OrgDangerZoneProps = {
  companyName: string;
  isOwner: boolean;
  onChanged?: () => void;
};

export function OrgDangerZone({ companyName, isOwner, onChanged }: OrgDangerZoneProps) {
  const { colors } = useTheme();
  const { companyId } = useSession();
  const { refreshProfile } = useAuth();
  const [confirmName, setConfirmName] = useState('');
  const [mode, setMode] = useState<'idle' | 'leave' | 'delete'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = useMemo(
    () => confirmName.trim() === companyName.trim(),
    [confirmName, companyName],
  );

  const handleLeave = useCallback(async () => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      await leaveOrganization(companyId);
      setMode('idle');
      await refreshProfile();
      onChanged?.();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setBusy(false);
    }
  }, [companyId, onChanged, refreshProfile]);

  const handleDelete = useCallback(async () => {
    if (!companyId || !canDelete) return;
    setBusy(true);
    setError(null);
    try {
      await deleteOrganization(companyId, confirmName.trim());
      setMode('idle');
      await refreshProfile();
      onChanged?.();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setBusy(false);
    }
  }, [canDelete, companyId, confirmName, onChanged, refreshProfile]);

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${colors.destructive}44`,
        backgroundColor: `${colors.destructive}10`,
        padding: rhythm.stack,
        gap: rhythm.inline,
      }}
    >
      <Text variant="bodyStrong" style={{ color: colors.destructive }}>
        Опасная зона
      </Text>
      <Text variant="caption" color="muted">
        Необратимые действия с организацией
      </Text>

      {mode === 'idle' ? (
        <View style={{ gap: rhythm.tight }}>
          <Button variant="outline" onPress={() => setMode('leave')}>
            Покинуть организацию
          </Button>
          {isOwner ? (
            <Button variant="destructive" onPress={() => setMode('delete')}>
              Удалить организацию
            </Button>
          ) : null}
        </View>
      ) : null}

      {mode === 'leave' ? (
        <View style={{ gap: rhythm.tight }}>
          <Text variant="body">
            Вы потеряете доступ к «{companyName}». Продолжить?
          </Text>
          <View style={{ flexDirection: 'row', gap: rhythm.tight }}>
            <Button variant="ghost" onPress={() => setMode('idle')} disabled={busy}>
              Отмена
            </Button>
            <Button variant="destructive" onPress={() => void handleLeave()} loading={busy}>
              Покинуть
            </Button>
          </View>
        </View>
      ) : null}

      {mode === 'delete' ? (
        <View style={{ gap: rhythm.tight }}>
          <Text variant="caption" color="muted">
            Введите «{companyName}» для подтверждения удаления всех данных.
          </Text>
          <Input value={confirmName} onChangeText={setConfirmName} placeholder={companyName} />
          <View style={{ flexDirection: 'row', gap: rhythm.tight }}>
            <Button variant="ghost" onPress={() => setMode('idle')} disabled={busy}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onPress={() => void handleDelete()}
              loading={busy}
              disabled={!canDelete}
            >
              Удалить
            </Button>
          </View>
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" style={{ color: colors.destructive }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
