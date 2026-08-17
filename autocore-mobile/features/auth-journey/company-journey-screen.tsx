import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { StoreIcon, UsersIcon } from '@/assets/icons';
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
import { WorkspacePathCard } from './workspace-path-card';

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
        title="Name this workspace"
        description="Shown on the home screen, documents, and invites to your team."
        onBack={() => goMode('choose')}
        stepKey="company-create"
        stepDirection={direction}
      >
        <FormStack gap={form.fieldGap}>
          <Input
            label="Workspace name"
            size="lg"
            placeholder="e.g. North Yard Motors"
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
            autoFocus
          />
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            You can change this later in settings.
          </Text>
          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}
          <Button
            size="lg"
            shape="pill"
            onPress={() => void handleCreate()}
            loading={loading}
            disabled={!companyName.trim()}
          >
            Create workspace
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
        title="Join with a code"
        description="Ask the workspace owner for the short invite they can copy from Team."
        onBack={() => goMode('choose')}
        stepKey="company-invite"
        stepDirection={direction}
      >
        <FormStack gap={form.fieldGap}>
          <Input
            label="Invite code"
            size="lg"
            placeholder="DUAVV5"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            textStyle={{ letterSpacing: 3, fontWeight: '700' }}
          />
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Codes are 6 characters. Capitalization does not matter.
          </Text>
          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}
          <Button
            size="lg"
            shape="pill"
            onPress={() => void handleJoin()}
            loading={loading}
            disabled={!inviteCode.trim()}
          >
            Join workspace
          </Button>
        </FormStack>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      stepLabel={AUTH_JOURNEY_STEP_LABELS.company}
      progressLabel={authJourneyProgressLabel('company')}
      title="Your workshop starts here"
      description="Open a new workspace, or join one your team already runs."
      stepKey="company-choose"
      stepDirection={direction}
      footer={
        <Button variant="ghost" onPress={() => void signOut()}>
          Sign out
        </Button>
      }
    >
      <View style={{ gap: spacing[3] }}>
        {memberships.length > 0 ? (
          <View style={{ gap: spacing[2], marginBottom: spacing[2] }}>
            <Text
              variant="caption"
              color="muted"
              style={{ fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}
            >
              Already a member
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

        <WorkspacePathCard
          index={0}
          emphasized
          title="Create a workspace"
          description="For owners. Inventory, work orders, and the team in one place."
          icon={<StoreIcon size="sm" color={colors.primaryForeground} />}
          onPress={() => goMode('create')}
        />
        <WorkspacePathCard
          index={1}
          title="I have an invite code"
          description="Join a yard that is already set up. You will need a 6-character code."
          icon={<UsersIcon size="sm" color={colors.primary} />}
          onPress={() => goMode('invite')}
        />

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
      </View>
    </AuthShell>
  );
}
