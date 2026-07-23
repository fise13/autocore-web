"use client";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type WorkspaceStatusBarProps = {
  compact?: boolean;
  /** Manual save + save status — warehouse grid only. */
  showSave?: boolean;
};

export function WorkspaceStatusBar({
  compact = false,
  showSave = false,
}: WorkspaceStatusBarProps) {
  const { shownCount, totalCount, saveStatus, saveError, gridInteractionLocked, triggerSync } =
    useWorkspace();
  const persistence = usePersistenceOptional();

  const hasUnsaved =
    saveStatus === "pending" ||
    persistence?.uiStatus === "dirty" ||
    persistence?.uiStatus === "offline";
  const isSaving = saveStatus === "saving" || persistence?.uiStatus === "saving";
  const isError = saveStatus === "error" || persistence?.uiStatus === "error";
  const isOffline = persistence?.uiStatus === "offline";

  const handleSaveClick = () => {
    void (async () => {
      if (persistence?.hasUnsavedChanges()) {
        await persistence.flushAll("manual");
      }
      await triggerSync();
    })().catch((error) => {
      console.error("Save failed:", error);
    });
  };

  const persistenceText =
    persistence?.uiStatus === "offline"
      ? "Офлайн — изменения в очереди"
      : persistence?.uiStatus === "conflict"
        ? "Конфликт версий"
        : null;

  const saveStatusText = persistenceText
    ? persistenceText
    : {
        idle: userCopy.sync.saved,
        pending: gridInteractionLocked ? userCopy.sync.pendingLocked : userCopy.sync.pending,
        saving: userCopy.sync.warehouseSaving,
        saved: userCopy.sync.saved,
        error: saveError ?? persistence?.snapshot.lastError ?? userCopy.sync.error,
      }[saveStatus];

  if (compact && !showSave) {
    return null;
  }

  return (
    <footer
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 bg-transparent px-1 text-xs text-muted-foreground",
        compact && "justify-end",
      )}
    >
      {!compact ? (
        <>
          <span>
            {shownCount} / {totalCount}
          </span>
          {showSave ? <span aria-hidden>•</span> : null}
        </>
      ) : null}
      {showSave ? (
        <>
          <span
            className={cn(
              "transition-colors duration-300",
              hasUnsaved && "text-amber-600",
              isSaving && "text-sky-600",
              isOffline && "text-sky-600",
              isError && "text-destructive",
              !hasUnsaved && !isSaving && !isError && !isOffline && "text-muted-foreground",
            )}
          >
            {saveStatusText}
          </span>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={(!hasUnsaved && !isError) || isSaving || gridInteractionLocked}
            className="text-primary transition hover:text-primary/80 disabled:pointer-events-none disabled:opacity-40"
          >
            {userCopy.sync.saveLocal}
          </button>
        </>
      ) : null}
    </footer>
  );
}
