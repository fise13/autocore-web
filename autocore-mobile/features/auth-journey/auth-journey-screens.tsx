import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/authentication/auth-shell';
import { useAuth } from '@/authentication/auth-provider';
import { VerificationCodeInput } from '@/components/auth/verification-code-input';
import { Button, FormStack, Input, Text } from '@/components/ui';
import {
  AUTH_JOURNEY_STEP_LABELS,
  authJourneyProgressLabel,
} from '@/hooks/use-auth-journey-step';
import { updateUserProfileName } from '@/services/firebase/profile';
import { mapAuthError } from '@/utils/auth-error';
import { form, rhythm } from '@/theme';

export function ProfileNameJourneyScreen() {
  const { firebaseUser, refreshProfile, signOut } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const nameError =
    attempted && (!firstName.trim() || !lastName.trim())
      ? 'Enter your first and last name.'
      : null;

  const handleSave = async () => {
    if (!firebaseUser) return;
    setAttempted(true);
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      setError('Enter your first and last name');
      return;
    }

    const fullName = `${trimmedFirst} ${trimmedLast}`;
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
      progressLabel={authJourneyProgressLabel('profile-name')}
      title="What should we call you?"
      description="Your name appears on work orders, the team list, and notifications."
      stepKey="profile-name"
    >
      <FormStack gap={form.fieldGap}>
        <Input
          label="First name"
          size="lg"
          placeholder="First name"
          value={firstName}
          onChangeText={setFirstName}
          textContentType="givenName"
          autoCapitalize="words"
          error={nameError ?? undefined}
        />
        <Input
          label="Last name"
          size="lg"
          placeholder="Last name"
          value={lastName}
          onChangeText={setLastName}
          textContentType="familyName"
          autoCapitalize="words"
          error={nameError ?? undefined}
        />
        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}
        <Button size="lg" onPress={() => void handleSave()} loading={loading}>
          Continue
        </Button>
        <Button variant="ghost" onPress={() => void signOut()}>
          Sign out
        </Button>
      </FormStack>
    </AuthShell>
  );
}

export function VerifyEmailJourneyScreen() {
  const { firebaseUser, sendEmailVerification, verifyEmailWithCode, refreshProfile, signOut } =
    useAuth();
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
      .then(() => setStatus('Code sent to your email'))
      .catch((sendError) => {
        const message = sendError instanceof Error ? sendError.message : '';
        if (message.includes('Подождите') || /wait|too many/i.test(message)) {
          setStatus('Code already sent — check your email');
          return;
        }
        autoSentRef.current = false;
        setError(message || 'Could not send the code');
      });
  }, [sendEmailVerification]);

  const verifyCode = useCallback(
    async (nextCode: string) => {
      setBusy(true);
      setError(null);
      setStatus('Checking code…');
      try {
        const verified = await verifyEmailWithCode(nextCode);
        if (verified) {
          setStatus('Email verified. Continuing…');
          await refreshProfile();
          return;
        }
        setStatus(null);
        setError('Email not verified yet. Please try again.');
        verifyAttemptRef.current = null;
        setCode('');
      } catch (verifyError) {
        setError(verifyError instanceof Error ? verifyError.message : 'Invalid code');
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
      setStatus('New code sent');
    } catch (cause) {
      setError(mapAuthError(cause));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      stepLabel={AUTH_JOURNEY_STEP_LABELS['verify-email']}
      progressLabel={authJourneyProgressLabel('verify-email')}
      title="Check your email"
      description={
        firebaseUser?.email
          ? `Enter the 6-digit code we sent to ${firebaseUser.email}`
          : 'Enter the 6-digit code from your email to continue.'
      }
      stepKey="verify-email"
    >
      <View style={{ gap: rhythm.stack }}>
        <VerificationCodeInput
          value={code}
          onChange={setCode}
          disabled={busy}
          invalid={Boolean(error)}
        />
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
        <Button
          size="lg"
          onPress={() => void handleResend()}
          loading={resending}
          variant="outline"
          disabled={busy}
        >
          Resend code
        </Button>
        <Button variant="ghost" onPress={() => void signOut()}>
          Sign out / switch account
        </Button>
      </View>
    </AuthShell>
  );
}
