import { useState } from 'react';
import { View } from 'react-native';
import { sendEmailVerification } from 'firebase/auth';

import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { Button, Input, Text } from '@/components/ui';
import { updateUserProfileName } from '@/services/firebase/profile';
import { mapAuthError } from '@/utils/auth-error';

export function ProfileNameJourneyScreen() {
  const { firebaseUser, refreshProfile } = useAuth();
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
      <View style={{ gap: 12 }}>
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
      </View>
    </AuthShell>
  );
}

export function VerifyEmailJourneyScreen() {
  const { firebaseUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <View style={{ gap: 12 }}>
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
        <Button onPress={handleResend} loading={loading} variant="outline">
          Отправить письмо снова
        </Button>
      </View>
    </AuthShell>
  );
}
