import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { UsersIcon } from '@/assets/icons';
import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, MetaRow, SettingsSectionCard, Skeleton, Text } from '@/components/ui';
import { clearPendingInvite, storePendingInvite } from '@/lib/invites/pending-invite';
import { normalizeCompanyId } from '@/lib/company-id';
import { formatRole } from '@/lib/team/format';
import { acceptInvite, declineInvite, fetchInvitePreview } from '@/services/api/org-api';
import { NotificationService } from '@/services/notifications';
import { inviteRequiresEmailMatch, INVITE_STATUS_LABELS, type InvitePreview } from '@autocore/org';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';

type InviteAcceptScreenProps = {
  token: string;
};

export function InviteAcceptScreen({ token }: InviteAcceptScreenProps) {
  const router = useRouter();
  const { firebaseUser, refreshProfile, signOut, profile } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const autoAcceptStarted = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      storePendingInvite({ token });
      const response = await fetchInvitePreview(token);
      setPreview(response.preview);
      if (response.preview.email || response.preview.companyName) {
        storePendingInvite({
          token,
          email: response.preview.email ?? undefined,
          companyName: response.preview.companyName,
        });
      }
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const userEmail = firebaseUser?.email?.trim().toLowerCase() ?? '';
  const emailMismatch =
    preview && firebaseUser ? inviteRequiresEmailMatch(preview.email, userEmail) : false;

  const handleAccept = useCallback(async (switchToCompany: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(token, switchToCompany);
      clearPendingInvite();
      await refreshProfile();
      await NotificationService.syncInbox();
      router.replace('/(tabs)');
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setBusy(false);
    }
  }, [refreshProfile, router, token]);

  useEffect(() => {
    if (autoAcceptStarted.current || loading || busy) return;
    if (!firebaseUser || !preview?.canAccept || emailMismatch) return;

    const activeCompanyId = normalizeCompanyId(profile?.companyId);
    const inviteCompanyId = normalizeCompanyId(preview.companyId);
    const hasOtherCompany = Boolean(
      activeCompanyId && activeCompanyId !== 'default' && activeCompanyId !== inviteCompanyId,
    );
    if (hasOtherCompany) return;

    autoAcceptStarted.current = true;
    void handleAccept(true);
  }, [busy, emailMismatch, firebaseUser, handleAccept, loading, preview, profile?.companyId]);

  const handleDecline = async () => {
    setBusy(true);
    try {
      if (firebaseUser) {
        await declineInvite(token);
      }
      clearPendingInvite();
      router.replace(firebaseUser ? '/(tabs)' : '/(auth)/login');
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AuthShell title="Invite" description="Loading invite details…">
        <View style={{ gap: rhythm.stack }}>
          <Skeleton width="100%" height={120} rounded="lg" />
          <Skeleton width="100%" height={44} rounded="lg" />
        </View>
      </AuthShell>
    );
  }

  if (!preview) {
    return (
      <AuthShell title="Invite unavailable" description={error ?? 'This link has expired or already been used'}>
        <Button onPress={() => void load()}>Retry</Button>
      </AuthShell>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthShell title="Team invite" description="Sign in to accept the invite">
        <InvitePreviewCard preview={preview} />
        <Button onPress={() => router.push(`/(auth)/login?invite=${encodeURIComponent(token)}`)}>
          Sign in
        </Button>
        <Button
          variant="secondary"
          onPress={() => router.push(`/(auth)/login?invite=${encodeURIComponent(token)}&mode=signup`)}
        >
          Create account
        </Button>
      </AuthShell>
    );
  }

  if (emailMismatch) {
    return (
      <AuthShell
        title="Different account"
        description={`This invite is for ${preview.email}. You're signed in as ${userEmail}.`}
      >
        <InvitePreviewCard preview={preview} />
        <Button variant="secondary" onPress={() => void handleAccept(false)} loading={busy}>
          Continue with current account
        </Button>
        <Button variant="ghost" onPress={() => void signOut()}>
          Switch account
        </Button>
      </AuthShell>
    );
  }

  if (busy && preview.canAccept && !emailMismatch) {
    return (
      <AuthShell title="Joining the team" description="This will just take a second">
        <InvitePreviewCard preview={preview} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Team invite" description="Accept the invite to get access">
      <InvitePreviewCard preview={preview} />
      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : null}
      {preview.canAccept ? (
        <>
          <Button onPress={() => void handleAccept(true)} loading={busy}>
            Accept and switch
          </Button>
          <Button variant="secondary" onPress={() => void handleAccept(false)} loading={busy}>
            Accept without switching
          </Button>
          <Button variant="ghost" onPress={() => void handleDecline()} disabled={busy}>
            Decline
          </Button>
        </>
      ) : (
        <Text variant="caption" color="muted">
          Status: {INVITE_STATUS_LABELS[preview.status]}
        </Text>
      )}
    </AuthShell>
  );
}

function InvitePreviewCard({ preview }: { preview: InvitePreview }) {
  return (
    <SettingsSectionCard
      title="Organization"
      description="Invite details"
      icon={UsersIcon}
      inset={false}
    >
      <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX, gap: rhythm.tight }}>
        <MetaRow label="Company" value={preview.companyName} />
        <MetaRow label="Role" value={formatRole(preview.role)} />
        {preview.inviterName ? <MetaRow label="Invited by" value={preview.inviterName} /> : null}
        {preview.email ? <MetaRow label="Email" value={preview.email} /> : null}
      </View>
    </SettingsSectionCard>
  );
}
