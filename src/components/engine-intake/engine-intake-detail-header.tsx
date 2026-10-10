"use client";

import { Check, CircleX, Ellipsis, Pause, Pencil, Play, Unlink } from "lucide-react";
import type { EngineIntakeJob } from "@autocore/engine-intake";
import { warehouseLifecycleLabel } from "@autocore/engine-intake";

import {
  formatIntakeDate,
  formatIntakeState,
  jobChecklistStatusLabel,
  jobIdentityLine,
  jobSerial,
  jobStateBadgeVariant,
} from "@/components/engine-intake/engine-intake-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { userCopy } from "@/lib/user-copy";
import type { EngineIntakePriority, EngineIntakeSource } from "@autocore/engine-intake";

function intakeSourceLabel(source: EngineIntakeSource | string): string {
  const known = userCopy.engineIntake.create.sources;
  if (source in known) return known[source as EngineIntakeSource];
  return formatIntakeState(source);
}

function intakePriorityLabel(priority: EngineIntakePriority | string): string {
  const known = userCopy.engineIntake.create.priorities;
  if (priority in known) return known[priority as EngineIntakePriority];
  return formatIntakeState(priority);
}

export function EngineIntakeDetailHeader({
  job,
  busy,
  canVerify,
  activeClaimStale,
  canShowRelease,
  onEditIdentity,
  onReleaseClaim,
  onPause,
  onResume,
  onCancel,
  onRelease,
}: {
  job: EngineIntakeJob;
  busy: boolean;
  canVerify: boolean;
  activeClaimStale: boolean;
  canShowRelease: boolean;
  onEditIdentity: () => void;
  onReleaseClaim: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRelease: () => void;
}) {
  const terminal = ["verified", "closed", "rejected", "cancelled"].includes(job.state);
  const canManage = canVerify && !terminal;
  const showPause = ["open", "in_session", "rework"].includes(job.state);
  const showResume = job.state === "paused";
  const summary = job.documentationChecklist.summary;

  return (
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate font-mono text-xl font-semibold tracking-wide">
            {jobSerial(job)}
          </h2>
          <Badge variant={jobStateBadgeVariant(job.state)} dot>
            {warehouseLifecycleLabel(job.state)}
          </Badge>
          {job.priority !== "normal" ? (
            <Badge variant="warning">{intakePriorityLabel(job.priority)}</Badge>
          ) : null}
          {activeClaimStale ? <Badge variant="destructive">{userCopy.engineIntake.detailUi.sessionStale}</Badge> : null}
          {job.verificationLock ? (
            <Badge variant="info">
              {userCopy.engineIntake.detailUi.reviewing(job.verificationLock.reviewerName || userCopy.engineIntake.detailUi.verifier)}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {jobIdentityLine(job)}
          <span className="text-muted-foreground/60">
            {" · "}
            {summary.completedCount} done · {summary.missingCount} missing
            {summary.uncertainCount > 0 ? ` · ${summary.uncertainCount} uncertain` : ""}
            {" · "}
            {job.progress.capturedCount} photos
            {" · "}
            {jobChecklistStatusLabel(job)}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          {job.sourceReference || intakeSourceLabel(job.source)} · Created{" "}
          {formatIntakeDate(job.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {canShowRelease ? (
          <Button size="sm" disabled={busy} onClick={onRelease}>
            <Check data-icon="inline-start" />
            Release to Motors Grid
          </Button>
        ) : null}
        {canManage ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={onEditIdentity}>
            <Pencil data-icon="inline-start" />
            Edit identity
          </Button>
        ) : null}
        {canManage || job.assignment.activeSessionId || showPause || showResume ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={busy}
                  aria-label={userCopy.engineIntake.detailUi.moreActions}
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {job.assignment.activeSessionId ? (
                <DropdownMenuItem className="gap-2" onClick={onReleaseClaim}>
                  <Unlink className="size-4 opacity-70" />
                  Release claim
                </DropdownMenuItem>
              ) : null}
              {showResume ? (
                <DropdownMenuItem className="gap-2" onClick={onResume}>
                  <Play className="size-4 opacity-70" />
                  Resume
                </DropdownMenuItem>
              ) : null}
              {showPause ? (
                <DropdownMenuItem className="gap-2" onClick={onPause}>
                  <Pause className="size-4 opacity-70" />
                  Pause
                </DropdownMenuItem>
              ) : null}
              {canManage ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={onCancel}
                  >
                    <CircleX className="size-4 opacity-70" />
                    Cancel job
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
