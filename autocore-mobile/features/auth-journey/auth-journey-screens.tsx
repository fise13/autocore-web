import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { sendEmailVerification } from 'firebase/auth';

import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, Input, Text } from '@/components/ui';
import { updateUserProfileName } from '@/services/firebase/profile';
import { refreshCurrentUser } from '@/services/firebase/auth';
import { mapAuthError } from '@/utils/auth-error';
import { rhythm } from '@/theme';

export function ProfileNameJourneyScreen() {
  const { firebaseUser, refreshProfile, signOut } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!firebaseUser) return;
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
    if (fullName.split(/\s+/).length < 2) {
      setError('Укажите имя и фамилию');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateUserProfileName(firebaseUser.uid, fullName);
      await refreshProfile();
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Ваш профиль"
      description="Укажите имя и фамилию — так коллеги увидят вас в заказ-нарядах и уведомлениях."
    >
      <View style={{ gap: rhythm.stack }}>
        <Input placeholder="Имя" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Input placeholder="Фамилия" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}
        <Button onPress={handleSave} loading={loading}>
          Продолжить
        </Button>
        <Button variant="ghost" onPress={() => void signOut()}>
          Выйти
        </Button>
      </View>
    </AuthShell>
  );
}

export function VerifyEmailJourneyScreen() {
  const { firebaseUser, refreshProfile, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkVerified = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setChecking(true);
        setError(null);
      }
      try {
        const user = await refreshCurrentUser(true);
        if (user?.emailVerified) {
          setMessage('Email подтверждён. Продолжаем…');
          await refreshProfile();
          return true;
        }
        if (!opts?.silent) {
          setError('Email ещё не подтверждён. Откройте письмо и нажмите ссылку.');
        }
        return false;
      } catch (cause) {
        if (!opts?.silent) setError(mapAuthError(cause));
        return false;
      } finally {
        if (!opts?.silent) setChecking(false);
      }
    },
    [refreshProfile],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkVerified({ silent: true });
      }
    });
    return () => sub.remove();
  }, [checkVerified]);

  const handleResend = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await sendEmailVerification(firebaseUser);
      setMessage('Письмо отправлено. Проверьте почту и подтвердите адрес.');
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Подтвердите email"
      description={
        firebaseUser?.email
          ? `Мы отправили письмо на ${firebaseUser.email}. Подтвердите адрес, чтобы продолжить.`
          : 'Подтвердите email, чтобы продолжить.'
      }
    >
      <View style={{ gap: rhythm.stack }}>
        {message ? (
          <Text variant="caption" color="muted">
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}
        <Button onPress={() => void checkVerified()} loading={checking}>
          Я подтвердил email
        </Button>
        <Button onPress={handleResend} loading={loading} variant="outline">
          Отправить письмо снова
        </Button>
        <Button variant="ghost" onPress={() => void signOut()}>
          Выйти / сменить аккаунт
        </Button>
      </View>
    </AuthShell>
  );
}
