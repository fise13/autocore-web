import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import "server-only";

const SERVICE_ACCOUNT_FILE_PATTERN = /firebase-adminsdk.*\.json$/i;

function discoverServiceAccountInDir(dir: string): string | null {
  try {
    const match = readdirSync(dir).find((name) => SERVICE_ACCOUNT_FILE_PATTERN.test(name));
    return match ? join(dir, match) : null;
  } catch {
    return null;
  }
}

function resolveProjectRoot(): string {
  const roots = new Set<string>();
  let cursor = process.cwd();

  for (let depth = 0; depth < 8; depth += 1) {
    roots.add(cursor);
    try {
      const pkgPath = join(cursor, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "autocore-web") {
          return cursor;
        }
      }
    } catch {
      // Keep walking up.
    }

    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  return process.cwd();
}

function discoverServiceAccountUpwards(startDir?: string): string | null {
  let cursor = startDir ?? process.cwd();
  for (let depth = 0; depth < 12; depth += 1) {
    const discovered = discoverServiceAccountInDir(cursor);
    if (discovered) return discovered;

    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return null;
}

function candidatePaths(configuredPath?: string): string[] {
  const projectRoot = resolveProjectRoot();
  const cwd = process.cwd();
  const searchDirs = [...new Set([projectRoot, cwd])];
  const candidates: string[] = [];

  if (configuredPath) {
    const trimmed = configuredPath.trim();
    candidates.push(resolve(trimmed));
    for (const dir of searchDirs) {
      if (!isAbsolute(trimmed)) {
        candidates.push(resolve(dir, trimmed));
      }
    }
  }

  for (const dir of searchDirs) {
    const discovered = discoverServiceAccountInDir(dir);
    if (discovered) {
      candidates.push(discovered);
    }
  }

  const upwards = discoverServiceAccountUpwards(projectRoot);
  if (upwards) {
    candidates.push(upwards);
  }

  return [...new Set(candidates)];
}

function isServerlessDeploy(): boolean {
  return Boolean(process.env.VERCEL?.trim() || process.env.AWS_LAMBDA_FUNCTION_NAME?.trim());
}

function serviceAccountSetupHint(configuredPath?: string): string {
  if (isServerlessDeploy()) {
    return (
      "На Vercel/сервере файл ключа недоступен. Задайте FIREBASE_SERVICE_ACCOUNT_JSON " +
      "(полный JSON сервисного аккаунта одной строкой) в Environment Variables и redeploy. " +
      "Удалите FIREBASE_SERVICE_ACCOUNT_PATH из Vercel — он работает только локально."
    );
  }

  const hint = configuredPath
    ? `Путь из FIREBASE_SERVICE_ACCOUNT_PATH не найден: ${configuredPath}`
    : "FIREBASE_SERVICE_ACCOUNT_PATH не задан";

  return (
    `${hint}. Скачайте ключ в Firebase Console → Project settings → Service accounts, ` +
    "сохраните *-firebase-adminsdk-*.json в корень проекта и укажите " +
    "FIREBASE_SERVICE_ACCOUNT_PATH=./имя-файла.json (перезапустите dev-сервер)."
  );
}

export function resolveServiceAccountFilePath(): string {
  const configured =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  const found = candidatePaths(configured).find((path) => existsSync(path));
  if (found) return found;

  throw new Error(serviceAccountSetupHint(configured));
}

export function readServiceAccountFromDisk(): Record<string, unknown> {
  const filePath = resolveServiceAccountFilePath();
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function isPlaceholderServiceAccountJson(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.includes("...") || /"project_id"\s*:\s*"\.\.\."/.test(trimmed);
}

export function parseInlineServiceAccount(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (isPlaceholderServiceAccountJson(trimmed)) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON содержит placeholder (...). Укажите полный JSON сервисного аккаунта.",
    );
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON: ${message}`);
  }
}

function canReadServiceAccountFromDisk(): boolean {
  if (isServerlessDeploy()) return false;

  const configured =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (configured) {
    return candidatePaths(configured).some((path) => existsSync(path));
  }

  return Boolean(
    discoverServiceAccountInDir(resolveProjectRoot()) ||
      discoverServiceAccountInDir(process.cwd()) ||
      discoverServiceAccountUpwards(),
  );
}

function parseServiceAccountOnServerless(): Record<string, unknown> {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

  if (!inline || isPlaceholderServiceAccountJson(inline)) {
    const pathHint = configuredPath
      ? ` Сейчас задан FIREBASE_SERVICE_ACCOUNT_PATH=${configuredPath}, но файл на Vercel недоступен — удалите эту переменную.`
      : "";
    throw new Error(
      "На Vercel задайте FIREBASE_SERVICE_ACCOUNT_JSON (полный JSON сервисного аккаунта одной строкой) и redeploy." +
        pathHint,
    );
  }

  return parseInlineServiceAccount(inline);
}

export function parseServiceAccount(): Record<string, unknown> {
  if (isServerlessDeploy()) {
    return parseServiceAccountOnServerless();
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (inline && !isPlaceholderServiceAccountJson(inline)) {
    try {
      return parseInlineServiceAccount(inline);
    } catch (error) {
      if (canReadServiceAccountFromDisk()) {
        console.warn("[firebase-admin] Invalid FIREBASE_SERVICE_ACCOUNT_JSON, using file path fallback");
        return readServiceAccountFromDisk();
      }
      throw error;
    }
  }

  if (inline && isPlaceholderServiceAccountJson(inline)) {
    if (canReadServiceAccountFromDisk()) {
      console.warn("[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON is a placeholder, using file path fallback");
      return readServiceAccountFromDisk();
    }
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON содержит placeholder (...). Вставьте полный JSON сервисного аккаунта в Vercel или удалите переменную.",
    );
  }

  if (canReadServiceAccountFromDisk()) {
    return readServiceAccountFromDisk();
  }

  throw new Error(
    "Firebase Admin не настроен локально. Задайте FIREBASE_SERVICE_ACCOUNT_PATH в .env.local " +
      "(файл *-firebase-adminsdk-*.json в корне проекта) или FIREBASE_SERVICE_ACCOUNT_JSON.",
  );
}
