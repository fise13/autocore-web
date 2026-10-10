"use client";

import { LayoutGrid, MessageSquarePlus, Pencil, Search, Settings, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";

import { useAssistant } from "@/components/ai/ai-provider";
import { sortSessionsByUpdated } from "@/domain/ai/assistant-chats";
import { groupSessionsByRecency, type SessionRecencyGroupId } from "@/domain/ai/session-recency";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CoreChatSidebarProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

function recencyLabel(id: SessionRecencyGroupId): string {
  const copy = userCopy.ai;
  if (id === "today") return copy.recencyToday;
  if (id === "yesterday") return copy.recencyYesterday;
  if (id === "week") return copy.recencyWeek;
  return copy.recencyOlder;
}

export function CoreChatSidebar({ collapsed = false, onNavigate }: CoreChatSidebarProps) {
  const { sessions, activeSessionId, newChat, selectChat, renameChat, deleteChat, close } = useAssistant();
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const ordered = sortSessionsByUpdated(sessions).filter(
    (session) => session.messages.length > 0 || session.id === activeSessionId,
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;
    return ordered.filter((session) =>
      (session.title || userCopy.ai.newChatTitle).toLowerCase().includes(needle),
    );
  }, [ordered, query]);
  const grouped = useMemo(() => groupSessionsByRecency(visible), [visible]);

  const startConversation = () => {
    newChat();
    setSearching(false);
    setQuery("");
    setEditingId(null);
    onNavigate?.();
  };

  const commitRename = (sessionId: string) => {
    renameChat(sessionId, draft);
    setEditingId(null);
    setDraft("");
  };

  const goWorkspace = () => {
    onNavigate?.();
    close();
  };

  const goSettings = () => {
    onNavigate?.();
    router.push("/settings");
  };

  if (collapsed) {
    return (
      <div className="core-nav core-nav--collapsed flex h-full min-h-0 w-full flex-col items-center">
        <button type="button" className="core-mark" aria-label={userCopy.ai.workspaceTitle} onClick={goWorkspace}>
          C
        </button>
        <button type="button" className="core-icon-btn" aria-label={userCopy.ai.newChat} onClick={startConversation}>
          <MessageSquarePlus className="size-4" />
        </button>
        <button
          type="button"
          className="core-icon-btn"
          aria-label={userCopy.ai.searchChats}
          onClick={() => setSearching(true)}
        >
          <Search className="size-4" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-1">
          <button type="button" className="core-icon-btn" aria-label={userCopy.ai.workspace} onClick={goWorkspace}>
            <LayoutGrid className="size-4" />
          </button>
          <button type="button" className="core-icon-btn" aria-label={userCopy.ai.settings} onClick={goSettings}>
            <Settings className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="core-nav flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-8 items-center justify-between gap-2 px-1">
        {searching ? (
          <div className="core-nav-search">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={userCopy.ai.searchChatsPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-grid outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              aria-label={userCopy.ai.close}
              onClick={() => {
                setSearching(false);
                setQuery("");
              }}
              className="core-icon-btn size-7"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <>
            <p className="core-kicker px-1">{userCopy.ai.workspaceTitle}</p>
            <button
              type="button"
              aria-label={userCopy.ai.searchChats}
              onClick={() => setSearching(true)}
              className="core-icon-btn size-7"
            >
              <Search className="size-3.5" />
            </button>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-0.5 px-1">
        <button type="button" className="core-nav-row flex w-full min-h-8 items-center gap-2" onClick={startConversation}>
          <MessageSquarePlus className="size-3.5 shrink-0" />
          {userCopy.ai.newChat}
        </button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-1">
        {grouped.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">{userCopy.ai.emptyChats}</p>
        ) : (
          grouped.map((group) => (
            <section key={group.id} className="mb-4">
              <h3 className="core-kicker px-1 pb-1.5">{recencyLabel(group.id)}</h3>
              <ul className="flex flex-col gap-px">
                {group.sessions.map((session) => {
                  const active = session.id === activeSessionId;
                  const label = session.title.trim() || userCopy.ai.newChatTitle;
                  const renaming = editingId === session.id;
                  return (
                    <li key={session.id}>
                      {renaming ? (
                        <form
                          onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            commitRename(session.id);
                          }}
                          className="core-nav-row is-active flex w-full min-h-8 items-center gap-2"
                        >
                          <input
                            autoFocus
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={() => commitRename(session.id)}
                            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                              if (event.key !== "Escape") return;
                              event.preventDefault();
                              setEditingId(null);
                              setDraft("");
                            }}
                            className="w-full bg-transparent text-grid outline-none"
                          />
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            selectChat(session.id);
                            onNavigate?.();
                          }}
                          className={cn("core-nav-row group/row flex w-full min-h-8 items-center gap-2", active && "is-active")}
                        >
                          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                          {session.messages.length > 0 ? (
                            <span className="flex shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100">
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label={userCopy.ai.renameChat}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingId(session.id);
                                  setDraft(label);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter" && event.key !== " ") return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setEditingId(session.id);
                                  setDraft(label);
                                }}
                                className="flex size-6 items-center justify-center rounded-sm hover:bg-muted"
                              >
                                <Pencil className="size-3" />
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label={userCopy.ai.deleteChat}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteChat(session.id);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter" && event.key !== " ") return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  deleteChat(session.id);
                                }}
                                className="flex size-6 items-center justify-center rounded-sm hover:bg-muted"
                              >
                                <Trash2 className="size-3" />
                              </span>
                            </span>
                          ) : null}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <div className="flex flex-col gap-px px-1 pt-3">
        <button type="button" className="core-nav-row flex w-full min-h-8 items-center gap-2" onClick={goWorkspace}>
          <LayoutGrid className="size-3.5 shrink-0" />
          {userCopy.ai.workspace}
        </button>
        <button type="button" className="core-nav-row flex w-full min-h-8 items-center gap-2" onClick={goSettings}>
          <Settings className="size-3.5 shrink-0" />
          {userCopy.ai.settings}
        </button>
      </div>
    </div>
  );
}
