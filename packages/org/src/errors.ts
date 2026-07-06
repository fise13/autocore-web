export const ORG_ERROR_CODES = [
  'invite_not_found',
  'invite_expired',
  'invite_cancelled',
  'invite_declined',
  'invite_already_accepted',
  'invite_revoked',
  'invite_invalid_token',
  'email_mismatch',
  'already_member',
  'org_deleted',
  'org_not_found',
  'owner_cannot_leave',
  'sole_owner_cannot_leave',
  'not_a_member',
  'permission_denied',
  'confirmation_mismatch',
  'network_error',
  'server_unavailable',
  'auth_required',
  'unexpected',
] as const;

export type OrgErrorCode = (typeof ORG_ERROR_CODES)[number];

export type OrgErrorCopy = {
  title: string;
  message: string;
  action?: string;
};

export const ORG_ERROR_COPY: Record<OrgErrorCode, OrgErrorCopy> = {
  invite_not_found: {
    title: 'Приглашение не найдено',
    message: 'Ссылка недействительна или устарела. Попросите администратора отправить новое приглашение.',
    action: 'На главную',
  },
  invite_expired: {
    title: 'Срок приглашения истёк',
    message: 'Попросите администратора отправить новое приглашение.',
    action: 'Запросить новое',
  },
  invite_cancelled: {
    title: 'Приглашение отозвано',
    message: 'Администратор отменил это приглашение. Свяжитесь с командой организации.',
  },
  invite_declined: {
    title: 'Приглашение отклонено',
    message: 'Вы отклонили это приглашение.',
  },
  invite_already_accepted: {
    title: 'Вы уже в организации',
    message: 'Это приглашение уже принято. Откройте рабочее пространство.',
    action: 'Открыть',
  },
  invite_revoked: {
    title: 'Приглашение отозвано',
    message: 'Администратор отменил это приглашение.',
  },
  invite_invalid_token: {
    title: 'Некорректная ссылка',
    message: 'Проверьте ссылку из письма или попросите отправить приглашение заново.',
  },
  email_mismatch: {
    title: 'Другой аккаунт',
    message: 'Это приглашение отправлено на другой email. Войдите под указанным адресом или смените аккаунт.',
    action: 'Сменить аккаунт',
  },
  already_member: {
    title: 'Вы уже в организации',
    message: 'Ваш аккаунт уже состоит в этой организации.',
    action: 'Открыть',
  },
  org_deleted: {
    title: 'Организация удалена',
    message: 'Эта организация больше не существует.',
  },
  org_not_found: {
    title: 'Организация не найдена',
    message: 'Компания не существует или была удалена.',
  },
  owner_cannot_leave: {
    title: 'Нельзя покинуть организацию',
    message: 'Владелец не может покинуть организацию. Передайте владение или удалите организацию.',
    action: 'Настройки',
  },
  sole_owner_cannot_leave: {
    title: 'Вы единственный владелец',
    message: 'Назначьте другого владельца или удалите организацию в разделе «Опасная зона».',
    action: 'Настройки',
  },
  not_a_member: {
    title: 'Нет доступа',
    message: 'Вы не состоите в этой организации.',
  },
  permission_denied: {
    title: 'Недостаточно прав',
    message: 'У вас нет прав для этого действия.',
  },
  confirmation_mismatch: {
    title: 'Подтверждение не совпало',
    message: 'Введите точное название организации для подтверждения.',
  },
  network_error: {
    title: 'Нет соединения',
    message: 'Проверьте подключение к интернету и попробуйте снова.',
    action: 'Повторить',
  },
  server_unavailable: {
    title: 'Сервер недоступен',
    message: 'Попробуйте позже.',
    action: 'Повторить',
  },
  auth_required: {
    title: 'Требуется вход',
    message: 'Войдите или зарегистрируйтесь, чтобы принять приглашение.',
    action: 'Войти',
  },
  unexpected: {
    title: 'Что-то пошло не так',
    message: 'Не удалось выполнить действие. Попробуйте ещё раз.',
    action: 'Повторить',
  },
};

export class OrgError extends Error {
  code: OrgErrorCode;
  status: number;

  constructor(code: OrgErrorCode, status = 400, message?: string) {
    const copy = ORG_ERROR_COPY[code];
    super(message ?? copy.message);
    this.name = 'OrgError';
    this.code = code;
    this.status = status;
  }

  get copy(): OrgErrorCopy {
    return ORG_ERROR_COPY[this.code];
  }
}

export function mapToOrgError(error: unknown): OrgError {
  if (error instanceof OrgError) return error;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('permission-denied') || msg.includes('недостаточно прав')) {
      return new OrgError('permission_denied', 403);
    }
    if (msg.includes('истёк') || msg.includes('expired')) {
      return new OrgError('invite_expired', 410);
    }
    if (msg.includes('отозван') || msg.includes('cancelled') || msg.includes('revoked')) {
      return new OrgError('invite_cancelled', 410);
    }
    if (msg.includes('уже') && msg.includes('организа')) {
      return new OrgError('already_member', 409);
    }
    if (msg.includes('другой email') || msg.includes('email')) {
      return new OrgError('email_mismatch', 409);
    }
    if (msg.includes('не найден')) {
      return new OrgError('invite_not_found', 404);
    }
    if (msg.includes('авторизац') || msg.includes('войдите')) {
      return new OrgError('auth_required', 401);
    }
    return new OrgError('unexpected', 500, error.message);
  }

  return new OrgError('unexpected', 500);
}

export function orgErrorResponse(error: unknown): { code: OrgErrorCode; error: string; title: string; action?: string; status: number } {
  const orgError = mapToOrgError(error);
  return {
    code: orgError.code,
    error: orgError.message,
    title: orgError.copy.title,
    action: orgError.copy.action,
    status: orgError.status,
  };
}
