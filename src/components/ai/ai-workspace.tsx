"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect } from "react";

import { useAssistant } from "@/components/ai/ai-provider";
import { CoreComposer } from "@/components/ai/core-composer";
import { useCoreChat } from "@/components/ai/core-chat-runtime";
import { CoreConversation } from "@/components/ai/core-conversation";
import { CoreDesk } from "@/components/ai/core-desk";
import { CoreTopBar } from "@/components/ai/core-top-bar";
import type { CoreUIMessage } from "@/domain/ai/core-message";
import { takeCoreSeedPrompt } from "@/lib/ai/core-seed-prompt";
import { mcEase } from "@/lib/motion/overview-motion";
import { userCopy } from "@/lib/user-copy";

function assistantHasVisibleContent(message: CoreUIMessage | undefined): boolean {
  if (!message || message.role !== "assistant") return false;
  return message.parts.some((part) => {
    if (part.type === "text") return Boolean(part.text?.trim());
    if (part.type.startsWith("tool-")) {
      return "state" in part && (part.state === "output-available" || part.state === "output-error");
    }
    return false;
  });
}

export function AIWorkspace() {
  const { sessions } = useAssistant();
  const { messages, status, error, busy, ask, stop, regenerate, clearError } = useCoreChat();
  const reduceMotion = useReducedMotion();

  const isEmpty = messages.length === 0 && !busy;

  const submit = useCallback(
    (question: string, files?: Parameters<typeof ask>[1]) => {
      if (!question.trim() && !files?.length) return;
      clearError();
      ask(question, files);
    },
    [ask, clearError],
  );

  useEffect(() => {
    if (!isEmpty || busy) return;
    const seed = takeCoreSeedPrompt();
    if (seed) submit(seed);
  }, [busy, isEmpty, submit]);

  const hasAnswer = messages.some((message) => assistantHasVisibleContent(message));
  const errorReason = error && !hasAnswer ? error.message || userCopy.ai.errorGeneric : null;

  return (
    <div className="core-workspace flex h-full min-h-0 w-full flex-col overflow-hidden">
      <CoreTopBar hasConversations={sessions.some((session) => session.messages.length > 0)} />

      <div className="relative min-h-0 w-full flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {isEmpty ? (
            <motion.div
              key="desk"
              className="absolute inset-0 overflow-y-auto"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: mcEase }}
            >
              <CoreDesk status={status} busy={busy} onAsk={submit} onStop={stop} />
            </motion.div>
          ) : (
            <motion.div
              key="thread"
              className="absolute inset-0 flex min-h-0 flex-col"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              transition={{ duration: 0.22, ease: mcEase }}
            >
              <CoreConversation
                messages={messages}
                busy={busy}
                errorReason={errorReason}
                onRetry={() => regenerate()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isEmpty ? null : (
        <div className="core-workspace__composer w-full shrink-0">
          <CoreComposer status={status} busy={busy} onAsk={submit} onStop={stop} listPlacement="above" />
        </div>
      )}
    </div>
  );
}
