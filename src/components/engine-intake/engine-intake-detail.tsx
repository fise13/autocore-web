"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Check,
  Clock3,
  CircleX,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Pause,
  Pencil,
  Play,
  RefreshCcw,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import {
  engineIntakeCompletionPercent,
  isEngineIntakeSessionStale,
} from "@autocore/engine-intake";
import type {
  EngineIntakeCommand,
  EngineIntakeJob,
  EngineIntakeSession,
  IntakeAiInspectionResult,
  IntakeEvent,
  IntakePhoto,
  PhotoRequirement,
} from "@autocore/engine-intake";

import type { CompanyEmployee } from "@/domain/rbac";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  engineIntakeCommandId,
  sendEngineIntakeCommand,
} from "@/lib/engine-intake/engine-intake-api.client";
import { cn } from "@/lib/utils";

type ReviewDialog =
  | { kind: "approve" }
  | { kind: "rework"; requirement: PhotoRequirement; photoId?: string }
  | { kind: "quarantine" }
  | { kind: "reject" }
  | { kind: "identity" }
  | { kind: "cancel" }
  | null;

type VerificationDialog = Exclude<
  ReviewDialog,
  { kind: "identity" } | { kind: "cancel" } | null
>;

function jobLabel(job: EngineIntakeJob): string {
  return (
    job.expectedIdentity.engineCode ||
    job.expectedIdentity.serialCode ||
    job.sourceReference ||
    "Unidentified engine"
  );
}

function stateBadge(state: EngineIntakeJob["state"]) {
  if (state === "verified" || state === "closed") return "success" as const;
  if (state === "rework" || state === "quarantine") return "warning" as const;
  if (state === "rejected" || state === "cancelled") return "destructive" as const;
  if (state === "in_session" || state === "awaiting_verification") return "info" as const;
  return "secondary" as const;
}

function formatState(state: string): string {
  return state.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Pending";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(parsed)
    : "Pending";
}

function latestInspectionForPhoto(
  inspections: IntakeAiInspectionResult[],
  photoId: string,
): IntakeAiInspectionResult | null {
  return inspections.find((inspection) => inspection.photoId === photoId) ?? null;
}

export function EngineIntakeDetail({
  companyId,
  job,
  sessions,
  photos,
  events,
  inspections,
  employees,
  canVerify,
}: {
  companyId: string;
  job: EngineIntakeJob;
  sessions: EngineIntakeSession[];
  photos: IntakePhoto[];
  events: IntakeEvent[];
  inspections: IntakeAiInspectionResult[];
  employees: CompanyEmployee[];
  canVerify: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ReviewDialog>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [aiOverrideReason, setAiOverrideReason] = useState("");
  const [serialCode, setSerialCode] = useState(job.expectedIdentity.serialCode);
  const [engineCode, setEngineCode] = useState(job.expectedIdentity.engineCode);
  const [brandName, setBrandName] = useState(job.expectedIdentity.brandName);
  const completion = engineIntakeCompletionPercent(job.progress);
  const activeClaimStale =
    Boolean(job.assignment.activeSessionId) &&
    isEngineIntakeSessionStale(job.assignment.lastHeartbeatAt);
  const canApprove =
    job.state === "awaiting_verification" &&
    job.progress.capturedCount >= 1 &&
    job.progress.rejectedPhotoIds.length === 0 &&
    Boolean(serialCode.trim());
  const releaseNeedsOverride = job.progress.coveragePercent < 85;

  const run = async (command: EngineIntakeCommand, success: string) => {
    setBusy(command.type);
    try {
      await sendEngineIntakeCommand(companyId, command);
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Engine intake update failed");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const managedCommand = (
    command: Omit<EngineIntakeCommand, "idempotencyKey" | "client" | "clientAt">,
  ): EngineIntakeCommand =>
    ({
      ...command,
      idempotencyKey: engineIntakeCommandId(command.type),
      client: "desktop",
      clientAt: new Date().toISOString(),
    }) as EngineIntakeCommand;

  const assign = async (uid: string | null) => {
    const employee = employees.find((item) => item.uid === uid) ?? null;
    await run(
      managedCommand({
        type: "reassign_job",
        payload: {
          jobId: job.id,
          assigneeUid: employee?.uid ?? null,
          assigneeName: employee?.fullName ?? null,
        },
      }),
      employee ? `Assigned to ${employee.fullName}` : "Moved to unassigned queue",
    );
  };

  const beginVerification = async (nextDialog: VerificationDialog) => {
    setReviewNote("");
    setAiOverrideReason("");
    const started = await run(
      managedCommand({
        type: "start_verification",
        payload: { jobId: job.id },
      }),
      "Verification opened",
    );
    if (started) setDialog(nextDialog);
  };

  const closeDialog = async () => {
    const current = dialog;
    setDialog(null);
    setReviewNote("");
    setAiOverrideReason("");
    if (
      current &&
      current.kind !== "identity" &&
      current.kind !== "cancel"
    ) {
      await sendEngineIntakeCommand(
        companyId,
        managedCommand({
          type: "release_verification",
          payload: { jobId: job.id },
        }),
      ).catch(() => null);
    }
  };

  const submitReview = async () => {
    if (!dialog) return;
    let command: EngineIntakeCommand;
    let message: string;
    if (dialog.kind === "approve") {
      if (releaseNeedsOverride && !reviewNote.trim() && !aiOverrideReason.trim()) {
        toast.error("Add an override note — coverage is below Ready (~85%)");
        return;
      }
      command = managedCommand({
        type: "approve_job",
        payload: {
          jobId: job.id,
          note: reviewNote.trim() || (releaseNeedsOverride ? "" : "Coverage ready"),
          identity: {
            serialCode: serialCode.trim(),
            engineCode: engineCode.trim(),
            brandName: brandName.trim(),
          },
          ...(job.blockingAiFlags.length > 0 || releaseNeedsOverride
            ? {
                aiOverrideReason:
                  aiOverrideReason.trim() ||
                  reviewNote.trim() ||
                  "Manager override for release",
              }
            : {}),
        },
      });
      message = "Released to Motors Grid";
    } else if (dialog.kind === "rework") {
      command = managedCommand({
        type: "request_rework",
        payload: {
          jobId: job.id,
          note: reviewNote.trim() || `Retake ${dialog.requirement.label}`,
          gaps: [
            {
              requirementId: dialog.requirement.id,
              reason: reviewNote.trim() || `Retake ${dialog.requirement.label}`,
              ...(dialog.photoId ? { photoId: dialog.photoId } : {}),
            },
          ],
        },
      });
      message = "Targeted retake sent to the field worker";
    } else if (dialog.kind === "quarantine") {
      command = managedCommand({
        type: "quarantine_job",
        payload: {
          jobId: job.id,
          reason: reviewNote.trim() || "Manual inspection required",
        },
      });
      message = "Engine moved to quarantine";
    } else if (dialog.kind === "reject") {
      command = managedCommand({
        type: "reject_job",
        payload: {
          jobId: job.id,
          reason: reviewNote.trim() || "Engine rejected during verification",
        },
      });
      message = "Engine intake rejected";
    } else if (dialog.kind === "identity") {
      command = managedCommand({
        type: "update_identity",
        payload: {
          jobId: job.id,
          identity: {
            serialCode: serialCode.trim(),
            engineCode: engineCode.trim(),
            brandName: brandName.trim(),
          },
        },
      });
      message = "Expected engine identity updated";
    } else {
      command = managedCommand({
        type: "cancel_job",
        payload: {
          jobId: job.id,
          reason: reviewNote.trim() || "Cancelled by desktop operator",
        },
      });
      message = "Engine intake job cancelled";
    }
    if (await run(command, message)) {
      setDialog(null);
      setReviewNote("");
      setAiOverrideReason("");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-heading text-xl font-semibold">{jobLabel(job)}</h2>
            <Badge variant={stateBadge(job.state)} dot>
              {formatState(job.state)}
            </Badge>
            {job.priority !== "normal" ? (
              <Badge variant="warning">{formatState(job.priority)}</Badge>
            ) : null}
            {activeClaimStale ? <Badge variant="destructive">Session stale</Badge> : null}
            {job.verificationLock ? (
              <Badge variant="info">
                Reviewing: {job.verificationLock.reviewerName || "Verifier"}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {job.sourceReference || formatState(job.source)} · Created {formatDate(job.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canVerify &&
          !["verified", "closed", "rejected", "cancelled"].includes(job.state) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => {
                setReviewNote("");
                setDialog({ kind: "identity" });
              }}
            >
              <Pencil data-icon="inline-start" />
              Edit identity
            </Button>
          ) : null}
          {job.assignment.activeSessionId ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                void run(
                  managedCommand({
                    type: "release_claim",
                    payload: { jobId: job.id, reason: "Released by desktop operator" },
                  }),
                  "Worker claim released",
                )
              }
            >
              <Unlink data-icon="inline-start" />
              Release claim
            </Button>
          ) : null}
          {job.state === "paused" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                void run(
                  managedCommand({ type: "resume_job", payload: { jobId: job.id } }),
                  "Intake resumed",
                )
              }
            >
              <Play data-icon="inline-start" />
              Resume
            </Button>
          ) : ["open", "in_session", "rework"].includes(job.state) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() =>
                void run(
                  managedCommand({ type: "pause_job", payload: { jobId: job.id } }),
                  "Intake paused",
                )
              }
            >
              <Pause data-icon="inline-start" />
              Pause
            </Button>
          ) : null}
          {canVerify &&
          !["verified", "closed", "rejected", "cancelled"].includes(job.state) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => {
                setReviewNote("");
                setDialog({ kind: "cancel" });
              }}
            >
              <CircleX data-icon="inline-start" />
              Cancel job
            </Button>
          ) : null}
        </div>
      </header>

      {job.identityMismatch ? (
        <Alert variant="destructive" className="mx-5 mt-4 w-auto">
          <ShieldAlert />
          <AlertTitle>Worker reported the wrong physical engine or job</AlertTitle>
          <AlertDescription>{job.identityMismatch.reason}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_340px] xl:overflow-hidden">
        <main className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5">
          <section aria-labelledby="intake-progress-title" className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 id="intake-progress-title" className="font-heading text-base font-semibold">
                  Documentation coverage
                </h3>
                <p className="text-sm text-muted-foreground">
                  Coverage is view diversity — not photo count. AI classifies free captures after upload.
                </p>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {completion}% · {job.progress.capturedCount} photos
              </span>
            </div>
            <Progress value={completion}>
              <ProgressLabel>Coverage</ProgressLabel>
              <ProgressValue />
            </Progress>
            {job.progress.missingFacets?.length ? (
              <div className="flex flex-wrap gap-2">
                {job.progress.missingFacets.slice(0, 6).map((facet) => (
                  <Badge key={facet} variant="secondary">
                    Missing {facet.replaceAll("_", " ")}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {job.requirements
                .filter((requirement) => requirement.required)
                .map((requirement) => {
                  const count = Number(job.progress.requirementCounts?.[requirement.id] ?? 0);
                  const complete = count >= requirement.minCount;
                  return (
                    <div
                      key={requirement.id}
                      className="flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 py-2"
                    >
                      {complete ? (
                        <Check className="text-success" />
                      ) : (
                        <Clock3 className="text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{requirement.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {complete ? `${count} captured` : "Waiting for photo"}
                        </p>
                      </div>
                      {canVerify && ["awaiting_verification", "quarantine"].includes(job.state) ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            void beginVerification({ kind: "rework", requirement });
                          }}
                        >
                          Retake
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </section>

          {job.blockingAiFlags?.length > 0 ? (
            <Alert>
              <Sparkles />
              <AlertTitle>AI found evidence that needs human review</AlertTitle>
              <AlertDescription>
                {job.blockingAiFlags.map((flag) => flag.message).join(" · ")}
              </AlertDescription>
            </Alert>
          ) : null}

          <Separator />

          <section aria-labelledby="photo-evidence-title" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 id="photo-evidence-title" className="font-heading text-base font-semibold">
                Photo evidence
              </h3>
              <p className="text-sm text-muted-foreground">
                Originals, sync state, AI observations, and retake controls stay together.
              </p>
            </div>
            {photos.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {photos.map((photo) => {
                  const requirement = job.requirements.find(
                    (item) => item.id === photo.requirementId,
                  );
                  const inspection = latestInspectionForPhoto(inspections, photo.id);
                  return (
                    <article
                      key={photo.id}
                      className="overflow-hidden rounded-xl border bg-card"
                    >
                      <a
                        href={photo.url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "group relative block aspect-[4/3] bg-muted",
                          !photo.url && "pointer-events-none",
                        )}
                      >
                        {photo.url ? (
                          <Image
                            src={photo.url}
                            alt={requirement?.label ?? formatState(photo.category)}
                            fill
                            unoptimized
                            sizes="(max-width: 1280px) 50vw, 33vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Uploading from device
                          </div>
                        )}
                        {photo.url ? (
                          <ExternalLink className="absolute right-2 top-2 rounded-md bg-background/85 p-1 text-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100" />
                        ) : null}
                      </a>
                      <div className="flex flex-col gap-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {requirement?.label ?? formatState(photo.category)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(photo.capturedAt)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              photo.syncState === "synced"
                                ? "success"
                                : photo.syncState === "failed"
                                  ? "destructive"
                                  : "info"
                            }
                          >
                            {formatState(photo.syncState)}
                          </Badge>
                        </div>
                        {inspection?.flags?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {inspection.flags.map((flag) => (
                              <Badge
                                key={`${photo.id}-${flag.code}`}
                                variant={
                                  flag.severity === "blocking"
                                    ? "destructive"
                                    : flag.severity === "warning"
                                      ? "warning"
                                      : "outline"
                                }
                              >
                                {formatState(flag.code)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {canVerify &&
                        requirement &&
                        ["awaiting_verification", "quarantine"].includes(job.state) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void beginVerification({
                                kind: "rework",
                                requirement,
                                photoId: photo.id,
                              });
                            }}
                          >
                            <RefreshCcw data-icon="inline-start" />
                            Request retake
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                Waiting for the first field photo
              </div>
            )}
          </section>
        </main>

        <aside className="flex min-h-0 flex-col gap-4 border-t bg-muted/20 p-4 xl:overflow-y-auto xl:border-l xl:border-t-0">
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Smartphone className="text-muted-foreground" />
              <h3 className="font-heading text-sm font-semibold">Live field session</h3>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Worker</dt>
              <dd className="text-right font-medium">
                {job.assignment.claimedByName ||
                  job.assignment.assigneeName ||
                  "Unassigned"}
              </dd>
              <dt className="text-muted-foreground">Heartbeat</dt>
              <dd className="text-right">{formatDate(job.assignment.lastHeartbeatAt)}</dd>
              <dt className="text-muted-foreground">Sync queue</dt>
              <dd className="text-right tabular-nums">{job.progress.syncQueueDepth}</dd>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="text-right font-medium">
                {job.location?.code || "Not scanned"}
              </dd>
              <dt className="text-muted-foreground">Engine ID</dt>
              <dd className="truncate text-right font-mono text-xs">{job.engineId}</dd>
            </dl>
            {canVerify ? (
              <Field>
                <FieldLabel>Assigned worker</FieldLabel>
                <Select
                  value={job.assignment.assigneeUid ?? "unassigned"}
                  onValueChange={(value) =>
                    void assign(value && value !== "unassigned" ? value : null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="unassigned">Unassigned queue</SelectItem>
                      {employees
                        .filter((employee) => employee.isActive)
                        .map((employee) => (
                          <SelectItem key={employee.uid} value={employee.uid}>
                            {employee.fullName || employee.email}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </section>

          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <MapPin className="text-muted-foreground" />
              <h3 className="font-heading text-sm font-semibold">Verification</h3>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Identity</dt>
              <dd className="text-right">
                {job.expectedIdentity.engineCode || job.expectedIdentity.serialCode || "Missing"}
              </dd>
              <dt className="text-muted-foreground">Evidence</dt>
              <dd className="text-right">
                {job.progress.missingRequirementIds.length === 0 ? "Complete" : "Incomplete"}
              </dd>
              <dt className="text-muted-foreground">Uploads</dt>
              <dd className="text-right">
                {job.progress.syncQueueDepth === 0 ? "Synced" : "Pending"}
              </dd>
            </dl>
            {canVerify && job.state === "awaiting_verification" ? (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    void beginVerification({ kind: "approve" });
                  }}
                  disabled={!canApprove}
                >
                  <Check data-icon="inline-start" />
                  Release to Motors Grid
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void beginVerification({ kind: "quarantine" })}
                  >
                    <ShieldAlert data-icon="inline-start" />
                    Quarantine
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void beginVerification({ kind: "reject" })}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ) : null}
            {canVerify && job.state === "quarantine" ? (
              <Button
                variant="destructive"
                onClick={() => void beginVerification({ kind: "reject" })}
              >
                Reject engine
              </Button>
            ) : null}
            {canVerify && job.state === "verified" ? (
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() =>
                  void run(
                    managedCommand({
                      type: "close_job",
                      payload: { jobId: job.id },
                    }),
                    "Intake chapter closed",
                  )
                }
              >
                Close intake chapter
              </Button>
            ) : null}
            {!canApprove && job.state === "awaiting_verification" ? (
              <p className="text-xs text-muted-foreground">
                Complete identity, location, evidence, and uploads before approval.
              </p>
            ) : null}
          </section>

          <Tabs defaultValue="timeline">
            <TabsList className="w-full">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="pt-2">
              <div className="flex flex-col">
                {events.length > 0 ? (
                  events.map((event, index) => (
                    <div key={event.id} className="grid grid-cols-[16px_1fr] gap-2">
                      <div className="flex flex-col items-center">
                        <span className="mt-1.5 size-2 rounded-full bg-primary" />
                        {index < events.length - 1 ? (
                          <span className="min-h-8 w-px flex-1 bg-border" />
                        ) : null}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-medium">{formatState(event.type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.actorName || event.actorRole} · {formatDate(event.serverAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Timeline is loading
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="sessions" className="flex flex-col gap-2 pt-2">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.userName || "Worker"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {session.deviceName || session.deviceId}
                    </p>
                  </div>
                  <Badge variant={session.state === "active" ? "info" : "secondary"}>
                    {formatState(session.state)}
                  </Badge>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="ai" className="flex flex-col gap-2 pt-2">
              {inspections.length > 0 ? (
                inspections.map((inspection) => (
                  <div key={inspection.id} className="flex flex-col gap-1 border-b py-2 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {inspection.suggestedCategory
                          ? formatState(inspection.suggestedCategory)
                          : "Photo inspection"}
                      </span>
                      <Badge
                        variant={
                          inspection.state === "completed"
                            ? "success"
                            : inspection.state === "failed"
                              ? "destructive"
                              : "info"
                        }
                      >
                        {formatState(inspection.state)}
                      </Badge>
                    </div>
                    {inspection.listingReadinessScore != null ? (
                      <p className="text-xs text-muted-foreground">
                        Listing readiness {inspection.listingReadinessScore}/100
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  AI checks begin after upload
                </p>
              )}
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) void closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "approve"
                ? "Release to Motors Grid"
                : dialog?.kind === "rework"
                  ? `Request ${dialog.requirement.label} retake`
                  : dialog?.kind === "quarantine"
                    ? "Quarantine engine"
                    : dialog?.kind === "reject"
                      ? "Reject engine"
                      : dialog?.kind === "identity"
                        ? "Edit expected identity"
                        : "Cancel Warehouse draft"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "approve"
                ? releaseNeedsOverride
                  ? `Coverage is ${job.progress.coveragePercent}% (Ready ~85%). Add a manager override note to release anyway.`
                  : "Documentation looks Ready. Confirm serial identity and release into Motors Grid as sellable inventory."
                : dialog?.kind === "rework"
                  ? "Ask the worker for more photos — still suggestions, not a rigid checklist."
                  : dialog?.kind === "identity"
                    ? "Changing identity is recorded in the timeline."
                    : "Record a clear operational reason in the immutable timeline."}
            </DialogDescription>
          </DialogHeader>

          {dialog?.kind === "approve" || dialog?.kind === "identity" ? (
            <FieldGroup>
              <Field>
                <FieldLabel>Brand</FieldLabel>
                <Input value={brandName} onChange={(event) => setBrandName(event.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Engine code</FieldLabel>
                  <Input value={engineCode} onChange={(event) => setEngineCode(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>Serial number</FieldLabel>
                  <Input value={serialCode} onChange={(event) => setSerialCode(event.target.value)} />
                </Field>
              </div>
              {dialog.kind === "approve" ? (
                <>
                  <Field>
                    <FieldLabel>Verification note</FieldLabel>
                    <Textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                    />
                  </Field>
                  {job.blockingAiFlags.length > 0 ? (
                    <Field>
                      <FieldLabel>AI flag override reason</FieldLabel>
                      <Textarea
                        value={aiOverrideReason}
                        onChange={(event) => setAiOverrideReason(event.target.value)}
                        placeholder="Explain why the evidence is safe to approve"
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}
            </FieldGroup>
          ) : (
            <Field>
              <FieldLabel>Operational reason</FieldLabel>
              <Textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder={
                  dialog?.kind === "rework"
                    ? "Example: serial digits are obscured by glare"
                    : dialog?.kind === "cancel"
                      ? "Why is this physical intake being cancelled?"
                    : "Explain the condition or decision"
                }
              />
            </Field>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => void closeDialog()} disabled={busy !== null}>
              Cancel
            </Button>
            <Button
              variant={
                dialog?.kind === "reject" || dialog?.kind === "cancel"
                  ? "destructive"
                  : dialog?.kind === "quarantine"
                    ? "outline"
                    : "default"
              }
              disabled={
                busy !== null ||
                (dialog?.kind === "approve" && !canApprove) ||
                (dialog?.kind === "approve" &&
                  releaseNeedsOverride &&
                  !reviewNote.trim() &&
                  !aiOverrideReason.trim()) ||
                (dialog?.kind === "approve" &&
                  job.blockingAiFlags.length > 0 &&
                  !aiOverrideReason.trim()) ||
                ((dialog?.kind === "quarantine" ||
                  dialog?.kind === "reject" ||
                  dialog?.kind === "cancel") &&
                  !reviewNote.trim())
              }
              onClick={() => void submitReview()}
            >
              {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
