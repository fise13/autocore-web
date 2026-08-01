import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, FormStack, Input, Skeleton, Text } from '@/components/ui';
import {
  AUTH_JOURNEY_STEP_LABELS,
  authJourneyProgressLabel,
} from '@/hooks/use-auth-journey-step';
import { readInviteToken, clearPendingInvite } from '@/lib/invites/pending-invite';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';
import { formatRole } from '@/lib/team/format';
import { acceptInvite } from '@/services/api/org-api';
import { NotificationService } from '@/services/notifications';
import { joinCompanyWithInviteCode } from '@/services/firestore/join-company-service';
import { switchActiveCompany } from '@/services/firestore/company-membership-service';
import { mapAuthError } from '@/utils/auth-error';
import { form, rhythm, spacing } from '@/theme';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';

import { JourneyOptionCard } from './journey-option-card';

type CompanyMode = 'choose' | 'create' | 'invite';

export function CompanyJourneyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { memberships, firebaseUser, refreshProfile, createCompany, signOut } = useAuth();
  const [mode, setMode] = useState<CompanyMode>('choose');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
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
      setSubmitMessage('Joining the team…');
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

  const goMode = (next: CompanyMode) => {
    setDirection(next === 'choose' ? -1 : 1);
    setMode(next);
    setError(null);
  };

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
    }, 'Creating workspace…');
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
    }, 'Joining…');
  };

  const handleSwitch = async (targetCompanyId: string) => {
    if (!firebaseUser) return;
    await runAction(async () => {
      await switchActiveCompany(firebaseUser.uid, targetCompanyId);
      await refreshProfile();
      await NotificationService.syncInbox();
    }, 'Switching workspace…');
  };

  if (joiningInvite || (loading && submitMessage)) {
    return (
      <AuthShell
        stepLabel={AUTH_JOURNEY_STEP_LABELS.company}
        progressLabel={authJourneyProgressLabel('company')}
        title="Almost there"
        description={submitMessage ?? 'Joining the team…'}
        stepKey="company-loading"
      >
        <Skeleton width="100%" height={120} rounded="lg" />
      </AuthShell>
    );
  }

  if (mode === 'create') {
    return (
      <AuthShell
        stepLabel={AUTH_JOURNEY_STEP_LABELS.company}
        progressLabel={authJourneyProgressLabel('company')}
        title="Name your workspace"
        description="A separate space for your team, stock, and work orders."
        onBack={() => goMode('choose')}
        stepKey="company-create"
        stepDirection={direction}
      >
        <FormStack gap={form.fieldGap}>
          <Input
            label="Company name"
            size="lg"
            placeholder="e.g. North Yard Motors"
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
            autoFocus
          />
          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}
          <Button
            size="lg"
            onPress={() => void handleCreate()}
            loading={loading}
            disabled={!companyName.trim()}
          >
            Continue
          </Button>
        </FormStack>
      </AuthShell>
    );
  }

  if (mode === 'invite') {
    return (
      <AuthShell
        stepLabel={AUTH_JOURNEY_STEP_LABELS.company}
        progressLabel={authJourneyProgressLabel('company')}
        title="Join with an invite"
        description="Enter the code your admin sent you."
        onBack={() => goMode('choose')}
        stepKey="company-invite"
        stepDirection={direction}
      >
        <FormStack gap={form.fieldGap}>
          <Input
            label="Invite code"
            size="lg"
            placeholder="e.g. DUAVV5"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />
          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}
          <Button
            size="lg"
            onPress={() => void handleJoin()}
            loading={loading}
            disabled={!inviteCode.trim()}
          >
            Join team
          </Button>
        </FormStack>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      stepLabel={AUTH_JOURNEY_STEP_LABELS.company}
      progressLabel={authJourneyProgressLabel('company')}
      title="Welcome to AutoCore"
      description="Create a workspace or join an existing team."
      stepKey="company-choose"
      stepDirection={direction}
    >
      <View style={{ gap: rhythm.stack }}>
        {memberships.length > 0 ? (
          <View style={{ gap: spacing[2] }}>
            <Text variant="caption" color="muted" style={{ fontWeight: '600' }}>
              Your workspaces
            </Text>
            {memberships.map((membership, index) => (
              <JourneyOptionCard
                key={membership.companyId}
                index={index}
                onPress={() => void handleSwitch(membership.companyId)}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: rhythm.cardRadius,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  gap: 2,
                }}
              >
                <Text variant="bodyStrong">
                  {resolveActiveCompanyName(membership.companyId, membership.name, [])}
                </Text>
                <Text variant="caption" color="muted">
                  {formatRole(membership.role)}
                </Text>
              </JourneyOptionCard>
            ))}
          </View>
        ) : null}

        <Button size="lg" onPress={() => goMode('create')}>
          Create a workspace
        </Button>
        <Button size="lg" variant="outline" onPress={() => goMode('invite')}>
          I have an invite code
        </Button>

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

        <Button variant="ghost" onPress={() => void signOut()}>
          Sign out
        </Button>
      </View>
    </AuthShell>
  );
}
