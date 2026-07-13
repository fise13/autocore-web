export const I18N_NAMESPACES = [
  "common",
  "navigation",
  "authentication",
  "onboarding",
  "organization",
  "employees",
  "inventory",
  "motors",
  "warehouse",
  "orders",
  "customers",
  "accounting",
  "billing",
  "settings",
  "notifications",
  "activity",
  "documents",
  "warranty",
  "imports",
  "exports",
  "scan",
  "search",
  "command-palette",
  "validation",
  "errors",
  "a11y",
  "emails",
  "metadata",
  "marketing",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const CORE_NAMESPACES = ["common", "errors", "validation", "a11y"] as const satisfies readonly I18nNamespace[];

export function isI18nNamespace(value: unknown): value is I18nNamespace {
  return (
    typeof value === "string" &&
    I18N_NAMESPACES.includes(value as I18nNamespace)
  );
}
