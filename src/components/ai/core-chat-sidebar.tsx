"use client";

import Link from "next/link";
import { MessageSquarePlus, Trash2 } from "lucide-react";

import { useAssistant } from "@/components/ai/ai-provider";
import { AppLogo } from "@/components/brand/app-logo";
import { SidebarUserMenu } from "@/components/layout/sidebar-user-menu";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { sortSessionsByUpdated } from "@/domain/ai/assistant-chats";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CoreChatSidebarProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function CoreChatSidebar({ collapsed = false, onNavigate }: CoreChatSidebarProps) {
  const { sessions, activeSessionId, newChat, selectChat, deleteChat } = useAssistant();
  const ordered = sortSessionsByUpdated(sessions);
  const hasNamedChats = ordered.some((session) => session.messages.length > 0);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-sidebar text-sidebar-foreground",
        collapsed && "items-center",
      )}
    >
      <SidebarProvider className="min-h-0 flex-1">
        <TooltipProvider delay={200}>
          <Sidebar
            collapsible="none"
            variant="inset"
            className="w-full! max-w-full min-w-0 border-none bg-transparent shadow-none"
          >
            <SidebarContent className={cn("min-h-0 gap-0 pt-2", collapsed && "px-1.5 pt-2")}>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                  className={cn(
                    "shrink-0 border-b border-sidebar-border/50",
                    collapsed
                      ? "flex min-h-11 items-center justify-center px-0 py-2"
                      : "px-2 pb-2",
                  )}
                >
                  <Link
                    href="/home"
                    onClick={onNavigate}
                    aria-label={userCopy.ai.goHomeAria}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg outline-none transition-colors",
                      "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring",
                      collapsed ? "size-9 justify-center" : "w-full px-2 py-2",
                    )}
                  >
                    <AppLogo size={collapsed ? 28 : 32} className="size-7 shrink-0 md:size-8" />
                    {!collapsed ? (
                      <span className="truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground">
                        {userCopy.ai.workspaceTitle}
                      </span>
                    ) : null}
                  </Link>
                </div>

                <div className={cn("shrink-0 px-2 py-2", collapsed && "flex justify-center px-1.5")}>
                  <Button
                    type="button"
                    variant="outline"
                    size={collapsed ? "icon" : "default"}
                    onClick={() => {
                      newChat();
                      onNavigate?.();
                    }}
                    className={cn(
                      "border-sidebar-border bg-sidebar shadow-none",
                      collapsed ? "size-9" : "h-9 w-full justify-start gap-2",
                    )}
                    aria-label={userCopy.ai.newChat}
                    title={userCopy.ai.newChat}
                  >
                    <MessageSquarePlus className="size-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{userCopy.ai.newChat}</span> : null}
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-2">
                  {!collapsed ? (
                    <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {userCopy.ai.chatsLabel}
                    </p>
                  ) : null}

                  {!hasNamedChats ? (
                    !collapsed ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground">{userCopy.ai.emptyChats}</p>
                    ) : null
                  ) : (
                    <ul className="flex flex-col gap-0.5">
                      {ordered
                        .filter((session) => session.messages.length > 0 || session.id === activeSessionId)
                        .map((session) => {
                          const active = session.id === activeSessionId;
                          const label = session.title.trim() || userCopy.ai.newChatTitle;
                          return (
                            <li key={session.id} className="group relative">
                              <button
                                type="button"
                                onClick={() => {
                                  selectChat(session.id);
                                  onNavigate?.();
                                }}
                                title={label}
                                className={cn(
                                  "flex w-full items-center rounded-lg text-left text-sm transition-colors",
                                  collapsed ? "size-9 justify-center p-0" : "h-9 gap-2 px-2.5 pr-8",
                                  active
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent/70",
                                )}
                              >
                                {collapsed ? (
                                  <span className="text-[11px] font-semibold uppercase">
                                    {label.slice(0, 1)}
                                  </span>
                                ) : (
                                  <span className="min-w-0 flex-1 truncate">{label}</span>
                                )}
                              </button>
                              {!collapsed && session.messages.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteChat(session.id);
                                  }}
                                  aria-label={userCopy.ai.deleteChat}
                                  title={userCopy.ai.deleteChat}
                                  className={cn(
                                    "absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md",
                                    "text-muted-foreground opacity-0 transition-opacity",
                                    "hover:bg-sidebar-accent hover:text-foreground",
                                    "group-hover:opacity-100 focus-visible:opacity-100",
                                    active && "opacity-100",
                                  )}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              ) : null}
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>

                <SidebarFooter className={cn("shrink-0 border-t border-sidebar-border/50 p-2", collapsed && "items-center")}>
                  <SidebarUserMenu collapsed={collapsed} />
                </SidebarFooter>
              </div>
            </SidebarContent>
          </Sidebar>
        </TooltipProvider>
      </SidebarProvider>
    </aside>
  );
}
