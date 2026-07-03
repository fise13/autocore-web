import { AUTH_BUTTON_HEIGHT, AUTH_BUTTON_RADIUS } from '@/authentication/auth-button-metrics';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';

import { CheckIcon, Loader2Icon, XIcon } from '@/assets/icons';
import { Alert, Button, Input, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/hooks';
import { spacing } from '@/theme';
import { mapAuthError } from '@/utils/auth-error';
import { getPasswordStrengthState, validateSignupPassword } from '@/utils/password-validation';
import { resolveEmailSignInMode, type EmailSignInMode } from '@/utils/resolve-email-sign-in-mode';
import { isAppleSignInCancellation } from '@/services/auth/apple-sign-in';

import { AuthDivider } from './auth-divider';
import { AppleSignInButton } from './apple-sign-in-button';
import { GoogleSignInButton } from './google-sign-in-button';
import { useAuth } from './auth-provider';
import { AuthShell } from './auth-shell';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginScreen() {
  const { colors } = useTheme();
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

  const reducedMotion = useReducedMotion();
  const isSignUp = emailMode === 'signup';
  const displayError = error ?? authError;

  useEffect(() => {
    import('@/services/auth/apple-sign-in')
      .then((module) => module.isAppleSignInAvailable())
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

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

  const authDescription = emailStep
    ? emailMode === 'signup'
      ? 'Создайте пароль и укажите имя для аккаунта AutoCore.'
      : emailMode === 'oauth'
        ? 'Войдите тем же способом, который привязан к этому email.'
        : 'Введите пароль для входа в AutoCore.'
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
      title="Войти или создать аккаунт"
      description={authDescription}
      footer={
        <Text variant="caption" color="muted" style={{ textAlign: 'center', maxWidth: 300, lineHeight: 16 }}>
          Продолжая, вы соглашаетесь с Условиями использования и Политикой конфиденциальности.
        </Text>
      }
    >
      {!isFirebaseReady ? (
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

      <Animated.View key={stepKey} entering={entering} exiting={exiting} style={{ width: '100%', gap: spacing[3] }}>
      {!emailStep ? (
        <>
          <View style={{ gap: spacing[2], width: '100%' }}>
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
            {appleAvailable ? (
              <AppleSignInButton
                disabled={submitDisabled}
                loading={oauthLoading === 'apple'}
                onPress={onApplePress}
              />
            ) : null}
          </View>

          <AuthDivider>ИЛИ</AuthDivider>

          <View style={{ gap: spacing[2], width: '100%' }}>
            <Text variant="caption" color="muted">Email для входа или создания аккаунта</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="username"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="ваш@email.ru"
              invalid={Boolean(emailError)}
              returnKeyType="done"
              onSubmitEditing={onEmailContinue}
            />
            {emailError ? <Text variant="caption" style={{ color: colors.destructive }}>{emailError}</Text> : null}
          </View>

          <Button
            size="default"
            disabled={submitDisabled}
            onPress={onEmailContinue}
            leftIcon={isDetecting ? <Loader2Icon size="sm" color={colors.primaryForeground} /> : undefined}
            style={{ width: '100%', height: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS }}
          >
            {isDetecting ? 'Проверяем email…' : 'Продолжить с email'}
          </Button>

          <Pressable onPress={() => void onForgotPassword()} disabled={submitDisabled}>
            <Text variant="caption" color="muted" style={{ textDecorationLine: 'underline' }}>
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
          <View style={{ gap: spacing[1.5], width: '100%' }}>
            <Text variant="caption" color="muted">Email</Text>
            <Input value={email} editable={false} selectTextOnFocus={false} />
          </View>

          <Text variant="small" color="muted">
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

          <Button variant="link" size="sm" style={{ alignSelf: 'flex-start' }} onPress={changeEmail}>
            Изменить email
          </Button>
        </>
      ) : (
        <>
          <View style={{ gap: spacing[2], width: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="caption" color="muted">
                Email
              </Text>
              <Button variant="link" size="sm" style={{ height: undefined, minHeight: undefined }} onPress={changeEmail}>
                Назад
              </Button>
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
              editable={!isSubmitting}
            />
          </View>

          {isSignUp ? (
            <View style={{ gap: spacing[2], width: '100%' }}>
              <View style={{ gap: spacing[2] }}>
                <Text variant="caption" color="muted">
                  Имя
                </Text>
                <Input
                  value={firstName}
                  onChangeText={setFirstName}
                  textContentType="givenName"
                  autoCapitalize="words"
                  placeholder="Имя"
                  invalid={Boolean(nameError)}
                />
              </View>
              <View style={{ gap: spacing[2] }}>
                <Text variant="caption" color="muted">
                  Фамилия
                </Text>
                <Input
                  value={lastName}
                  onChangeText={setLastName}
                  textContentType="familyName"
                  autoCapitalize="words"
                  placeholder="Фамилия"
                  invalid={Boolean(nameError)}
                />
              </View>
            </View>
          ) : null}

          {nameError ? <Text variant="caption" style={{ color: colors.destructive }}>{nameError}</Text> : null}

          <View style={{ gap: spacing[2], width: '100%' }}>
            <Text variant="caption" color="muted">
              {isSignUp ? 'Придумайте пароль' : 'Пароль'}
            </Text>
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isSignUp ? 'newPassword' : 'password'}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={isSignUp ? '' : 'Введите пароль'}
              invalid={Boolean(passwordError)}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            {passwordError ? <Text variant="caption" style={{ color: colors.destructive }}>{passwordError}</Text> : null}
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
          </View>

          <Button
            size="default"
            loading={isSubmitting}
            disabled={submitDisabled}
            onPress={onSubmit}
            style={{ width: '100%', height: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS }}
          >
            {isSubmitting ? (isSignUp ? 'Создание аккаунта…' : 'Вход…') : isSignUp ? 'Создать аккаунт' : 'Войти по почте'}
          </Button>

          {!isSignUp ? (
            <>
              <Link href={'/forgot-password' as never} asChild>
                <Button variant="link" size="sm" style={{ alignSelf: 'flex-start' }}>
                  Забыли пароль?
                </Button>
              </Link>
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

      {displayError ? (
        <Text variant="small" style={{ color: colors.destructive }}>
          {displayError}
        </Text>
      ) : null}
    </AuthShell>
  );
}
