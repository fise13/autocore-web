"use client";

import { MessageSquarePlus, Pencil, Search, Settings2, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";

import { useAssistant } from "@/components/ai/ai-provider";
import { sortSessionsByUpdated } from "@/domain/ai/assistant-chats";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CoreChatSidebarProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function CoreChatSidebar({ collapsed = false, onNavigate }: CoreChatSidebarProps) {
  const { sessions, activeSessionId, newChat, selectChat, renameChat, deleteChat, close } =
    useAssistant();
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

  const leaveCore = () => {
    onNavigate?.();
    close();
  };

  const startChat = () => {
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

  if (collapsed) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center bg-sidebar px-1.5 py-3 text-sidebar-foreground">
        <button
          type="button"
          aria-label={userCopy.ai.goHomeAria}
          onClick={leaveCore}
          className="flex size-10 items-center justify-center rounded-full text-[15px] font-semibold tracking-tight"
        >
          A
        </button>
        <button
          type="button"
          aria-label={userCopy.ai.newChat}
          onClick={startChat}
          className="mt-3 flex size-10 items-center justify-center rounded-full bg-foreground text-background"
        >
          <MessageSquarePlus className="size-4" />
        </button>
        <div className="mt-auto">
          <button
            type="button"
            aria-label={userCopy.ai.goHomeAria}
            onClick={leaveCore}
            className="flex size-10 items-center justify-center rounded-full bg-sidebar-accent"
          >
            <Settings2 className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar px-3 py-3 text-sidebar-foreground">
      <div className="flex min-h-11 items-center justify-between gap-2 px-1">
        {searching ? (
          <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-sidebar-accent px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={userCopy.ai.searchChatsPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              aria-label={userCopy.ai.close}
              onClick={() => {
                setSearching(false);
                setQuery("");
              }}
              className="flex size-7 items-center justify-center"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <p className="core-lockup truncate">AutoCore</p>
            <button
              type="button"
              aria-label={userCopy.ai.searchChats}
              onClick={() => setSearching(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent"
            >
              <Search className="size-[18px]" />
            </button>
          </>
        )}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {visible.length > 0 ? (
          <p className="px-1 pb-2 text-[13px] font-semibold text-muted-foreground">
            {userCopy.ai.recentChats}
          </p>
        ) : (
          <p className="px-1 py-3 text-[13px] text-muted-foreground">{userCopy.ai.emptyChats}</p>
        )}
        <ul className="flex flex-col">
          {visible.map((session) => {
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
                    className="flex h-11 items-center rounded-xl bg-sidebar-accent px-3"
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
                      className="w-full bg-transparent text-[15px] outline-none"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      selectChat(session.id);
                      onNavigate?.();
                    }}
                    className={cn(
                      "group/row flex h-11 w-full items-center gap-1 rounded-xl px-3 text-left text-[15px] transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/70",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {session.messages.length > 0 ? (
                      <span className="flex shrink-0 items-center">
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
                          className={cn(
                            "flex size-7 items-center justify-center rounded-md",
                            active ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
                          )}
                        >
                          <Pencil className="size-3.5" />
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
                          className="flex size-7 items-center justify-center rounded-md opacity-0 group-hover/row:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </span>
                      </span>
                    ) : null}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-2.5 pt-3">
        <button
          type="button"
          onClick={startChat}
          className="flex h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-full bg-foreground text-[15px] font-semibold text-background"
        >
          <MessageSquarePlus className="size-[18px]" />
          {userCopy.ai.chatAction}
        </button>
        <button
          type="button"
          aria-label={userCopy.ai.goHomeAria}
          onClick={leaveCore}
          className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-full bg-sidebar-accent"
        >
          <Settings2 className="size-5" />
        </button>
      </div>
    </div>
  );
}
