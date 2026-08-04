"use client";

/**
 * @deprecated Auto-opening draft modal removed — unfinished composer drafts
 * surface in the work-orders left list instead. Kept as a no-op export so
 * stale imports cannot pop a blocking dialog again.
 */
export type DraftRecoveryDialogProps = {
  companyId: string | null | undefined;
  kind?: string;
  getServerSnapshot?: (key: unknown) => unknown | Promise<unknown>;
  onRestore?: (draft: unknown) => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DraftRecoveryDialog(_props: DraftRecoveryDialogProps) {
  return null;
}
