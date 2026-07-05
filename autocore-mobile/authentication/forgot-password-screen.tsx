import { Link } from 'expo-router';
import { useMemo, useState } from 'react';

import { Alert, Button, Input } from '@/components/ui';
import { useAuth } from './auth-provider';
import { AuthShell } from './auth-shell';
import { mapAuthError } from '@/utils/auth-error';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ForgotPasswordScreen() {
  const { sendPasswordReset, isOnline, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const emailError = attempted && !isValidEmail(email) ? 'Введите корректный email.' : null;
  const submitDisabled = useMemo(() => isSubmitting || !isOnline, [isOnline, isSubmitting]);

  const onSubmit = async () => {
    setAttempted(true);
    setError(null);
    setSuccess(null);
    clearError();

    if (!isValidEmail(email)) return;

    try {
      setIsSubmitting(true);
      await sendPasswordReset(email);
      setSuccess('Ссылка для сброса пароля отправлена. Проверьте входящие и папку «Спам».');
    } catch (reason) {
      setError(mapAuthError(reason));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Сброс пароля"
      description="Отправим письмо на тот же email, который вы используете для входа в AutoCore."
      footer={
        <Link href={'/login' as never} asChild>
          <Button variant="link" size="sm">
            Вернуться ко входу
          </Button>
        </Link>
      }
    >
      {!isOnline ? (
        <Alert
          variant="warning"
          title="Нет подключения"
          description="Для отправки письма нужен интернет."
        />
      ) : null}

      {success ? <Alert variant="success" title="Письмо отправлено" description={success} /> : null}
      {error ? <Alert variant="destructive" title="Не удалось отправить письмо" description={error} /> : null}

      <Input
        label="Email"
        size="lg"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="username"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="you@company.com"
        error={emailError ?? undefined}
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />

      <Button size="lg" loading={isSubmitting} disabled={submitDisabled} onPress={onSubmit} style={{ width: '100%' }}>
        Отправить ссылку
      </Button>
    </AuthShell>
  );
}
