"use client";

import { useSyncExternalStore } from "react";

import {
  clearAuthDebugEntries,
  getAuthDebugEntries,
  isAuthDebugEnabled,
  setAuthDebugEnabled,
  subscribeAuthDebug,
  type AuthDebugSnapshot,
} from "@/lib/auth/auth-debug";

type AuthDebugPanelProps = {
  snapshot: AuthDebugSnapshot;
};

const SERVER_AUTH_DEBUG_ENTRIES: ReturnType<typeof getAuthDebugEntries> = [];

function getServerAuthDebugEntries() {
  return SERVER_AUTH_DEBUG_ENTRIES;
}

export function AuthDebugPanel({ snapshot }: AuthDebugPanelProps) {
  const enabled = useSyncExternalStore(
    subscribeAuthDebug,
    () => isAuthDebugEnabled(),
    () => false,
  );
  const entries = useSyncExternalStore(
    subscribeAuthDebug,
    getAuthDebugEntries,
    getServerAuthDebugEntries,
  );

  if (!enabled) {
    return (
      <button
        type="button"
        className="fixed bottom-3 right-3 z-[100] rounded-full border bg-background/95 px-3 py-1.5 text-xs shadow-md backdrop-blur"
        onClick={() => setAuthDebugEnabled(true)}
      >
        Auth debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[100] flex max-h-[min(70vh,520px)] w-[min(92vw,420px)] flex-col overflow-hidden rounded-xl border bg-background/95 text-xs shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="font-medium">Auth debug</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => clearAuthDebugEntries()}
          >
            Очистить
          </button>
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => setAuthDebugEnabled(false)}
          >
            Скрыть
          </button>
        </div>
      </div>

      <div className="space-y-1 border-b bg-muted/30 px-3 py-2 font-mono">
        <div>path: {snapshot.pathname}{snapshot.search}</div>
        <div>firebaseUser: {snapshot.firebaseUserUid ?? "null"}</div>
        <div>currentUser: {snapshot.currentUserUid ?? "null"}</div>
        <div>
          isLoading={String(snapshot.isLoading)} authReady={String(snapshot.authReady)} isAuthed=
          {String(snapshot.isAuthed)}
        </div>
        <div>appleRedirectPending={String(snapshot.pendingAppleRedirect)}</div>
        <div>profile.companyId={snapshot.profileCompanyId ?? "null"}</div>
        {snapshot.appleAuthError ? (
          <div className="text-destructive">appleError: {snapshot.appleAuthError}</div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono">
        {entries.length === 0 ? (
          <div className="text-muted-foreground">Событий пока нет.</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="mb-2 border-b border-border/50 pb-2 last:border-0">
              <div className="text-muted-foreground">
                {entry.at} · {entry.source}
              </div>
              <div>{entry.message}</div>
              {entry.detail ? (
                <pre className="mt-1 whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
                  {entry.detail}
                </pre>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
