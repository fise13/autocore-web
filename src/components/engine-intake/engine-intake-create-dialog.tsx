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

const SOURCE_OPTIONS: Array<{ value: EngineIntakeSource; label: string }> = [
  { value: "dismantle", label: "Vehicle dismantle" },
  { value: "purchase", label: "Purchased engine" },
  { value: "transfer", label: "Warehouse transfer" },
  { value: "ad_hoc", label: "Yard arrival" },
];

export function EngineIntakeCreateDialog({
  companyId,
  employees,
  onCreated,
}: {
  companyId: string;
  employees: CompanyEmployee[];
  onCreated: (jobId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<EngineIntakeSource>("ad_hoc");
  const [serialCode, setSerialCode] = useState("");
  const [priority, setPriority] = useState<EngineIntakePriority>("normal");
  const [assigneeUid, setAssigneeUid] = useState("unassigned");

  const reset = () => {
    setSource("ad_hoc");
    setSerialCode("");
    setPriority("normal");
    setAssigneeUid("unassigned");
  };

  const createJob = async () => {
    const serial = serialCode.trim().toUpperCase();
    if (!serial) {
      toast.error("Serial number is required");
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
      toast.success("Engine intake draft created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create engine");
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
        New engine
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New engine</DialogTitle>
          <DialogDescription>
            Creates an Engine intake draft — not Motors Grid. Brand and photo roles come from AI
            after capture.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="intake-serial">Serial</FieldLabel>
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
              <FieldLabel>Source</FieldLabel>
              <Select
                value={source}
                onValueChange={(value) => setSource(value as EngineIntakeSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as EngineIntakePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Assignee</FieldLabel>
              <Select
                value={assigneeUid}
                onValueChange={(value) => setAssigneeUid(value ?? "unassigned")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
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
            Cancel
          </Button>
          <Button onClick={() => void createJob()} disabled={busy || !serialCode.trim()}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
