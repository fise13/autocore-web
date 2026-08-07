"use client";

import { useDeferredValue, useState } from "react";
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
import {
  engineIntakeCompletionPercent,
  warehouseLifecycleLabel,
  type EngineIntakeJob,
  type EngineIntakeJobState,
} from "@autocore/engine-intake";

import { EngineIntakeCreateDialog } from "@/components/engine-intake/engine-intake-create-dialog";
import { EngineIntakeDetail } from "@/components/engine-intake/engine-intake-detail";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function jobTitle(job: EngineIntakeJob): string {
  return (
    job.expectedIdentity.serialCode ||
    job.expectedIdentity.engineCode ||
    job.sourceReference ||
    "Unnamed engine"
  );
}

function stateLabel(state: EngineIntakeJobState): string {
  return warehouseLifecycleLabel(state);
}

function identityLine(job: EngineIntakeJob): string {
  const brand = job.expectedIdentity.brandName?.trim();
  const code = job.expectedIdentity.engineCode?.trim();
  if (brand && code) return `${brand} · ${code}`;
  if (brand || code) return brand || code || "";
  return "AI identity pending";
}

function stateVariant(state: EngineIntakeJobState) {
  if (state === "verified" || state === "closed") return "success" as const;
  if (state === "rework" || state === "quarantine") return "warning" as const;
  if (state === "rejected" || state === "cancelled") return "destructive" as const;
  if (state === "in_session" || state === "awaiting_verification") return "info" as const;
  return "secondary" as const;
}

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex min-h-20 items-center gap-3 rounded-lg px-3 py-2">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
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
            <EmptyTitle>Warehouse is not available</EmptyTitle>
            <EmptyDescription>
              Select a company with Warehouse access or ask an administrator for permission.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Camera className="text-primary" />
            <h1 className="font-heading text-xl font-semibold tracking-tight">Warehouse</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Engines being documented. Release to Motors Grid only when Ready — never mix with sellable stock.
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
        <Alert variant="destructive" className="mx-5 mt-4 w-auto">
          <AlertTriangle />
          <AlertTitle>Warehouse stream unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-3 border-b p-3">
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search serial, AI identity, worker"
                aria-label="Search Warehouse engines"
              />
            </InputGroup>
            <Select
              value={filter}
              onValueChange={(value) => setFilter((value as QueueFilter | null) ?? "active")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="active">Documenting</SelectItem>
                  <SelectItem value="verification">Ready / in review</SelectItem>
                  <SelectItem value="complete">Released / closed</SelectItem>
                  <SelectItem value="all">All Warehouse engines</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <QueueSkeleton /> : null}
            {!loading && visibleJobs.length === 0 ? (
              <Empty className="min-h-64">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Camera />
                  </EmptyMedia>
                  <EmptyTitle>No matching Warehouse engines</EmptyTitle>
                  <EmptyDescription>
                    Change the filter or create a serial draft for the next engine on the floor.
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
              <div className="flex flex-col p-2">
                {visibleJobs.map((job) => {
                  const active = job.id === selectedJob?.id;
                  const completion = engineIntakeCompletionPercent(job.progress);
                  const missing =
                    job.progress.missingFacets?.slice(0, 2).join(", ") ||
                    job.progress.coverageWhisper ||
                    null;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedId(job.id)}
                      className={cn(
                        "group flex min-h-24 w-full flex-col gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                        active ? "bg-primary-subtle text-primary-on-subtle" : "hover:bg-muted",
                      )}
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-semibold tracking-wide">
                            {jobTitle(job)}
                          </p>
                          <p
                            className={cn(
                              "truncate text-xs",
                              active ? "text-primary-on-subtle/75" : "text-muted-foreground",
                            )}
                          >
                            {identityLine(job)}
                          </p>
                        </div>
                        <Badge variant={stateVariant(job.state)}>{stateLabel(job.state)}</Badge>
                      </div>
                      <Progress value={completion} className="gap-0" />
                      <div
                        className={cn(
                          "flex items-center justify-between gap-2 text-xs",
                          active ? "text-primary-on-subtle/75" : "text-muted-foreground",
                        )}
                      >
                        <span className="flex items-center gap-1">
                          {job.assignment.activeSessionId ? <Smartphone /> : <Clock3 />}
                          {completion}% · {job.progress.capturedCount} photos
                        </span>
                        <span className="truncate">
                          {job.progress.syncQueueDepth > 0
                            ? `${job.progress.syncQueueDepth} syncing`
                            : missing
                              ? `Missing ${missing}`
                              : job.assignment.claimedByName ||
                                job.assignment.assigneeName ||
                                "Warehouse"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="flex min-h-[560px] min-w-0 flex-col lg:min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            {selectedJob ? (
              <motion.div
                key={selectedJob.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-0 flex-1 flex-col"
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
                    <EmptyTitle>Select an intake job</EmptyTitle>
                    <EmptyDescription>
                      Live photos, session state, location, and verification appear here.
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
