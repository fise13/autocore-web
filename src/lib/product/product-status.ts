export type SystemStatusLevel = "operational" | "degraded" | "outage";

export type SystemStatusComponentId = "app" | "firestore" | "auth" | "storage";

export type SystemStatusComponentDefinition = {
  id: SystemStatusComponentId;
  name: string;
  description: string;
};

export const systemStatusComponents: SystemStatusComponentDefinition[] = [
  {
    id: "app",
    name: "Приложение",
    description: "Веб-интерфейс и API AutoCore.",
  },
  {
    id: "firestore",
    name: "База данных",
    description: "Хранение данных компаний, склада и нарядов.",
  },
  {
    id: "auth",
    name: "Авторизация",
    description: "Вход, сессии и права доступа.",
  },
  {
    id: "storage",
    name: "Файлы",
    description: "Логотипы, PDF и вложения.",
  },
];

export type SystemStatusIncident = {
  id: string;
  date: string;
  title: string;
  summary: string;
  resolved?: boolean;
};

export const systemStatusIncidents: SystemStatusIncident[] = [];

export function readExternalStatusUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_AUTOCORE_STATUS_URL?.trim();
  return fromEnv || null;
}

export function getStatusPageHref(): string {
  return readExternalStatusUrl() ?? "/status";
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export const systemStatusLevelLabels: Record<SystemStatusLevel, string> = {
  operational: "Работает",
  degraded: "Частичные сбои",
  outage: "Недоступно",
};
