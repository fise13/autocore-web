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
  { value: "ad_hoc", label: "Unplanned arrival" },
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
  const [source, setSource] = useState<EngineIntakeSource>("dismantle");
  const [sourceReference, setSourceReference] = useState("");
  const [engineCode, setEngineCode] = useState("");
  const [serialCode, setSerialCode] = useState("");
  const [brandName, setBrandName] = useState("");
  const [donorVin, setDonorVin] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [priority, setPriority] = useState<EngineIntakePriority>("normal");
  const [dueAt, setDueAt] = useState("");
  const [assigneeUid, setAssigneeUid] = useState("unassigned");

  const reset = () => {
    setSource("dismantle");
    setSourceReference("");
    setEngineCode("");
    setSerialCode("");
    setBrandName("");
    setDonorVin("");
    setConfiguration("");
    setPriority("normal");
    setDueAt("");
    setAssigneeUid("unassigned");
  };

  const createJob = async () => {
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
        sourceReference: sourceReference.trim(),
        priority,
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
        expectedIdentity: {
          engineCode: engineCode.trim(),
          serialCode: serialCode.trim(),
          brandName: brandName.trim(),
          donorVin: donorVin.trim(),
          configuration: configuration.trim(),
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
      toast.success("Engine intake job created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create intake job");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        New intake job
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create engine intake job</DialogTitle>
          <DialogDescription>
            Define the expected engine and assign the physical intake work.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Source</FieldLabel>
              <Select
                value={source}
                onValueChange={(value) => {
                  if (value) setSource(value as EngineIntakeSource);
                }}
              >
                <SelectTrigger className="w-full">
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
              <FieldLabel>Reference</FieldLabel>
              <Input
                value={sourceReference}
                onChange={(event) => setSourceReference(event.target.value)}
                placeholder="Vehicle, supplier, or transfer"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>Brand</FieldLabel>
              <Input
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Toyota"
              />
            </Field>
            <Field>
              <FieldLabel>Engine code</FieldLabel>
              <Input
                value={engineCode}
                onChange={(event) => setEngineCode(event.target.value)}
                placeholder="2ZR-FE"
              />
            </Field>
            <Field>
              <FieldLabel>Serial number</FieldLabel>
              <Input
                value={serialCode}
                onChange={(event) => setSerialCode(event.target.value)}
                placeholder="If known"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Donor VIN</FieldLabel>
              <Input
                value={donorVin}
                onChange={(event) => setDonorVin(event.target.value)}
                placeholder="If known"
              />
            </Field>
            <Field>
              <FieldLabel>Configuration</FieldLabel>
              <Input
                value={configuration}
                onChange={(event) => setConfiguration(event.target.value)}
                placeholder="Accessories or variant"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setPriority((value as EngineIntakePriority | null) ?? "normal")
                }
              >
                <SelectTrigger className="w-full">
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
              <FieldLabel>Due by</FieldLabel>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel>Field worker</FieldLabel>
            <Select
              value={assigneeUid}
              onValueChange={(value) => setAssigneeUid(value ?? "unassigned")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="unassigned">Unassigned field queue</SelectItem>
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
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void createJob()} disabled={busy}>
            {busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : null}
            Create job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
