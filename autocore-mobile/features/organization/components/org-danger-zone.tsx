import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/authentication/auth-provider';
import { Button, Input, SettingsLinkRow, SettingsSectionCard, Text } from '@/components/ui';
import { useSession } from '@/hooks';
import { deleteOrganization, leaveOrganization } from '@/services/api/org-api';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';

type OrgDangerZoneProps = {
  companyName: string;
  isOwner: boolean;
  onChanged?: () => void;
};

export function OrgDangerZone({ companyName, isOwner, onChanged }: OrgDangerZoneProps) {
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
    <SettingsSectionCard
      title="Опасная зона"
      description="Необратимые действия с организацией"
      tone="danger"
    >
      {mode === 'idle' ? (
        <>
          <SettingsLinkRow
            title="Покинуть организацию"
            subtitle="Потеряете доступ к данным"
            tone="danger"
            onPress={() => setMode('leave')}
          />
          {isOwner ? (
            <SettingsLinkRow
              bordered
              title="Удалить организацию"
              subtitle="Все данные будут удалены"
              tone="danger"
              onPress={() => setMode('delete')}
            />
          ) : null}
        </>
      ) : null}

      {mode === 'leave' ? (
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.inline }}>
          <Text variant="caption" color="muted">
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
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.inline }}>
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
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX }}>
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        </View>
      ) : null}
    </SettingsSectionCard>
  );
}
