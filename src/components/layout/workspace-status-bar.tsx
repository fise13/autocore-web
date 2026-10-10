"use client";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import { useWorkspace } from "@/components/layout/workspace-context";
import { modShortcutLabel } from "@/lib/grid/grid-keyboard-shortcuts";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type WorkspaceStatusBarProps = {
  compact?: boolean;
  /** Manual save status + ⌘S / Ctrl+S hint (save itself is keyboard-only). */
  showSave?: boolean;
};

export function WorkspaceStatusBar({
  compact = false,
  showSave = false,
}: WorkspaceStatusBarProps) {
  const { shownCount, totalCount, saveStatus, saveError, gridInteractionLocked } = useWorkspace();
  const persistence = usePersistenceOptional();

  const hasUnsaved =
    saveStatus === "pending" ||
    persistence?.uiStatus === "dirty" ||
    persistence?.uiStatus === "offline";
  const isSaving = saveStatus === "saving" || persistence?.uiStatus === "saving";
  const isError = saveStatus === "error" || persistence?.uiStatus === "error";
  const isOffline = persistence?.uiStatus === "offline";

  const persistenceText =
    persistence?.uiStatus === "offline"
      ? userCopy.layout.offlineQueued
      : persistence?.uiStatus === "conflict"
        ? userCopy.layout.versionConflict
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
              hasUnsaved && "text-warning-on-subtle",
              isSaving && "text-primary-on-subtle",
              isOffline && "text-offline-on-subtle",
              isError && "text-destructive",
              !hasUnsaved && !isSaving && !isError && !isOffline && "text-muted-foreground",
            )}
          >
            {saveStatusText}
          </span>
          <span
            className={cn(
              "tabular-nums",
              hasUnsaved || isError ? "text-primary" : "text-muted-foreground/70",
            )}
            title={`${userCopy.sync.syncNow} (${modShortcutLabel("S")})`}
          >
            {userCopy.sync.syncNow} ({modShortcutLabel("S")})
          </span>
        </>
      ) : null}
    </footer>
  );
}
