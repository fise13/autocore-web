import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, Input, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { readInviteToken, clearPendingInvite } from '@/lib/invites/pending-invite';
import { acceptInvite } from '@/services/api/org-api';
import { NotificationService } from '@/services/notifications';
import { joinCompanyWithInviteCode } from '@/services/firestore/join-company-service';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { mapAuthError } from '@/utils/auth-error';

export function CompanyJourneyScreen() {
  const router = useRouter();
  const { memberships, firebaseUser, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joiningInvite, setJoiningInvite] = useState(false);
  const inviteAutoJoinAttempted = useRef(false);

  useEffect(() => {
    if (!firebaseUser || inviteAutoJoinAttempted.current) return;
    const token = readInviteToken();
    if (!token) return;
    inviteAutoJoinAttempted.current = true;

    void (async () => {
      setJoiningInvite(true);
      setError(null);
      try {
        await acceptInvite(token, true);
        clearPendingInvite();
        await refreshProfile();
        void NotificationService.syncInbox();
      } catch (cause) {
        router.replace(`/invite/${encodeURIComponent(token)}` as never);
        setError(mapAuthError(cause));
      } finally {
        setJoiningInvite(false);
      }
    })();
  }, [firebaseUser, refreshProfile, router]);

  const handleJoin = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      await joinCompanyWithInviteCode(firebaseUser.uid, inviteCode);
      await refreshProfile();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (companyId: string) => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      await switchActiveCompany(firebaseUser.uid, companyId);
      await refreshProfile();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  if (joiningInvite) {
    return (
      <AuthShell
        title="Команда и доступ"
        description="Присоединяем к команде по приглашению…"
      />
    );
  }

  return (
    <AuthShell
      title="Команда и доступ"
      description="Введите код приглашения от администратора или выберите рабочее пространство."
    >
      <View style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Text variant="caption" color="muted">
            Код приглашения
          </Text>
          <Input
            placeholder="ABCD-1234"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
          />
          <Button onPress={handleJoin} loading={loading}>
            Присоединиться
          </Button>
        </View>

        {memberships.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text variant="caption" color="muted">
              Ваши пространства
            </Text>
            {memberships.map((membership) => (
              <Pressable
                key={membership.companyId}
                onPress={() => handleSwitch(membership.companyId)}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 14,
                  backgroundColor: colors.card,
                }}
              >
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {membership.name}
                </Text>
                <Text variant="caption" color="muted">
                  {membership.role}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}
      </View>
    </AuthShell>
  );
}
