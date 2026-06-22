export const userCopy = {
  appName: "AutoCore",
  defaultCompanyName: "AutoCore",

  sync: {
    online: "Подключено",
    offline: "Офлайн",
    syncing: "Сохранение…",
    synced: "Сохранено",
    error: "Не удалось сохранить",
    localChanges: "Есть несохранённые изменения",
    remoteUpdates: "Доступны обновления",
    needsAttention: "Требует внимания",
    syncNow: "Сохранить",
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
    signInEmail: "Войти по почте",
    createAccount: "Создать аккаунт",
    haveAccount: "У меня уже есть аккаунт",
    noAccount: "Нет аккаунта? Создать новый",
    subtitle: "Вход в рабочее пространство",
    loading: "Загрузка…",
    completing: "Подготовка рабочего пространства…",
    signingIn: "Вход…",
    creatingAccount: "Создание аккаунта…",
    verifyEmailTitle: "Подтвердите email",
    verifyEmailDescription: "Мы отправили 6-значный код на",
    verifyEmailResent: "Новый код отправлен. Проверьте почту и папку «Спам».",
    verifyEmailCodeHint: "Введите код из письма — подтверждение произойдёт автоматически.",
    verifyEmailCodeWorking: "Проверяем код…",
    verifyEmailCodeInvalid: "Неверный код. Проверьте письмо и попробуйте снова.",
    verifyEmailNotYet: "Email ещё не подтверждён. Введите код из письма.",
    verifyEmailWorking: "Подтверждаем email…",
    verifyEmailSuccessTitle: "Email подтверждён",
    verifyEmailSuccess: "Email подтверждён. Сейчас откроем рабочее пространство.",
    verifyEmailAutoSent: "Мы отправили код подтверждения на вашу почту.",
    passwordResetTitle: "Новый пароль",
    passwordResetDescription: "Придумайте новый пароль для входа в AutoCore.",
    passwordResetNew: "Новый пароль",
    passwordResetConfirm: "Повторите пароль",
    passwordResetSubmit: "Сохранить пароль",
    passwordResetSuccess: "Пароль обновлён. Сейчас откроем страницу входа.",
    forgotPassword: "Забыли пароль?",
    passwordResetSent: "Ссылка для сброса пароля отправлена.",
  },

  company: {
    welcomeTitle: "Добро пожаловать в AutoCore Web",
    welcomeDescription: "Подключите существующие данные или создайте новое рабочее пространство.",
    macQuestion: "У вас уже есть AutoCore на Mac?",
    macDescription:
      "Продолжите с теми же моторами и операциями, что в приложении AutoCore на Mac.",
    macButton: "Продолжить с Mac",
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
      "Чтобы видеть те же моторы и операции, что в приложении AutoCore на Mac.",
    connectButton: "Подключить данные с Mac",
    createTitle: "Создать компанию",
    createDescription: "Отдельное рабочее пространство для новой команды.",
    joinTitle: "Присоединиться по приглашению",
    inviteLabel: "Код приглашения",
    defaultTaken:
      "Общее рабочее пространство уже занято. Присоединитесь по коду приглашения или создайте новую команду.",
  },

  desktop: {
    downloadUnavailableTitle: "Установщик пока недоступен",
    macUnavailable: "Сборка для macOS ещё не опубликована. Напишите в поддержку — пришлём ссылку.",
    windowsUnavailable:
      "Сборка для Windows готовится. Напишите в поддержку — пришлём установщик, как только он будет готов.",
  },

  billing: {
    title: "Подписка",
    description: "Тариф компании для облака, экспорта и команды.",
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
    checkoutUnavailable: "Сервис оплаты временно недоступен. Попробуйте позже или обратитесь в поддержку.",
    paymentUnavailableTitle: "Оплата пока недоступна",
    paymentUnavailable: "Напишите в поддержку — поможем оформить подписку.",
    stripeNotConfigured: "Оплата временно недоступна. Обратитесь в поддержку.",
    notConfigured: "Stripe не настроен. Добавьте Price ID в .env.local.",
    proActiveHint: "Pro активен — доступны облако, экспорт и команда.",
    freeActiveHint: "Free — базовый доступ. Pro открывает облако и команду.",
    trialingHint: (date: string) => `Пробный Pro до ${date}`,
    trialStartedTitle: "Пробный Pro активирован",
    trialStartedDescription: "14 дней полного доступа без привязки карты.",
    trialExpiredTitle: "Пробный период завершён",
    trialExpiredDescription:
      "Pro доступ отключён. Оформите подписку в настройках, чтобы продолжить пользоваться облаком и командой.",
    proExpiredTitle: "Подписка Pro завершена",
    proExpiredDescription:
      "Срок Pro истёк. Оформите подписку в настройках, чтобы вернуть облако и команду.",
    viewPlans: "Выбрать тариф",
    openSettings: "Открыть подписку",
    askAdmin: "Обратитесь к владельцу или администратору компании для оформления Pro.",
    paywallTitle: "Нужен тариф Pro",
    paywallFooter: "Оформление подписки — через поддержку",
    nextChargeLabel: "Следующее списание",
    nextChargeUnknown: "Дата списания появится после подтверждения оплаты",
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
        { label: "Облачное хранение данных", free: false, pro: true },
        { label: "Импорт и экспорт Excel", free: false, pro: true },
        { label: "Команда и роли", free: false, pro: true },
        { label: "Доступ с Mac и web", free: false, pro: true },
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
        title: "Облако — Pro",
        description: "Сохранение данных в облаке доступно на тарифе Pro.",
      },
      invite: {
        title: "Приглашения — Pro",
        description: "Приглашение сотрудников доступно на тарифе Pro.",
      },
      cloud_sync: {
        title: "Облако — Pro",
        description: "Подключение облачных данных и команды — на тарифе Pro.",
      },
    },
    features: [
      "Pro: облако и экспорт",
      "Pro: приглашение сотрудников",
      "Free: базовый доступ без Pro-функций",
    ],
    proActivation: {
      activatingTitle: "Активируем Pro…",
      activatingHint: "Подключаем Pro — это займёт несколько секунд.",
      celebrationTitle: "Добро пожаловать в Pro",
      celebrationSubtitle: "Облако, экспорт и команда — всё уже доступно вашей компании.",
      startButton: "Начать работу",
      benefits: [
        {
          title: "Облачные данные",
          description: "Моторы и операции доступны в браузере и в приложении для Mac.",
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
          title: "Команда и настройки",
          description: "Сотрудники, роли и расширенные возможности компании.",
        },
      ],
    },
  },

  settings: {
    title: "Настройки",
    subtitle: "Профиль, команда и управление данными.",
    subtitleAccount: "Профиль, безопасность и краткий статус подписки.",
    subtitleCompany: "Название компании, подписка и команда на Pro.",
    subtitleAccounting: "Бухгалтерия, списки сотрудников и импорт/экспорт.",
    subtitleSync: "Поведение списка моторов.",
    subtitleDataCleanup: "Безвозвратное удаление данных компании из облака.",
    interface: "Интерфейс",
    subtitleInterface: "Боковая панель, порядок разделов и видимость.",
    theme: "Тема",
    subtitleTheme: "Светлое, тёмное или автоматическое оформление по системе.",
    themeSystem: "Авто",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    appConfig: "Система",
    subtitleAppConfig: "Разделы меню, каталог запчастей и гарантия по умолчанию.",
    account: "Аккаунт",
    employees: "Сотрудники",
    roles: "Роли",
    accounting: "Бухгалтерия",
    sync: "Поведение",
    importExport: "Импорт и экспорт",
    workflow: "Поведение",
    dataCleanup: "Удаление данных",
    companyDescription: "Название рабочего пространства и управление подпиской компании.",
    companyNameSave: "Обновить название",
    companyNameUpdated: "Название компании обновлено",
    companyNameError: "Не удалось обновить название компании",
    companyStatsTitle: "Статистика компании",
    companyStatsDescription: "Краткий обзор активности вашего рабочего пространства.",
    companyProHint: "Pro открывает команду, облако и расширенный экспорт.",
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
    deleteMotorsDescription:
      "Удаляет моторы компании, а также бренды и двигатели в левом меню.",
    deleteMotorsConfirmTitle: "Удалить все моторы?",
    deleteMotorsConfirmDescription:
      "Все моторы компании в облаке будут удалены вместе с брендами и двигателями в боковом меню. Локальные копии в приложении для Mac не затрагиваются.",
    deleteSpecificsTitle: "Удалить специфичные",
    deleteSpecificsDescription: "Удаляет все категории и записи раздела «Специфичные».",
    deleteSpecificsConfirmTitle: "Удалить все специфичные?",
    deleteSpecificsConfirmDescription:
      "Все категории и строки специфичных будут удалены без возможности восстановления.",
    deleteAccountingSuccess: (count: number) =>
      count > 0 ? `Бухгалтерия очищена: удалено ${count} записей` : "Бухгалтерия уже была пустой",
    deleteMotorsSuccess: (count: number) =>
      count > 0
        ? `Моторы и каталог брендов очищены: удалено ${count} записей`
        : "Моторы и бренды в облаке уже отсутствовали",
    deleteSpecificsSuccess: (count: number) =>
      count > 0 ? `Специфичные удалены: ${count} записей` : "Специфичные уже были пустыми",
    deleteWarehouseTitle: "Очистить склад",
    deleteWarehouseDescription: "Удалить все позиции, движения, склады и импорты компании.",
    deleteWarehouseConfirmTitle: "Очистить склад?",
    deleteWarehouseConfirmDescription:
      "Будут удалены товары, движения, остатки, склады, поставщики и история импортов. Восстановить данные будет нельзя.",
    deleteWarehouseSuccess: (count: number) =>
      count > 0 ? `Склад очищен: удалено ${count} записей` : "Склад уже был пустым",
    macOnly: "Mac",
    macOnlyHint: "Внешний вид, резервные копии и расширенные параметры доступны в приложении AutoCore для Mac.",
    billing: "Подписка",
    role: "Роль",
    company: "Компания",
  },

  accounting: {
    title: "Бухгалтерия",
    syncOn: "Данные: онлайн",
    syncOff: "Данные: офлайн",
    loadError: "Не удалось загрузить операции",
    loadErrorHint: "Проверьте права доступа к компании и повторите попытку.",
  },

  motors: {
    accessError: "Нет доступа к данным",
    accessHint: "Войдите тем же аккаунтом, что в приложении, или присоединитесь к компании по приглашению.",
    exportExcel: "Экспорт в Excel",
    importExcel: "Импорт из Excel",
    magicImport: "Magic Import",
    magicImportReview: "Проверить импорт",
    magicImportReviewHint: "Готово к проверке",
    magicImportDone: "Magic Import завершён",
    exportEmpty: "Нет данных для экспорта",
    importDone: "Импорт завершён",
    emptyTitle: "Каталог пуст",
    emptyDescription: "Импортируйте Excel со склада или добавьте моторы вручную в таблицу.",
    emptyImport: "Выбрать файл",
    emptyImportDropHint: "Перетащите .xlsx или .xls сюда",
    emptyImportAiHint: "Magic Import сам разберёт листы, бренды и серийники.",
    emptyCreate: "Вручную",
    emptyImportProgressTitle: "Magic Import",
    emptyImportProgressDescription: "Обработка на сервере — можно уйти с этой страницы.",
    emptyImportProgressHint: "Прогресс также виден в верхней панели. После анализа откроется проверка.",
    emptyImportProgressAction: "Подробнее",
    emptyImportProgressCollapse: "Свернуть",
    emptyImportProgressCollapsed: "Импорт в фоне",
    emptyImportPhaseAnalyze: "Анализ",
    emptyImportPhaseApply: "Загрузка",
    emptyImportReviewTitle: "Готово к проверке",
    emptyImportReviewDescription: "Проверьте строки перед загрузкой в базу.",
    emptyImportReviewAction: "Проверить импорт",
    soldEmptyTitle: "Проданных двигателей пока нет",
    soldEmptyDescription: "Отметьте продажу в разделе «Все моторы» — запись появится здесь.",
  },

  workOrders: {
    emptyTitle: "Заказ-нарядов пока нет",
    emptyDescription: "Создайте первый заказ — клиент, авто и работы в одном месте.",
    emptyCreate: "Создать заказ-наряд",
  },

  missionControl: {
    analytics: {
      title: "Аналитика разбора",
      revenueLabel: "Выручка от продаж моторов",
      salesCount: "Продажи",
      avgCheckPrefix: "ср.",
      avgDaysLabel: "Ср. срок продажи",
      avgDaysHintSold: (count: number) => `по ${count} проданным`,
      avgDaysHintEmpty: "нет продаж с датами",
      staleLabel: "Залежалые",
      staleHint: "более 90 дней на площадке",
      inventoryComposition: "Состав наличия",
      inStock: "В обороте",
      staleShort: "Залежалые",
      pieces: (count: number) => `${count.toLocaleString("ru-RU")} шт.`,
      topBrands: "Топ брендов",
      topBrandsEmpty: "Бренды появятся после загрузки моторов",
      topEngines: "Топ двигателей",
      topEnginesEmpty: "Коды двигателей появятся в каталоге",
      noSalesYet:
        "Продажи моторов пока не зафиксированы — выручка обновится после первых сделок.",
      inventoryEmpty: "Нет моторов в наличии",
    },
  },

  brands: {
    addTitle: "Новый бренд",
    addHint: "Бренд появится в сайдбаре и в подсказках колонки «Бренд» в таблице.",
    addPlaceholder: "Например, Toyota",
    renameTitle: "Изменить бренд",
    renameHint: "Двойной клик по бренду открывает это окно.",
    renamePlaceholder: "Новое имя бренда",
    deleteTitle: "Удалить бренд?",
    deleteHint: "Бренд и его двигатели будут удалены из каталога. Моторы в таблице останутся.",
    deleteAction: "Удалить",
  },

  specificSheets: {
    addTitle: "Новый специфичный лист",
    addHint: "Лист появится в сайдбаре с семью базовыми колонками. Дополнительные колонки можно добавить позже.",
    addPlaceholder: "Например, Коробки",
    renameTitle: "Переименовать лист",
    renameHint: "Двойной клик по листу открывает это окно.",
    renamePlaceholder: "Новое название листа",
    deleteTitle: "Удалить лист?",
    deleteHint: "Лист и все строки будут удалены без возможности восстановления.",
    deleteAction: "Удалить лист",
    emptyCta: "Создать лист",
    columnsTitle: "Колонки листа",
    columnsHint: "Базовые колонки можно переименовать. Дополнительные — добавить, переименовать или удалить.",
    importHint: "Загрузить данные — через Magic Import в разделе «Все моторы», выбрав существующий лист.",
    selectSheet: "Выберите лист",
    selectSheetHint: "Создайте лист в сайдбаре «Специфичные», если нужного ещё нет.",
  },

  account: {
    menuTitle: "Аккаунт",
    menuSettings: "Настройки аккаунта",
    signOut: "Выйти",
    description: "Профиль, способ входа и безопасность.",
    displayName: "Имя профиля",
    phone: "Телефон",
    avatar: "Фото профиля",
    avatarHint: "PNG, JPG, WebP или SVG · до 2 МБ",
    avatarUploading: "Загружаем аватар…",
    avatarSaved: "Аватар обновлён",
    saveProfile: "Сохранить профиль",
    profileSaved: "Профиль обновлён",
    signInMethod: "Способ входа",
    securityTitle: "Безопасность",
    changePassword: "Изменить пароль",
    changePasswordHint: "Для смены пароля нужно подтвердить текущий.",
    changeEmail: "Изменить почту",
    changeEmailHint: "Новая почта и текущий пароль для подтверждения.",
    sendResetEmail: "Письмо для сброса пароля",
    resetEmailSent: "Письмо для сброса пароля отправлено",
    emailLabel: "Email",
    passwordChanged: "Пароль обновлён",
    emailChanged: "Почта обновлена",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    confirmPassword: "Повторите пароль",
    savePassword: "Сохранить пароль",
    saveEmail: "Сохранить почту",
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
    loading: "Загружаем настройки компании…",
    appleRedirect: "Переход к Apple ID…",
    appleFailed:
      "Не удалось завершить вход через Apple. Попробуйте другой способ входа или обратитесь в поддержку.",
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
    case "mechanic":
      return "Механик";
    case "diagnostician":
      return "Диагност";
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
    case "inventory_export":
      return "Экспорт склада";
    case "inventory_import":
      return "Импорт склада";
    case "warehouse_manage":
      return "Управление складами";
    case "work_orders_view":
      return "Просмотр заказ-нарядов";
    case "work_orders_edit":
      return "Редактирование заказ-нарядов";
    case "clients_manage":
      return "Управление клиентами";
    case "vehicles_manage":
      return "Управление автомобилями";
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
    case "payroll_view_own":
      return "Мои начисления";
    default:
      return permission ?? "—";
  }
}

export type AuthErrorContext = {
  provider?: "apple" | "google" | "email";
  surface?: "onboarding" | "sync";
};

function extractAuthErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code.startsWith("auth/")) return code;
  }

  if (error instanceof Error) {
    if (error.message.startsWith("auth/")) return error.message;

    const firebaseMatch = error.message.match(/\((auth\/[^)]+)\)/i);
    if (firebaseMatch?.[1]) return firebaseMatch[1];

    const prefixedMatch = error.message.match(/(?:Firebase:\s*)?(auth\/[\w-]+)/i);
    if (prefixedMatch?.[1]) return prefixedMatch[1];
  }

  return "";
}

const GRID_FIELD_LABELS: Record<string, string> = {
  sku: "Артикул",
  name: "Название",
};

function mapValidationError(error: unknown): string | null {
  if (error instanceof Error && error.message.includes("Артикул и название")) {
    return error.message;
  }
  if (error instanceof Error && error.message.includes("SKU и название")) {
    return error.message.replace(/SKU/g, "Артикул");
  }

  const zodIssues =
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
      ? (error as { issues: Array<{ path?: unknown[]; message?: string }> }).issues
      : null;

  if (zodIssues) {
    const labels = [
      ...new Set(
        zodIssues.map((issue) => GRID_FIELD_LABELS[String(issue.path?.[0] ?? "")] ?? String(issue.path?.[0] ?? "поле")),
      ),
    ];
    if (labels.length > 0) {
      return `Заполните обязательные поля: ${labels.join(", ")}.`;
    }
  }

  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as Array<{ path?: string[] }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const labels = [
          ...new Set(
            parsed.map((issue) => GRID_FIELD_LABELS[String(issue.path?.[0] ?? "")] ?? String(issue.path?.[0] ?? "поле")),
          ),
        ];
        if (labels.length > 0) {
          return `Заполните обязательные поля: ${labels.join(", ")}.`;
        }
      }
    } catch {
      // Not a JSON validation payload.
    }
  }

  return null;
}

export function mapGridSaveError(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code === "permission-denied") {
      return "Не удалось сохранить остаток на складе. Обновите страницу и попробуйте снова.";
    }
    if (code === "invalid-argument") {
      return "Не удалось сохранить: в строке есть некорректное значение. Проверьте пустые поля, цены и количество.";
    }
  }
  if (error instanceof Error && /missing or insufficient permissions/i.test(error.message)) {
    return "Не удалось сохранить остаток на складе. Обновите страницу и попробуйте снова.";
  }
  if (
    error instanceof Error &&
    /unsupported field value|undefined|invalid-argument/i.test(error.message)
  ) {
    return "Не удалось сохранить: одно из полей имеет некорректное значение. Очистите поле или заполните его заново.";
  }
  return mapValidationError(error) ?? mapAuthError(error, { surface: "sync" });
}

export function mapAuthError(error: unknown, context?: AuthErrorContext): string {
  const code = extractAuthErrorCode(error);

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
      return "Этот email уже зарегистрирован. Войдите или используйте другой адрес.";
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
      return "Этот адрес сайта не разрешён для входа. Обратитесь в поддержку.";
    case "auth/invalid-oauth-client-id":
    case "auth/invalid-oauth-provider":
      return code;
    case "permission-denied":
      if (error instanceof Error && error.message.includes("Не удалось")) {
        return error.message;
      }
      if (context?.surface === "onboarding") {
        return "Не удалось выполнить действие. Обновите страницу и попробуйте снова.";
      }
      return "Недостаточно прав. Обновите страницу. Если ошибка повторится — проверьте роль в разделе «Сотрудники».";
    case "auth/credential-already-in-use":
      return "Этот Apple ID или Google-аккаунт уже привязан к другому пользователю.";
    default:
      if (error instanceof Error && error.message) {
        if (/missing or insufficient permissions/i.test(error.message)) {
          if (context?.surface === "onboarding") {
            return "Не удалось выполнить действие. Обновите страницу и попробуйте снова.";
          }
          return "Недостаточно прав. Обновите страницу. Если ошибка повторится — проверьте роль в разделе «Сотрудники».";
        }
        if (error.message.includes("Не удалось")) {
          return error.message.replace(/\s*\([a-z0-9/-]+\)\s*$/i, "").trim();
        }
        return error.message;
      }
      return code || "Unknown auth error";
  }
}
