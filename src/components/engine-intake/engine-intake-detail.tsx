"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ExternalLink,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  DOCUMENTATION_CHECKLIST_GROUP_LABELS,
  DOCUMENTATION_CHECKLIST_GROUPS,
  isDocumentationChecklistReady,
  isEngineIntakeSessionStale,
  type DocumentationChecklistItem,
  type DocumentationChecklistItemState,
  type EngineIntakeCommand,
  type EngineIntakeJob,
  type EngineIntakeSession,
  type IntakeAiInspectionResult,
  type IntakeEvent,
  type IntakePhoto,
  type IntakePhotoCategory,
  type PhotoRequirement,
} from "@autocore/engine-intake";

import type { CompanyEmployee } from "@/domain/rbac";
import { EngineIntakeChecklistPane } from "@/components/engine-intake/engine-intake-checklist-pane";
import { EngineIntakeDetailHeader } from "@/components/engine-intake/engine-intake-detail-header";
import { EngineIntakeEvidencePane } from "@/components/engine-intake/engine-intake-evidence-pane";
import {
  formatIntakeDate,
  formatIntakeState,
  INTAKE_PHOTO_CATEGORY_OPTIONS,
  intakePhotoCategoryLabel,
  intakePhotoDisplayLabel,
} from "@/components/engine-intake/engine-intake-format";
import { EngineIntakeSideRail } from "@/components/engine-intake/engine-intake-side-rail";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  engineIntakeCommandId,
  matchEngineIntakePhotos,
  sendEngineIntakeCommand,
  setEngineIntakePhotoCategory,
} from "@/lib/engine-intake/engine-intake-api.client";
import { userCopy } from "@/lib/user-copy";
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
  const checklist = job.documentationChecklist;
  const summary = checklist.summary;
  const [busy, setBusy] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [dialog, setDialog] = useState<ReviewDialog>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [aiOverrideReason, setAiOverrideReason] = useState("");
  const [serialCode, setSerialCode] = useState(job.expectedIdentity.serialCode);
  const [engineCode, setEngineCode] = useState(job.expectedIdentity.engineCode);
  const [brandName, setBrandName] = useState(job.expectedIdentity.brandName);
  const autoMatchedJobs = useRef(new Set<string>());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    () =>
      checklist.items.find(
        (item) => item.saleGate && (item.state === "missing" || item.state === "uncertain"),
      )?.id ??
      checklist.items.find((item) => item.state !== "not_applicable")?.id ??
      null,
  );
  const activeClaimStale =
    Boolean(job.assignment.activeSessionId) &&
    isEngineIntakeSessionStale(job.assignment.lastHeartbeatAt);
  const canApprove =
    job.state === "awaiting_verification" &&
    job.progress.capturedCount >= 1 &&
    job.progress.rejectedPhotoIds.length === 0 &&
    Boolean(serialCode.trim());
  const releaseNeedsOverride = !isDocumentationChecklistReady(checklist);
  const canShowRelease = canVerify && job.state === "awaiting_verification";

  const selectedItem = useMemo(
    () => checklist.items.find((item) => item.id === selectedItemId) ?? null,
    [checklist.items, selectedItemId],
  );

  const evidencePhotos = useMemo(() => {
    if (!selectedItem) return [];
    const byId = new Map(photos.map((photo) => [photo.id, photo]));
    return selectedItem.evidencePhotoIds
      .map((id) => byId.get(id))
      .filter((photo): photo is IntakePhoto => Boolean(photo));
  }, [photos, selectedItem]);

  const activeGroups = useMemo(() => {
    return DOCUMENTATION_CHECKLIST_GROUPS.map((group) => ({
      group,
      label: DOCUMENTATION_CHECKLIST_GROUP_LABELS[group],
      items: checklist.items.filter(
        (item) => item.group === group && item.state !== "not_applicable",
      ),
    })).filter((entry) => entry.items.length > 0);
  }, [checklist.items]);

  const naItems = useMemo(
    () => checklist.items.filter((item) => item.state === "not_applicable"),
    [checklist.items],
  );

  const unmatchedPhotoCount = useMemo(
    () =>
      photos.filter((photo) => {
        if (photo.deletedAt || photo.syncState !== "synced" || !photo.url) return false;
        const state = photo.aiInspectionState ?? "queued";
        if (state === "queued" || state === "failed") return true;
        const category = photo.category ?? "other";
        const hits = photo.checklistHits ?? [];
        if (category === "other" && hits.length === 0) return true;
        if (
          category === "other" &&
          hits.length > 0 &&
          hits.every((hit) => hit === "overall_engine")
        ) {
          return true;
        }
        return false;
      }).length,
    [photos],
  );

  const runMatch = async (force = false) => {
    if (!canVerify) return;
    setMatching(true);
    setBusy("ai_match");
    try {
      const result = await matchEngineIntakePhotos(companyId, job.id, { force });
      if (result.queued === 0) {
        toast.message(force ? "No photos to rematch" : "Photos already matched");
      } else if (result.failed > 0 && result.matched === 0) {
        toast.error("AI could not match photos — try Rematch again");
      } else {
        toast.success(
          `Matched ${result.matched} of ${result.queued} photo${result.queued === 1 ? "" : "s"}`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI match failed");
    } finally {
      setMatching(false);
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!canVerify) return;
    if (photos.length === 0) return;
    if (unmatchedPhotoCount === 0) return;
    if (autoMatchedJobs.current.has(job.id)) return;
    autoMatchedJobs.current.add(job.id);
    void runMatch(false);
    // Auto-queue once per job open when unmatched synced photos exist.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot per job.id
  }, [canVerify, job.id, photos.length, unmatchedPhotoCount]);

  const setPhotoCategory = async (photo: IntakePhoto, category: IntakePhotoCategory) => {
    setBusy(`category:${photo.id}`);
    try {
      await setEngineIntakePhotoCategory(companyId, {
        jobId: job.id,
        photoId: photo.id,
        category,
        aiLabel: intakePhotoCategoryLabel(category),
      });
      toast.success(userCopy.engineIntake.categorySaved);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : userCopy.engineIntake.categoryFailed,
      );
    } finally {
      setBusy(null);
    }
  };

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

  const overrideItem = async (
    item: DocumentationChecklistItem,
    state: DocumentationChecklistItemState,
    rationale: string,
  ) => {
    await run(
      managedCommand({
        type: "override_checklist_item",
        payload: {
          jobId: job.id,
          itemId: item.id,
          state,
          rationale,
        },
      }),
      `Checklist: ${item.label} → ${state.replaceAll("_", " ")}`,
    );
  };

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
    if (current && current.kind !== "identity" && current.kind !== "cancel") {
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
        toast.error("Add an override note — sale checklist items are still open");
        return;
      }
      command = managedCommand({
        type: "approve_job",
        payload: {
          jobId: job.id,
          note: reviewNote.trim() || (releaseNeedsOverride ? "" : "Checklist ready"),
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
      <EngineIntakeDetailHeader
        job={job}
        busy={busy !== null}
        canVerify={canVerify}
        activeClaimStale={activeClaimStale}
        canShowRelease={canShowRelease}
        onEditIdentity={() => {
          setReviewNote("");
          setDialog({ kind: "identity" });
        }}
        onReleaseClaim={() =>
          void run(
            managedCommand({
              type: "release_claim",
              payload: { jobId: job.id, reason: "Released by desktop operator" },
            }),
            "Worker claim released",
          )
        }
        onPause={() =>
          void run(
            managedCommand({ type: "pause_job", payload: { jobId: job.id } }),
            "Intake paused",
          )
        }
        onResume={() =>
          void run(
            managedCommand({ type: "resume_job", payload: { jobId: job.id } }),
            "Intake resumed",
          )
        }
        onCancel={() => {
          setReviewNote("");
          setDialog({ kind: "cancel" });
        }}
        onRelease={() => void beginVerification({ kind: "approve" })}
      />

      {job.identityMismatch ? (
        <Alert variant="destructive" className="mx-4 mt-3 w-auto shrink-0">
          <ShieldAlert />
          <AlertTitle>Worker reported the wrong physical engine</AlertTitle>
          <AlertDescription>{job.identityMismatch.reason}</AlertDescription>
        </Alert>
      ) : null}

      {job.blockingAiFlags?.length > 0 ? (
        <Alert className="mx-4 mt-3 w-auto shrink-0">
          <Sparkles />
          <AlertTitle>AI flags need a glance</AlertTitle>
          <AlertDescription>
            {job.blockingAiFlags.map((flag) => flag.message).join(" · ")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Tabs defaultValue="checklist" className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                {summary.whisper ??
                  (summary.ready
                    ? "Sale checklist ready — override any item if needed"
                    : "AI matches photos here · edit any item yourself")}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {canVerify ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null || matching || photos.length === 0}
                    onClick={() => void runMatch(unmatchedPhotoCount === 0)}
                  >
                    {matching ? (
                      <LoaderCircle data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <Sparkles data-icon="inline-start" />
                    )}
                    {unmatchedPhotoCount > 0
                      ? `Match ${unmatchedPhotoCount} photos`
                      : "Rematch with AI"}
                  </Button>
                ) : null}
                <TabsList variant="line">
                  <TabsTrigger value="checklist">Checklist</TabsTrigger>
                  <TabsTrigger value="photos">All photos</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent
              value="checklist"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[hidden]:hidden"
            >
              <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.95fr)]">
                <EngineIntakeChecklistPane
                  activeGroups={activeGroups}
                  naItems={naItems}
                  selectedItemId={selectedItem?.id ?? null}
                  onSelect={setSelectedItemId}
                />
                <EngineIntakeEvidencePane
                  item={selectedItem}
                  evidencePhotos={evidencePhotos}
                  job={job}
                  canVerify={canVerify}
                  busy={busy !== null}
                  onOverride={(item, state, rationale) =>
                    void overrideItem(item, state, rationale)
                  }
                />
              </div>
            </TabsContent>

            <TabsContent
              value="photos"
              className="mt-0 min-h-0 flex-1 overflow-y-auto p-4 data-[hidden]:hidden"
            >
              <p className="mb-3 text-xs text-muted-foreground">
                AI labels each photo. Change the label anytime — checklist updates from it.
              </p>
              {photos.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {photos.map((photo) => {
                    const requirement = job.requirements.find(
                      (item) => item.id === photo.requirementId,
                    );
                    const inspection = latestInspectionForPhoto(inspections, photo.id);
                    const displayLabel = intakePhotoDisplayLabel(photo);
                    return (
                      <article
                        key={photo.id}
                        className="overflow-hidden rounded-lg border bg-card"
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
                              alt={displayLabel}
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
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge
                              variant={
                                photo.category === "other" ? "secondary" : "info"
                              }
                              className="max-w-full truncate"
                            >
                              {displayLabel}
                            </Badge>
                          </div>
                        </a>
                        <div className="flex flex-col gap-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{displayLabel}</p>
                              <p className="text-xs text-muted-foreground">
                                {photo.categorySource === "ai"
                                  ? "Labeled by AI"
                                  : photo.category === "other"
                                    ? userCopy.engineIntake.photoLabelUnset
                                    : formatIntakeDate(photo.capturedAt)}
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
                              {formatIntakeState(photo.syncState)}
                            </Badge>
                          </div>
                          {canVerify ? (
                            <div className="flex flex-col gap-1">
                              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                                {userCopy.engineIntake.setCategory}
                              </p>
                              <Select
                                value={photo.category}
                                onValueChange={(value) => {
                                  if (!value) return;
                                  void setPhotoCategory(
                                    photo,
                                    value as IntakePhotoCategory,
                                  );
                                }}
                              >
                                <SelectTrigger
                                  size="sm"
                                  className="w-full"
                                  disabled={busy !== null}
                                >
                                  <SelectValue>
                                    {intakePhotoCategoryLabel(photo.category)}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {INTAKE_PHOTO_CATEGORY_OPTIONS.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {intakePhotoCategoryLabel(category)}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}
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
                                  {formatIntakeState(flag.code)}
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
                <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Waiting for the first field photo
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <EngineIntakeSideRail
          job={job}
          sessions={sessions}
          events={events}
          inspections={inspections}
          employees={employees}
          canVerify={canVerify}
          canApprove={canApprove}
          busy={busy !== null}
          onAssign={(uid) => void assign(uid)}
          onRelease={() => void beginVerification({ kind: "approve" })}
          onQuarantine={() => void beginVerification({ kind: "quarantine" })}
          onReject={() => void beginVerification({ kind: "reject" })}
          onClose={() =>
            void run(
              managedCommand({ type: "close_job", payload: { jobId: job.id } }),
              "Intake chapter closed",
            )
          }
        />
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
                  ? `Sale checklist still open${summary.whisper ? ` — ${summary.whisper}` : ""}. Add a manager override note to release anyway.`
                  : "Sale checklist is ready. Confirm serial identity and release into Motors Grid."
                : dialog?.kind === "rework"
                  ? "Ask the worker for more photos — suggestions, not a rigid checklist."
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
                  <Input
                    value={engineCode}
                    onChange={(event) => setEngineCode(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Serial number</FieldLabel>
                  <Input
                    value={serialCode}
                    onChange={(event) => setSerialCode(event.target.value)}
                    className="font-mono"
                  />
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
