"use client";

import { useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import type {
  EngineIntakeCommand,
  EngineIntakePriority,
  EngineIntakeSource,
} from "@autocore/engine-intake";

import type { CompanyEmployee } from "@/domain/rbac";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  engineIntakeCommandId,
  sendEngineIntakeCommand,
} from "@/lib/engine-intake/engine-intake-api.client";
import { userCopy } from "@/lib/user-copy";

const SOURCE_VALUES: EngineIntakeSource[] = [
  "dismantle",
  "purchase",
  "transfer",
  "ad_hoc",
];

const PRIORITY_VALUES: EngineIntakePriority[] = ["normal", "high", "urgent"];

function sourceLabel(source: EngineIntakeSource): string {
  return userCopy.engineIntake.create.sources[source];
}

function priorityLabel(priority: EngineIntakePriority): string {
  return userCopy.engineIntake.create.priorities[priority];
}

export function EngineIntakeCreateDialog({
  companyId,
  employees,
  onCreated,
}: {
  companyId: string;
  employees: CompanyEmployee[];
  onCreated: (jobId: string) => void;
}) {
  const copy = userCopy.engineIntake.create;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<EngineIntakeSource>("ad_hoc");
  const [serialCode, setSerialCode] = useState("");
  const [priority, setPriority] = useState<EngineIntakePriority>("normal");
  const [assigneeUid, setAssigneeUid] = useState("unassigned");

  const assigneeLabel =
    assigneeUid === "unassigned"
      ? copy.unassigned
      : employees.find((employee) => employee.uid === assigneeUid)?.fullName ??
        copy.unassigned;

  const reset = () => {
    setSource("ad_hoc");
    setSerialCode("");
    setPriority("normal");
    setAssigneeUid("unassigned");
  };

  const createJob = async () => {
    const serial = serialCode.trim().toUpperCase();
    if (!serial) {
      toast.error(copy.serialRequired);
      return;
    }
    const assignee =
      assigneeUid === "unassigned"
        ? null
        : employees.find((employee) => employee.uid === assigneeUid) ?? null;
    const command: EngineIntakeCommand = {
      type: "create_job",
      idempotencyKey: engineIntakeCommandId("create"),
      client: "desktop",
      clientAt: new Date().toISOString(),
      payload: {
        source,
        priority,
        expectedIdentity: {
          serialCode: serial,
        },
        assigneeUid: assignee?.uid ?? null,
        assigneeName: assignee?.fullName ?? null,
      },
    };

    setBusy(true);
    try {
      const result = await sendEngineIntakeCommand(companyId, command);
      setOpen(false);
      reset();
      onCreated(result.jobId);
      toast.success(copy.created);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.createFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        {copy.trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="intake-serial">{copy.serial}</FieldLabel>
            <Input
              id="intake-serial"
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={serialCode}
              onChange={(event) => setSerialCode(event.target.value.toUpperCase())}
              placeholder="UF398539"
              className="h-12 font-mono text-xl tracking-[0.12em]"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel>{copy.source}</FieldLabel>
              <Select
                value={source}
                onValueChange={(value) => setSource(value as EngineIntakeSource)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{sourceLabel(source)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SOURCE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {sourceLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{copy.priority}</FieldLabel>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as EngineIntakePriority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{priorityLabel(priority)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PRIORITY_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {priorityLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{copy.assignee}</FieldLabel>
              <Select
                value={assigneeUid}
                onValueChange={(value) => setAssigneeUid(value ?? "unassigned")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{assigneeLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="unassigned">{copy.unassigned}</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.uid} value={employee.uid}>
                        {employee.fullName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            {copy.cancel}
          </Button>
          <Button onClick={() => void createJob()} disabled={busy || !serialCode.trim()}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
