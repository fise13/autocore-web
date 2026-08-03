import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/authentication/auth-provider';
import { Button, CollectionRow, Input, ListSection, Text } from '@/components/ui';
import { useSession, useTheme } from '@/hooks';
import { deleteOrganization, leaveOrganization } from '@/services/api/org-api';
import { mapAuthError } from '@/utils/auth-error';
import { tokens } from '@/theme/tokens';

type OrgDangerZoneProps = {
  companyName: string;
  isOwner: boolean;
  onChanged?: () => void;
};

/** Leave + Delete — ListSection island, confirm flows intact. */
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

  const reset = useCallback(() => {
    setMode('idle');
    setConfirmName('');
    setError(null);
  }, []);

  const handleLeave = useCallback(async () => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      await leaveOrganization(companyId);
      reset();
      await refreshProfile();
      onChanged?.();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setBusy(false);
    }
  }, [companyId, onChanged, refreshProfile, reset]);

  const handleDelete = useCallback(async () => {
    if (!companyId || !canDelete) return;
    setBusy(true);
    setError(null);
    try {
      await deleteOrganization(companyId, confirmName.trim());
      reset();
      await refreshProfile();
      onChanged?.();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setBusy(false);
    }
  }, [canDelete, companyId, confirmName, onChanged, refreshProfile, reset]);

  return (
    <ListSection
      title="Danger zone"
      footer="Irreversible actions for this organization"
    >
      {mode === 'idle' ? (
        <>
          <CollectionRow
            title="Leave organization"
            subtitle="You'll lose access to the data"
            tone="danger"
            onPress={() => setMode('leave')}
          />
          {isOwner ? (
            <CollectionRow
              title="Delete organization"
              subtitle="All data will be deleted"
              tone="danger"
              onPress={() => {
                setConfirmName('');
                setMode('delete');
              }}
            />
          ) : null}
        </>
      ) : null}

      {mode === 'leave' ? (
        <View style={{ padding: tokens.space.stack + 2, gap: tokens.space.stack }}>
          <Text variant="caption" color="muted">
            You'll lose access to "{companyName}". Continue?
          </Text>
          <View style={{ flexDirection: 'row', gap: tokens.space.inline }}>
            <Button variant="ghost" onPress={reset} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onPress={() => void handleLeave()} loading={busy}>
              Leave
            </Button>
          </View>
        </View>
      ) : null}

      {mode === 'delete' ? (
        <View style={{ padding: tokens.space.stack + 2, gap: tokens.space.stack }}>
          <Text variant="caption" color="muted">
            Type "{companyName}" to confirm deleting all data.
          </Text>
          <Input
            value={confirmName}
            onChangeText={setConfirmName}
            placeholder={companyName}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ flexDirection: 'row', gap: tokens.space.inline }}>
            <Button variant="ghost" onPress={reset} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onPress={() => void handleDelete()}
              loading={busy}
              disabled={!canDelete}
            >
              Delete
            </Button>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={{ paddingHorizontal: tokens.space.stack + 2, paddingBottom: tokens.space.stack }}>
          <Text variant="caption" style={{ color: colors.destructive }}>
            {error}
          </Text>
        </View>
      ) : null}
    </ListSection>
  );
}
