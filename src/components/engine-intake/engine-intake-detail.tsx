"use client";

import { useMemo, useState } from "react";
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
  MOTOR_QUALITY_GRADE_OPTIONS,
  type DocumentationChecklistItem,
  type DocumentationChecklistItemState,
  type EngineIntakeCommand,
  type EngineIntakeJob,
  type EngineIntakeSession,
  type IntakeAiInspectionResult,
  type IntakeEvent,
  type IntakePhoto,
  type IntakePhotoCategory,
  type MotorQualityGrade,
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
import { DatalistInput } from "@/components/ui/datalist-input";
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
  sendEngineIntakeCommand,
  setEngineIntakePhotoCategory,
} from "@/lib/engine-intake/engine-intake-api.client";
import { useEngineIntakeIdentitySuggestions } from "@/hooks/use-engine-intake-identity-suggestions";
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
  const [dialog, setDialog] = useState<ReviewDialog>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [aiOverrideReason, setAiOverrideReason] = useState("");
  const [quality, setQuality] = useState<MotorQualityGrade | null>(null);
  const [serialCode, setSerialCode] = useState(job.expectedIdentity.serialCode);
  const [engineCode, setEngineCode] = useState(job.expectedIdentity.engineCode);
  const [brandName, setBrandName] = useState(job.expectedIdentity.brandName);
  const identitySuggestionsEnabled =
    dialog?.kind === "approve" || dialog?.kind === "identity";
  const {
    brandOptions,
    engineCodeOptionsForBrand,
    serialOptions,
    applyMotorIdentityFromSerial,
    brandForEngineCode,
  } = useEngineIntakeIdentitySuggestions(identitySuggestionsEnabled);
  const engineCodeOptions = useMemo(
    () => engineCodeOptionsForBrand(brandName),
    [brandName, engineCodeOptionsForBrand],
  );
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
  const canConfirmApprove = canApprove && quality !== null;
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
      toast.error(error instanceof Error ? error.message : userCopy.engineIntake.feedback.updateFailed);
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
      employee ? userCopy.engineIntake.feedback.assignedTo(employee.fullName) : userCopy.engineIntake.feedback.movedToUnassigned,
    );
  };

  const beginVerification = async (nextDialog: VerificationDialog) => {
    setReviewNote("");
    setAiOverrideReason("");
    setQuality(null);
    const started = await run(
      managedCommand({
        type: "start_verification",
        payload: { jobId: job.id },
      }),
      userCopy.engineIntake.feedback.verificationOpened,
    );
    if (started) setDialog(nextDialog);
  };

  const closeDialog = async () => {
    const current = dialog;
    setDialog(null);
    setReviewNote("");
    setAiOverrideReason("");
    setQuality(null);
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
        toast.error(userCopy.engineIntake.feedback.overrideNoteRequired);
        return;
      }
      if (!quality) {
        toast.error(userCopy.engineIntake.feedback.qualityRequired);
        return;
      }
      command = managedCommand({
        type: "approve_job",
        payload: {
          jobId: job.id,
          note: reviewNote.trim() || (releaseNeedsOverride ? "" : userCopy.engineIntake.defaultReasons.checklistReady),
          identity: {
            serialCode: serialCode.trim(),
            engineCode: engineCode.trim(),
            brandName: brandName.trim(),
          },
          quality,
          ...(job.blockingAiFlags.length > 0 || releaseNeedsOverride
            ? {
                aiOverrideReason:
                  aiOverrideReason.trim() ||
                  reviewNote.trim() ||
                  userCopy.engineIntake.defaultReasons.managerOverride,
              }
            : {}),
        },
      });
      message = userCopy.engineIntake.feedback.released;
    } else if (dialog.kind === "rework") {
      command = managedCommand({
        type: "request_rework",
        payload: {
          jobId: job.id,
          note: reviewNote.trim() || userCopy.engineIntake.defaultReasons.retake(dialog.requirement.label),
          gaps: [
            {
              requirementId: dialog.requirement.id,
              reason: reviewNote.trim() || userCopy.engineIntake.defaultReasons.retake(dialog.requirement.label),
              ...(dialog.photoId ? { photoId: dialog.photoId } : {}),
            },
          ],
        },
      });
      message = userCopy.engineIntake.feedback.retakeSent;
    } else if (dialog.kind === "quarantine") {
      command = managedCommand({
        type: "quarantine_job",
        payload: {
          jobId: job.id,
          reason: reviewNote.trim() || userCopy.engineIntake.defaultReasons.manualInspection,
        },
      });
      message = userCopy.engineIntake.feedback.quarantined;
    } else if (dialog.kind === "reject") {
      command = managedCommand({
        type: "reject_job",
        payload: {
          jobId: job.id,
          reason: reviewNote.trim() || userCopy.engineIntake.defaultReasons.rejectedDuringVerification,
        },
      });
      message = userCopy.engineIntake.feedback.rejected;
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
      message = userCopy.engineIntake.feedback.identityUpdated;
    } else {
      command = managedCommand({
        type: "cancel_job",
        payload: {
          jobId: job.id,
          reason: reviewNote.trim() || userCopy.engineIntake.defaultReasons.cancelledByOperator,
        },
      });
      message = userCopy.engineIntake.feedback.cancelled;
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
              payload: { jobId: job.id, reason: userCopy.engineIntake.defaultReasons.claimReleasedByOperator },
            }),
            userCopy.engineIntake.feedback.claimReleased,
          )
        }
        onPause={() =>
          void run(
            managedCommand({ type: "pause_job", payload: { jobId: job.id } }),
            userCopy.engineIntake.feedback.paused,
          )
        }
        onResume={() =>
          void run(
            managedCommand({ type: "resume_job", payload: { jobId: job.id } }),
            userCopy.engineIntake.feedback.resumed,
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
          <AlertTitle>{userCopy.engineIntake.detailUi.wrongEngineTitle}</AlertTitle>
          <AlertDescription>{job.identityMismatch.reason}</AlertDescription>
        </Alert>
      ) : null}

      {job.blockingAiFlags?.length > 0 ? (
        <Alert className="mx-4 mt-3 w-auto shrink-0">
          <Sparkles />
          <AlertTitle>{userCopy.engineIntake.detailUi.aiFlagsTitle}</AlertTitle>
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
                    : "Label photos yourself · checklist updates from your labels")}
              </p>
              <TabsList variant="line">
                <TabsTrigger value="checklist">{userCopy.engineIntake.detailUi.checklistTab}</TabsTrigger>
                <TabsTrigger value="photos">{userCopy.engineIntake.detailUi.allPhotosTab}</TabsTrigger>
              </TabsList>
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
                Label each photo yourself — the checklist updates from your labels.
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
                                {photo.category === "other"
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
              userCopy.engineIntake.workspace.chapterClosed,
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
                ? userCopy.engineIntake.workspace.releaseToGrid
                : dialog?.kind === "rework"
                  ? userCopy.engineIntake.workspace.requestRetake(dialog.requirement.label)
                  : dialog?.kind === "quarantine"
                    ? userCopy.engineIntake.workspace.quarantineEngine
                    : dialog?.kind === "reject"
                      ? userCopy.engineIntake.workspace.rejectEngine
                      : dialog?.kind === "identity"
                        ? userCopy.engineIntake.workspace.editIdentity
                        : userCopy.engineIntake.workspace.cancelDraft}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "approve"
                ? releaseNeedsOverride
                  ? userCopy.engineIntake.workspace.overrideNote(summary.whisper ?? "")
                  : userCopy.engineIntake.workspace.checklistReady
                : dialog?.kind === "rework"
                  ? userCopy.engineIntake.workspace.reworkHint
                  : dialog?.kind === "identity"
                    ? userCopy.engineIntake.workspace.identityHint
                    : userCopy.engineIntake.workspace.reasonHint}
            </DialogDescription>
          </DialogHeader>

          {dialog?.kind === "approve" || dialog?.kind === "identity" ? (
            <FieldGroup>
              <Field>
                <FieldLabel>{userCopy.engineIntake.workspace.brand}</FieldLabel>
                <DatalistInput
                  value={brandName}
                  onValueChange={setBrandName}
                  options={brandOptions}
                  matchMode="flexible"
                  cycleOnTab
                  placeholder="Subaru"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>{userCopy.engineIntake.workspace.engineCode}</FieldLabel>
                  <DatalistInput
                    value={engineCode}
                    onValueChange={setEngineCode}
                    options={engineCodeOptions}
                    matchMode="flexible"
                    cycleOnTab
                    placeholder="EJ251"
                    onOptionCommit={(value) => {
                      if (brandName.trim()) return;
                      const inferred = brandForEngineCode(value);
                      if (inferred) setBrandName(inferred);
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>{userCopy.engineIntake.workspace.serialNumber}</FieldLabel>
                  <DatalistInput
                    value={serialCode}
                    onValueChange={setSerialCode}
                    options={serialOptions}
                    matchMode="flexible"
                    cycleOnTab
                    className="font-mono"
                    placeholder="B877550"
                    onOptionCommit={(value) => {
                      const matched = applyMotorIdentityFromSerial(value);
                      if (!matched) return;
                      if (matched.brandName) setBrandName(matched.brandName);
                      if (matched.engineCode) setEngineCode(matched.engineCode);
                    }}
                  />
                </Field>
              </div>
              {dialog.kind === "approve" ? (
                <>
                  <Field>
                    <FieldLabel>{userCopy.engineIntake.detailUi.quality}</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {MOTOR_QUALITY_GRADE_OPTIONS.map((option) => {
                        const selected = quality === option.value;
                        const tone =
                          option.value === "2"
                            ? "border-success-border bg-success-subtle text-success-on-subtle"
                            : option.value === "3"
                              ? "border-danger-border bg-danger-subtle text-danger-on-subtle"
                              : "border-primary-border bg-primary-subtle text-primary-on-subtle";
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setQuality(option.value)}
                            className={cn(
                              "flex min-h-11 flex-col items-center justify-center rounded-lg border px-2 py-2 text-sm font-semibold transition-colors",
                              selected ? tone : "border-border bg-card text-muted-foreground",
                            )}
                          >
                            <span className="font-mono text-base tabular-nums">{option.value}</span>
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel>{userCopy.engineIntake.detailUi.verificationNote}</FieldLabel>
                    <Textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                    />
                  </Field>
                  {job.blockingAiFlags.length > 0 ? (
                    <Field>
                      <FieldLabel>{userCopy.engineIntake.detailUi.aiOverrideReason}</FieldLabel>
                      <Textarea
                        value={aiOverrideReason}
                        onChange={(event) => setAiOverrideReason(event.target.value)}
                        placeholder={userCopy.engineIntake.detailUi.aiOverridePlaceholder}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}
            </FieldGroup>
          ) : (
            <Field>
              <FieldLabel>{userCopy.engineIntake.detailUi.operationalReason}</FieldLabel>
              <Textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder={
                  dialog?.kind === "rework"
                    ? userCopy.engineIntake.detailUi.reworkPlaceholder
                    : dialog?.kind === "cancel"
                      ? userCopy.engineIntake.detailUi.cancelPlaceholder
                      : userCopy.engineIntake.detailUi.reasonPlaceholder
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
                (dialog?.kind === "approve" && !canConfirmApprove) ||
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
