"use client";

import { User } from "firebase/auth";

export type AuthDebugEntry = {
  id: number;
  at: string;
  source: string;
  message: string;
  detail?: string;
};

export type AuthDebugSnapshot = {
  pathname: string;
  search: string;
  firebaseUserUid: string | null;
  currentUserUid: string | null;
  isLoading: boolean | null;
  authReady: boolean | null;
  isAuthed: boolean | null;
  pendingAppleRedirect: boolean;
  appleAuthError: string | null;
  profileCompanyId: string | null;
};

const MAX_ENTRIES = 80;

let nextId = 1;
let entries: AuthDebugEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const code =
      "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? `[${(error as { code: string }).code}] `
        : "";
    return `${code}${error.message}`.trim();
  }
  return String(error);
}

export function isAuthDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "true") return true;
  if (window.location.search.includes("authDebug=1")) return true;
  return window.localStorage.getItem("autocore.authDebug") === "1";
}

export function setAuthDebugEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("autocore.authDebug", enabled ? "1" : "0");
  notify();
}

export function logAuthDebug(source: string, message: string, detail?: unknown) {
  if (!isAuthDebugEnabled()) return;

  const entry: AuthDebugEntry = {
    id: nextId++,
    at: new Date().toLocaleTimeString("ru-RU", { hour12: false }),
    source,
    message,
    detail:
      detail === undefined
        ? undefined
        : typeof detail === "string"
          ? detail
          : detail instanceof Error
            ? formatError(detail)
            : JSON.stringify(detail, null, 2),
  };

  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  console.info(`[auth-debug:${source}]`, message, detail ?? "");
  notify();
}

export function getAuthDebugEntries(): AuthDebugEntry[] {
  return entries;
}

export function clearAuthDebugEntries() {
  entries = [];
  notify();
}

export function subscribeAuthDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function describeFirebaseUser(user: User | null | undefined): string {
  if (!user) return "null";
  const providers = user.providerData.map((item) => item.providerId).join(", ") || "none";
  return `uid=${user.uid.slice(0, 8)}… email=${user.email ?? "—"} providers=${providers}`;
}

export function buildAuthDebugSnapshot(partial: Partial<AuthDebugSnapshot>): AuthDebugSnapshot {
  return {
    pathname: typeof window !== "undefined" ? window.location.pathname : "",
    search: typeof window !== "undefined" ? window.location.search : "",
    firebaseUserUid: null,
    currentUserUid: null,
    isLoading: null,
    authReady: null,
    isAuthed: null,
    pendingAppleRedirect: false,
    appleAuthError: null,
    profileCompanyId: null,
    ...partial,
  };
}

let lastSnapshotKey = "";

export function snapshotAuthDebug(snapshot: AuthDebugSnapshot) {
  const key = JSON.stringify(snapshot);
  if (key === lastSnapshotKey) return;
  lastSnapshotKey = key;
  logAuthDebug("snapshot", "state", snapshot);
}
