"use client";

import { AccountMenu } from "@/components/account/account-menu";
import { useAssistant } from "@/components/ai/ai-provider";
import { useDashboardLayout } from "@/components/layout/dashboard-layout-context";
import { userCopy } from "@/lib/user-copy";

export function CoreTopBar({
  hasConversations,
}: {
  hasConversations: boolean;
}) {
  const { close } = useAssistant();
  const { toggleMobileSidebar } = useDashboardLayout();

  return (
    <header className="core-topbar flex w-full shrink-0 items-center justify-between gap-3 px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="core-icon-btn core-topbar__menu md:hidden"
          aria-label={userCopy.ai.openChats}
          onClick={toggleMobileSidebar}
        >
          <span className="core-menu-glyph" aria-hidden>
            <span />
            <span />
          </span>
          {hasConversations ? <span className="core-menu-notify" /> : null}
        </button>
        <p className="truncate font-heading text-[15px] font-medium leading-tight">{userCopy.ai.workspaceTitle}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" className="core-text-btn hidden sm:inline-flex" onClick={() => close()}>
          {userCopy.ai.workspace}
        </button>
        <AccountMenu compact />
      </div>
    </header>
  );
}
