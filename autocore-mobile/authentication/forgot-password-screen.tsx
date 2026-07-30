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

  const emailError = attempted && !isValidEmail(email) ? 'Enter a valid email address.' : null;
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
      setSuccess('A password reset link has been sent. Check your inbox and spam folder.');
    } catch (reason) {
      setError(mapAuthError(reason));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      stepLabel="Sign in and registration"
      title="Reset password"
      description="We'll send an email to the same address you use to sign in to AutoCore."
      footer={
        <Link href={'/login' as never} asChild>
          <Button variant="link" size="sm">
            Back to sign in
          </Button>
        </Link>
      }
    >
      {!isOnline ? (
        <Alert
          variant="warning"
          title="No connection"
          description="An internet connection is required to send the email."
        />
      ) : null}

      {success ? <Alert variant="success" title="Email sent" description={success} /> : null}
      {error ? <Alert variant="destructive" title="Couldn't send the email" description={error} /> : null}

      <Input
        label="Email"
        size="lg"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="username"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="your@email.com"
        error={emailError ?? undefined}
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />

      <Button size="lg" loading={isSubmitting} disabled={submitDisabled} onPress={onSubmit} style={{ width: '100%' }}>
        Send reset link
      </Button>
    </AuthShell>
  );
}
