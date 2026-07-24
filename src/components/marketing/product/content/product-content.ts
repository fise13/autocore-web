import { marketingRoutes } from "@/lib/marketing-routes";

export type ProductSectionId =
  | "engine-search"
  | "sale"
  | "work-order"
  | "documents"
  | "finance"
  | "mobile"
  | "ai";

export const productContent = {
  hero: {
    title: "Один склад. Один цех. Одна правда.",
    subtitle: "Живой интерфейс — откройте экран и пройдите операцию сами.",
  },
  toc: {
    title: "Продукт",
    items: [
      { id: "engine-search" as const, label: "Поиск двигателя" },
      { id: "sale" as const, label: "Продажа" },
      { id: "work-order" as const, label: "Заказ-наряд" },
      { id: "documents" as const, label: "Документы" },
      { id: "finance" as const, label: "Финансы" },
      { id: "mobile" as const, label: "Mobile" },
      { id: "ai" as const, label: "AI" },
    ],
  },
  sections: {
    "engine-search": {
      id: "engine-search" as const,
      title: "Поиск двигателя",
      question: "Есть ли он у меня?",
      line: "Введите код, отфильтруйте наличие, увидьте полку и резерв. Та же Excel-сетка, что в рабочей смене.",
      searchPrompt: "Найдите двигатель за секунды — поиск, фильтр, полка, резерв.",
    },
    sale: {
      id: "sale" as const,
      title: "Продажа",
      question: "Как быстро оформить продажу?",
      line: "Нажмите «Продать». Откроется настоящее окно продажи, затем цепочка: остаток → наряд → гарантийный PDF.",
      sellLabel: "Продать",
      cascade: [
        "Продажа сохранена",
        "Остаток обновлён",
        "Наряд связан",
        "Гарантия готова",
      ],
      replay: "Повторить",
      closeDocument: "Закрыть",
    },
    "work-order": {
      id: "work-order" as const,
      title: "Заказ-наряд",
      question: "Как вести работу?",
      line: "Открытая карточка наряда: клиент, машина, работы, финансы и документы — тот же экран, что в кабинете.",
    },
    documents: {
      id: "documents" as const,
      title: "Документы",
      question: "Что получает клиент?",
      line: "Настоящие PDF: заказ-наряд, гарантия и акт — из тех же данных, что и в рабочем кабинете.",
    },
    finance: {
      id: "finance" as const,
      title: "Финансы",
      question: "Где отражается операция?",
      line: "Касса, карта и операции по наряду — тот же экран бухгалтерии.",
    },
    mobile: {
      id: "mobile" as const,
      title: "Mobile",
      question: "Что можно сделать вне офиса?",
      line: "На телефоне: склад, скан VIN и резерв — с интерактивом внутри симулятора.",
    },
    ai: {
      id: "ai" as const,
      title: "AI-импорт",
      question: "Что можно автоматизировать?",
      line: "Прайс Excel: колонки сопоставляются, уверенность видна, позиции уходят на склад без ручного копирования.",
    },
  },
  cta: {
    titleLine1: "Проверьте на своём процессе.",
    titleLine2: "Демо уже заполнено.",
    primary: "Демо",
    secondary: "Скачать",
    secondaryHref: marketingRoutes.download,
  },
} as const;
