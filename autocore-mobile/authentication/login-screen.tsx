import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';

import { Loader2Icon } from '@/assets/icons';
import { Alert, Button, FormStack, Input, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { radius, spacing, duration } from '@/theme';
import { mapAuthError } from '@/utils/auth-error';
import { getPasswordStrengthState, validateSignupPassword } from '@/utils/password-validation';
import { resolveEmailSignInMode, type EmailSignInMode } from '@/utils/resolve-email-sign-in-mode';
import { isAppleSignInCancellation } from '@/services/auth/apple-sign-in';
import {
  readInviteCompanyName,
  readInviteEmail,
  readInviteToken,
  storePendingInvite,
} from '@/lib/invites/pending-invite';
import { fetchInvitePreview } from '@/services/api/org-api';
import { isGoogleOAuthConfigured } from '@/lib/auth/oauth-config';

import { AUTH_HERO_BUTTON_HEIGHT } from './auth-button-metrics';
import { AuthEmailChip } from './auth-email-chip';
import { AuthEmailPill } from './auth-email-pill';
import { AppleSignInButton } from './apple-sign-in-button';
import { GoogleSignInButton } from './google-sign-in-button';
import { InviteFormNotice } from './invite-form-notice';
import { useAuth } from './auth-provider';
import { AuthHeroShell } from './auth-hero-shell';
import { useAuthPressSpring } from './auth-motion';
import { AuthSocialCluster } from './auth-social-cluster';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ invite?: string; mode?: string }>();
  const {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    resolveSignInMethodsForEmail,
    sendPasswordResetForEmail,
    isOnline,
    error: authError,
    clearError,
    isFirebaseReady,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailStep, setEmailStep] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailSignInMode>('login');
  const [oauthProviders, setOauthProviders] = useState<Array<'google.com' | 'apple.com'>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailAttempted, setEmailAttempted] = useState(false);
  const [credentialAttempted, setCredentialAttempted] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const [inviteFlowActive, setInviteFlowActive] = useState(false);
  const [inviteCompanyName, setInviteCompanyName] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const inviteBootstrapRef = useRef(false);

  const oauthConfigured = isGoogleOAuthConfigured();
  const showGoogleSignIn = oauthConfigured && (Platform.OS !== 'ios' || appleAvailable);
  const showAppleSignIn = Platform.OS === 'ios' && appleAvailable && oauthConfigured;
  const reducedMotion = useReducedMotion();
  const primaryPress = useAuthPressSpring(0.975);
  const isSignUp = emailMode === 'signup';
  const displayError = error ?? authError;
  const inviteTokenParam = params.invite?.trim() ?? '';
  const isInviteFlow =
    inviteFlowActive || Boolean(inviteCompanyName) || Boolean(inviteTokenParam);
  const inviteBootstrapping = isInviteFlow && isDetecting && !emailStep;

  useEffect(() => {
    import('@/services/auth/apple-sign-in')
      .then((module) => module.isAppleSignInAvailable())
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    if (inviteBootstrapRef.current) return;

    const token = inviteTokenParam || readInviteToken() || '';
    const pendingInviteEmail = readInviteEmail();

    if (!token && !pendingInviteEmail) return;
    inviteBootstrapRef.current = true;
    setInviteFlowActive(true);

    let cancelled = false;

    void (async () => {
      setIsDetecting(true);
      setError(null);
      clearError();
      setResetSent(false);

      try {
        let inviteEmail = pendingInviteEmail;
        let companyName = readInviteCompanyName();

        if (token) {
          storePendingInvite({ token });
          if (!inviteEmail || !companyName) {
            const response = await fetchInvitePreview(token);
            inviteEmail = response.preview.email ?? inviteEmail;
            companyName = response.preview.companyName?.trim() || companyName;
            storePendingInvite({
              token,
              email: inviteEmail ?? undefined,
              companyName: companyName ?? undefined,
            });
          }
        }

        if (cancelled) return;
        if (!inviteEmail?.trim()) {
          setIsDetecting(false);
          return;
        }

        setEmail(inviteEmail);
        setInviteCompanyName(companyName);

        const lookup = await resolveSignInMethodsForEmail(inviteEmail);
        if (cancelled) return;

        const resolved = resolveEmailSignInMode(lookup.methods);
        const forcedSignup = params.mode === 'signup';
        setStepDirection(1);
        setEmailMode(forcedSignup ? 'signup' : resolved.mode);
        setOauthProviders(resolved.oauthProviders);
        setEmailStep(true);
        setCredentialAttempted(false);
        setPassword('');
        setFirstName('');
        setLastName('');
      } catch (cause) {
        if (!cancelled) {
          setError(mapAuthError(cause));
        }
      } finally {
        if (!cancelled) {
          setIsDetecting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearError, inviteTokenParam, params.mode, resolveSignInMethodsForEmail]);

  const passwordStrength = useMemo(() => getPasswordStrengthState(password), [password]);
  const emailError = emailAttempted && !isValidEmail(email) ? 'Enter a valid email address.' : null;
  const passwordError = credentialAttempted
    ? isSignUp
      ? validateSignupPassword(password)
      : password.trim().length < 6
        ? 'Password is too short (minimum 6 characters).'
        : null
    : null;
  const nameError = credentialAttempted && isSignUp && (!firstName.trim() || !lastName.trim()) ? 'Enter your first and last name.' : null;

  const submitDisabled = useMemo(() => {
    return isSubmitting || isDetecting || !isOnline || !isFirebaseReady || oauthLoading !== null;
  }, [isDetecting, isFirebaseReady, isOnline, isSubmitting, oauthLoading]);

  const runGoogleSignIn = async (idToken: string) => {
    setOauthLoading('google');
    clearError();
    setError(null);
    try {
      await signInWithGoogle(idToken);
    } catch (error) {
      setError(mapAuthError(error));
      throw error;
    } finally {
      setOauthLoading(null);
    }
  };

  const onApplePress = async () => {
    clearError();
    setError(null);
    if (!appleAvailable) {
      setError('Apple Sign In is not available on this device.');
      return;
    }

    try {
      setOauthLoading('apple');
      await signInWithApple();
    } catch (error) {
      if (!isAppleSignInCancellation(error)) {
        setError(mapAuthError(error));
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const onEmailContinue = async () => {
    setEmailAttempted(true);
    setError(null);
    clearError();
    setResetSent(false);

    if (!isValidEmail(email)) return;

    try {
      setIsDetecting(true);
      const lookup = await resolveSignInMethodsForEmail(email);
      const resolved = resolveEmailSignInMode(lookup.methods);
      // When API is unavailable, Firebase client hides existing emails — prefer login.
      const mode =
        !lookup.apiResolved && lookup.methods.length === 0 && resolved.mode === 'signup'
          ? 'login'
          : resolved.mode;
      setStepDirection(1);
      setEmailMode(mode);
      setOauthProviders(resolved.oauthProviders);
      setEmailStep(true);
      setCredentialAttempted(false);
      setPassword('');
      setFirstName('');
      setLastName('');
    } catch (error) {
      setError(mapAuthError(error));
    } finally {
      setIsDetecting(false);
    }
  };

  const onSubmit = async () => {
    setCredentialAttempted(true);
    setError(null);
    clearError();
    setResetSent(false);

    if (!isValidEmail(email)) {
      return;
    }

    if (isSignUp && validateSignupPassword(password)) {
      return;
    }

    if (!isSignUp && password.trim().length < 6) {
      return;
    }

    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      return;
    }

    try {
      setIsSubmitting(true);
      if (isSignUp) {
        await signUp(email, password, { firstName, lastName });
      } else {
        await signIn(email, password);
      }
    } catch (authError) {
      const message = mapAuthError(authError);
      if (isSignUp && message.includes('already registered')) {
        setEmailMode('login');
        setFirstName('');
        setLastName('');
        setCredentialAttempted(false);
        setError('This email is already registered. Enter your password to sign in.');
        return;
      }

      if (!isSignUp && message.includes('Incorrect email or password')) {
        try {
          const lookup = await resolveSignInMethodsForEmail(email);
          if (lookup.apiResolved && lookup.methods.length === 0) {
            setStepDirection(1);
            setEmailMode('signup');
            setFirstName('');
            setLastName('');
            setCredentialAttempted(false);
            setError("There's no account with this email. Choose a password to sign up.");
            return;
          }
        } catch {
          // Keep the original auth error.
        }
      }

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgotPassword = async () => {
    setEmailAttempted(true);
    setError(null);
    setResetSent(false);
    clearError();

    if (!isValidEmail(email)) {
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordResetForEmail(email);
      setResetSent(true);
    } catch (error) {
      setError(mapAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleError = (message: string) => {
    setError(message);
  };

  const changeEmail = () => {
    setStepDirection(-1);
    setEmailStep(false);
    setPassword('');
    setFirstName('');
    setLastName('');
    setError(null);
    setResetSent(false);
    setCredentialAttempted(false);
  };

  const authTitle = isInviteFlow && emailStep && isSignUp
    ? 'Create an account'
    : isInviteFlow && emailStep
      ? 'Sign in to your team'
      : 'Sign in or create an account';

  const authDescription = isInviteFlow && emailStep
    ? isSignUp
      ? 'Your email is set from the invite — choose a name and password.'
      : 'Your email is set from the invite — enter your password.'
    : emailMode === 'oauth'
      ? 'This email uses a social sign-in. Continue the same way.'
      : isSignUp
        ? 'Add your name and choose a strong password.'
        : 'Enter your password to continue.';

  const heroFieldStyle = {
    borderRadius: radius.full,
    paddingLeft: 22,
    paddingRight: 18,
  } as const;

  const stepKey = !emailStep ? 'entry' : emailMode;
  const entering = reducedMotion
    ? undefined
    : stepDirection === 1
      ? FadeInRight.duration(duration.normal)
      : FadeInLeft.duration(duration.normal);
  const exiting = reducedMotion
    ? undefined
    : stepDirection === 1
      ? FadeOutLeft.duration(duration.fast)
      : FadeOutRight.duration(duration.fast);

  const legalFooter = (
    <Text
      variant="caption"
      color="muted"
      style={{ fontSize: 11, lineHeight: 15, textAlign: 'center', letterSpacing: -0.05 }}
    >
      By continuing, you agree to the{' '}
      <Text
        variant="caption"
        style={{ fontSize: 11, lineHeight: 15, textDecorationLine: 'underline' }}
        onPress={() => void Linking.openURL('https://myautocore.com/legal/terms')}
      >
        Terms of Use
      </Text>{' '}
      and{' '}
      <Text
        variant="caption"
        style={{ fontSize: 11, lineHeight: 15, textDecorationLine: 'underline' }}
        onPress={() => void Linking.openURL('https://myautocore.com/legal/privacy')}
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );

  /** Landing — Google / Apple collapse when the email field has keyboard focus. */
  if (!emailStep && !inviteBootstrapping) {
    const showSocial = showGoogleSignIn || showAppleSignIn;

    return (
      <AuthHeroShell
        tagline={"Run your workshop\nfrom anywhere."}
        footer={legalFooter}
        compact={emailFocused}
      >
        {!isFirebaseReady && __DEV__ ? (
          <Alert
            variant="warning"
            title="Firebase is not configured"
            description="Add the `EXPO_PUBLIC_FIREBASE_*` environment variables for the mobile app."
          />
        ) : null}

        {!isOnline ? (
          <Alert
            variant="warning"
            title="No connection"
            description="Check your internet connection. Sign-in and password reset are unavailable offline."
          />
        ) : null}

        {showSocial ? (
          <AuthSocialCluster collapsed={emailFocused}>
            {showGoogleSignIn ? (
              <GoogleSignInButton
                hero
                disabled={submitDisabled}
                loading={oauthLoading === 'google'}
                onStart={() => {
                  clearError();
                  setError(null);
                }}
                onSuccess={runGoogleSignIn}
                onError={onGoogleError}
              />
            ) : null}

            {showAppleSignIn ? (
              <AppleSignInButton
                hero
                disabled={submitDisabled}
                loading={oauthLoading === 'apple'}
                onPress={onApplePress}
              />
            ) : null}
          </AuthSocialCluster>
        ) : null}

        <AuthEmailPill
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (emailAttempted) setEmailAttempted(false);
          }}
          onFocusChange={setEmailFocused}
          onSubmit={() => void onEmailContinue()}
          canSubmit={isValidEmail(email)}
          loading={isDetecting}
          disabled={submitDisabled && !isDetecting}
        />

        {emailError ? (
          <Text variant="small" style={{ color: colors.destructive, textAlign: 'center' }}>
            {emailError}
          </Text>
        ) : null}

        {displayError ? (
          <Animated.View entering={FadeIn.duration(duration.fast)} exiting={FadeOut.duration(duration.instant)}>
            <Text variant="small" style={{ color: colors.destructive, lineHeight: 20, textAlign: 'center' }}>
              {displayError}
            </Text>
          </Animated.View>
        ) : null}
      </AuthHeroShell>
    );
  }

  return (
    <AuthHeroShell
      variant="form"
      tagline={authTitle}
      description={authDescription}
      footer={legalFooter}
      onBack={isInviteFlow ? undefined : changeEmail}
      backDisabled={submitDisabled}
    >
      {!isFirebaseReady && __DEV__ ? (
        <Alert
          variant="warning"
          title="Firebase is not configured"
          description="Add the `EXPO_PUBLIC_FIREBASE_*` environment variables for the mobile app."
        />
      ) : null}

      {!isOnline ? (
        <Alert
          variant="warning"
          title="No connection"
          description="Check your internet connection. Sign-in and password reset are unavailable offline."
        />
      ) : null}

      {inviteBootstrapping ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 }}>
          <Loader2Icon size="sm" color={colors.mutedForeground} />
          <Text variant="caption" color="muted">
            Loading invite…
          </Text>
        </View>
      ) : (
        <Animated.View
          key={stepKey}
          entering={entering}
          exiting={exiting}
          style={{ width: '100%', gap: spacing[4] }}
        >
          {emailMode === 'oauth' ? (
            <>
              <AuthEmailChip email={email} />

              {isInviteFlow ? <InviteFormNotice companyName={inviteCompanyName} /> : null}

              <View style={{ gap: spacing[3], width: '100%' }}>
                {oauthProviders.includes('google.com') ? (
                  <GoogleSignInButton
                    hero
                    disabled={submitDisabled}
                    loading={oauthLoading === 'google'}
                    onStart={() => {
                      clearError();
                      setError(null);
                    }}
                    onSuccess={runGoogleSignIn}
                    onError={onGoogleError}
                  />
                ) : null}
                {oauthProviders.includes('apple.com') && appleAvailable ? (
                  <AppleSignInButton
                    hero
                    disabled={submitDisabled}
                    loading={oauthLoading === 'apple'}
                    onPress={onApplePress}
                  />
                ) : null}
              </View>
            </>
          ) : (
            <>
              <AuthEmailChip email={email} />

              {isInviteFlow ? <InviteFormNotice companyName={inviteCompanyName} /> : null}

              <FormStack gap={spacing[3]}>
                {isSignUp ? (
                  <>
                    <Input
                      label="First name"
                      labelVariant="caption"
                      value={firstName}
                      onChangeText={setFirstName}
                      textContentType="givenName"
                      autoCapitalize="words"
                      placeholder="First name"
                      error={nameError ?? undefined}
                      fieldHeight={AUTH_HERO_BUTTON_HEIGHT}
                      containerStyle={heroFieldStyle}
                      textStyle={{ fontSize: 17 }}
                    />
                    <Input
                      label="Last name"
                      labelVariant="caption"
                      value={lastName}
                      onChangeText={setLastName}
                      textContentType="familyName"
                      autoCapitalize="words"
                      placeholder="Last name"
                      fieldHeight={AUTH_HERO_BUTTON_HEIGHT}
                      containerStyle={heroFieldStyle}
                      textStyle={{ fontSize: 17 }}
                    />
                  </>
                ) : null}

                <Input
                  label={isSignUp ? 'Choose a password' : 'Password'}
                  labelVariant="caption"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType={isSignUp ? 'newPassword' : 'password'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'}
                  error={passwordError ?? undefined}
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                  fieldHeight={AUTH_HERO_BUTTON_HEIGHT}
                  containerStyle={heroFieldStyle}
                  textStyle={{ fontSize: 17 }}
                />

                {isSignUp ? (
                  <View style={{ gap: spacing[2], paddingHorizontal: 4 }}>
                    <View style={{ flexDirection: 'row', gap: spacing[1] }}>
                      {Array.from({ length: 4 }).map((_, index) => {
                        const active = index < passwordStrength.score;
                        const tone =
                          passwordStrength.barTone === 'weak'
                            ? colors.destructive
                            : passwordStrength.barTone === 'fair'
                              ? colors.warning
                              : passwordStrength.barTone === 'good'
                                ? '#d39b23'
                                : passwordStrength.barTone === 'strong'
                                  ? colors.success
                                  : colors.border;

                        return (
                          <View
                            key={index}
                            style={{
                              flex: 1,
                              height: 6,
                              borderRadius: 999,
                              backgroundColor: active ? tone : colors.borderMuted,
                            }}
                          />
                        );
                      })}
                    </View>
                    <Text
                      variant="caption"
                      color="muted"
                      style={{ fontSize: 13, lineHeight: 18, textAlign: 'center' }}
                    >
                      {passwordStrength.strengthText}
                      {!passwordStrength.isValid && password.length > 0
                        ? ` · ${passwordStrength.requirements
                            .filter((requirement) => !requirement.met)
                            .map((requirement) => requirement.text.replace(/^At least /, ''))
                            .join(', ')}`
                        : null}
                    </Text>
                  </View>
                ) : null}
              </FormStack>

              <Animated.View style={primaryPress.style}>
                <Button
                  size="xl"
                  shape="pill"
                  loading={isSubmitting}
                  disabled={submitDisabled}
                  onPressIn={primaryPress.onPressIn}
                  onPressOut={primaryPress.onPressOut}
                  onPress={onSubmit}
                  style={{ width: '100%', minHeight: AUTH_HERO_BUTTON_HEIGHT }}
                >
                  {isSubmitting
                    ? isSignUp
                      ? 'Creating account…'
                      : 'Signing in…'
                    : isSignUp
                      ? 'Create account'
                      : 'Sign in'}
                </Button>
              </Animated.View>

              {!isSignUp ? (
                <>
                  <Pressable
                    onPress={() => void onForgotPassword()}
                    disabled={submitDisabled}
                    style={{ alignItems: 'center', paddingVertical: 4 }}
                  >
                    <Text
                      variant="caption"
                      color="muted"
                      style={{ fontSize: 14, textDecorationLine: 'underline' }}
                    >
                      Forgot password?
                    </Text>
                  </Pressable>
                  {resetSent ? (
                    <Text variant="caption" color="muted" style={{ textAlign: 'center', lineHeight: 18 }}>
                      A password reset link has been sent to {email}.
                    </Text>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </Animated.View>
      )}

      {displayError ? (
        <Animated.View entering={FadeIn.duration(duration.fast)} exiting={FadeOut.duration(duration.instant)}>
          <Text
            variant="small"
            style={{ color: colors.destructive, lineHeight: 20, textAlign: 'center' }}
          >
            {displayError}
          </Text>
        </Animated.View>
      ) : null}
    </AuthHeroShell>
  );
}
