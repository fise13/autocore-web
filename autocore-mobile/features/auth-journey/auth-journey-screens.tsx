import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { VerificationCodeInput } from '@/components/auth/verification-code-input';
import { Button, Input, Text } from '@/components/ui';
import { AUTH_JOURNEY_STEP_LABELS } from '@/hooks/use-auth-journey-step';
import { updateUserProfileName } from '@/services/firebase/profile';
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
      stepLabel={AUTH_JOURNEY_STEP_LABELS['profile-name']}
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
        <Button onPress={() => void handleSave()} loading={loading}>
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
  const { firebaseUser, sendEmailVerification, verifyEmailWithCode, refreshProfile, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const autoSentRef = useRef(false);
  const verifyAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoSentRef.current) return;
    autoSentRef.current = true;
    void sendEmailVerification()
      .then(() => setStatus('Код отправлен на вашу почту'))
      .catch((sendError) => {
        const message = sendError instanceof Error ? sendError.message : '';
        if (message.includes('Подождите')) {
          setStatus('Код уже отправлен — проверьте почту');
          return;
        }
        autoSentRef.current = false;
        setError(message || 'Не удалось отправить код');
      });
  }, [sendEmailVerification]);

  const verifyCode = useCallback(
    async (nextCode: string) => {
      setBusy(true);
      setError(null);
      setStatus('Проверяем код…');
      try {
        const verified = await verifyEmailWithCode(nextCode);
        if (verified) {
          setStatus('Email подтверждён. Продолжаем…');
          await refreshProfile();
          return;
        }
        setStatus(null);
        setError('Email ещё не подтверждён. Попробуйте снова.');
        verifyAttemptRef.current = null;
        setCode('');
      } catch (verifyError) {
        setError(verifyError instanceof Error ? verifyError.message : 'Неверный код');
        setStatus(null);
        verifyAttemptRef.current = null;
        setCode('');
      } finally {
        setBusy(false);
      }
    },
    [refreshProfile, verifyEmailWithCode],
  );

  useEffect(() => {
    if (code.length !== 6) return;
    if (verifyAttemptRef.current === code) return;
    verifyAttemptRef.current = code;
    void verifyCode(code);
  }, [code, verifyCode]);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setStatus(null);
    try {
      await sendEmailVerification();
      setStatus('Новый код отправлен');
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      stepLabel={AUTH_JOURNEY_STEP_LABELS['verify-email']}
      title="Подтвердите email"
      description={
        firebaseUser?.email
          ? `Введите 6-значный код из письма на ${firebaseUser.email}`
          : 'Введите код из письма, чтобы продолжить'
      }
    >
      <View style={{ gap: rhythm.stack }}>
        <VerificationCodeInput value={code} onChange={setCode} disabled={busy} invalid={Boolean(error)} />
        {status ? (
          <Text variant="caption" color="muted">
            {status}
          </Text>
        ) : null}
        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}
        <Button onPress={() => void handleResend()} loading={resending} variant="outline" disabled={busy}>
          Отправить код снова
        </Button>
        <Button variant="ghost" onPress={() => void signOut()}>
          Выйти / сменить аккаунт
        </Button>
      </View>
    </AuthShell>
  );
}
