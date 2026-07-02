import { marketingRoutes } from "@/lib/marketing-routes";

export type ProductWorkflowStep = {
  label: string;
  detail?: string;
};

export type ProductSectionId =
  | "mission-control"
  | "workday"
  | "vehicle-card"
  | "work-orders"
  | "inventory"
  | "documents"
  | "repair-timeline"
  | "platform"
  | "ai-import"
  | "analytics"
  | "security";

export const productContent = {
  hero: {
    title: "Один рабочий день. Одна система.",
    description:
      "AutoCore не каталог модулей. Это то, как склад, цех и офис проходят смену вместе, без Excel и ночных сверок.",
    ctaPrimary: "Попробовать демо",
    ctaSecondary: "Скачать",
    ctaSecondaryHref: marketingRoutes.download,
  },
  sections: [
    {
      id: "mission-control" as const,
      title: "Mission Control",
      narrative:
        "Утро начинается не с отчётов из пяти мест. Директор открывает пульт: выручка, наряды, остатки и алерты за одну минуту.",
      workflow: [
        { label: "Открыть пульт", detail: "KPI и алерты" },
        { label: "Прочитать сигналы", detail: "3 требуют внимания" },
        { label: "Перейти в действие", detail: "Клик в нужный модуль" },
      ],
      intervalMs: 2400,
    },
    {
      id: "workday" as const,
      title: "Начало смены",
      narrative:
        "Каждый отдел видит своё, но работает из одного факта. Кладовщик, мастер и офис не переспрашивают друг друга.",
      workflow: [
        { label: "Директор видит картину", detail: "Mission Control" },
        { label: "Кладовщик на полу", detail: "Скан и приёмка" },
        { label: "Мастер в цеху", detail: "Наряд и резерв" },
        { label: "Офис в курсе", detail: "Документы и проводки" },
      ],
      intervalMs: 2600,
    },
    {
      id: "vehicle-card" as const,
      title: "Карточка автомобиля",
      narrative:
        "VIN открывает всю историю: двигатель, наряды, документы и фото ремонта. Один идентификатор вместо папок и звонков.",
      workflow: [
        { label: "Скан VIN", detail: "KMHGC41D…" },
        { label: "Открыть карточку", detail: "Sonata NF · 2011" },
        { label: "Связать наряд", detail: "НЗ-2026-0142" },
        { label: "История доступна", detail: "Цех и офис" },
      ],
      intervalMs: 2500,
    },
    {
      id: "work-orders" as const,
      title: "Заказ-наряды",
      narrative:
        "Наряд создаётся один раз. Резерв со склада, списание при закрытии и проводки уходят в бухгалтерию без второго ввода.",
      workflow: [
        { label: "Создать наряд", detail: "Замена G4KC" },
        { label: "Зарезервировать", detail: "Полка A-12" },
        { label: "Закрыть работу", detail: "Списание и акт" },
      ],
      intervalMs: 2800,
    },
    {
      id: "inventory" as const,
      title: "Склад",
      narrative:
        "Двигатель проходит путь от сканирования до продажи. Остаток виден на полу, в цеху и в офисе в тот же момент.",
      workflow: [
        { label: "Сканировать двигатель", detail: "G4KC · 2.4L" },
        { label: "Назначить полку", detail: "A-12" },
        { label: "Зарезервировать", detail: "Под наряд" },
        { label: "Продать", detail: "Документы готовы" },
      ],
      intervalMs: 2600,
    },
    {
      id: "documents" as const,
      title: "Документы",
      narrative:
        "Гарантия и акт рождаются из наряда, а не из Word-шаблона. Печать, PDF и QR для клиента из тех же данных.",
      workflow: [
        { label: "Наряд закрыт", detail: "НЗ-2026-0142" },
        { label: "Сгенерировать PDF", detail: "Акт приёма-передачи" },
        { label: "Оформить гарантию", detail: "180 дней" },
        { label: "Печать", detail: "QR на талоне" },
      ],
      intervalMs: 2800,
    },
    {
      id: "repair-timeline" as const,
      title: "История ремонта",
      narrative:
        "Каждый этап фиксируется с временем и автором. Фото с цеха, статусы и гарантия видны всем, кто работает с машиной.",
      workflow: [
        { label: "Наряд открыт", detail: "09:12 · Иван М." },
        { label: "Фото этапа", detail: "Диагностика" },
        { label: "Ремонт завершён", detail: "Гарантия активна" },
      ],
      intervalMs: 2700,
    },
    {
      id: "platform" as const,
      title: "Desktop и mobile",
      narrative:
        "Кладовщик сканирует на телефоне. Мастер видит резерв на компьютере. Одна база, без задержки и без копирования.",
      workflow: [
        { label: "Скан на телефоне", detail: "VIN и двигатель" },
        { label: "Синхронизация", detail: "Realtime" },
        { label: "Резерв на desktop", detail: "Наряд обновлён" },
      ],
      intervalMs: 2200,
    },
    {
      id: "ai-import" as const,
      title: "Импорт прайсов",
      narrative:
        "Поставщик прислал Excel. Колонки сопоставляются автоматически, позиции попадают на склад без ручного переноса.",
      workflow: [
        { label: "Загрузить файл", detail: "Прайс поставщика" },
        { label: "Сопоставить колонки", detail: "SKU · название · цена" },
        { label: "Импорт на склад", detail: "128 позиций" },
      ],
      intervalMs: 3000,
    },
    {
      id: "analytics" as const,
      title: "Аналитика",
      narrative:
        "Выручка, маржа и остатки из операций, а не из сводных таблиц. Руководитель видит тренд недели без выгрузок.",
      workflow: [
        { label: "Операции в системе", detail: "Наряды и продажи" },
        { label: "KPI обновляются", detail: "Каждая смена" },
        { label: "Решение за минуту", detail: "Без Excel" },
      ],
      intervalMs: 3200,
    },
    {
      id: "security" as const,
      title: "Безопасность",
      narrative:
        "Права по ролям, изоляция компаний и журнал каждого изменения. Руководитель видит, кто изменил остаток или закрыл наряд.",
      workflow: [
        { label: "Роль определяет доступ", detail: "Склад · наряды · финансы" },
        { label: "Действие записано", detail: "Кто · что · когда" },
        { label: "Данные изолированы", detail: "Multi-tenant" },
      ],
      intervalMs: 2800,
    },
  ],
  cta: {
    titleLine1: "Пройдите день в AutoCore.",
    titleLine2: "За несколько минут.",
    description:
      "Откройте демо-компанию с живыми данными: склад, наряды, документы и синхронизация устройств без настройки.",
    primary: "Начать бесплатно",
    secondary: "Скачать приложение",
    secondaryHref: marketingRoutes.download,
    trust: ["14 дней бесплатно", "Без карты", "Демо-компания", "Windows и macOS"],
  },
} as const;
