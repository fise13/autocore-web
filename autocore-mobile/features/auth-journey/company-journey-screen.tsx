import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { StoreIcon, UsersIcon } from '@/assets/icons';
import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, Input, SettingsInset, SettingsSectionCard, Skeleton, Text } from '@/components/ui';
import { AUTH_JOURNEY_STEP_LABELS } from '@/hooks/use-auth-journey-step';
import { readInviteToken, clearPendingInvite } from '@/lib/invites/pending-invite';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { formatRole } from '@/lib/team/format';
import { acceptInvite } from '@/services/api/org-api';
import { NotificationService } from '@/services/notifications';
import { joinCompanyWithInviteCode } from '@/services/firestore/join-company-service';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

import { OrganizationMembershipRow } from '@/features/organization/components/organization-membership-row';

export function CompanyJourneyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { memberships, firebaseUser, refreshProfile, createCompany } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
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
      setSubmitMessage('Присоединяем к команде…');
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
        setSubmitMessage(null);
      }
    })();
  }, [firebaseUser, refreshProfile, router]);

  const runAction = async (action: () => Promise<void>, message: string) => {
    setLoading(true);
    setSubmitMessage(message);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setLoading(false);
      setSubmitMessage(null);
    }
  };

  const handleCreate = async () => {
    const trimmed = companyName.trim();
    if (!trimmed) return;
    await runAction(async () => {
      await createCompany(trimmed);
      setCompanyName('');
      await refreshProfile();
      await NotificationService.syncInbox();
    }, 'Создаём компанию…');
  };

  const handleJoin = async () => {
    if (!firebaseUser) return;
    const trimmed = inviteCode.trim();
    if (!trimmed) return;
    await runAction(async () => {
      await joinCompanyWithInviteCode(firebaseUser.uid, trimmed);
      setInviteCode('');
      await refreshProfile();
      await NotificationService.syncInbox();
    }, 'Присоединяем…');
  };

  const handleSwitch = async (targetCompanyId: string) => {
    if (!firebaseUser) return;
    await runAction(async () => {
      await switchActiveCompany(firebaseUser.uid, targetCompanyId);
      await refreshProfile();
      await NotificationService.syncInbox();
    }, 'Переключаем компанию…');
  };

  if (joiningInvite || (loading && submitMessage)) {
    return (
      <AuthShell
        stepLabel={AUTH_JOURNEY_STEP_LABELS.company}
        title="Команда и доступ"
        description={submitMessage ?? 'Присоединяем к команде…'}
      >
        <Skeleton width="100%" height={120} rounded="lg" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      stepLabel={AUTH_JOURNEY_STEP_LABELS.company}
      title="Добро пожаловать в AutoCore"
      description="Создайте рабочее пространство или присоединитесь к существующей команде."
    >
      {memberships.length > 0 ? (
        <SettingsSectionCard
          title="Ваши компании"
          description="Активная компания не выбрана"
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

      <SettingsSectionCard title="Создать компанию" icon={StoreIcon} inset={false}>
        <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.inline }}>
          <Text variant="caption" color="muted">
            Отдельное рабочее пространство для вашей команды.
          </Text>
          <SettingsInset embedded>
            <Input
              placeholder="Название компании"
              value={companyName}
              onChangeText={setCompanyName}
              autoCapitalize="words"
            />
          </SettingsInset>
          <Button onPress={() => void handleCreate()} loading={loading} disabled={!companyName.trim()}>
            Создать компанию
          </Button>
        </View>
      </SettingsSectionCard>

      <Pressable onPress={() => setShowInvite((current) => !current)} accessibilityRole="button">
        <Text variant="caption" color="muted" style={{ textAlign: 'center', textDecorationLine: 'underline' }}>
          {showInvite ? 'Скрыть код приглашения' : 'Есть код приглашения?'}
        </Text>
      </Pressable>

      {showInvite ? (
        <SettingsSectionCard title="Код приглашения" icon={UsersIcon} inset={false}>
          <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.inline }}>
            <Text variant="caption" color="muted">
              Введите код, который отправил администратор.
            </Text>
            <SettingsInset embedded>
              <Input
                placeholder="Например: DUAVV5"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </SettingsInset>
            <Button onPress={() => void handleJoin()} loading={loading} disabled={!inviteCode.trim()} variant="outline">
              Присоединиться
            </Button>
          </View>
        </SettingsSectionCard>
      ) : null}

      {error ? (
        <View
          style={{
            padding: 12,
            borderRadius: rhythm.cardRadius,
            backgroundColor: toneBackground(colors.destructive, 0.08),
          }}
        >
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        </View>
      ) : null}
    </AuthShell>
  );
}
