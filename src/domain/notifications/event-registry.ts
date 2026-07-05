import type {
  NotificationEventContext,
  NotificationEventDefinition,
  NotificationEventType,
} from "./types";

function orderLabel(ctx: NotificationEventContext): string {
  const number = ctx.payload?.orderNumber ?? ctx.aggregateId ?? "наряд";
  return String(number);
}

function actorLabel(ctx: NotificationEventContext): string {
  return ctx.actorName?.trim() || "Сотрудник";
}

const WORK_ORDER_ROLES = ["owner", "admin", "manager", "mechanic", "diagnostician"] as const;
const INVENTORY_ROLES = ["owner", "admin", "manager", "employee"] as const;
const ACCOUNTING_ROLES = ["owner", "admin", "manager", "accountant"] as const;
const TEAM_ROLES = ["owner", "admin", "manager"] as const;

export const NOTIFICATION_EVENT_REGISTRY: Record<
  NotificationEventType,
  NotificationEventDefinition
> = {
  "work_order.created": {
    eventType: "work_order.created",
    category: "work_orders",
    priority: "medium",
    defaultChannels: ["inbox", "push"],
    roles: [...WORK_ORDER_ROLES],
    permissions: ["work_orders_view"],
    assigneeOnlyForRoles: ["mechanic", "diagnostician"],
    groupable: true,
    groupWindowMinutes: 5,
    buildGroupKey: (ctx) => `wo-created:${ctx.actorUserId ?? "system"}`,
    buildCopy: (ctx) => ({
      title: "Новый заказ-наряд",
      body: `${actorLabel(ctx)} создал наряд №${orderLabel(ctx)}`,
    }),
    buildDeepLink: (ctx) =>
      ctx.aggregateId ? `autocoremobile://orders/${ctx.aggregateId}` : undefined,
  },
  "work_order.updated": {
    eventType: "work_order.updated",
    category: "work_orders",
    priority: "low",
    defaultChannels: ["inbox"],
    roles: [...WORK_ORDER_ROLES],
    permissions: ["work_orders_view"],
    assigneeOnlyForRoles: ["mechanic", "diagnostician"],
    groupable: true,
    groupWindowMinutes: 10,
    buildGroupKey: (ctx) => `wo-updated:${ctx.aggregateId ?? "unknown"}`,
    buildCopy: (ctx) => ({
      title: "Наряд обновлён",
      body: `№${orderLabel(ctx)} — ${String(ctx.payload?.changeSummary ?? "изменения")}`,
    }),
    buildDeepLink: (ctx) =>
      ctx.aggregateId ? `autocoremobile://orders/${ctx.aggregateId}` : undefined,
  },
  "work_order.assigned": {
    eventType: "work_order.assigned",
    category: "work_orders",
    priority: "high",
    defaultChannels: ["inbox", "push", "badge"],
    roles: [...WORK_ORDER_ROLES],
    permissions: ["work_orders_view"],
    assigneeOnlyForRoles: ["mechanic", "diagnostician"],
    groupable: false,
    groupWindowMinutes: 0,
    buildGroupKey: (ctx) => `wo-assigned:${ctx.aggregateId}`,
    buildCopy: (ctx) => ({
      title: "Назначение на наряд",
      body: `Вам назначен наряд №${orderLabel(ctx)}`,
    }),
    buildDeepLink: (ctx) =>
      ctx.aggregateId ? `autocoremobile://orders/${ctx.aggregateId}` : undefined,
  },
  "work_order.completed": {
    eventType: "work_order.completed",
    category: "work_orders",
    priority: "medium",
    defaultChannels: ["inbox", "push"],
    roles: ["owner", "admin", "manager", "accountant"],
    permissions: ["work_orders_view"],
    groupable: true,
    groupWindowMinutes: 5,
    buildGroupKey: (ctx) => `wo-completed:${ctx.actorUserId ?? "system"}`,
    buildCopy: (ctx) => ({
      title: "Наряд завершён",
      body: `№${orderLabel(ctx)} закрыт`,
    }),
    buildDeepLink: (ctx) =>
      ctx.aggregateId ? `autocoremobile://orders/${ctx.aggregateId}` : undefined,
  },
  "work_order.left_open": {
    eventType: "work_order.left_open",
    category: "work_orders",
    priority: "high",
    defaultChannels: ["inbox", "push"],
    roles: ["owner", "admin", "manager"],
    permissions: ["work_orders_view"],
    groupable: true,
    groupWindowMinutes: 60,
    buildGroupKey: () => "wo-left-open",
    buildCopy: (ctx) => ({
      title: "Незакрытые наряды",
      body: String(ctx.payload?.summary ?? "Есть наряды, открытые после рабочего дня"),
    }),
    buildDeepLink: () => "autocoremobile://orders",
  },
  "work_order.waiting_parts": {
    eventType: "work_order.waiting_parts",
    category: "work_orders",
    priority: "high",
    defaultChannels: ["inbox", "push", "badge"],
    roles: [...INVENTORY_ROLES, "mechanic", "diagnostician"],
    permissions: ["work_orders_view"],
    groupable: true,
    groupWindowMinutes: 15,
    buildGroupKey: (ctx) => `wo-parts:${ctx.aggregateId}`,
    buildCopy: (ctx) => ({
      title: "Ожидание запчастей",
      body: `№${orderLabel(ctx)} ждёт запчасти`,
    }),
    buildDeepLink: (ctx) =>
      ctx.aggregateId ? `autocoremobile://orders/${ctx.aggregateId}` : undefined,
  },
  "invoice.created": {
    eventType: "invoice.created",
    category: "invoices",
    priority: "medium",
    defaultChannels: ["inbox"],
    roles: [...ACCOUNTING_ROLES],
    permissions: ["accounting_view"],
    groupable: true,
    groupWindowMinutes: 10,
    buildGroupKey: (ctx) => `invoice-created:${ctx.actorUserId}`,
    buildCopy: (ctx) => ({
      title: "Новый счёт",
      body: String(ctx.payload?.summary ?? "Выставлен счёт"),
    }),
    buildDeepLink: () => "autocoremobile://accounting",
  },
  "invoice.paid": {
    eventType: "invoice.paid",
    category: "payments",
    priority: "high",
    defaultChannels: ["inbox", "push"],
    roles: [...ACCOUNTING_ROLES],
    permissions: ["accounting_view"],
    groupable: true,
    groupWindowMinutes: 5,
    buildGroupKey: (ctx) => `invoice-paid:${ctx.aggregateId}`,
    buildCopy: (ctx) => ({
      title: "Оплата получена",
      body: String(ctx.payload?.summary ?? "Счёт оплачен"),
    }),
    buildDeepLink: () => "autocoremobile://accounting",
  },
  "invoice.overdue": {
    eventType: "invoice.overdue",
    category: "payments",
    priority: "high",
    defaultChannels: ["inbox", "push"],
    roles: [...ACCOUNTING_ROLES],
    permissions: ["accounting_view"],
    groupable: true,
    groupWindowMinutes: 60,
    buildGroupKey: () => "invoice-overdue",
    buildCopy: (ctx) => ({
      title: "Просроченные счета",
      body: String(ctx.payload?.summary ?? "Есть просроченные счета"),
    }),
    buildDeepLink: () => "autocoremobile://accounting",
  },
  "engine.sold": {
    eventType: "engine.sold",
    category: "sales",
    priority: "high",
    defaultChannels: ["inbox", "push"],
    roles: ["owner", "admin", "manager", "accountant"],
    permissions: ["inventory_view"],
    groupable: true,
    groupWindowMinutes: 5,
    buildGroupKey: (ctx) => `engine-sold:${ctx.actorUserId}`,
    buildCopy: (ctx) => ({
      title: "Продажа мотора",
      body: String(ctx.payload?.summary ?? "Мотор продан"),
    }),
    buildDeepLink: () => "autocoremobile://search?filter=motors",
  },
  "engine.reserved": {
    eventType: "engine.reserved",
    category: "reservations",
    priority: "medium",
    defaultChannels: ["inbox"],
    roles: ["owner", "admin", "manager"],
    permissions: ["inventory_view"],
    groupable: true,
    groupWindowMinutes: 10,
    buildGroupKey: (ctx) => `engine-reserved:${ctx.aggregateId}`,
    buildCopy: (ctx) => ({
      title: "Мотор забронирован",
      body: String(ctx.payload?.summary ?? "Новая бронь мотора"),
    }),
    buildDeepLink: () => "autocoremobile://search?filter=motors",
  },
  "inventory.low_stock": {
    eventType: "inventory.low_stock",
    category: "inventory",
    priority: "high",
    defaultChannels: ["inbox", "push"],
    roles: [...INVENTORY_ROLES],
    permissions: ["inventory_view"],
    groupable: true,
    groupWindowMinutes: 30,
    buildGroupKey: () => "inventory-low-stock",
    buildCopy: (ctx) => ({
      title: "Низкий остаток",
      body: String(ctx.payload?.summary ?? "Позиции ниже минимума"),
    }),
    buildDeepLink: () => "autocoremobile://search?filter=parts&lowStock=1",
  },
  "customer.created": {
    eventType: "customer.created",
    category: "work_orders",
    priority: "low",
    defaultChannels: ["inbox"],
    roles: ["owner", "admin", "manager"],
    permissions: ["clients_manage"],
    groupable: true,
    groupWindowMinutes: 15,
    buildGroupKey: (ctx) => `customer-created:${ctx.actorUserId}`,
    buildCopy: (ctx) => ({
      title: "Новый клиент",
      body: String(ctx.payload?.customerName ?? "Добавлен клиент"),
    }),
    buildDeepLink: () => "autocoremobile://search?filter=clients",
  },
  "employee.invited": {
    eventType: "employee.invited",
    category: "team",
    priority: "medium",
    defaultChannels: ["inbox", "push"],
    roles: [...TEAM_ROLES],
    permissions: ["employee_manage"],
    groupable: false,
    groupWindowMinutes: 0,
    buildGroupKey: (ctx) => `employee-invited:${ctx.payload?.email}`,
    buildCopy: (ctx) => ({
      title: "Приглашение в команду",
      body: String(ctx.payload?.summary ?? "Отправлено приглашение"),
    }),
    buildDeepLink: () => "autocoremobile://profile/team",
  },
  "role.changed": {
    eventType: "role.changed",
    category: "team",
    priority: "high",
    defaultChannels: ["inbox", "push"],
    roles: ["owner", "admin"],
    permissions: ["employee_manage"],
    groupable: false,
    groupWindowMinutes: 0,
    buildGroupKey: (ctx) => `role-changed:${ctx.payload?.targetUserId}`,
    buildCopy: (ctx) => ({
      title: "Изменение роли",
      body: String(ctx.payload?.summary ?? "Роль сотрудника изменена"),
    }),
    buildDeepLink: () => "autocoremobile://profile/team",
  },
  "warranty.expiring": {
    eventType: "warranty.expiring",
    category: "warranty",
    priority: "high",
    defaultChannels: ["inbox", "push"],
    roles: ["owner", "admin", "manager"],
    permissions: ["work_orders_view"],
    groupable: true,
    groupWindowMinutes: 120,
    buildGroupKey: () => "warranty-expiring",
    buildCopy: (ctx) => ({
      title: "Истекает гарантия",
      body: String(ctx.payload?.summary ?? "Гарантия истекает завтра"),
    }),
    buildDeepLink: () => "autocoremobile://orders",
  },
  "subscription.expiring": {
    eventType: "subscription.expiring",
    category: "system",
    priority: "critical",
    defaultChannels: ["inbox", "push", "badge"],
    roles: ["owner", "admin"],
    groupable: false,
    groupWindowMinutes: 0,
    buildGroupKey: () => "subscription-expiring",
    buildCopy: (ctx) => ({
      title: "Подписка истекает",
      body: String(ctx.payload?.summary ?? "Продлите подписку AutoCore"),
    }),
    buildDeepLink: () => "autocoremobile://profile/subscription",
  },
  "system.error": {
    eventType: "system.error",
    category: "system",
    priority: "critical",
    defaultChannels: ["inbox", "push", "badge"],
    roles: ["owner", "admin"],
    groupable: true,
    groupWindowMinutes: 5,
    buildGroupKey: () => "system-error",
    buildCopy: (ctx) => ({
      title: "Системная ошибка",
      body: String(ctx.payload?.message ?? "Требуется внимание администратора"),
    }),
    buildDeepLink: () => "autocoremobile://profile/diagnostics",
  },
  "sync.failed": {
    eventType: "sync.failed",
    category: "system",
    priority: "critical",
    defaultChannels: ["inbox", "push"],
    roles: ["owner", "admin"],
    groupable: true,
    groupWindowMinutes: 10,
    buildGroupKey: () => "sync-failed",
    buildCopy: (ctx) => ({
      title: "Сбой синхронизации",
      body: String(ctx.payload?.message ?? "Не удалось синхронизировать данные"),
    }),
    buildDeepLink: () => "autocoremobile://profile/diagnostics",
  },
  "import.finished": {
    eventType: "import.finished",
    category: "inventory",
    priority: "medium",
    defaultChannels: ["inbox", "push"],
    roles: [...INVENTORY_ROLES],
    permissions: ["inventory_import"],
    groupable: false,
    groupWindowMinutes: 0,
    buildGroupKey: (ctx) => `import-finished:${ctx.aggregateId}`,
    buildCopy: (ctx) => ({
      title: "Импорт завершён",
      body: String(ctx.payload?.summary ?? "Импорт данных завершён"),
    }),
    buildDeepLink: () => "autocoremobile://search?filter=parts",
  },
  "scan.completed": {
    eventType: "scan.completed",
    category: "scan",
    priority: "medium",
    defaultChannels: ["inbox"],
    roles: ["owner", "admin", "manager", "mechanic", "employee"],
    groupable: true,
    groupWindowMinutes: 2,
    buildGroupKey: (ctx) => `scan:${ctx.actorUserId}`,
    buildCopy: (ctx) => ({
      title: "Сканирование",
      body: String(ctx.payload?.summary ?? "Результат сканирования"),
    }),
    buildDeepLink: () => "autocoremobile://scan",
  },
  "sales.daily_summary": {
    eventType: "sales.daily_summary",
    category: "sales",
    priority: "low",
    defaultChannels: ["inbox"],
    roles: ["owner", "admin", "manager", "accountant"],
    permissions: ["analytics_view"],
    groupable: false,
    groupWindowMinutes: 0,
    buildGroupKey: () => "sales-daily",
    buildCopy: (ctx) => ({
      title: "Итоги дня",
      body: String(ctx.payload?.summary ?? "Сводка продаж за день"),
    }),
    buildDeepLink: () => "autocoremobile://",
  },
  "sales.large_sale": {
    eventType: "sales.large_sale",
    category: "sales",
    priority: "high",
    defaultChannels: ["inbox", "push"],
    roles: ["owner", "admin", "manager"],
    permissions: ["analytics_view"],
    groupable: false,
    groupWindowMinutes: 0,
    buildGroupKey: (ctx) => `large-sale:${ctx.aggregateId}`,
    buildCopy: (ctx) => ({
      title: "Крупная продажа",
      body: String(ctx.payload?.summary ?? "Зафиксирована крупная продажа"),
    }),
    buildDeepLink: () => "autocoremobile://accounting",
  },
};

export function getNotificationEventDefinition(
  eventType: NotificationEventType,
): NotificationEventDefinition {
  return NOTIFICATION_EVENT_REGISTRY[eventType];
}

export const PRIORITY_CHANNELS: Record<
  NotificationEventDefinition["priority"],
  NotificationEventDefinition["defaultChannels"]
> = {
  critical: ["inbox", "push", "badge"],
  high: ["inbox", "push"],
  medium: ["inbox"],
  low: ["inbox"],
};
