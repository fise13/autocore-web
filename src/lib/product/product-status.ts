import { userCopy } from "@/lib/user-copy";

export type SystemStatusLevel = "operational" | "degraded" | "outage";

export type SystemStatusComponentId = "app" | "firestore" | "auth" | "storage";

export type SystemStatusComponentDefinition = {
  id: SystemStatusComponentId;
  name: string;
  description: string;
};

const SYSTEM_STATUS_COMPONENT_IDS: SystemStatusComponentId[] = [
  "app",
  "firestore",
  "auth",
  "storage",
];

export function getSystemStatusComponents(): SystemStatusComponentDefinition[] {
  const meta = userCopy.systemStatus.componentsMeta;
  return SYSTEM_STATUS_COMPONENT_IDS.map((id) => ({
    id,
    name: meta[id].name,
    description: meta[id].description,
  }));
}

/** Locale-aware component list — prefer getSystemStatusComponents() at call time. */
export const systemStatusComponents: SystemStatusComponentDefinition[] = new Proxy(
  [] as SystemStatusComponentDefinition[],
  {
    get(_target, prop, receiver) {
      const live = getSystemStatusComponents();
      if (prop === "length") return live.length;
      if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        return live[Number(prop)];
      }
      const value = Reflect.get(live, prop, receiver);
      return typeof value === "function" ? value.bind(live) : value;
    },
  },
);

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

export function getSystemStatusLevelLabels(): Record<SystemStatusLevel, string> {
  return { ...userCopy.systemStatus.levels };
}

/** Locale-aware level labels — read at call/render time. */
export const systemStatusLevelLabels: Record<SystemStatusLevel, string> = new Proxy(
  {} as Record<SystemStatusLevel, string>,
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return userCopy.systemStatus.levels[prop as SystemStatusLevel];
    },
    ownKeys() {
      return Reflect.ownKeys(userCopy.systemStatus.levels);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return {
        configurable: true,
        enumerable: true,
        value: userCopy.systemStatus.levels[prop as SystemStatusLevel],
      };
    },
    has(_target, prop) {
      return Reflect.has(userCopy.systemStatus.levels, prop);
    },
  },
);
