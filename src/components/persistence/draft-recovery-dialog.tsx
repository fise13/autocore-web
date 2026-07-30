"use client";

import { useEffect, useState } from "react";

import { usePersistenceOptional } from "@/components/persistence/persistence-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FieldDiff, PersistenceDraftRecord, PersistenceKey } from "@/lib/persistence";
import { persistenceKeyString } from "@/lib/persistence";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";

export type DraftRecoveryDialogProps = {
  companyId: string | null | undefined;
  kind?: string;
  /** Current server snapshot for compare (optional). */
  getServerSnapshot?: (key: PersistenceKey) => unknown | Promise<unknown>;
  onRestore: (draft: PersistenceDraftRecord) => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DraftRecoveryDialog({
  companyId,
  kind,
  getServerSnapshot,
  onRestore,
  open: openProp,
  onOpenChange,
}: DraftRecoveryDialogProps) {
  const persistence = usePersistenceOptional();
  const [internalOpen, setInternalOpen] = useState(false);
  const [draft, setDraft] = useState<PersistenceDraftRecord | null>(null);
  const [diffs, setDiffs] = useState<FieldDiff[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : internalOpen;

  useEffect(() => {
    if (!companyId || !persistence) return;
    let cancelled = false;

    void (async () => {
      const serverMap = new Map<string, unknown>();
      const drafts = await persistence.engine.findRecoverableDrafts(companyId, kind);
      if (drafts.length === 0 || cancelled) return;

      const top = drafts[0]!;
      if (getServerSnapshot) {
        try {
          const key = {
            companyId: top.companyId,
            kind: top.kind,
            id: top.id,
          };
          const server = await getServerSnapshot(key);
          if (server !== undefined) {
            serverMap.set(persistenceKeyString(key), server);
          }
        } catch {
          // ignore compare failures
        }
      }

      const candidates = await persistence.recovery.findCandidates({
        companyId,
        kind,
        serverSnapshots: serverMap,
      });
      if (cancelled || candidates.length === 0) return;

      const candidate = candidates[0]!;
      setDraft(candidate.draft);
      setDiffs(candidate.diffs);
      if (!controlled) setInternalOpen(true);
      onOpenChange?.(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, controlled, getServerSnapshot, kind, onOpenChange, persistence]);

  if (!persistence || !draft) return null;

  const setOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{userCopy.persistence.draftTitle}</DialogTitle>
          <DialogDescription>
            {(() => {
              const locale = getActiveUserCopyLocale() === "ru" ? "en-US" : "en-US";
              const when = new Date(draft.updatedAt).toLocaleString(locale);
              return draft.label
                ? userCopy.persistence.draftLabeled(draft.label, when)
                : userCopy.persistence.draftUntitled(when);
            })()}
          </DialogDescription>
        </DialogHeader>

        {showCompare && diffs.length > 0 ? (
          <div className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-2 text-xs">
            <p className="mb-2 font-medium">{userCopy.persistence.diffsTitle}</p>
            <ul className="space-y-1">
              {diffs.slice(0, 40).map((diff) => (
                <li key={diff.path} className="font-mono">
                  <span className="text-muted-foreground">{diff.path}</span>
                  {": "}
                  <span className="text-amber-700 dark:text-amber-400">
                    {JSON.stringify(diff.local)}
                  </span>
                  {" → "}
                  <span className="text-sky-700 dark:text-sky-400">
                    {JSON.stringify(diff.server)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          {diffs.length > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setShowCompare((v) => !v)}>
              {showCompare ? userCopy.persistence.hideCompare : userCopy.persistence.compare}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void persistence.discardDraft({
                companyId: draft.companyId,
                kind: draft.kind,
                id: draft.id,
              });
              setOpen(false);
            }}
          >
            {userCopy.persistence.discard}
          </Button>
          <Button
            type="button"
            onClick={() => {
              void Promise.resolve(onRestore(draft)).then(() => setOpen(false));
            }}
          >
            {userCopy.persistence.restore}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
