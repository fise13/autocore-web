"use client";

import { useWorkspace } from "@/components/layout/workspace-context";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

export function WorkspaceStatusBar() {
  const { shownCount, totalCount, saveStatus, saveError, triggerSync } = useWorkspace();

  const hasUnsaved = saveStatus === "pending";
  const isSaving = saveStatus === "saving";

  const handleSaveClick = () => {
    void triggerSync().catch((error) => {
      console.error("Save failed:", error);
    });
  };

  const saveStatusText = {
    idle: userCopy.sync.saved,
    pending: userCopy.sync.pending,
    saving: userCopy.sync.saving,
    saved: userCopy.sync.saved,
    error: saveError ?? userCopy.sync.error,
  }[saveStatus];

  return (
    <footer className="flex h-10 shrink-0 items-center gap-2 border-t border-sidebar-border bg-sidebar px-3 text-xs text-muted-foreground">
      <span>
        {shownCount} / {totalCount}
      </span>
      <span aria-hidden>•</span>
      <span
        className={cn(
          "transition-colors duration-300",
          hasUnsaved && "text-amber-600",
          saveStatus === "saving" && "text-sky-600",
          saveStatus === "error" && "text-destructive",
          !hasUnsaved && saveStatus !== "saving" && saveStatus !== "error" && "text-muted-foreground",
        )}
      >
        {saveStatusText}
      </span>
      <button
        type="button"
        onClick={handleSaveClick}
        disabled={!hasUnsaved || isSaving}
        className="text-primary transition hover:text-primary/80 disabled:pointer-events-none disabled:opacity-40"
      >
        {userCopy.sync.saveLocal}
      </button>
    </footer>
  );
}
