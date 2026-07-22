"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getPersistenceEngine,
  RecoveryManager,
  type PersistenceEngine,
  type PersistenceEngineSnapshot,
  type PersistenceFlushReason,
  type PersistenceKey,
  type PersistenceSyncHandler,
  type PersistenceUiStatus,
} from "@/lib/persistence";

type PersistenceContextValue = {
  engine: PersistenceEngine;
  snapshot: PersistenceEngineSnapshot;
  uiStatus: PersistenceUiStatus;
  patch: (input: {
    key: PersistenceKey;
    snapshot: unknown;
    label?: string;
    schedule?: boolean;
  }) => Promise<void>;
  flush: (key: PersistenceKey, reason?: PersistenceFlushReason) => Promise<void>;
  flushAll: (reason?: PersistenceFlushReason) => Promise<void>;
  register: (input: {
    key: PersistenceKey;
    snapshot?: unknown;
    baseRevision?: string | null;
    label?: string;
    sync?: PersistenceSyncHandler | null;
  }) => void;
  unregister: (key: PersistenceKey) => void;
  setSyncHandler: (key: PersistenceKey, sync: PersistenceSyncHandler | null) => void;
  markClean: (key: PersistenceKey, baseRevision?: string | null) => Promise<void>;
  discardDraft: (key: PersistenceKey) => Promise<void>;
  hasUnsavedChanges: () => boolean;
  recovery: RecoveryManager;
};

const PersistenceContext = createContext<PersistenceContextValue | null>(null);

export function PersistenceProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => getPersistenceEngine(), []);
  const recovery = useMemo(() => new RecoveryManager(engine.drafts), [engine]);
  const [snapshot, setSnapshot] = useState<PersistenceEngineSnapshot>(() => engine.getSnapshot());
  const flushingRef = useRef(false);

  useEffect(() => {
    engine.start();
    void engine.drainQueue();
    const unsubscribe = engine.subscribe(setSnapshot);
    return () => {
      unsubscribe();
    };
  }, [engine]);

  const flushAll = useCallback(
    async (reason: PersistenceFlushReason = "manual") => {
      if (flushingRef.current) return;
      flushingRef.current = true;
      try {
        await engine.flushAll(reason);
      } finally {
        flushingRef.current = false;
      }
    },
    [engine],
  );

  // Save before close / refresh / tab hide
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden" && engine.hasUnsavedChanges()) {
        void flushAll("visibility");
      }
    }

    function onPageHide() {
      if (engine.hasUnsavedChanges()) {
        void flushAll("pagehide");
      }
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!engine.hasUnsavedChanges()) return;
      void flushAll("pagehide");
      event.preventDefault();
      event.returnValue = "";
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [engine, flushAll]);

  // Flush when leaving via in-app link clicks (capture phase)
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (anchor.target === "_blank") return;
      if (!engine.hasUnsavedChanges()) return;
      void flushAll("route");
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [engine, flushAll]);

  const value = useMemo<PersistenceContextValue>(
    () => ({
      engine,
      snapshot,
      uiStatus: snapshot.uiStatus,
      patch: (input) => engine.patch(input),
      flush: (key, reason) => engine.flush(key, reason),
      flushAll,
      register: (input) => engine.register(input),
      unregister: (key) => engine.unregister(key),
      setSyncHandler: (key, sync) => engine.setSyncHandler(key, sync),
      markClean: (key, baseRevision) => engine.markClean(key, baseRevision),
      discardDraft: (key) => engine.discardDraft(key),
      hasUnsavedChanges: () => engine.hasUnsavedChanges(),
      recovery,
    }),
    [engine, flushAll, recovery, snapshot],
  );

  return <PersistenceContext.Provider value={value}>{children}</PersistenceContext.Provider>;
}

export function usePersistence() {
  const ctx = useContext(PersistenceContext);
  if (!ctx) {
    throw new Error("usePersistence must be used within PersistenceProvider");
  }
  return ctx;
}

export function usePersistenceOptional() {
  return useContext(PersistenceContext);
}
