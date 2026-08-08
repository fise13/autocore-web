"use client";

import Image from "next/image";
import type {
  DocumentationChecklistItem,
  DocumentationChecklistItemState,
  EngineIntakeJob,
  IntakePhoto,
} from "@autocore/engine-intake";

import {
  checklistStateBadgeVariant,
  formatIntakeState,
} from "@/components/engine-intake/engine-intake-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EngineIntakeEvidencePane({
  item,
  evidencePhotos,
  job,
  canVerify,
  busy,
  onOverride,
}: {
  item: DocumentationChecklistItem | null;
  evidencePhotos: IntakePhoto[];
  job: EngineIntakeJob;
  canVerify: boolean;
  busy: boolean;
  onOverride: (
    item: DocumentationChecklistItem,
    state: DocumentationChecklistItemState,
    rationale: string,
  ) => void;
}) {
  const terminal = ["verified", "closed", "rejected", "cancelled"].includes(job.state);
  const canOverride = canVerify && !terminal && item !== null;

  if (!item) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Select a checklist item to inspect evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex shrink-0 flex-col gap-1 border-b px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-heading text-sm font-semibold">{item.label}</h4>
          <Badge variant={checklistStateBadgeVariant(item.state)}>
            {formatIntakeState(item.state)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Confidence {Math.round(item.confidence * 100)}%
          {item.rationale ? ` · ${item.rationale}` : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {evidencePhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {evidencePhotos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "relative aspect-[4/3] overflow-hidden rounded-md bg-muted",
                  !photo.url && "pointer-events-none",
                )}
              >
                {photo.url ? (
                  <Image
                    src={photo.url}
                    alt={item.label}
                    fill
                    unoptimized
                    sizes="220px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Uploading
                  </div>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No supporting evidence found.
          </div>
        )}
      </div>

      {canOverride ? (
        <div className="flex shrink-0 flex-col gap-2 border-t px-4 py-3">
          {item.state === "uncertain" ? (
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  onOverride(item, "completed", "Manager accepted uncertain evidence")
                }
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  onOverride(item, "missing", "Manager rejected uncertain evidence")
                }
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  onOverride(item, "not_applicable", "Manager marked not applicable")
                }
              >
                Mark NA
              </Button>
            </div>
          ) : null}
          {item.state === "not_applicable" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onOverride(item, "missing", "Manager made item required")}
            >
              Make required
            </Button>
          ) : null}
          {item.state === "missing" || item.state === "completed" ? (
            <div className="grid grid-cols-2 gap-2">
              {item.state === "missing" ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    onOverride(item, "completed", "Manager forced completed")
                  }
                >
                  Force complete
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onOverride(item, "missing", "Manager reopened item")}
                >
                  Mark missing
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  onOverride(item, "not_applicable", "Manager marked not applicable")
                }
              >
                Mark NA
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
