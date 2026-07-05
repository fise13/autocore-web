type AuthErrorCode = string | null;

export function getAuthErrorCode(error: unknown): AuthErrorCode {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }

  if (error instanceof Error) {
    const match = error.message.match(/\b(auth\/[a-z0-9-]+)\b/i);
    return match?.[1] ?? null;
  }

  return null;
}

export function mapAuthError(error: unknown): string {
  const code = getAuthErrorCode(error);

  switch (code) {
    case 'auth/invalid-email':
      return 'Некорректный email.';
    case 'auth/user-disabled':
      return 'Аккаунт отключён.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Неверный email или пароль.';
    case 'auth/password-required':
      return 'Введите текущий пароль, чтобы удалить аккаунт.';
    case 'auth/requires-recent-login':
      return 'Нужно подтвердить личность ещё раз, затем повторите удаление.';
    case 'auth/invalid-credential':
      return 'Не удалось подтвердить вход. Попробуйте ещё раз.';
    case 'auth/account-exists-with-different-credential':
      return 'Этот email уже связан с другим способом входа.';
    case 'auth/email-already-in-use':
      return 'Этот email уже зарегистрирован.';
    case 'auth/weak-password':
      return 'Пароль слишком короткий (минимум 6 символов).';
    case 'auth/too-many-requests':
      return 'Слишком много попыток. Попробуйте позже.';
    case 'auth/network-request-failed':
      return 'Не удалось подключиться к сети. Проверьте интернет и попробуйте снова.';
    case 'auth/operation-not-allowed':
      return 'Этот способ входа временно недоступен. Включите Apple в Firebase Console.';
    default:
      if (error instanceof Error && error.message) {
        if (/network|internet|offline/i.test(error.message)) {
          return 'Не удалось подключиться к сети. Проверьте интернет и попробуйте снова.';
        }
        if (/apple sign in не настроен|apple sign in недоступен|apple не вернул/i.test(error.message)) {
          return error.message;
        }
        if (/authorization attempt failed|authenticationServices/i.test(error.message)) {
          return 'Apple Sign In не настроен в этой сборке. Пересоберите приложение: npx expo run:ios.';
        }
        if (/apple/i.test(error.message)) {
          return error.message;
        }
        if (/signInWithIdp|INVALID_IDP_RESPONSE|FEDERATED_USER_ID_ALREADY_LINKED/i.test(error.message)) {
          return 'Не удалось подтвердить вход через Apple. Попробуйте снова или войдите по email.';
        }
        return error.message.replace(/\s*\([a-z0-9/-]+\)\s*$/i, '').trim();
      }
      return 'Не удалось выполнить вход. Попробуйте снова.';
  }
}

export function isOfflineError(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  if (code === 'auth/network-request-failed') return true;
  return error instanceof Error ? /network|internet|offline/i.test(error.message) : false;
}
