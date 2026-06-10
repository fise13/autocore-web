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

  return [...new Set(candidates)];
}

export function resolveServiceAccountFilePath(): string {
  const configured =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  const found = candidatePaths(configured).find((path) => existsSync(path));
  if (found) return found;

  const hint = configured
    ? `Путь из FIREBASE_SERVICE_ACCOUNT_PATH не найден: ${configured}`
    : "FIREBASE_SERVICE_ACCOUNT_PATH не задан";

  throw new Error(
    `${hint}. Скачайте ключ в Firebase Console → Project settings → Service accounts, сохраните *-firebase-adminsdk-*.json в корень проекта и укажите FIREBASE_SERVICE_ACCOUNT_PATH=./имя-файла.json (перезапустите dev-сервер).`,
  );
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
  const configured =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const projectRoot = resolveProjectRoot();
  return Boolean(
    configured ||
      discoverServiceAccountInDir(projectRoot) ||
      discoverServiceAccountInDir(process.cwd()),
  );
}

export function parseServiceAccount(): Record<string, unknown> {
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
    "Firebase Admin не настроен. Задайте FIREBASE_SERVICE_ACCOUNT_PATH (локально) или FIREBASE_SERVICE_ACCOUNT_JSON (Vercel).",
  );
}
