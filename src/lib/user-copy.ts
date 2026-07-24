import type { AppLocale } from "@autocore/i18n/config";

import { ACCOUNT_LOCALE_FALLBACK } from "@/lib/locale/preferred-locale";
import { userCopyEn } from "@/lib/user-copy.en";
import {
  authErrorMessagesEn,
  authErrorMessagesRu,
  permissionLabelsEn,
  permissionLabelsRu,
  roleLabelsEn,
  roleLabelsRu,
} from "@/lib/user-copy.locale-labels";
import { userCopyRu } from "@/lib/user-copy.ru";

const copies = {
  en: userCopyEn,
  ru: userCopyRu,
} as const satisfies Record<AppLocale, typeof userCopyEn | typeof userCopyRu>;

/** Structural EN shape; RU is asserted to match at runtime (validated by key-parity checks). */
type UserCopyBundle = typeof userCopyEn;

let activeLocale: AppLocale = ACCOUNT_LOCALE_FALLBACK;

export function setActiveUserCopyLocale(locale: AppLocale): void {
  activeLocale = locale in copies ? locale : ACCOUNT_LOCALE_FALLBACK;
}

export function getActiveUserCopyLocale(): AppLocale {
  return activeLocale;
}

function activeCopy(): UserCopyBundle {
  return (copies[activeLocale] ?? copies[ACCOUNT_LOCALE_FALLBACK]) as unknown as UserCopyBundle;
}

/**
 * Locale-aware UI copy. Reads from the active locale set by AppLocaleProvider.
 * Remounting the app tree on locale change re-evaluates static `userCopy.*` reads.
 */
export const userCopy: UserCopyBundle = new Proxy({} as UserCopyBundle, {
  get(_target, prop, receiver) {
    const bundle = activeCopy();
    const value = Reflect.get(bundle, prop, receiver);
    return typeof value === "function" ? value.bind(bundle) : value;
  },
  ownKeys() {
    return Reflect.ownKeys(activeCopy());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(activeCopy(), prop);
  },
  has(_target, prop) {
    return Reflect.has(activeCopy(), prop);
  },
});

export function formatRole(role: string | undefined | null): string {
  const labels = activeLocale === "en" ? roleLabelsEn : roleLabelsRu;
  if (role && role in labels) {
    return labels[role as keyof typeof labels];
  }
  return role ?? "—";
}

export function formatPermission(permission: string | undefined | null): string {
  const labels = activeLocale === "en" ? permissionLabelsEn : permissionLabelsRu;
  if (permission && permission in labels) {
    return labels[permission as keyof typeof labels];
  }
  return permission ?? "—";
}

export type AuthErrorContext = {
  provider?: "apple" | "google" | "email";
  surface?: "onboarding" | "sync";
};

function extractAuthErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code.startsWith("auth/")) return code;
  }

  if (error instanceof Error) {
    if (error.message.startsWith("auth/")) return error.message;

    const firebaseMatch = error.message.match(/\((auth\/[^)]+)\)/i);
    if (firebaseMatch?.[1]) return firebaseMatch[1];

    const prefixedMatch = error.message.match(/(?:Firebase:\s*)?(auth\/[\w-]+)/i);
    if (prefixedMatch?.[1]) return prefixedMatch[1];
  }

  return "";
}

const GRID_FIELD_LABELS_RU: Record<string, string> = {
  sku: "Артикул",
  name: "Название",
  serialCode: "Номер двигателя",
  brandName: "Бренд",
  engineCode: "Двигатель",
  configuration: "Комплектация",
  notes: "Особые отметки",
  quantity: "Кол-во",
  transmission: "Коробка",
};

const GRID_FIELD_LABELS_EN: Record<string, string> = {
  sku: "SKU",
  name: "Name",
  serialCode: "Engine number",
  brandName: "Brand",
  engineCode: "Engine",
  configuration: "Configuration",
  notes: "Notes",
  quantity: "Qty",
  transmission: "Transmission",
};

function mapValidationError(error: unknown): string | null {
  const fieldLabels = activeLocale === "en" ? GRID_FIELD_LABELS_EN : GRID_FIELD_LABELS_RU;
  const fieldFallback = activeLocale === "en" ? "field" : "поле";
  const fillRequired =
    activeLocale === "en"
      ? (labels: string[]) => `Fill required fields: ${labels.join(", ")}.`
      : (labels: string[]) => `Заполните обязательные поля: ${labels.join(", ")}.`;

  if (error instanceof Error && error.message.includes("Артикул и название")) {
    return activeLocale === "en" ? "SKU and name are required." : error.message;
  }
  if (error instanceof Error && error.message.includes("SKU и название")) {
    return activeLocale === "en"
      ? "SKU and name are required."
      : error.message.replace(/SKU/g, "Артикул");
  }

  const zodIssues =
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
      ? (error as { issues: Array<{ path?: unknown[]; message?: string }> }).issues
      : null;

  if (zodIssues) {
    const labels = [
      ...new Set(
        zodIssues.map(
          (issue) => fieldLabels[String(issue.path?.[0] ?? "")] ?? String(issue.path?.[0] ?? fieldFallback),
        ),
      ),
    ];
    if (labels.length > 0) return fillRequired(labels);
  }

  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as Array<{ path?: string[] }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const labels = [
          ...new Set(
            parsed.map(
              (issue) =>
                fieldLabels[String(issue.path?.[0] ?? "")] ?? String(issue.path?.[0] ?? fieldFallback),
            ),
          ),
        ];
        if (labels.length > 0) return fillRequired(labels);
      }
    } catch {
      // Not a JSON validation payload.
    }
  }

  return null;
}

export function mapGridSaveError(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code === "permission-denied") {
      return activeLocale === "en"
        ? "Could not save warehouse stock. Refresh the page and try again."
        : "Не удалось сохранить остаток на складе. Обновите страницу и попробуйте снова.";
    }
    if (code === "invalid-argument") {
      return activeLocale === "en"
        ? "Could not save: a row has an invalid value. Check empty fields, prices, and quantities."
        : "Не удалось сохранить: в строке есть некорректное значение. Проверьте пустые поля, цены и количество.";
    }
  }
  if (error instanceof Error && /missing or insufficient permissions/i.test(error.message)) {
    return activeLocale === "en"
      ? "Could not save warehouse stock. Refresh the page and try again."
      : "Не удалось сохранить остаток на складе. Обновите страницу и попробуйте снова.";
  }
  if (
    error instanceof Error &&
    /unsupported field value|undefined|invalid-argument/i.test(error.message)
  ) {
    return activeLocale === "en"
      ? "Could not save: one field has an invalid value. Clear it or fill it again."
      : "Не удалось сохранить: одно из полей имеет некорректное значение. Очистите поле или заполните его заново.";
  }
  return mapValidationError(error) ?? mapAuthError(error, { surface: "sync" });
}

export function mapAuthError(error: unknown, context?: AuthErrorContext): string {
  const code = extractAuthErrorCode(error);
  const messages = activeLocale === "en" ? authErrorMessagesEn : authErrorMessagesRu;

  if (code === "permission-denied") {
    if (error instanceof Error && error.message.includes("Не удалось")) {
      return error.message;
    }
    if (context?.surface === "onboarding") {
      return activeLocale === "en"
        ? "Could not complete the action. Refresh the page and try again."
        : "Не удалось выполнить действие. Обновите страницу и попробуйте снова.";
    }
    return messages["permission-denied"];
  }

  if (code && messages[code]) {
    return messages[code];
  }

  if (error instanceof Error && error.message) {
    if (/missing or insufficient permissions/i.test(error.message)) {
      if (context?.surface === "onboarding") {
        return activeLocale === "en"
          ? "Could not complete the action. Refresh the page and try again."
          : "Не удалось выполнить действие. Обновите страницу и попробуйте снова.";
      }
      return messages["permission-denied"];
    }
    if (error.message.includes("Не удалось")) {
      return error.message.replace(/\s*\([a-z0-9/-]+\)\s*$/i, "").trim();
    }
    return error.message;
  }
  return code || "Unknown auth error";
}
