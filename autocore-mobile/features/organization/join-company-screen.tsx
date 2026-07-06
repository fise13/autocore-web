import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/authentication/auth-provider';
import { Button, Input, Text } from '@/components/ui';
import { ProfileScreenShell } from '@/features/profile/components/profile-screen-shell';
import { joinCompanyWithInviteCode } from '@/services/firestore/join-company-service';
import { NotificationService } from '@/services/notifications';
import { parseInviteTokenFromPath } from '@autocore/org';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';

function parseInviteInput(raw: string): { type: 'token'; token: string } | { type: 'code'; code: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { type: 'code', code: '' };

  const fromPath = parseInviteTokenFromPath(trimmed);
  if (fromPath) return { type: 'token', token: fromPath };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const fromUrl = parseInviteTokenFromPath(`${url.pathname}${url.search}`);
      if (fromUrl) return { type: 'token', token: fromUrl };
    } catch {
      // Fall through to invite code.
    }
  }

  return { type: 'code', code: trimmed };
}

export function JoinCompanyScreen() {
  const router = useRouter();
  const { firebaseUser, refreshProfile } = useAuth();
  const [inviteInput, setInviteInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!firebaseUser) return;
    const parsed = parseInviteInput(inviteInput);
    if (parsed.type === 'code' && !parsed.code) return;

    setLoading(true);
    setError(null);
    try {
      if (parsed.type === 'token') {
        router.push(`/invite/${encodeURIComponent(parsed.token)}` as never);
        return;
      }

      await joinCompanyWithInviteCode(firebaseUser.uid, parsed.code);
      await refreshProfile();
      await NotificationService.syncInbox();
      router.back();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileScreenShell
      title="Присоединиться"
      subtitle="Вставьте ссылку или код приглашения. Текущая компания останется в списке."
    >
      <View style={{ gap: rhythm.stack }}>
        <View style={{ gap: rhythm.inline }}>
          <Text variant="caption" color="muted">
            Ссылка или код
          </Text>
          <Input
            placeholder="https://app.myautocore.com/invite/… или DUAVV5"
            value={inviteInput}
            onChangeText={setInviteInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}

        <Button onPress={() => void handleJoin()} loading={loading} disabled={!inviteInput.trim()}>
          Присоединиться
        </Button>
      </View>
    </ProfileScreenShell>
  );
}
