"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

import { CoreAskOrb } from "@/components/ai/core-ask-orb";
import { CoreChatRuntime } from "@/components/ai/core-chat-runtime";
import {
  CHAT_TITLE_MAX,
  createEmptyChatSession,
  sortSessionsByUpdated,
  withUpdatedMessages,
  type AssistantChatSession,
} from "@/domain/ai/assistant-chats";
import type { CoreUIMessage } from "@/domain/ai/core-message";
import {
  resolvePointerState,
  type AssistantState,
} from "@/domain/ai/assistant-state";
import { loadChatSessions, saveChatSessions } from "@/lib/ai/assistant-chats.storage";
import { resolveAssistantContext, type AssistantContext } from "@/lib/ai/assistant-context";
import type { AssistantRequestContext } from "@/lib/ai/assistant-context-request";
import { requestCoreFocus } from "@/lib/ai/core-focus";
import { useAuth } from "@/components/providers/auth-provider";
import { normalizeCompanyId } from "@/lib/company-id";
import { parseCollectionFromSearchParams } from "@/lib/navigation/inventory-collections";
import { userCopy } from "@/lib/user-copy";

export const AI_ROUTE = "/ai";
export const AI_CHAT_QUERY = "chat";

type AssistantContextValue = {
  isOpen: boolean;
  /** Pointer/affordance state for the sidebar glyph. Stream state lives in `useCoreChat`. */
  state: AssistantState;
  sessions: AssistantChatSession[];
  activeSessionId: string | null;
  context: AssistantContext;
  /** Route the user left when opening AI — used for context + closing. */
  returnPath: string;
  open: () => void;
  close: () => void;
  /** Compact Ask Core overlay from the rest of the app. */
  isCompactOpen: boolean;
  openCompact: () => void;
  closeCompact: () => void;
  newChat: () => void;
  selectChat: (sessionId: string) => void;
  renameChat: (sessionId: string, title: string) => void;
  deleteChat: (sessionId: string) => void;
  setPointer: (pointer: "enter" | "leave") => void;
  registerEntry: (element: HTMLElement | null) => void;
};

const AssistantStore = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const store = useContext(AssistantStore);
  if (!store) {
    throw new Error("useAssistant must be used within AIProvider");
  }
  return store;
}

/** Non-throwing accessor for surfaces that may render outside the dashboard shell. */
export function useAssistantOptional(): AssistantContextValue | null {
  return useContext(AssistantStore);
}

function isAiRoute(pathname: string): boolean {
  return pathname === AI_ROUTE || pathname.startsWith(`${AI_ROUTE}/`);
}

function aiHref(sessionId: string | null): string {
  if (!sessionId) return AI_ROUTE;
  return `${AI_ROUTE}?${AI_CHAT_QUERY}=${encodeURIComponent(sessionId)}`;
}

export function AIProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { firebaseUser, profile } = useAuth();

  const isOpen = isAiRoute(pathname);
  const uid = firebaseUser?.uid ?? "";
  const companyId = normalizeCompanyId(profile?.companyId);
  const storageReady = Boolean(uid);

  const [state, setState] = useState<AssistantState>("idle");
  const [sessions, setSessions] = useState<AssistantChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  /** Last non-AI route — AI answers against this workspace context. */
  const [returnPath, setReturnPath] = useState("/");
  const [returnSearch, setReturnSearch] = useState("");
  const [compactOpen, setCompactOpen] = useState(false);

  const sessionsRef = useRef<AssistantChatSession[]>([]);
  const activeSessionIdRef = useRef<string | null>(null);
  const pendingSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    if (isAiRoute(pathname)) return;
    setReturnPath(pathname || "/");
    const search = searchParams.toString();
    setReturnSearch(search ? `?${search}` : "");
  }, [pathname, searchParams]);

  // Hydrate sessions when auth/company is ready. `loadChatSessions` migrates
  // any v1 history forward on first read.
  useEffect(() => {
    if (!storageReady) {
      setSessions([]);
      setActiveSessionId(null);
      setHydratedKey(null);
      return;
    }
    const key = `${uid}:${companyId}`;
    setSessions(loadChatSessions(uid, companyId));
    setHydratedKey(key);
  }, [companyId, storageReady, uid]);

  // Persist after hydrate.
  useEffect(() => {
    if (!storageReady || !hydratedKey) return;
    if (hydratedKey !== `${uid}:${companyId}`) return;
    saveChatSessions(uid, companyId, sessions);
  }, [companyId, hydratedKey, sessions, storageReady, uid]);

  // Sync active session from ?chat= and ensure a draft exists when open.
  // In-memory selection (new/select/delete) is marked pending so a stale
  // `?chat=` value cannot snap the workspace back before `router.replace` lands.
  useEffect(() => {
    if (!isOpen || !hydratedKey) return;

    const fromQuery = searchParams.get(AI_CHAT_QUERY);
    const pending = pendingSessionIdRef.current;

    if (pending && sessions.some((session) => session.id === pending)) {
      if (activeSessionId !== pending) setActiveSessionId(pending);
      if (fromQuery !== pending) {
        router.replace(aiHref(pending), { scroll: false });
      } else {
        pendingSessionIdRef.current = null;
      }
      return;
    }

    if (fromQuery && sessions.some((session) => session.id === fromQuery)) {
      if (activeSessionId !== fromQuery) setActiveSessionId(fromQuery);
      return;
    }

    if (activeSessionId && sessions.some((session) => session.id === activeSessionId)) {
      if (fromQuery !== activeSessionId) {
        router.replace(aiHref(activeSessionId), { scroll: false });
      }
      return;
    }

    if (sessions.length > 0) {
      const newest = sortSessionsByUpdated(sessions)[0]!;
      setActiveSessionId(newest.id);
      if (fromQuery !== newest.id) {
        router.replace(aiHref(newest.id), { scroll: false });
      }
      return;
    }

    const draft = createEmptyChatSession();
    pendingSessionIdRef.current = draft.id;
    setSessions([draft]);
    setActiveSessionId(draft.id);
    router.replace(aiHref(draft.id), { scroll: false });
  }, [activeSessionId, hydratedKey, isOpen, router, searchParams, sessions]);

  const collectionContext = useMemo(
    () =>
      parseCollectionFromSearchParams(
        new URLSearchParams(returnSearch.replace(/^\?/, "")),
        returnPath,
      ),
    [returnPath, returnSearch],
  );

  const context = useMemo(
    () =>
      resolveAssistantContext({
        pathname: returnPath,
        collection: collectionContext.collection,
      }),
    [collectionContext.collection, returnPath],
  );

  const requestContext = useMemo<AssistantRequestContext>(
    () => ({ pathname: context.path, collection: collectionContext.collection }),
    [collectionContext.collection, context.path],
  );

  /**
   * Persisted messages for a session, read at mount time by the runtime.
   *
   * Deliberately a callback rather than a memo: the runtime calls it once from
   * a lazy state initializer, so the lookup happens exactly when a session
   * mounts. Deriving it during this render would re-read on every stream tick
   * and reset the chat mid-answer.
   */
  const readSessionMessages = useCallback((sessionId: string): CoreUIMessage[] => {
    return sessionsRef.current.find((session) => session.id === sessionId)?.messages ?? [];
  }, []);

  const handleMessagesChange = useCallback((sessionId: string, messages: CoreUIMessage[]) => {
    if (sessionId === "boot") return;
    setSessions((current) => {
      const index = current.findIndex((session) => session.id === sessionId);
      const base = index >= 0 ? current[index]! : createEmptyChatSession(sessionId);
      const next = withUpdatedMessages(base, messages, userCopy.ai.newChatTitle);

      // Skip the state write when nothing actually changed, or persistence
      // would loop against its own effect.
      if (index >= 0 && current[index]!.messages === next.messages) return current;

      const remaining = index >= 0 ? current.filter((_, i) => i !== index) : current;
      return sortSessionsByUpdated([next, ...remaining]);
    });
  }, []);

  const registerEntry = useCallback((_element: HTMLElement | null) => {
    // Entry registration kept for API stability; navigation no longer needs a rect.
  }, []);

  const open = useCallback(() => {
    if (isAiRoute(pathname)) return;
    setCompactOpen(false);
    setState("active");
    router.push(aiHref(activeSessionIdRef.current));
  }, [pathname, router]);

  const close = useCallback(() => {
    setCompactOpen(false);
    setState("idle");
    router.push(`${returnPath}${returnSearch}` || "/");
  }, [returnPath, returnSearch, router]);

  const openCompact = useCallback(() => {
    if (isAiRoute(pathname)) {
      router.push(aiHref(activeSessionIdRef.current));
      return;
    }
    setCompactOpen(true);
  }, [pathname, router]);

  const closeCompact = useCallback(() => {
    setCompactOpen(false);
  }, []);

  const newChat = useCallback(() => {
    setState("idle");
    const draft = createEmptyChatSession();
    pendingSessionIdRef.current = draft.id;
    setSessions((current) => sortSessionsByUpdated([draft, ...current]));
    setActiveSessionId(draft.id);
    router.replace(aiHref(draft.id), { scroll: false });
  }, [router]);

  const selectChat = useCallback(
    (sessionId: string) => {
      if (!sessionsRef.current.some((session) => session.id === sessionId)) return;
      if (activeSessionIdRef.current === sessionId) return;
      pendingSessionIdRef.current = sessionId;
      setState("idle");
      setActiveSessionId(sessionId);
      router.replace(aiHref(sessionId), { scroll: false });
    },
    [router],
  );

  const renameChat = useCallback((sessionId: string, title: string) => {
    const nextTitle = title.trim().replace(/\s+/g, " ").slice(0, CHAT_TITLE_MAX);
    if (!nextTitle) return;
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, title: nextTitle, updatedAt: Date.now() } : session,
      ),
    );
  }, []);

  const deleteChat = useCallback(
    (sessionId: string) => {
      setState("idle");
      setSessions((current) => {
        const remaining = current.filter((session) => session.id !== sessionId);
        if (activeSessionIdRef.current !== sessionId) {
          return remaining;
        }

        if (remaining.length === 0) {
          const draft = createEmptyChatSession();
          pendingSessionIdRef.current = draft.id;
          setActiveSessionId(draft.id);
          router.replace(aiHref(draft.id), { scroll: false });
          return [draft];
        }

        const next = sortSessionsByUpdated(remaining)[0]!;
        pendingSessionIdRef.current = next.id;
        setActiveSessionId(next.id);
        router.replace(aiHref(next.id), { scroll: false });
        return remaining;
      });
    },
    [router],
  );

  const setPointer = useCallback((pointer: "enter" | "leave") => {
    setState((current) => resolvePointerState(current, pointer));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && compactOpen) {
        event.preventDefault();
        closeCompact();
        return;
      }
      if (event.key === "Escape" && isOpen && !isAiRoute(pathname)) {
        event.preventDefault();
        close();
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() === "k" && isOpen) {
        event.preventDefault();
        requestCoreFocus();
        return;
      }
      if (event.key.toLowerCase() !== "j") return;
      event.preventDefault();
      if (isOpen) close();
      else open();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, closeCompact, compactOpen, isOpen, open, pathname]);

  useEffect(() => {
    if (!isOpen) return;
    setCompactOpen(false);
    setState((current) => (current === "active" ? "idle" : current));
  }, [isOpen]);

  const value = useMemo<AssistantContextValue>(
    () => ({
      isOpen,
      state,
      sessions,
      activeSessionId,
      context,
      returnPath,
      open,
      close,
      isCompactOpen: compactOpen,
      openCompact,
      closeCompact,
      newChat,
      selectChat,
      renameChat,
      deleteChat,
      setPointer,
      registerEntry,
    }),
    [
      activeSessionId,
      close,
      closeCompact,
      compactOpen,
      context,
      deleteChat,
      isOpen,
      newChat,
      open,
      openCompact,
      registerEntry,
      renameChat,
      returnPath,
      selectChat,
      sessions,
      setPointer,
      state,
    ],
  );

  return (
    <AssistantStore.Provider value={value}>
      <CoreChatRuntime
        key={activeSessionId ?? "boot"}
        sessionId={activeSessionId ?? "boot"}
        readInitialMessages={readSessionMessages}
        companyId={companyId}
        requestContext={requestContext}
        onMessagesChange={handleMessagesChange}
      >
        {children}
        <CoreAskOrb />
      </CoreChatRuntime>
    </AssistantStore.Provider>
  );
}

export { isAssistantBusy } from "@/domain/ai/assistant-state";
