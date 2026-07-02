import { marketingRoutes } from "@/lib/marketing-routes";

export const landingContent = {
  nav: {
    signIn: "Войти",
    startFree: "Демо",
  },
  footer: {
    tagline: "Операционная система для авторазборок и автосервисов.",
  },
  hero: {
    title: "Сложный бизнес. Простой интерфейс.",
    subtitle:
      "Склад, наряды, документы и синхронизация устройств в одной системе. Без Excel и ночных сверок.",
    ctaPrimary: "Попробовать демо",
    ctaSecondary: "Скачать",
    ctaSecondaryHref: marketingRoutes.download,
  },
  philosophy: {
    title: "Не ERP и не CRM",
    description:
      "AutoCore заменяет Excel, WhatsApp и пять разных программ одной операционной системой. Склад, цех и офис работают из одного пространства, а не из разрозненных файлов.",
    before: ["Excel", "Бумага", "WhatsApp", "Звонки", "Папки", "Ручные PDF", "Поиск данных"],
    after: ["Одно пространство", "Синхронизация live", "Общий склад", "Общая история", "Автодокументы"],
    conclusion: "Одно действие запускает всю цепочку. Без копирования, без звонков, без ночных сверок.",
    workflows: [
      {
        id: "order",
        title: "Наряд в работе",
        intervalMs: 2200,
        initialIndex: 0,
        steps: [
          { label: "Наряд создан", detail: "НЗ-0142 · замена G4KC" },
          { label: "Резерв на складе", detail: "G4KC · полка A-12" },
          { label: "Гарантия оформлена", detail: "Связана с нарядом" },
          { label: "PDF сгенерирован", detail: "Акт приёма-передачи" },
          { label: "История обновлена", detail: "Видно всем отделам" },
        ],
      },
      {
        id: "vin",
        title: "Скан на телефоне",
        intervalMs: 2400,
        initialIndex: 1,
        steps: [
          { label: "VIN отсканирован", detail: "Кладовщик · телефон" },
          { label: "Двигатель распознан", detail: "G4KC · 2.4L" },
          { label: "Десктоп обновлён", detail: "Остаток синхронизирован" },
          { label: "Мастер уведомлён", detail: "Резерв подтверждён" },
        ],
      },
      {
        id: "photo",
        title: "Фото в ремонте",
        intervalMs: 2600,
        initialIndex: 2,
        steps: [
          { label: "Фото сделано", detail: "Цех · этап диагностики" },
          { label: "Прикреплено к наряду", detail: "НЗ-0142" },
          { label: "Таймлайн клиента", detail: "История ремонта" },
          { label: "Доступно везде", detail: "Офис · цех · телефон" },
        ],
      },
    ],
  },
  showcase: {
    title: "Как это выглядит в работе",
    description: "Реальный интерфейс: наряд, склад и печать из тех же данных.",
    scenes: [
      { id: "orders", label: "Наряды" },
      { id: "inventory", label: "Склад" },
      { id: "documents", label: "Документы" },
    ] as const,
  },
  platform: {
    title: "Desktop и телефон",
    description: "Кладовщик сканирует на телефоне, мастер видит резерв на компьютере.",
  },
  cta: {
    eyebrow: "Excel · бумага · WhatsApp · хаос",
    eyebrowTo: "одна операционная система",
    titleLine1: "Одно пространство.",
    titleLine2: "Каждая операция.",
    description:
      "Откройте заполненную демо-компанию и за несколько минут пройдите склад, наряды, документы и совместную работу в реальном времени.",
    primary: "Начать бесплатно",
    secondary: "Скачать приложение",
    secondaryHref: marketingRoutes.download,
    trust: [
      { label: "14 дней бесплатно", icon: "calendar" as const },
      { label: "Без карты", icon: "card" as const },
      { label: "Демо-компания", icon: "building" as const },
      { label: "Windows и desktop", icon: "desktop" as const },
    ],
  },
} as const;

export type LandingContent = typeof landingContent;
