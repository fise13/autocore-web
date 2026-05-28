"use client";

import { useWorkspace } from "@/components/layout/workspace-context";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function WorkspaceStatusBar() {
  const { shownCount, totalCount, saveStatus, saveError, triggerSave, motorSyncState, triggerSync } =
    useWorkspace();
  const pathname = usePathname();
  const isWarehouse = pathname?.startsWith("/warehouse");

  const hasUnsaved = saveStatus === "pending";
  const isSaving = saveStatus === "saving";
  const canSync =
    motorSyncState.localDirty ||
    motorSyncState.remotePending ||
    motorSyncState.status === "error" ||
    saveStatus === "pending";
  const isSyncing = motorSyncState.status === "syncing" || saveStatus === "saving";

  const saveStatusText = {
    idle: userCopy.sync.saved,
    pending: userCopy.sync.pending,
    saving: userCopy.sync.saving,
    saved: userCopy.sync.saved,
    error: saveError ?? userCopy.sync.error,
  }[saveStatus];

  const syncStatusText =
    motorSyncState.status === "error"
      ? motorSyncState.errorMessage ?? userCopy.sync.error
      : isSyncing
        ? userCopy.sync.syncing
        : motorSyncState.localDirty
          ? userCopy.sync.localChanges
          : motorSyncState.remotePending
            ? userCopy.sync.remoteUpdates
            : userCopy.sync.synced;

  if (isWarehouse) {
    return (
      <footer className="flex h-10 shrink-0 items-center gap-2 border-t bg-card px-3 text-xs text-muted-foreground">
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
          )}
        >
          {saveStatusText}
        </span>
        <button
          type="button"
          onClick={triggerSave}
          disabled={!hasUnsaved || isSaving}
          className="text-primary transition hover:text-primary/80 disabled:pointer-events-none disabled:opacity-40"
        >
          {userCopy.sync.saveLocal}
        </button>
      </footer>
    );
  }

  return (
    <footer className="flex h-10 shrink-0 items-center gap-2 border-t bg-card px-3 text-xs text-muted-foreground">
      <span>
        {shownCount} / {totalCount}
      </span>
      <span aria-hidden>•</span>
      <span
        className={cn(
          "transition-colors duration-300",
          hasUnsaved && "text-amber-600",
          saveStatus === "error" && "text-destructive",
          (saveStatus === "saved" || saveStatus === "idle") && "text-muted-foreground",
        )}
      >
        {saveStatusText}
      </span>
      <button
        type="button"
        onClick={triggerSave}
        disabled={!hasUnsaved || isSaving}
        className="text-primary transition hover:text-primary/80 disabled:pointer-events-none disabled:opacity-40"
      >
        {userCopy.sync.saveLocal}
      </button>
      <span aria-hidden>•</span>
      <span
        className={cn(
          "transition-colors duration-300",
          motorSyncState.localDirty && "animate-pulse text-amber-600",
          motorSyncState.remotePending && !motorSyncState.localDirty && "text-sky-600",
          motorSyncState.status === "error" && "animate-shake text-destructive",
          !canSync && !isSyncing && "text-muted-foreground",
        )}
      >
        {syncStatusText}
      </span>
      <button
        type="button"
        onClick={() => {
          void triggerSync().then((synced) => {
            if (!synced) {
              console.warn("Sync handler is not registered for the current workspace");
            }
          });
        }}
        disabled={!canSync || isSyncing}
        className="text-primary transition hover:text-primary/80 disabled:pointer-events-none disabled:opacity-40"
      >
        {userCopy.sync.syncNow}
      </button>
    </footer>
  );
}
