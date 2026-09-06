"use client";

import { CoreComposer } from "@/components/ai/core-composer";
import type { ChatStatus, FileUIPart } from "ai";
import { userCopy } from "@/lib/user-copy";

/** Command-center empty state — a question and a composer, not a chatbot greeting. */
export function CoreDesk({
  status,
  busy,
  onAsk,
  onStop,
}: {
  status: ChatStatus;
  busy: boolean;
  onAsk: (text: string, files?: FileUIPart[]) => void;
  onStop: () => void;
}) {
  return (
    <section className="core-empty flex min-h-full w-full flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="core-empty__copy">
        <p className="core-kicker">{userCopy.ai.workspaceTitle}</p>
        <h1 className="core-empty__title">{userCopy.ai.emptyTitle}</h1>
      </div>

      <CoreComposer
        status={status}
        busy={busy}
        onAsk={onAsk}
        onStop={onStop}
        listPlacement="below"
        commandsAlways
      />
    </section>
  );
}
