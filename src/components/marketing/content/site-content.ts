import { marketingRoutes } from "@/lib/marketing-routes";

/** Узел графа знаний: вопрос → ответ, позиция в горизонтальном полотне. */
export type KnowledgeNode = {
  id: string;
  parentId?: string;
  x: number;
  y: number;
  kind: "origin" | "hub" | "leaf";
  question: string;
  answer: string;
  tag?: string;
  href?: string;
  hrefLabel?: string;
};

export const siteContent = {
  nav: {
    graph: "Карта ценности",
    modules: "Модули",
    process: "Процесс",
    faq: "Вопросы",
    signIn: "Войти",
  },
  hero: {
    eyebrow: "Операционная система дилерского центра",
    title: "Один контур для склада, цеха, офиса и бухгалтерии",
    subtitle:
      "AutoCore связывает остатки, заказ-наряды, финансы и команду в realtime. Mission Control — единая точка правды для всего бизнеса.",
    exploreGraph: "Исследовать карту ценности",
    exploreModules: "Справочник модулей",
  },
  graph: {
    label: "Структура ценности",
    title: "База вопросов и ответов",
    description:
      "Листайте вправо по ветвям — как в графе знаний. Каждый узел: вопрос бизнеса и конкретный ответ AutoCore. От общей боли — к модулям и результату.",
    scroll: "Скролл →",
    nodes: [
      {
        id: "origin",
        kind: "origin",
        x: 140,
        y: 380,
        question: "Почему дилеру нужна одна система?",
        answer: "Потому что разрыв между Excel, цехом и бухгалтерией стоит денег каждый день.",
        tag: "Корень",
      },
      {
        id: "pain-1",
        parentId: "origin",
        kind: "leaf",
        x: 420,
        y: 180,
        question: "Что происходит с остатками?",
        answer: "Двойной ввод, устаревшие файлы, спор «сколько на полке» между складом и офисом.",
        tag: "Боль",
      },
      {
        id: "pain-2",
        parentId: "origin",
        kind: "leaf",
        x: 420,
        y: 320,
        question: "Где теряется маржа?",
        answer: "В ночных сверках, ручных проводках и нарядах без связи со складом.",
        tag: "Боль",
      },
      {
        id: "pain-3",
        parentId: "origin",
        kind: "leaf",
        x: 420,
        y: 520,
        question: "Кто виноват при ошибке?",
        answer: "Без журнала действий невозможно быстро найти человека, роль и момент изменения.",
        tag: "Боль",
      },
      {
        id: "hub",
        parentId: "origin",
        kind: "hub",
        x: 720,
        y: 380,
        question: "Что даёт AutoCore?",
        answer: "Единый operational layer: изменение в одном модуле — факт для всей компании в realtime.",
        tag: "Решение",
      },
      {
        id: "mod-warehouse",
        parentId: "hub",
        kind: "leaf",
        x: 1020,
        y: 140,
        question: "Как устроен склад?",
        answer: "Сетка как Excel, штрихкод, импорт прайсов, алерты остатка — без отдельной «версии правды».",
        tag: "Модуль",
        href: `${marketingRoutes.modules}#warehouse`,
        hrefLabel: "Склад",
      },
      {
        id: "mod-orders",
        parentId: "hub",
        kind: "leaf",
        x: 1020,
        y: 280,
        question: "Как связан цех?",
        answer: "Заказ-наряд списывает расходники, обновляет склад и порождает проводки.",
        tag: "Модуль",
        href: `${marketingRoutes.modules}#work-orders`,
        hrefLabel: "Заказ-наряды",
      },
      {
        id: "mod-accounting",
        parentId: "hub",
        kind: "leaf",
        x: 1020,
        y: 420,
        question: "Где финансы?",
        answer: "Ledger в контексте операций дня, авансы и выручка — рядом с Mission Control.",
        tag: "Модуль",
        href: `${marketingRoutes.modules}#accounting`,
        hrefLabel: "Бухгалтерия",
      },
      {
        id: "mod-team",
        parentId: "hub",
        kind: "leaf",
        x: 1020,
        y: 560,
        question: "Как с командой?",
        answer: "RBAC, присутствие онлайн, журнал — кто, что и когда изменил.",
        tag: "Модуль",
        href: marketingRoutes.security,
        hrefLabel: "Безопасность",
      },
      {
        id: "mc",
        parentId: "hub",
        kind: "hub",
        x: 1320,
        y: 380,
        question: "Что такое Mission Control?",
        answer: "Утренний обзор KPI, модулей и живого журнала — командный центр, а не отчёт ради отчёта.",
        tag: "Центр",
        href: `${marketingRoutes.modules}#mission-control`,
        hrefLabel: "Mission Control",
      },
      {
        id: "mc-1",
        parentId: "mc",
        kind: "leaf",
        x: 1620,
        y: 200,
        question: "Какие метрики сразу?",
        answer: "Выручка, остатки, наряды, авансы, низкий остаток, команда онлайн.",
      },
      {
        id: "mc-2",
        parentId: "mc",
        kind: "leaf",
        x: 1620,
        y: 380,
        question: "Как искать?",
        answer: "Командная палитра ⌘K — переход в модуль без меню на три уровня.",
      },
      {
        id: "mc-3",
        parentId: "mc",
        kind: "leaf",
        x: 1620,
        y: 560,
        question: "Журнал рядом?",
        answer: "Да — активность команды в боковой панели, синхронно с KPI.",
      },
      {
        id: "sync",
        parentId: "mc",
        kind: "hub",
        x: 1920,
        y: 380,
        question: "Как работает realtime?",
        answer: "Firestore-синхронизация: правка на iPhone в цехе видна в офисе без выгрузок.",
        tag: "Sync",
      },
      {
        id: "sync-1",
        parentId: "sync",
        kind: "leaf",
        x: 2220,
        y: 240,
        question: "Веб и native?",
        answer: "Один UI: браузер, macOS, iPhone — одна модель, не три продукта.",
        href: `${marketingRoutes.home}#platform`,
        hrefLabel: "Платформы",
      },
      {
        id: "sync-2",
        parentId: "sync",
        kind: "leaf",
        x: 2220,
        y: 520,
        question: "Импорт Excel?",
        answer: "Нормализация колонок с превью — без «AI-агентов», только объяснимая автоматизация.",
        href: `${marketingRoutes.home}#import`,
        hrefLabel: "Импорт",
      },
      {
        id: "outcome",
        parentId: "sync",
        kind: "hub",
        x: 2520,
        y: 380,
        question: "Итог для бизнеса?",
        answer: "Скорость решений, доверие к цифрам, масштаб без новых таблиц на каждый отдел.",
        tag: "Результат",
      },
      {
        id: "out-1",
        parentId: "outcome",
        kind: "leaf",
        x: 2820,
        y: 260,
        question: "Меньше сверок?",
        answer: "Цепочка склад → наряд → бухгалтерия замкнута — нет ночных батчей.",
      },
      {
        id: "out-2",
        parentId: "outcome",
        kind: "leaf",
        x: 2820,
        y: 500,
        question: "Готовность к росту?",
        answer: "Новая точка или отдел подключает модули по готовности, не ломая контур.",
        href: marketingRoutes.pricing,
        hrefLabel: "Тарифы",
      },
    ] satisfies KnowledgeNode[],
  },
  pillars: [
    {
      title: "Единый источник правды",
      body: "Остаток, проводка и наряд ссылаются на одни данные — не на три файла.",
    },
    {
      title: "Скорость на полу",
      body: "Сканер, inline-правки, ⌘K — операции без ожидания «обновления отчёта».",
    },
    {
      title: "Подотчётность",
      body: "Роли и журнал — руководитель видит изменения, а не догадывается.",
    },
  ],
  modules: [
    {
      id: "mission-control",
      name: "Mission Control",
      summary: "Командный дашборд и KPI",
      points: ["Обзор дня", "Модули-виджеты", "Журнал активности", "⌘K навигация"],
      href: `${marketingRoutes.modules}#mission-control`,
    },
    {
      id: "warehouse",
      name: "Склад",
      summary: "Инвентарь и ячейки",
      points: ["Excel-like сетка", "Штрихкод", "Импорт", "Алерты"],
      href: `${marketingRoutes.modules}#warehouse`,
    },
    {
      id: "work-orders",
      name: "Заказ-наряды",
      summary: "Цех и документы",
      points: ["Наряды", "Расходники", "Списание", "Пакет на выдачу"],
      href: `${marketingRoutes.modules}#work-orders`,
    },
    {
      id: "accounting",
      name: "Бухгалтерия",
      summary: "Ledger в операциях",
      points: ["Проводки", "Авансы", "Выручка", "Баланс"],
      href: `${marketingRoutes.modules}#accounting`,
    },
    {
      id: "inventory",
      name: "Номенклатура",
      summary: "Каталог и моторы",
      points: ["Бренды", "Категории", "Sold", "Связь со складом"],
      href: `${marketingRoutes.modules}#inventory`,
    },
    {
      id: "security",
      name: "Команда и RBAC",
      summary: "Права и аудит",
      points: ["Роли", "Онлайн", "Журнал", "Enterprise"],
      href: marketingRoutes.security,
    },
  ],
  process: {
    label: "Операционная цепочка",
    title: "От ячейки до подписи клиента",
    steps: [
      { name: "Склад", desc: "Резерв и остаток" },
      { name: "Наряд", desc: "Работы и детали" },
      { name: "Списание", desc: "Расходники" },
      { name: "Проводка", desc: "Бухгалтерия" },
      { name: "Документ", desc: "Выдача" },
      { name: "Журнал", desc: "След" },
    ],
  },
  platform: {
    title: "Одна экосистема",
    items: ["Веб — полная глубина", "macOS — native + hotkeys", "iPhone — пол и склад"],
  },
  faq: [
    {
      q: "Это замена 1С или Excel?",
      a: "Операционный контур дилера: склад, наряды, MC. Бухгалтерия в связке с операциями — не изолированный отчёт.",
    },
    {
      q: "Сколько времени на внедрение?",
      a: "Старт с Mission Control и склада; наряды и RBAC — по готовности команды, без big-bang.",
    },
    {
      q: "Где документация модулей?",
      a: "Каталог /marketing/modules с перекрёстными ссылками и якорями на этой странице.",
    },
  ],
  close: {
    title: "Продолжить изучение",
    links: [
      { href: marketingRoutes.modules, label: "Каталог модулей" },
      { href: marketingRoutes.product, label: "О продукте" },
      { href: marketingRoutes.security, label: "Безопасность" },
      { href: marketingRoutes.pricing, label: "Тарифы" },
      { href: marketingRoutes.contact, label: "Контакты" },
    ],
  },
} as const;

export function getGraphEdges(nodes: KnowledgeNode[]) {
  return nodes
    .filter((n) => n.parentId)
    .map((n) => ({
      from: nodes.find((p) => p.id === n.parentId)!,
      to: n,
    }))
    .filter((e) => e.from);
}

export function getGraphWidth(nodes: KnowledgeNode[]) {
  return Math.max(...nodes.map((n) => n.x)) + 420;
}
