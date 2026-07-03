import type { DemoPermission, PermissionGroupId } from '../types';

export const PERMISSION_GROUPS: Record<
  PermissionGroupId,
  { title: string; permissions: DemoPermission[] }
> = {
  warehouse: {
    title: 'Склад',
    permissions: [
      { id: 'warehouse.view', label: 'Просмотр склада', description: 'Остатки и ячейки' },
      { id: 'warehouse.receive', label: 'Приёмка', description: 'Оприходование товаров' },
      { id: 'warehouse.ship', label: 'Отгрузка', description: 'Списание и перемещения' },
      { id: 'warehouse.adjust', label: 'Корректировки', description: 'Инвентаризация и правки' },
    ],
  },
  sales: {
    title: 'Продажи',
    permissions: [
      { id: 'sales.view', label: 'Просмотр сделок', description: 'Воронка и клиенты' },
      { id: 'sales.create', label: 'Создание сделок', description: 'Новые коммерческие предложения' },
      { id: 'sales.discount', label: 'Скидки', description: 'Управление скидками' },
      { id: 'sales.close', label: 'Закрытие сделок', description: 'Финализация продаж' },
    ],
  },
  orders: {
    title: 'Наряды',
    permissions: [
      { id: 'orders.view', label: 'Просмотр нарядов', description: 'Все рабочие заказы' },
      { id: 'orders.create', label: 'Создание', description: 'Новые наряды' },
      { id: 'orders.assign', label: 'Назначение', description: 'Распределение по механикам' },
      { id: 'orders.close', label: 'Закрытие', description: 'Завершение работ' },
    ],
  },
  accounting: {
    title: 'Бухгалтерия',
    permissions: [
      { id: 'accounting.view', label: 'Просмотр', description: 'Финансовые операции' },
      { id: 'accounting.create', label: 'Создание', description: 'Новые проводки' },
      { id: 'accounting.export', label: 'Экспорт', description: 'Выгрузка отчётов' },
      { id: 'accounting.delete', label: 'Удаление', description: 'Опасные операции' },
    ],
  },
  analytics: {
    title: 'Аналитика',
    permissions: [
      { id: 'analytics.view', label: 'Просмотр', description: 'Дашборды и KPI' },
      { id: 'analytics.export', label: 'Экспорт', description: 'Выгрузка аналитики' },
      { id: 'analytics.financial', label: 'Финансы', description: 'Чувствительные метрики' },
    ],
  },
  documents: {
    title: 'Документы',
    permissions: [
      { id: 'documents.view', label: 'Просмотр', description: 'Архив документов' },
      { id: 'documents.create', label: 'Создание', description: 'Новые шаблоны' },
      { id: 'documents.sign', label: 'Подписание', description: 'Электронная подпись' },
    ],
  },
  settings: {
    title: 'Настройки',
    permissions: [
      { id: 'settings.view', label: 'Просмотр', description: 'Конфигурация компании' },
      { id: 'settings.manage', label: 'Управление', description: 'Изменение настроек' },
      { id: 'settings.branding', label: 'Брендинг', description: 'Логотип и оформление' },
    ],
  },
  admin: {
    title: 'Администрирование',
    permissions: [
      { id: 'admin.users', label: 'Пользователи', description: 'Управление командой' },
      { id: 'admin.roles', label: 'Роли', description: 'Создание ролей' },
      { id: 'admin.billing', label: 'Биллинг', description: 'Подписка и оплата' },
      { id: 'admin.danger', label: 'Опасная зона', description: 'Удаление данных' },
    ],
  },
};

export const ACCOUNTING_DEMO = {
  currency: { code: 'KZT', name: 'Казахстанский тенге', symbol: '₸' },
  defaultTax: { rate: '12%', label: 'НДС', inclusive: false },
  financialYear: { start: '1 января', end: '31 декабря', current: '2026' },
  expenseCategories: ['Аренда', 'Зарплата', 'Запчасти', 'Логистика', 'Маркетинг', 'Коммунальные'],
  incomeCategories: ['Ремонт', 'Продажа агрегатов', 'Диагностика', 'Гарантийные работы'],
  salaryTracking: { enabled: true, employees: 12, lastPayroll: '28 июня 2026' },
  payroll: { cycle: 'Ежемесячно', nextRun: '28 июля 2026', method: 'Банковский перевод' },
  suppliers: [
    { name: 'MotorParts KZ', balance: '₸ 1 240 000', status: 'Активен' },
    { name: 'Asia Auto Supply', balance: '₸ 380 500', status: 'Активен' },
    { name: 'EuroGear GmbH', balance: '€ 12 400', status: 'Ожидание' },
  ],
  exportFormats: ['1C', 'Excel', 'PDF', 'CSV'],
  invoices: { draft: 3, sent: 18, paid: 142, overdue: 2 },
  paymentMethods: ['Наличные', 'Kaspi', 'Банковский перевод', 'Halyk Terminal'],
};

export const WORKSPACE_DEMO = {
  storageUsed: { usedGb: 4.2, totalGb: 50, label: '4,2 ГБ из 50 ГБ' },
  cloudSync: { status: 'Синхронизировано', lastSync: '2 мин назад', devices: 3 },
  region: 'Казахстан (Алматы)',
  timezone: 'GMT+5 · Asia/Almaty',
  inviteCode: 'MTR-4829',
};

export const DESKTOP_DEMO = {
  connected: true,
  deviceName: 'MacBook Pro',
  appVersion: 'AutoCore Desktop 2.4.1',
  lastSeen: 'Сейчас онлайн',
  syncStatus: 'Двусторонняя синхронизация',
};
