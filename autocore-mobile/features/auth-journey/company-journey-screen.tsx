import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { UsersIcon } from '@/assets/icons';
import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, Input, SettingsInset, SettingsSectionCard, Skeleton, Text } from '@/components/ui';
import { readInviteToken, clearPendingInvite } from '@/lib/invites/pending-invite';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { formatRole } from '@/lib/team/format';
import { acceptInvite } from '@/services/api/org-api';
import { NotificationService } from '@/services/notifications';
import { joinCompanyWithInviteCode } from '@/services/firestore/join-company-service';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';

import { OrganizationMembershipRow } from '@/features/organization/components/organization-membership-row';

export function CompanyJourneyScreen() {
  const router = useRouter();
  const { memberships, firebaseUser, refreshProfile } = useAuth();
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
        await NotificationService.syncInbox();
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
      await NotificationService.syncInbox();
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
      await NotificationService.syncInbox();
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
      >
        <Skeleton width="100%" height={120} rounded="lg" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Присоединиться по приглашению"
      description="Введите код, который вам отправил администратор компании."
    >
      <SettingsSectionCard title="Код приглашения" icon={UsersIcon} inset={false}>
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.inline }}>
          <SettingsInset embedded>
            <Input
              placeholder="Например: 6SD2BL"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </SettingsInset>
          <Button onPress={() => void handleJoin()} loading={loading} disabled={!inviteCode.trim()}>
            Присоединиться
          </Button>
        </View>
      </SettingsSectionCard>

      {memberships.length > 0 ? (
        <SettingsSectionCard
          title="Ваши пространства"
          description="Переключитесь на существующую компанию"
          inset={false}
        >
          {memberships.map((membership, index) => (
            <OrganizationMembershipRow
              key={membership.companyId}
              companyId={membership.companyId}
              title={resolveActiveCompanyName(membership.companyId, membership.name, [])}
              subtitle={formatRole(membership.role)}
              bordered={index > 0}
              onPress={() => void handleSwitch(membership.companyId)}
            />
          ))}
        </SettingsSectionCard>
      ) : null}

      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : null}
    </AuthShell>
  );
}
