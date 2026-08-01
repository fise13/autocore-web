import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/authentication/auth-provider';
import { ChevronRightIcon } from '@/assets/icons';
import { Button, Input, Text } from '@/components/ui';
import { useSession, useTheme } from '@/hooks';
import { deleteOrganization, leaveOrganization } from '@/services/api/org-api';
import { mapAuthError } from '@/utils/auth-error';
import { haptics, rhythm } from '@/theme';

import { SettingsGroup, SettingsSectionTitle } from '@/features/settings/components/settings-section';

type OrgDangerZoneProps = {
  companyName: string;
  isOwner: boolean;
  onChanged?: () => void;
};

function DangerRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const danger = colors.danger ?? colors.destructive;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        width: '100%',
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: rhythm.cardPadX,
        paddingVertical: 12,
        backgroundColor: pressed ? colors.muted : 'transparent',
      })}
    >
      <View style={{ flex: 1, flexShrink: 1, minWidth: 0, paddingRight: 12, gap: 2 }}>
        <Text
          variant="body"
          style={{
            fontSize: 15,
            fontWeight: '600',
            lineHeight: 20,
            color: danger,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          variant="caption"
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: colors.mutedForeground,
          }}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
      <View style={{ flexShrink: 0, width: 16, alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRightIcon size={16} color={colors.mutedForeground} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

/** Leave + Delete — quiet Notion group, brand danger text, confirm flows intact. */
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

  const idleRows = (
    <>
      <DangerRow
        title="Leave organization"
        subtitle="You'll lose access to the data"
        onPress={() => setMode('leave')}
      />
      {isOwner ? (
        <DangerRow
          title="Delete organization"
          subtitle="All data will be deleted"
          onPress={() => {
            setConfirmName('');
            setMode('delete');
          }}
        />
      ) : null}
    </>
  );

  return (
    <View style={{ gap: rhythm.stack }}>
      <SettingsSectionTitle
        title="Danger zone"
        subtitle="Irreversible actions for this organization"
        tone="danger"
      />

      <SettingsGroup>
        {mode === 'idle' ? idleRows : null}

        {mode === 'leave' ? (
          <View
            style={{
              paddingHorizontal: rhythm.cardPadX,
              paddingVertical: rhythm.cardPadX,
              gap: rhythm.inline,
            }}
          >
            <Text variant="caption" color="muted">
              You'll lose access to "{companyName}". Continue?
            </Text>
            <View style={{ flexDirection: 'row', gap: rhythm.tight }}>
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
          <View
            style={{
              paddingHorizontal: rhythm.cardPadX,
              paddingVertical: rhythm.cardPadX,
              gap: rhythm.inline,
            }}
          >
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
            <View style={{ flexDirection: 'row', gap: rhythm.tight }}>
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
          <View
            style={{
              paddingHorizontal: rhythm.cardPadX,
              paddingBottom: rhythm.cardPadX,
            }}
          >
            <Text variant="caption" style={{ color: colors.destructive }}>
              {error}
            </Text>
          </View>
        ) : null}
      </SettingsGroup>
    </View>
  );
}
