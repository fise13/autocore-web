"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  Search,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { EngineIntakeJob, EngineIntakeJobState } from "@autocore/engine-intake";

import { EngineIntakeCreateDialog } from "@/components/engine-intake/engine-intake-create-dialog";
import { EngineIntakeDetail } from "@/components/engine-intake/engine-intake-detail";
import {
  jobIdentityLine,
  jobLifecycleLabel,
  jobSerial,
  jobStateBadgeVariant,
} from "@/components/engine-intake/engine-intake-format";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { cn } from "@/lib/utils";
import { useEmployeesRealtime } from "@/hooks/use-employees-realtime";
import {
  useEngineIntakeJobRealtime,
  useEngineIntakeJobsRealtime,
} from "@/hooks/use-engine-intake-realtime";

type QueueFilter = "active" | "verification" | "complete" | "all";

const FILTER_STATES: Record<QueueFilter, EngineIntakeJobState[]> = {
  active: ["open", "in_session", "paused", "rework"],
  verification: ["awaiting_verification", "quarantine"],
  complete: ["verified", "closed", "rejected", "cancelled"],
  all: [
    "open",
    "in_session",
    "paused",
    "rework",
    "awaiting_verification",
    "quarantine",
    "verified",
    "closed",
    "rejected",
    "cancelled",
  ],
};

const FILTER_OPTIONS: Array<{ value: QueueFilter; label: string }> = [
  { value: "active", label: "Documenting" },
  { value: "verification", label: "In review" },
  { value: "complete", label: "Released" },
  { value: "all", label: "All" },
];

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex min-h-[4.5rem] flex-col gap-2 rounded-md px-3 py-2.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}

function BayCard({
  job,
  active,
  onSelect,
}: {
  job: EngineIntakeJob;
  active: boolean;
  onSelect: () => void;
}) {
  const checklist = job.documentationChecklist;
  const summary = checklist?.summary;
  const topMissing = (checklist?.items ?? [])
    .filter(
      (item) => item.saleGate && (item.state === "missing" || item.state === "uncertain"),
    )
    .slice(0, 2)
    .map((item) => item.label);
  const summaryLine = summary
    ? `${summary.completedCount} done · ${summary.missingCount} missing${
        summary.uncertainCount > 0 ? ` · ${summary.uncertainCount} uncertain` : ""
      }`
    : `${job.progress.capturedCount} photos`;
  const understanding =
    checklist?.understandingState === "understanding" ||
    checklist?.understandingState === "pending";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col gap-1.5 rounded-md px-3 py-2.5 text-left transition-colors",
        active
          ? "bg-primary-subtle text-primary-on-subtle"
          : "hover:bg-muted/70",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
        />
      ) : null}
      <div className="flex items-start justify-between gap-2 pl-1">
        <div className="min-w-0">
          <p className="truncate font-mono text-[15px] font-semibold tracking-wide">
            {jobSerial(job)}
          </p>
          <p
            className={cn(
              "truncate text-xs",
              active ? "text-primary-on-subtle/70" : "text-muted-foreground",
            )}
          >
            {jobIdentityLine(job)}
          </p>
        </div>
        <Badge variant={jobStateBadgeVariant(job.state)} className="shrink-0">
          {jobLifecycleLabel(job.state)}
        </Badge>
      </div>

      {topMissing.length > 0 ? (
        <div className="flex flex-wrap gap-1 pl-1">
          {topMissing.map((label) => (
            <span
              key={label}
              className={cn(
                "max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                active
                  ? "bg-primary-on-subtle/12 text-primary-on-subtle"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center justify-between gap-2 pl-1 text-[11px]",
          active ? "text-primary-on-subtle/65" : "text-muted-foreground",
        )}
      >
        <span className="flex min-w-0 items-center gap-1 truncate">
          {job.assignment.activeSessionId ? (
            <Smartphone className="size-3 shrink-0" />
          ) : (
            <Clock3 className="size-3 shrink-0" />
          )}
          {summaryLine}
        </span>
        <span className="shrink-0 tabular-nums">
          {job.progress.syncQueueDepth > 0
            ? `${job.progress.syncQueueDepth} syncing`
            : understanding
              ? "Understanding…"
              : `${job.progress.capturedCount} photos`}
        </span>
      </div>
    </button>
  );
}

export function EngineIntakeWorkspace() {
  const { profile } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const canView = can(profile, "engine_intake_view");
  const canVerify = can(profile, "engine_intake_verify");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("active");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const { jobs, loading, error } = useEngineIntakeJobsRealtime(companyId, canView);
  const { employees } = useEmployeesRealtime(companyId, Boolean(companyId && canVerify));

  const filterCounts = useMemo(() => {
    const counts: Record<QueueFilter, number> = {
      active: 0,
      verification: 0,
      complete: 0,
      all: jobs.length,
    };
    for (const job of jobs) {
      if (FILTER_STATES.active.includes(job.state)) counts.active += 1;
      if (FILTER_STATES.verification.includes(job.state)) counts.verification += 1;
      if (FILTER_STATES.complete.includes(job.state)) counts.complete += 1;
    }
    return counts;
  }, [jobs]);

  const visibleJobs = jobs.filter((job) => {
    if (!FILTER_STATES[filter].includes(job.state)) return false;
    if (!deferredSearch) return true;
    return [
      job.expectedIdentity.engineCode,
      job.expectedIdentity.serialCode,
      job.expectedIdentity.brandName,
      job.sourceReference,
      job.assignment.assigneeName,
      job.location?.code,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(deferredSearch));
  });
  const selectedJob =
    jobs.find((job) => job.id === selectedId) ?? visibleJobs[0] ?? jobs[0] ?? null;
  const detail = useEngineIntakeJobRealtime(companyId, selectedJob?.id ?? null);

  if (!companyId || !canView) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheck />
            </EmptyMedia>
            <EmptyTitle>Engine intake unavailable</EmptyTitle>
            <EmptyDescription>
              Select a company with Engine intake access, or ask an admin for permission.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Camera className="size-4 text-primary" />
            <h1 className="font-heading text-lg font-semibold tracking-tight">Engine intake</h1>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Document engines here. Release to Motors Grid only when checklist is ready.
          </p>
        </div>
        {canVerify ? (
          <EngineIntakeCreateDialog
            companyId={companyId}
            employees={employees}
            onCreated={setSelectedId}
          />
        ) : null}
      </header>

      {error ? (
        <Alert variant="destructive" className="mx-5 mt-3 w-auto shrink-0">
          <AlertTriangle />
          <AlertTitle>Warehouse stream unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
          <div className="flex shrink-0 flex-col gap-2.5 border-b p-3">
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Serial, identity, worker"
                  aria-label="Search Engine intake"
              />
            </InputGroup>
            <div
              className="autocore-segmented-tabs inline-flex w-full rounded-lg p-0.5"
              role="tablist"
              aria-label="Engine intake queue filter"
            >
              {FILTER_OPTIONS.map((option) => {
                const selected = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "flex-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-all duration-200",
                      selected
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                    <span
                      className={cn(
                        "ml-1 tabular-nums",
                        selected ? "text-foreground/60" : "text-muted-foreground/70",
                      )}
                    >
                      {filterCounts[option.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <QueueSkeleton /> : null}
            {!loading && visibleJobs.length === 0 ? (
              <Empty className="min-h-56 px-3">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Camera />
                  </EmptyMedia>
                  <EmptyTitle>No engines here</EmptyTitle>
                  <EmptyDescription>
                    Switch filter, or create a serial draft for the next engine on the floor.
                  </EmptyDescription>
                </EmptyHeader>
                {canVerify ? (
                  <EmptyContent>
                    <EngineIntakeCreateDialog
                      companyId={companyId}
                      employees={employees}
                      onCreated={setSelectedId}
                    />
                  </EmptyContent>
                ) : null}
              </Empty>
            ) : null}
            {visibleJobs.length > 0 ? (
              <div className="flex flex-col gap-0.5 p-1.5">
                {visibleJobs.map((job) => (
                  <BayCard
                    key={job.id}
                    job={job}
                    active={job.id === selectedJob?.id}
                    onSelect={() => setSelectedId(job.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {selectedJob ? (
              <motion.div
                key={selectedJob.id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <EngineIntakeDetail
                  key={[
                    selectedJob.id,
                    selectedJob.expectedIdentity.brandName,
                    selectedJob.expectedIdentity.engineCode,
                    selectedJob.expectedIdentity.serialCode,
                  ].join(":")}
                  companyId={companyId}
                  job={selectedJob}
                  sessions={detail.sessions}
                  photos={detail.photos}
                  events={detail.events}
                  inspections={detail.inspections}
                  employees={employees}
                  canVerify={canVerify}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-1 items-center justify-center"
              >
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CheckCircle2 />
                    </EmptyMedia>
                    <EmptyTitle>Select an engine</EmptyTitle>
                    <EmptyDescription>
                      Checklist, evidence, and release controls open here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
