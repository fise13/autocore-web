export const userCopy = {
  appName: "AutoCore",
  defaultCompanyName: "Моя бухгалтерия",

  sync: {
    online: "Онлайн",
    offline: "Синхронизация отключена",
    syncing: "Синхронизация…",
    synced: "Синхронизировано",
    error: "Ошибка синхронизации",
    localChanges: "Изменения не отправлены",
    remoteUpdates: "Доступны обновления",
    needsAttention: "Требует внимания",
    syncNow: "Синхронизировать",
    saveLocal: "Сохранить (⌘S)",
    saved: "Сохранено",
    saving: "Сохранение…",
    pending: "Есть изменения · ⌘S",
  },

  auth: {
    signIn: "Войти",
    signUp: "Зарегистрироваться",
    signInGoogle: "Войти через Google",
    signInApple: "Войти через Apple",
    signInEmail: "Войти по email",
    createAccount: "Создать аккаунт",
    haveAccount: "У меня уже есть аккаунт",
    noAccount: "Нет аккаунта? Создать новый",
    subtitle: "Вход в рабочее пространство",
    loading: "Загрузка…",
    completing: "Подготовка рабочего пространства…",
    signingIn: "Вход…",
    creatingAccount: "Создание аккаунта…",
  },

  company: {
    welcomeTitle: "Добро пожаловать в AutoCore Web",
    welcomeDescription: "Подключите существующие данные или создайте новое рабочее пространство.",
    macQuestion: "У вас уже есть AutoCore на Mac?",
    macDescription:
      "Подключите «Мою бухгалтерию», чтобы видеть те же моторы и операции, что в приложении AutoCore.",
    macButton: "Подключить «Мою бухгалтерию»",
    newTeamTitle: "Новая команда?",
    newTeamDescription: "Создайте отдельное рабочее пространство для новой компании.",
    companyNameLabel: "Название компании",
    companyNamePlaceholder: "Например: МоторЛенд",
    createButton: "Создать компанию",
    inviteLink: "Есть код приглашения?",
    inviteTitle: "Присоединиться по приглашению",
    inviteDescription: "Введите код, который вам отправил администратор компании.",
    connectTitle: "Подключение к данным",
    connectDescription:
      "Чтобы видеть те же моторы и бухгалтерию, что в приложении AutoCore, подключите «Мою бухгалтерию».",
    connectButton: "Использовать «Мою бухгалтерию»",
    createTitle: "Создать компанию",
    createDescription: "Отдельное рабочее пространство для новой команды.",
    joinTitle: "Присоединиться по приглашению",
    inviteLabel: "Код приглашения",
    defaultTaken:
      "Компания «Моя бухгалтерия» уже создана другим пользователем. Присоединитесь по коду приглашения.",
  },

  billing: {
    title: "Подписка",
    description: "Тариф компании для облачной синхронизации, экспорта и команды.",
    planFree: "Free",
    planPro: "Pro",
    loading: "Загрузка тарифа…",
    loadError: "Не удалось загрузить тариф. Обновите страницу.",
    pastDue: "Оплата просрочена",
    renewsAt: (date: string) => `Следующее списание: ${date}`,
    upgradeMonthly: "Pro — $15 / мес",
    upgradeYearly: "Pro — $150 / год",
    manageButton: "Управлять подпиской",
    checkoutError: "Не удалось открыть оплату Stripe",
    checkoutUnavailable:
      "Сервис оплаты временно недоступен. Проверьте, что Firebase Functions задеплоены и Stripe настроен.",
    stripeNotConfigured:
      "Stripe не настроен на сервере. Добавьте STRIPE_SECRET_KEY в Firebase Functions и перезапустите.",
    notConfigured: "Stripe не настроен. Добавьте Price ID в .env.local.",
    proActiveHint: "Pro активен — доступны синхронизация, экспорт и команда.",
    freeActiveHint: "Free — базовый доступ. Pro открывает облако и команду.",
    viewPlans: "Выбрать тариф",
    openSettings: "Открыть подписку",
    askAdmin: "Обратитесь к владельцу или администратору компании для оформления Pro.",
    paywallTitle: "Нужен тариф Pro",
    paywallFooter: "Безопасная оплата через Stripe · отмена в любой момент",
    nextChargeLabel: "Следующее списание",
    nextChargeUnknown: "Дата списания появится после синхронизации со Stripe",
    planComparison: {
      title: "Сравнение тарифов",
      featureColumn: "Возможность",
      monthly: "Месяц",
      yearly: "Год",
      billingInterval: "Интервал",
      currentPlan: "Текущий план",
      proMonthlyPrice: "$15 / мес",
      proYearlyPrice: "$150 / год",
      yearlySave: "−17%",
      yearlyHint: "Экономия $30 в год по сравнению с помесячной оплатой",
      upgradeCta: "Перейти на Pro",
      hidePlans: "Скрыть тарифы",
      rows: [
        { label: "Базовый доступ к каталогу", free: true, pro: true },
        { label: "Облачная синхронизация", free: false, pro: true },
        { label: "Импорт и экспорт Excel", free: false, pro: true },
        { label: "Команда и роли", free: false, pro: true },
        { label: "«Моя бухгалтерия» в облаке", free: false, pro: true },
      ],
    },
    paywall: {
      export: {
        title: "Экспорт в Excel — Pro",
        description: "Экспорт моторов в Excel доступен на тарифе Pro.",
      },
      import: {
        title: "Импорт из Excel — Pro",
        description: "Импорт моторов из Excel доступен на тарифе Pro.",
      },
      sync: {
        title: "Синхронизация — Pro",
        description: "Облачная синхронизация моторов доступна на тарифе Pro.",
      },
      invite: {
        title: "Приглашения — Pro",
        description: "Приглашение сотрудников доступно на тарифе Pro.",
      },
      cloud_sync: {
        title: "Облако — Pro",
        description: "Подключение облачной «Моей бухгалтерии» и sync — на Pro.",
      },
    },
    features: [
      "Pro: облачная синхронизация и экспорт",
      "Pro: приглашение сотрудников",
      "Free: базовый доступ без Pro-функций",
    ],
    proActivation: {
      activatingTitle: "Активируем Pro…",
      activatingHint: "Подтверждаем оплату — это займёт несколько секунд.",
      celebrationTitle: "Добро пожаловать в Pro",
      celebrationSubtitle: "Облако, экспорт и команда — всё уже доступно вашей компании.",
      startButton: "Начать работу",
      benefits: [
        {
          title: "Облачная синхронизация",
          description: "Моторы и данные синхронизируются между web и Mac.",
        },
        {
          title: "Импорт и экспорт Excel",
          description: "Загружайте и выгружайте каталог без ограничений.",
        },
        {
          title: "Экспорт в один клик",
          description: "Выгрузка моторов из таблицы в Excel на тарифе Pro.",
        },
        {
          title: "Команда и приглашения",
          description: "Добавляйте сотрудников и управляйте ролями.",
        },
        {
          title: "«Моя бухгалтерия» в облаке",
          description: "Подключение облачной синхронизации и расширенных настроек.",
        },
      ],
    },
  },

  settings: {
    title: "Настройки",
    subtitle: "Профиль, команда, синхронизация и управление данными.",
    subtitleAccount: "Профиль, безопасность и краткий статус подписки.",
    subtitleCompany: "Название компании, подписка и команда на Pro.",
    subtitleAccounting: "Бухгалтерия, списки сотрудников и импорт/экспорт.",
    subtitleSync: "Синхронизация моторов и поведение списка.",
    subtitleDataCleanup: "Безвозвратное удаление данных компании из облака.",
    account: "Аккаунт",
    employees: "Сотрудники",
    roles: "Роли",
    accounting: "Бухгалтерия",
    sync: "Синхронизация",
    importExport: "Импорт и экспорт",
    workflow: "Поведение",
    dataCleanup: "Удаление данных",
    companyDescription: "Название рабочего пространства и управление подпиской компании.",
    companyNameSave: "Обновить название",
    companyNameUpdated: "Название компании обновлено",
    companyNameError: "Не удалось обновить название компании",
    companyStatsTitle: "Статистика компании",
    companyStatsDescription: "Краткий обзор активности вашего рабочего пространства.",
    companyProHint: "Pro открывает команду, облачную синхронизацию и расширенный экспорт.",
    companyTeamTitle: "Команда",
    companyTeamDescription: "Сотрудники и роли доступны на тарифе Pro.",
    statMotors: "Моторы на складе",
    statBalance: "Баланс",
    statChangesToday: "Изменений сегодня",
    dataCleanupDescription:
      "Безвозвратное удаление данных компании из облака. Перед очисткой убедитесь, что нужные данные экспортированы.",
    dataCleanupNoAccess: "У вас нет прав на удаление данных компании.",
    dataCleanupError: "Не удалось выполнить удаление",
    deleteAccountingTitle: "Удалить бухгалтерию",
    deleteAccountingDescription: "Удаляет все финансовые операции текущей компании из облака.",
    deleteAccountingConfirmTitle: "Удалить всю бухгалтерию?",
    deleteAccountingConfirmDescription:
      "Все операции кассы, расходов, продаж и авансов будут удалены без возможности восстановления.",
    deleteMotorsTitle: "Удалить моторы",
    deleteMotorsDescription: "Удаляет моторы компании из облачного каталога, доступного в браузере.",
    deleteMotorsConfirmTitle: "Удалить все моторы?",
    deleteMotorsConfirmDescription:
      "Все моторы компании в облаке будут удалены. Локальные копии в приложении для Mac не затрагиваются.",
    deleteSpecificsTitle: "Удалить специфичные",
    deleteSpecificsDescription: "Удаляет все категории и записи раздела «Специфичные».",
    deleteSpecificsConfirmTitle: "Удалить все специфичные?",
    deleteSpecificsConfirmDescription:
      "Все категории и строки специфичных будут удалены без возможности восстановления.",
    deleteAccountingSuccess: (count: number) =>
      count > 0 ? `Бухгалтерия очищена: удалено ${count} записей` : "Бухгалтерия уже была пустой",
    deleteMotorsSuccess: (count: number) =>
      count > 0 ? `Моторы удалены: ${count} записей` : "Моторы в облаке уже отсутствовали",
    deleteSpecificsSuccess: (count: number) =>
      count > 0 ? `Специфичные удалены: ${count} записей` : "Специфичные уже были пустыми",
    macOnly: "Настраивается в приложении для Mac",
    macOnlyHint: "Внешний вид, резервные копии и расширенные параметры доступны в приложении AutoCore для Mac.",
    billing: "Подписка",
    role: "Роль",
    company: "Компания",
  },

  accounting: {
    title: "Бухгалтерия",
    syncOn: "Синхронизация: включена",
    syncOff: "Синхронизация: выключена",
    loadError: "Не удалось загрузить операции",
    loadErrorHint: "Проверьте права доступа к компании и повторите попытку.",
  },

  motors: {
    accessError: "Нет доступа к данным",
    accessHint: "Войдите тем же аккаунтом, что в приложении, и подключите «Мою бухгалтерию» в настройках.",
    exportExcel: "Экспорт в Excel",
    importExcel: "Импорт из Excel",
    exportEmpty: "Нет данных для экспорта",
    importDone: "Импорт завершён",
  },

  brands: {
    renameTitle: "Изменить бренд",
    renameHint: "Двойной клик по бренду открывает это окно.",
    renamePlaceholder: "Новое имя бренда",
    deleteTitle: "Удалить бренд?",
    deleteHint: "Бренд и его двигатели будут удалены из каталога. Моторы в таблице останутся.",
    deleteAction: "Удалить",
  },

  account: {
    menuTitle: "Аккаунт",
    menuSettings: "Настройки аккаунта",
    signOut: "Выйти",
    description: "Профиль, способ входа и безопасность.",
    displayName: "Имя профиля",
    phone: "Телефон",
    saveProfile: "Сохранить профиль",
    profileSaved: "Профиль обновлён",
    signInMethod: "Способ входа",
    securityTitle: "Безопасность",
    changePassword: "Изменить пароль",
    changePasswordHint: "Для смены пароля нужно подтвердить текущий.",
    changeEmail: "Изменить email",
    changeEmailHint: "Новый email и текущий пароль для подтверждения.",
    sendResetEmail: "Письмо для сброса пароля",
    resetEmailSent: "Письмо для сброса пароля отправлено",
    passwordChanged: "Пароль обновлён",
    emailChanged: "Email обновлён",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    confirmPassword: "Повторите пароль",
    savePassword: "Сохранить пароль",
    saveEmail: "Сохранить email",
    passwordMismatch: "Новый пароль и подтверждение не совпадают.",
    googlePasswordHint:
      "Вход через Google. Пароль и email меняются в настройках Google-аккаунта.",
    applePasswordHint: "Вход через Apple ID. Пароль меняется в настройках Apple ID.",
    genericPasswordHint: "Смена пароля доступна только для входа по email.",
  },

  authErrors: {
    weakPassword: "Пароль слишком короткий (минимум 6 символов).",
  },

  onboarding: {
    title: "Обучение",
    loading: "Подготавливаем ваше рабочее пространство…",
    skip: "Пропустить",
    back: "Назад",
    next: "Далее",
    start: "Начать работу",
    stepCounter: (current: number, total: number) => `Шаг ${current} из ${total}`,
    welcomeTitle: "Добро пожаловать в AutoCore",
    welcomeDescription:
      "Короткий тур по веб-версии: где искать моторы, как редактировать таблицу и как данные синхронизируются с Mac и iOS.",
    welcomeHint: "Займёт около минуты",
    gridTitle: "Excel-таблица моторов",
    gridDescription:
      "Редактируйте моторы прямо в сетке: выделение, копирование, удаление и импорт из Excel — как в приложении для Mac.",
    gridHint: "Delete очищает выделенные ячейки · ⌘S сохраняет локально",
    sidebarTitle: "Бренды и двигатели слева",
    sidebarDescription:
      "Фильтруйте список по бренду и коду двигателя. Двойной клик по бренду — переименование, корзина — удаление из каталога.",
    accountingTitle: "Бухгалтерия и продажи",
    accountingDescription:
      "Операции, баланс и продажи моторов связаны между устройствами. Проданные моторы — в отдельном разделе.",
    syncTitle: "Облачная синхронизация",
    syncDescription:
      "Изменения отправляются в Firebase и доступны в приложении AutoCore на Mac и телефоне. Статус синхронизации — в toolbar.",
    readyTitle: "Всё готово",
    readyDescription:
      "Можно работать. Настройки аккаунта и компании — через аватар в правом верхнем углу.",
    appleRedirect: "Переход к Apple ID…",
    appleFailed:
      "Firebase не получил сессию после Apple. Проверьте Apple OAuth в Firebase Console и Return URL handler в Apple Developer.",
  },
} as const;

export function formatRole(role: string | undefined | null): string {
  switch (role) {
    case "owner":
      return "Владелец";
    case "admin":
      return "Администратор";
    case "manager":
      return "Менеджер";
    case "accountant":
      return "Бухгалтер";
    case "employee":
      return "Сотрудник";
    default:
      return role ?? "—";
  }
}

export function formatPermission(permission: string | undefined | null): string {
  switch (permission) {
    case "inventory_view":
      return "Просмотр склада";
    case "inventory_edit":
      return "Редактирование склада";
    case "inventory_delete":
      return "Удаление со склада";
    case "accounting_view":
      return "Просмотр бухгалтерии";
    case "accounting_edit":
      return "Редактирование бухгалтерии";
    case "accounting_delete":
      return "Удаление операций";
    case "employee_manage":
      return "Управление сотрудниками";
    case "employee_view":
      return "Просмотр сотрудников";
    case "analytics_view":
      return "Просмотр аналитики";
    case "settings_manage":
      return "Настройки компании";
    case "export_data":
      return "Экспорт данных";
    case "import_data":
      return "Импорт данных";
    default:
      return permission ?? "—";
  }
}

export type AuthErrorContext = {
  provider?: "apple" | "google" | "email";
  surface?: "onboarding" | "sync";
};

export function mapAuthError(error: unknown, context?: AuthErrorContext): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : error instanceof Error && error.message.startsWith("auth/")
        ? error.message
        : "";

  if (error instanceof Error && error.message === "popup_closed_by_user") {
    return "Apple отклонил вход. Проверьте Services ID и Return URL firebase handler в Apple Developer (см. подсказку ниже).";
  }

  if (code === "auth/invalid-credential" && context?.provider === "apple") {
    return "Firebase не принял Apple OAuth. Проверьте Services ID com.wise.AutoCore.app, Team ID, Key ID и private key (.p8) в Firebase → Apple → OAuth code flow. macOS/iOS вход — другой механизм, его успех не означает, что web настроен.";
  }

  switch (code) {
    case "auth/invalid-email":
      return "Некорректный email.";
    case "auth/user-disabled":
      return "Аккаунт отключён.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Неверный email или пароль.";
    case "auth/email-already-in-use":
      return "Этот email уже используется.";
    case "auth/weak-password":
      return "Пароль слишком короткий (минимум 6 символов).";
    case "auth/requires-recent-login":
      return "Нужно войти заново, чтобы подтвердить действие.";
    case "auth/too-many-requests":
      return "Слишком много попыток. Попробуйте позже.";
    case "auth/popup-closed-by-user":
      return "Вход отменён.";
    case "auth/operation-not-allowed":
      return "Этот способ входа временно недоступен.";
    case "auth/unauthorized-domain":
      return "Этот домен не разрешён для входа. Добавьте localhost в Firebase Authentication → Settings → Authorized domains.";
    case "auth/invalid-oauth-client-id":
    case "auth/invalid-oauth-provider":
      return "Apple OAuth не настроен: проверьте Services ID и OAuth code flow (Team ID, Key ID, .p8) в Firebase.";
    case "permission-denied":
      if (error instanceof Error && error.message.includes("Не удалось")) {
        return error.message;
      }
      if (context?.surface === "onboarding") {
        return "Не удалось выполнить действие. Обновите страницу и попробуйте снова.";
      }
      return "Недостаточно прав для синхронизации. Обновите страницу. Если ошибка повторится — проверьте роль в «Сотрудники» или подключите «Мою бухгалтерию» в настройках.";
    case "auth/credential-already-in-use":
      return "Этот Apple ID или Google-аккаунт уже привязан к другому пользователю.";
    default:
      if (error instanceof Error && error.message) {
        if (/missing or insufficient permissions/i.test(error.message)) {
          if (context?.surface === "onboarding") {
            return "Не удалось выполнить действие. Обновите страницу и попробуйте снова.";
          }
          return "Недостаточно прав для синхронизации. Обновите страницу. Если ошибка повторится — проверьте роль в «Сотрудники» или подключите «Мою бухгалтерию» в настройках.";
        }
        if (error.message.includes("Не удалось")) {
          return error.message;
        }
        return error.message;
      }
      return userCopy.onboarding.appleFailed;
  }
}
