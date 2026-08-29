"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatStatus, type FileUIPart } from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";

import type { CoreUIMessage } from "@/domain/ai/core-message";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";
import type { AssistantRequestContext } from "@/lib/ai/assistant-context-request";
import { userCopy } from "@/lib/user-copy";

type CoreChatValue = {
  messages: CoreUIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  busy: boolean;
  ask: (text: string, files?: FileUIPart[]) => void;
  stop: () => void;
  regenerate: () => void;
  clearError: () => void;
};

const CoreChatStore = createContext<CoreChatValue | null>(null);

export function useCoreChat(): CoreChatValue {
  const store = useContext(CoreChatStore);
  if (!store) throw new Error("useCoreChat must be used within CoreChatRuntime");
  return store;
}

/** Non-throwing accessor for surfaces that may render before the runtime mounts. */
export function useCoreChatOptional(): CoreChatValue | null {
  return useContext(CoreChatStore);
}

export type CoreChatRuntimeProps = {
  sessionId: string;
  /** Called once at mount to load this session's persisted history. */
  readInitialMessages: (sessionId: string) => CoreUIMessage[];
  companyId: string;
  requestContext: AssistantRequestContext;
  onMessagesChange: (sessionId: string, messages: CoreUIMessage[]) => void;
  children: ReactNode;
};

/**
 * Owns one chat session's stream.
 *
 * Mounted with `key={sessionId}` by `AIProvider`, so switching chats gives a
 * clean `useChat` rather than leaking messages between sessions. Everything
 * `useChat` does not own — the session list, `?chat=` sync, ⌘J — stays in the
 * outer provider.
 */
export function CoreChatRuntime({
  sessionId,
  readInitialMessages,
  companyId,
  requestContext,
  onMessagesChange,
  children,
}: CoreChatRuntimeProps) {
  // Lazy initializer: history is read exactly once per mounted session, and
  // never again while a stream is in flight.
  const [initialMessages] = useState<CoreUIMessage[]>(() => readInitialMessages(sessionId));
  // Read through refs so a changing route context never rebuilds the transport
  // (which would drop an in-flight stream). Written in an effect rather than
  // during render — a ref mutated in render is not safe under concurrent
  // rendering, and these are only read inside async request callbacks.
  const contextRef = useRef(requestContext);
  const companyIdRef = useRef(companyId);

  useEffect(() => {
    contextRef.current = requestContext;
    companyIdRef.current = companyId;
  }, [companyId, requestContext]);

  const transport = useMemo(
    () =>
      // The ref reads below happen inside request-time callbacks, not during
      // render — the rule cannot see through the `useMemo` closure. Keeping the
      // transport identity stable is the point: rebuilding it would drop an
      // in-flight stream.
      // eslint-disable-next-line react-hooks/refs
      new DefaultChatTransport<CoreUIMessage>({
        api: "/api/assistant",
        headers: async () => {
          const token = await getFirebaseAuth().currentUser?.getIdToken();
          if (!token) throw new Error(userCopy.ai.errorUnauthorized);
          return {
            Authorization: `Bearer ${token}`,
            // `verifyMobileAccess` binds every tool read to this company.
            "x-company-id": companyIdRef.current,
          };
        },
        body: () => ({ context: contextRef.current }),
      }),
    [],
  );

  const { messages, status, error, sendMessage, stop, regenerate, clearError } =
    useChat<CoreUIMessage>({
      id: sessionId,
      messages: initialMessages,
      transport,
    });

  // Persist on every settled change. `status` gates it so an in-flight stream
  // does not write 60 times a second.
  useEffect(() => {
    if (status === "streaming" || status === "submitted") return;
    if (messages.length === 0) return;
    onMessagesChange(sessionId, messages);
  }, [messages, onMessagesChange, sessionId, status]);

  const busy = status === "streaming" || status === "submitted";

  const ask = useCallback(
    (text: string, files?: FileUIPart[]) => {
      const trimmed = text.trim();
      if (busy) return;
      if (!trimmed && !files?.length) return;
      void sendMessage({
        text: trimmed || userCopy.ai.attachedFiles,
        files,
      });
    },
    [busy, sendMessage],
  );

  const value = useMemo<CoreChatValue>(
    () => ({
      messages,
      status,
      error,
      busy,
      ask,
      stop: () => void stop(),
      regenerate: () => void regenerate(),
      clearError,
    }),
    [ask, busy, clearError, error, messages, regenerate, status, stop],
  );

  return <CoreChatStore.Provider value={value}>{children}</CoreChatStore.Provider>;
}
