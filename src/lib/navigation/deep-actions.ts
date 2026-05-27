export const DEEP_ACTIONS = [
  "expense",
  "import",
  "export",
  "sync",
  "sell",
  "add",
  "invite",
] as const;

export type DeepAction = (typeof DEEP_ACTIONS)[number];

export function isDeepAction(value: string | null | undefined): value is DeepAction {
  return value != null && (DEEP_ACTIONS as readonly string[]).includes(value);
}

export function buildDeepActionUrl(path: string, action: DeepAction, extra?: Record<string, string>) {
  const params = new URLSearchParams({ action, ...extra });
  return `${path}?${params.toString()}`;
}

export const deepActionRoutes = {
  expense: () => buildDeepActionUrl("/accounting", "expense"),
  import: () => buildDeepActionUrl("/motors", "import"),
  export: () => buildDeepActionUrl("/motors", "export"),
  sync: () => buildDeepActionUrl("/motors", "sync"),
  sell: () => buildDeepActionUrl("/motors", "sell"),
  add: () => buildDeepActionUrl("/motors", "add"),
  invite: () => buildDeepActionUrl("/settings", "invite", { section: "employees" }),
} as const;
