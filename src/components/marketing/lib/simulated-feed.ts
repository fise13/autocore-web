export type FeedTone = "success" | "warning" | "operational" | "critical";

export type SimulatedFeedEvent = {
  id: string;
  actor: string;
  action: string;
  module: string;
  tone: FeedTone;
  time: string;
};

const ACTORS = ["М. Чен", "А. Ривера", "И. Оконкво", "С. Патель", "К. Новак"];
const MODULES = ["Склад", "Заказ-наряды", "Бухгалтерия", "Инвентарь", "Сотрудники"];

const EVENTS: Omit<SimulatedFeedEvent, "id" | "time">[] = [
  { actor: ACTORS[0], action: "Корректировка остатка · Альтернатор 12V", module: "Склад", tone: "operational" },
  { actor: ACTORS[1], action: "Закрыт заказ-наряд №1842", module: "Заказ-наряды", tone: "success" },
  { actor: ACTORS[2], action: "Списаны расходники", module: "Бухгалтерия", tone: "operational" },
  { actor: ACTORS[3], action: "Сканирована палета · Зона 3", module: "Инвентарь", tone: "success" },
  { actor: ACTORS[4], action: "Алерт: низкий остаток · Фильтр 04152", module: "Склад", tone: "warning" },
  { actor: ACTORS[0], action: "Сформирован документ монтажа", module: "Заказ-наряды", tone: "success" },
  { actor: ACTORS[1], action: "Сверка дневного ledger", module: "Бухгалтерия", tone: "operational" },
  { actor: ACTORS[2], action: "Обновлена роль · Руководитель сервиса", module: "Сотрудники", tone: "operational" },
  { actor: ACTORS[3], action: "Импорт: нормализовано 248 строк", module: "Склад", tone: "success" },
  { actor: ACTORS[4], action: "Критическое отклонение в проводке", module: "Бухгалтерия", tone: "critical" },
];

let sequence = 0;

export function nextFeedEvent(): SimulatedFeedEvent {
  const template = EVENTS[sequence % EVENTS.length];
  sequence += 1;
  return {
    ...template,
    id: `evt-${sequence}-${Date.now()}`,
    time: "сейчас",
  };
}

export const INITIAL_FEED: SimulatedFeedEvent[] = EVENTS.slice(0, 5).map((event, index) => ({
  ...event,
  id: `init-${index}`,
  time: index === 0 ? "сейчас" : `${index * 12} с назад`,
}));
