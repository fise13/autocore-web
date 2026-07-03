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
    case 'auth/invalid-credential':
      return 'Неверный email или пароль.';
    case 'auth/email-already-in-use':
      return 'Этот email уже зарегистрирован.';
    case 'auth/weak-password':
      return 'Пароль слишком короткий (минимум 6 символов).';
    case 'auth/requires-recent-login':
      return 'Нужно войти заново, чтобы подтвердить действие.';
    case 'auth/too-many-requests':
      return 'Слишком много попыток. Попробуйте позже.';
    case 'auth/network-request-failed':
      return 'Не удалось подключиться к сети. Проверьте интернет и попробуйте снова.';
    case 'auth/operation-not-allowed':
      return 'Этот способ входа временно недоступен.';
    default:
      if (error instanceof Error && error.message) {
        if (/network|internet|offline/i.test(error.message)) {
          return 'Не удалось подключиться к сети. Проверьте интернет и попробуйте снова.';
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
