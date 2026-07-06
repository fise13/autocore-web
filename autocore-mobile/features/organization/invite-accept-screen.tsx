import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/authentication/auth-provider';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { clearPendingInvite, storePendingInvite } from '@/lib/invites/pending-invite';
import { acceptInvite, declineInvite, fetchInvitePreview } from '@/services/api/org-api';
import { NotificationService } from '@/services/notifications';
import { inviteRequiresEmailMatch, INVITE_STATUS_LABELS, type InvitePreview } from '@autocore/org';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  manager: 'Менеджер',
  employee: 'Сотрудник',
  mechanic: 'Механик',
  accountant: 'Бухгалтер',
  diagnostician: 'Диагност',
};

type InviteAcceptScreenProps = {
  token: string;
};

export function InviteAcceptScreen({ token }: InviteAcceptScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { firebaseUser, refreshProfile, signOut } = useAuth();
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
    autoAcceptStarted.current = true;
    void handleAccept(true);
  }, [busy, emailMismatch, firebaseUser, handleAccept, loading, preview?.canAccept]);

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
      <View style={{ flex: 1, padding: rhythm.pad, gap: rhythm.stack }}>
        <View style={{ height: 56, width: 56, borderRadius: 14, backgroundColor: colors.muted, opacity: 0.4 }} />
        <View style={{ height: 22, width: '70%', borderRadius: 8, backgroundColor: colors.muted, opacity: 0.35 }} />
        <View style={{ height: 16, width: '90%', borderRadius: 8, backgroundColor: colors.muted, opacity: 0.3 }} />
        <View style={{ height: 120, borderRadius: 16, backgroundColor: colors.muted, opacity: 0.25, marginTop: rhythm.stack }} />
        <View style={{ height: 44, borderRadius: 12, backgroundColor: colors.muted, opacity: 0.3 }} />
      </View>
    );
  }

  if (!preview) {
    return (
      <View style={{ flex: 1, padding: rhythm.stack, justifyContent: 'center', gap: rhythm.inline }}>
        <Text variant="bodyStrong">{error ?? 'Приглашение недоступно'}</Text>
        <Button onPress={() => void load()}>Повторить</Button>
      </View>
    );
  }

  if (!firebaseUser) {
    return (
      <View style={{ flex: 1, padding: rhythm.stack, justifyContent: 'center', gap: rhythm.stack }}>
        <InviteCard preview={preview} />
        <Button onPress={() => router.push(`/(auth)/login?invite=${encodeURIComponent(token)}`)}>
          Войти
        </Button>
        <Button
          variant="outline"
          onPress={() => router.push(`/(auth)/login?invite=${encodeURIComponent(token)}&mode=signup`)}
        >
          Создать аккаунт
        </Button>
      </View>
    );
  }

  if (emailMismatch) {
    return (
      <View style={{ flex: 1, padding: rhythm.stack, justifyContent: 'center', gap: rhythm.stack }}>
        <Text variant="title">Другой аккаунт</Text>
        <Text variant="body" color="muted">
          Приглашение для {preview.email}. Вы вошли как {userEmail}.
        </Text>
        <Button variant="outline" onPress={() => void handleAccept(false)} loading={busy}>
          Продолжить с текущим
        </Button>
        <Button variant="ghost" onPress={() => void signOut()}>
          Сменить аккаунт
        </Button>
      </View>
    );
  }

  if (busy && preview.canAccept && !emailMismatch) {
    return (
      <View style={{ flex: 1, padding: rhythm.stack, justifyContent: 'center', gap: rhythm.stack }}>
        <InviteCard preview={preview} />
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          Присоединяем к команде…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: rhythm.stack, justifyContent: 'center', gap: rhythm.stack }}>
      <Text variant="title">Приглашение в команду</Text>
      <InviteCard preview={preview} />
      {error ? (
        <Text variant="caption" style={{ color: colors.destructive }}>
          {error}
        </Text>
      ) : null}
      {preview.canAccept ? (
        <>
          <Button onPress={() => void handleAccept(true)} loading={busy}>
            Принять и перейти
          </Button>
          <Button variant="outline" onPress={() => void handleAccept(false)} loading={busy}>
            Принять без переключения
          </Button>
          <Button variant="ghost" onPress={() => void handleDecline()} disabled={busy}>
            Отклонить
          </Button>
        </>
      ) : (
        <Text variant="body" color="muted">
          Статус: {INVITE_STATUS_LABELS[preview.status]}
        </Text>
      )}
    </View>
  );
}

function InviteCard({ preview }: { preview: InvitePreview }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: rhythm.stack,
        gap: rhythm.tight,
      }}
    >
      <Text variant="bodyStrong">{preview.companyName}</Text>
      <Text variant="caption" color="muted">
        Роль: {ROLE_LABELS[preview.role] ?? preview.role}
      </Text>
      {preview.inviterName ? (
        <Text variant="caption" color="muted">
          Пригласил: {preview.inviterName}
        </Text>
      ) : null}
    </View>
  );
}
