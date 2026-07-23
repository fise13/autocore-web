export const roleLabelsEn = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  accountant: "Accountant",
  mechanic: "Mechanic",
  diagnostician: "Diagnostics specialist",
  employee: "Employee",
} as const;

export const roleLabelsRu = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  accountant: "Бухгалтер",
  mechanic: "Механик",
  diagnostician: "Диагност",
  employee: "Сотрудник",
} as const;

export const permissionLabelsEn = {
  inventory_view: "View warehouse",
  inventory_edit: "Edit warehouse",
  inventory_delete: "Delete from warehouse",
  inventory_export: "Export warehouse",
  inventory_import: "Import warehouse",
  warehouse_manage: "Manage warehouses",
  work_orders_view: "View work orders",
  work_orders_edit: "Edit work orders",
  clients_manage: "Manage clients",
  vehicles_manage: "Manage vehicles",
  accounting_view: "View finances",
  accounting_edit: "Edit finances",
  accounting_delete: "Delete transactions",
  employee_manage: "Manage employees",
  employee_view: "View employees",
  analytics_view: "View analytics",
  settings_manage: "Company settings",
  export_data: "Export data",
  import_data: "Import data",
  payroll_view_own: "My earnings",
} as const;

export const permissionLabelsRu = {
  inventory_view: "Просмотр склада",
  inventory_edit: "Редактирование склада",
  inventory_delete: "Удаление со склада",
  inventory_export: "Экспорт склада",
  inventory_import: "Импорт склада",
  warehouse_manage: "Управление складами",
  work_orders_view: "Просмотр заказ-нарядов",
  work_orders_edit: "Редактирование заказ-нарядов",
  clients_manage: "Управление клиентами",
  vehicles_manage: "Управление автомобилями",
  accounting_view: "Просмотр финансов",
  accounting_edit: "Редактирование финансов",
  accounting_delete: "Удаление операций",
  employee_manage: "Управление сотрудниками",
  employee_view: "Просмотр сотрудников",
  analytics_view: "Просмотр аналитики",
  settings_manage: "Настройки компании",
  export_data: "Экспорт данных",
  import_data: "Импорт данных",
  payroll_view_own: "Мои начисления",
} as const;

/** Messages keyed by Firebase/auth error codes used in mapAuthError */
export const authErrorMessagesEn: Record<string, string> = {
  "auth/invalid-email": "Invalid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use":
    "This email is already registered. Sign in or use a different address.",
  "auth/weak-password": "Password is too short (minimum 6 characters).",
  "auth/requires-recent-login": "Please sign in again to confirm this action.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/operation-not-allowed": "This sign-in method is temporarily unavailable.",
  "auth/unauthorized-domain":
    "This site URL is not allowed for sign-in. Contact support.",
  "auth/invalid-oauth-client-id": "auth/invalid-oauth-client-id",
  "auth/invalid-oauth-provider": "auth/invalid-oauth-provider",
  "permission-denied":
    "Insufficient permissions. Refresh the page. If the error persists, check your role under Employees.",
  "auth/credential-already-in-use":
    "This Apple ID or Google account is already linked to another user.",
};

export const authErrorMessagesRu: Record<string, string> = {
  "auth/invalid-email": "Некорректный email.",
  "auth/user-disabled": "Аккаунт отключён.",
  "auth/user-not-found": "Неверный email или пароль.",
  "auth/wrong-password": "Неверный email или пароль.",
  "auth/invalid-credential": "Неверный email или пароль.",
  "auth/email-already-in-use":
    "Этот email уже зарегистрирован. Войдите или используйте другой адрес.",
  "auth/weak-password": "Пароль слишком короткий (минимум 6 символов).",
  "auth/requires-recent-login": "Нужно войти заново, чтобы подтвердить действие.",
  "auth/too-many-requests": "Слишком много попыток. Попробуйте позже.",
  "auth/popup-closed-by-user": "Вход отменён.",
  "auth/operation-not-allowed": "Этот способ входа временно недоступен.",
  "auth/unauthorized-domain":
    "Этот адрес сайта не разрешён для входа. Обратитесь в поддержку.",
  "auth/invalid-oauth-client-id": "auth/invalid-oauth-client-id",
  "auth/invalid-oauth-provider": "auth/invalid-oauth-provider",
  "permission-denied":
    "Недостаточно прав. Обновите страницу. Если ошибка повторится — проверьте роль в разделе «Сотрудники».",
  "auth/credential-already-in-use":
    "Этот Apple ID или Google-аккаунт уже привязан к другому пользователю.",
};
