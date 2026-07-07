import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';

import { CheckIcon, Loader2Icon, MailIcon, XIcon } from '@/assets/icons';
import { Alert, Button, FormStack, Input, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { form, rhythm, spacing } from '@/theme';
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

import { AuthDivider } from './auth-divider';
import { AuthEmailChip } from './auth-email-chip';
import { AppleSignInButton } from './apple-sign-in-button';
import { GoogleSignInButton } from './google-sign-in-button';
import { InviteFormNotice } from './invite-form-notice';
import { useAuth } from './auth-provider';
import { AuthShell } from './auth-shell';

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
  const inviteBootstrapRef = useRef(false);

  const oauthConfigured = isGoogleOAuthConfigured();
  const showGoogleSignIn = oauthConfigured && (Platform.OS !== 'ios' || appleAvailable);
  const showAppleSignIn = Platform.OS === 'ios' && appleAvailable && oauthConfigured;
  const reducedMotion = useReducedMotion();
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
  const emailError = emailAttempted && !isValidEmail(email) ? 'Введите корректный email.' : null;
  const passwordError = credentialAttempted
    ? isSignUp
      ? validateSignupPassword(password)
      : password.trim().length < 6
        ? 'Пароль слишком короткий (минимум 6 символов).'
        : null
    : null;
  const nameError = credentialAttempted && isSignUp && (!firstName.trim() || !lastName.trim()) ? 'Укажите имя и фамилию.' : null;

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
      setError('Apple Sign In недоступен на этом устройстве.');
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
      if (isSignUp && message.includes('уже зарегистрирован')) {
        setEmailMode('login');
        setFirstName('');
        setLastName('');
        setCredentialAttempted(false);
        setError('Этот email уже зарегистрирован. Введите пароль для входа.');
        return;
      }

      if (!isSignUp && message.includes('Неверный email или пароль')) {
        try {
          const lookup = await resolveSignInMethodsForEmail(email);
          if (lookup.apiResolved && lookup.methods.length === 0) {
            setStepDirection(1);
            setEmailMode('signup');
            setFirstName('');
            setLastName('');
            setCredentialAttempted(false);
            setError('Аккаунта с этим email нет. Придумайте пароль для регистрации.');
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
    ? 'Создать аккаунт'
    : isInviteFlow && emailStep
      ? 'Вход в команду'
      : 'Войти или создать аккаунт';

  const authDescription = isInviteFlow && emailStep
    ? isSignUp
      ? 'Email уже указан в приглашении — осталось придумать пароль и имя.'
      : 'Email уже указан в приглашении — введите пароль.'
    : isInviteFlow
      ? 'Загружаем приглашение…'
      : 'Вход в AutoCore или регистрация новой команды.';

  const stepKey = !emailStep ? 'entry' : emailMode;
  const entering = reducedMotion
    ? undefined
    : stepDirection === 1
      ? FadeInRight.duration(220)
      : FadeInLeft.duration(220);
  const exiting = reducedMotion
    ? undefined
    : stepDirection === 1
      ? FadeOutLeft.duration(180)
      : FadeOutRight.duration(180);

  return (
    <AuthShell
      stepLabel="Вход и регистрация"
      footer={
        <Text variant="caption" color="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          Нажимая «Продолжить», вы соглашаетесь с{' '}
          <Text
            variant="caption"
            style={{ textDecorationLine: 'underline' }}
            onPress={() => void Linking.openURL('https://myautocore.com/legal/terms')}
          >
            Условиями использования
          </Text>{' '}
          и{' '}
          <Text
            variant="caption"
            style={{ textDecorationLine: 'underline' }}
            onPress={() => void Linking.openURL('https://myautocore.com/legal/privacy')}
          >
            Политикой конфиденциальности
          </Text>
          .
        </Text>
      }
    >
      <View style={{ gap: rhythm.micro }}>
        <Text
          variant="pageTitle"
          style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.4, lineHeight: 30 }}
        >
          {authTitle}
        </Text>
        <Text variant="pageSubtitle" style={{ fontSize: 16, lineHeight: 22 }} color="muted">
          {authDescription}
        </Text>
      </View>
      {!isFirebaseReady && __DEV__ ? (
        <Alert
          variant="warning"
          title="Firebase не настроен"
          description="Добавьте `EXPO_PUBLIC_FIREBASE_*` переменные окружения для mobile-приложения."
        />
      ) : null}

      {!isOnline ? (
        <Alert
          variant="warning"
          title="Нет подключения"
          description="Проверьте интернет. Без сети вход и сброс пароля недоступны."
        />
      ) : null}

      {inviteBootstrapping ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 }}>
          <Loader2Icon size="sm" color={colors.mutedForeground} />
          <Text variant="caption" color="muted">
            Загружаем приглашение…
          </Text>
        </View>
      ) : (
      <Animated.View key={stepKey} entering={entering} exiting={exiting} style={{ width: '100%', gap: form.groupGap }}>
      {!emailStep ? (
        <>
          <View style={{ gap: spacing[2], width: '100%' }}>
            {showGoogleSignIn ? (
              <GoogleSignInButton
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
                disabled={submitDisabled}
                loading={oauthLoading === 'apple'}
                onPress={onApplePress}
              />
            ) : null}
          </View>

          <AuthDivider>ИЛИ</AuthDivider>

          <View style={{ gap: spacing[2], width: '100%' }}>
            <Text variant="caption" color="muted" style={{ fontSize: form.captionFontSize }}>
              Email для входа или создания аккаунта
            </Text>
            <Input
              size="lg"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="username"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="ваш@email.ru"
              error={emailError ?? undefined}
              returnKeyType="done"
              onSubmitEditing={onEmailContinue}
              leftIcon={<MailIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />}
            />
          </View>

          <Button
            size="default"
            disabled={submitDisabled}
            onPress={onEmailContinue}
            leftIcon={isDetecting ? <Loader2Icon size="sm" color={colors.primaryForeground} /> : undefined}
            style={{ width: '100%', height: form.controlHeightLg }}
          >
            {isDetecting ? 'Проверяем email…' : 'Продолжить с email'}
          </Button>

          <Pressable onPress={() => void onForgotPassword()} disabled={submitDisabled} style={{ alignItems: 'center' }}>
            <Text variant="caption" color="muted" style={{ fontSize: 14, textDecorationLine: 'underline' }}>
              Забыли пароль?
            </Text>
          </Pressable>

          {resetSent ? (
            <Text variant="caption" color="muted">
              Ссылка для сброса пароля отправлена на {email}.
            </Text>
          ) : null}
        </>
      ) : emailMode === 'oauth' ? (
        <>
          <AuthEmailChip
            email={email}
            onAction={changeEmail}
            actionDisabled={submitDisabled}
          />

          {isInviteFlow ? <InviteFormNotice companyName={inviteCompanyName} /> : null}

          <Text variant="small" color="muted" style={{ lineHeight: 20 }}>
            Этот email зарегистрирован через{' '}
            {oauthProviders.includes('google.com') ? 'Google' : 'Apple'}
            {oauthProviders.length > 1 ? ' или Apple' : ''}. Войдите тем же способом.
          </Text>

          <View style={{ gap: spacing[2], width: '100%' }}>
            {oauthProviders.includes('google.com') ? (
              <GoogleSignInButton
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
                disabled={submitDisabled}
                loading={oauthLoading === 'apple'}
                onPress={onApplePress}
              />
            ) : null}
          </View>
        </>
      ) : (
        <>
          <View style={{ gap: spacing[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="caption" color="muted" style={{ fontSize: form.captionFontSize }}>
                Email
              </Text>
              <Pressable disabled={submitDisabled || isInviteFlow} onPress={changeEmail}>
                <Text variant="caption" style={{ color: colors.primary, textDecorationLine: 'underline' }}>
                  Назад
                </Text>
              </Pressable>
            </View>
            <Input
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="username"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="ваш@email.ru"
              returnKeyType="next"
              editable={!isSubmitting && !isInviteFlow}
              selectTextOnFocus={!isInviteFlow}
              size="lg"
              leftIcon={<MailIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />}
            />
          </View>

          {isInviteFlow ? <InviteFormNotice companyName={inviteCompanyName} /> : null}

          <FormStack gap={form.fieldGap}>
            {isSignUp ? (
              <>
                <Input
                  label="Имя"
                  size="lg"
                  value={firstName}
                  onChangeText={setFirstName}
                  textContentType="givenName"
                  autoCapitalize="words"
                  placeholder="Имя"
                  error={nameError ?? undefined}
                />
                <Input
                  label="Фамилия"
                  size="lg"
                  value={lastName}
                  onChangeText={setLastName}
                  textContentType="familyName"
                  autoCapitalize="words"
                  placeholder="Фамилия"
                />
              </>
            ) : null}

            <Input
              label={isSignUp ? 'Придумайте пароль' : 'Пароль'}
              size="lg"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isSignUp ? 'newPassword' : 'password'}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={isSignUp ? '' : 'Введите пароль'}
              error={passwordError ?? undefined}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            {isSignUp ? (
              <View style={{ gap: spacing[2] }}>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing[1],
                  }}
                >
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
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: active ? tone : colors.borderMuted,
                        }}
                      />
                    );
                  })}
                </View>
                <Text variant="body" color="muted">
                  {passwordStrength.strengthText}. Должен содержать:
                </Text>
                <View style={{ gap: spacing[2] }}>
                  {passwordStrength.requirements.map((requirement) => (
                    <View key={requirement.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      {requirement.met ? (
                        <CheckIcon size="sm" color={colors.success} />
                      ) : (
                        <XIcon size="sm" color={colors.mutedForeground} />
                      )}
                      <Text variant="body" color={requirement.met ? 'primary' : 'muted'}>
                        {requirement.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </FormStack>

          <Button
            size="default"
            loading={isSubmitting}
            disabled={submitDisabled}
            onPress={onSubmit}
            style={{ width: '100%', height: form.controlHeightLg }}
          >
            {isSubmitting ? (isSignUp ? 'Создание аккаунта…' : 'Вход…') : isSignUp ? 'Создать аккаунт' : 'Войти по почте'}
          </Button>

          {!isSignUp ? (
            <>
              <Pressable onPress={() => void onForgotPassword()} disabled={submitDisabled} style={{ alignItems: 'center' }}>
                <Text variant="caption" color="muted" style={{ fontSize: 14, textDecorationLine: 'underline' }}>
                  Забыли пароль?
                </Text>
              </Pressable>
              {resetSent ? (
                <Text variant="caption" color="muted">
                  Ссылка для сброса пароля отправлена на {email}.
                </Text>
              ) : null}
            </>
          ) : null}
        </>
      )}
      </Animated.View>
      )}

      {displayError ? (
        <Text variant="small" style={{ color: colors.destructive, lineHeight: 20 }}>
          {displayError}
        </Text>
      ) : null}
    </AuthShell>
  );
}
