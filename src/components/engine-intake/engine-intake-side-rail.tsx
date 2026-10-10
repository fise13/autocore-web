"use client";

import { useMemo } from "react";
import { Check, MapPin, ShieldAlert, Smartphone } from "lucide-react";
import type {
  EngineIntakeJob,
  EngineIntakeSession,
  IntakeAiInspectionResult,
  IntakeEvent,
} from "@autocore/engine-intake";

import type { CompanyEmployee } from "@/domain/rbac";
import {
  formatIntakeDate,
  formatIntakeEventLabel,
  formatIntakeState,
  jobChecklistStatusLabel,
} from "@/components/engine-intake/engine-intake-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";

function employeeLabel(employee: CompanyEmployee): string {
  const name = employee.fullName?.trim();
  if (name) return name;
  const email = employee.email?.trim();
  if (email) return email.split("@")[0] || email;
  return userCopy.engineIntake.workspace.worker;
}

export function EngineIntakeSideRail({
  job,
  sessions,
  events,
  inspections: _inspections,
  employees,
  canVerify,
  canApprove,
  busy,
  onAssign,
  onRelease,
  onQuarantine,
  onReject,
  onClose,
}: {
  job: EngineIntakeJob;
  sessions: EngineIntakeSession[];
  events: IntakeEvent[];
  /** Kept for call-site compatibility while AI matching is disabled. */
  inspections: IntakeAiInspectionResult[];
  employees: CompanyEmployee[];
  canVerify: boolean;
  canApprove: boolean;
  busy: boolean;
  onAssign: (uid: string | null) => void;
  onRelease: () => void;
  onQuarantine: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const summary = job.documentationChecklist.summary;
  const assigneeUid = job.assignment.assigneeUid;
  const assigneeValue = assigneeUid ?? "unassigned";

  const assigneeOptions = useMemo(() => {
    const active = employees.filter((employee) => employee.isActive);
    const assigned =
      assigneeUid && !active.some((employee) => employee.uid === assigneeUid)
        ? employees.find((employee) => employee.uid === assigneeUid)
        : null;
    return assigned ? [assigned, ...active] : active;
  }, [assigneeUid, employees]);

  const matchedAssignee = assigneeUid
    ? assigneeOptions.find((employee) => employee.uid === assigneeUid)
    : null;
  const copy = userCopy.engineIntake.workspace;
  const assigneeDisplay = matchedAssignee
    ? employeeLabel(matchedAssignee)
    : job.assignment.assigneeName?.trim() ||
      (assigneeUid ? copy.assignedWorker : copy.unassignedQueue);

  const checklistStatus = jobChecklistStatusLabel(job);

  const timeline = events.slice(0, 16);

  return (
    <aside className="flex min-h-0 w-full flex-col gap-3 overflow-y-auto border-t bg-muted/15 p-3 lg:w-[280px] lg:shrink-0 lg:border-t-0 lg:border-l">
      <section className="flex shrink-0 flex-col gap-2.5 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Smartphone className="size-3.5 text-muted-foreground" />
          <h3 className="font-heading text-xs font-semibold tracking-wide uppercase">
            {copy.fieldSession}
          </h3>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">{copy.worker}</dt>
          <dd className="truncate text-right font-medium">
            {job.assignment.claimedByName || job.assignment.assigneeName || copy.unassigned}
          </dd>
          <dt className="text-muted-foreground">{copy.heartbeat}</dt>
          <dd className="text-right">{formatIntakeDate(job.assignment.lastHeartbeatAt)}</dd>
          <dt className="text-muted-foreground">{copy.sync}</dt>
          <dd className="text-right tabular-nums">
            {job.progress.syncQueueDepth === 0
              ? copy.synced
              : copy.pendingCount(job.progress.syncQueueDepth)}
          </dd>
          <dt className="text-muted-foreground">{copy.location}</dt>
          <dd className="text-right font-medium">{job.location?.code || "—"}</dd>
        </dl>
        {canVerify ? (
          <Field>
            <FieldLabel className="text-xs">{copy.assignedWorkerLabel}</FieldLabel>
            <Select
              value={assigneeValue}
              onValueChange={(value) =>
                onAssign(value && value !== "unassigned" ? value : null)
              }
            >
              <SelectTrigger className="h-8 w-full min-w-0 text-xs">
                <SelectValue placeholder={copy.unassignedQueue}>{assigneeDisplay}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="unassigned">{copy.unassignedQueue}</SelectItem>
                  {assigneeOptions.map((employee) => (
                    <SelectItem key={employee.uid} value={employee.uid}>
                      {employeeLabel(employee)}
                      {!employee.isActive ? ` ${copy.inactive}` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
      </section>

      <section className="flex shrink-0 flex-col gap-2.5 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-3.5 text-muted-foreground" />
          <h3 className="font-heading text-xs font-semibold tracking-wide uppercase">
            {copy.release}
          </h3>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">{copy.checklist}</span>
            <span
              className={cn(
                "min-w-0 text-right font-medium leading-snug",
                summary.ready ? "text-success" : "text-foreground",
              )}
            >
              {checklistStatus}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{copy.photos}</span>
            <span className="tabular-nums font-medium">{job.progress.capturedCount}</span>
          </div>
        </div>
        {canVerify && job.state === "awaiting_verification" ? (
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={onRelease} disabled={!canApprove || busy}>
              <Check data-icon="inline-start" />
              {copy.releaseToGrid}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={onQuarantine}>
                <ShieldAlert data-icon="inline-start" />
                {copy.quarantine}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
                {copy.reject}
              </Button>
            </div>
            {!canApprove ? (
              <p className="text-[11px] text-muted-foreground">
                {copy.needSerialPhoto}
              </p>
            ) : null}
          </div>
        ) : null}
        {canVerify && job.state === "quarantine" ? (
          <Button size="sm" variant="destructive" disabled={busy} onClick={onReject}>
            {copy.rejectEngine}
          </Button>
        ) : null}
        {canVerify && job.state === "verified" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={onClose}>
            {copy.closeChapter}
          </Button>
        ) : null}
      </section>

      <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="w-full shrink-0" variant="line">
          <TabsTrigger value="timeline" className="flex-1 text-xs">
            {copy.timeline}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex-1 text-xs">
            {copy.sessions}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="timeline"
          className="mt-2 min-h-0 flex-1 overflow-y-auto data-[hidden]:hidden"
        >
          {timeline.length > 0 ? (
            <ul className="flex flex-col">
              {timeline.map((event, index) => (
                <li key={event.id} className="grid grid-cols-[12px_1fr] gap-2">
                  <div className="flex flex-col items-center pt-1">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    {index < timeline.length - 1 ? (
                      <span className="mt-1 h-full min-h-3 w-px grow bg-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-2.5">
                    <p className="text-xs font-medium leading-snug">
                      {formatIntakeEventLabel(event.type)}
                    </p>
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      {event.actorName || event.actorRole} ·{" "}
                      {formatIntakeDate(event.serverAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-center text-xs text-muted-foreground">{userCopy.engineIntake.detailUi.noEvents}</p>
          )}
        </TabsContent>
        <TabsContent
          value="sessions"
          className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto data-[hidden]:hidden"
        >
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-2 border-b py-1.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {session.userName || "Worker"}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {session.deviceName || session.deviceId}
                  </p>
                </div>
                <Badge variant={session.state === "active" ? "info" : "secondary"}>
                  {formatIntakeState(session.state)}
                </Badge>
              </div>
            ))
          ) : (
            <p className="py-3 text-center text-xs text-muted-foreground">{userCopy.engineIntake.detailUi.noSessions}</p>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
