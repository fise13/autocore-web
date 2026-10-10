"use client";

import { Car, Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DonorFormDialog } from "@/components/donors/donor-form-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  donorApplicability,
  donorLabel,
  type DonorStatus,
  type DonorVehicle,
  type UpdateDonorInput,
} from "@/domain/donor";
import type { MotorEntity } from "@/domain/motor";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { useDonorsRealtime } from "@/hooks/use-donors-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useOperationsRealtime } from "@/hooks/use-operations-realtime";
import { useUsedPartsRealtime } from "@/hooks/use-used-parts-realtime";
import { createDonorRepository } from "@/infrastructure/firestore/donor-repository";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { can } from "@/lib/auth/permissions";
import { computeDonorPnl } from "@/lib/dismantler/compute-donor-pnl";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const donorRepository = createDonorRepository();
const motorRepository = createMotorRepository();
const financialRepository = createFinancialOperationRepository();

function motorLabel(motor: MotorEntity): string {
  return (
    [motor.brandName, motor.engineCode, motor.serialCode].filter(Boolean).join(" · ") || motor.id
  );
}

export function DonorsWorkspace() {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const uid = profile?.id ?? "";
  const canEdit = can(profile, "inventory_edit");
  const canDelete = can(profile, "inventory_delete");
  // Payback is only exact when the accounting rows behind each sale are
  // readable. Without them the page still works, on part amounts alone.
  const canAccounting = can(profile, "accounting_view");

  const { donors, isLoading } = useDonorsRealtime(companyId);
  const { parts } = useUsedPartsRealtime(companyId);
  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: Boolean(uid && companyId),
  });
  const operationsQuery = useOperationsRealtime(financialRepository, {
    companyId,
    enabled: Boolean(companyId) && canAccounting,
  });
  const motors = useMemo(() => motorsQuery.data ?? [], [motorsQuery.data]);
  const operations = useMemo(() => operationsQuery.data ?? [], [operationsQuery.data]);
  const { formatMoney } = useAppDisplayCurrency();
  const copy = userCopy.donors;

  const [editorDonor, setEditorDonor] = useState<DonorVehicle | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [enginesDonor, setEnginesDonor] = useState<DonorVehicle | null>(null);
  const [removeTarget, setRemoveTarget] = useState<DonorVehicle | null>(null);
  const [motorId, setMotorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      donors.map((donor) => ({
        donor,
        pnl: computeDonorPnl({ donor, parts, motors, operations }),
      })),
    [donors, parts, motors, operations],
  );

  const unlinkedMotors = useMemo(
    () => motors.filter((motor) => !motor.deletedAt && !motor.donorId),
    [motors],
  );

  const linkedMotors = useMemo(
    () =>
      enginesDonor
        ? motors.filter((motor) => !motor.deletedAt && motor.donorId === enginesDonor.id)
        : [],
    [motors, enginesDonor],
  );

  // A donor may only go once nothing points at it any more: Firestore has no
  // cascade, and an orphaned part loses its fitment and its payback line.
  const removeBlockers = useMemo(() => {
    if (!removeTarget) return { parts: 0, motors: 0 };
    return {
      parts: parts.filter((part) => part.donorId === removeTarget.id).length,
      motors: motors.filter((motor) => !motor.deletedAt && motor.donorId === removeTarget.id).length,
    };
  }, [removeTarget, parts, motors]);
  const removeBlocked = removeBlockers.parts > 0 || removeBlockers.motors > 0;

  function openCreate() {
    setEditorDonor(null);
    setEditorOpen(true);
  }

  function openEdit(donor: DonorVehicle) {
    setEditorDonor(donor);
    setEditorOpen(true);
  }

  async function handleSubmit(values: UpdateDonorInput) {
    if (!profile?.id || !companyId) return;
    setBusy(true);
    setError(null);
    try {
      if (editorDonor) {
        await donorRepository.update(companyId, editorDonor.id, values);
      } else {
        await donorRepository.create({
          ...values,
          make: values.make ?? "",
          model: values.model ?? "",
          // A new record has nothing to clear, so "cleared" collapses back to
          // "not provided" and `create` fills in its own defaults.
          year: values.year ?? undefined,
          purchasedAt: values.purchasedAt ?? undefined,
          companyId,
          createdByUserId: profile.id,
        });
      }
      setEditorOpen(false);
      setEditorDonor(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.createFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkEngine() {
    if (!uid || !enginesDonor || !motorId) return;
    setBusy(true);
    setError(null);
    try {
      await motorRepository.update(uid, motorId, { donorId: enginesDonor.id });
      setMotorId("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.createFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlinkEngine(id: string) {
    if (!uid) return;
    setBusy(true);
    setError(null);
    try {
      await motorRepository.update(uid, id, { donorId: null });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.createFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!companyId || !removeTarget || removeBlocked) return;
    setBusy(true);
    setError(null);
    try {
      await donorRepository.remove(companyId, removeTarget.id);
      setRemoveTarget(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.removeFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(donorId: string, status: DonorStatus) {
    if (!companyId) return;
    setError(null);
    try {
      await donorRepository.update(companyId, donorId, { status });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.createFailed);
    }
  }

  if (!companyId) {
    return <EmptyState icon={Car} title={copy.title} description={copy.selectCompany} />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/used-parts" className={cn(buttonVariants({ variant: "outline" }))}>
            {copy.viewCatalog}
          </Link>
          {canEdit ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" />
              {copy.create}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!canAccounting ? <p className="text-sm text-muted-foreground">{copy.financeHidden}</p> : null}

      {isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {copy.loading}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Car} title={copy.empty} description={copy.emptyHint} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{copy.vin}</th>
                <th className="py-2 pr-3 font-medium">{copy.status}</th>
                <th className="py-2 pr-3 font-medium">{copy.bought}</th>
                <th className="py-2 pr-3 font-medium">{copy.sold}</th>
                <th className="py-2 pr-3 font-medium">{copy.remaining}</th>
                <th className="py-2 pr-3 font-medium">{copy.gross}</th>
                <th className="py-2 pr-3 font-medium">{copy.parts}</th>
                <th className="py-2 pr-3 font-medium">{copy.engines}</th>
                <th className="py-2 font-medium sr-only">{copy.edit}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ donor, pnl }) => (
                <tr key={donor.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{donorLabel(donor)}</div>
                    <div className="text-xs text-muted-foreground">{donorApplicability(donor)}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={donor.status}
                      aria-label={copy.status}
                      disabled={!canEdit}
                      onChange={(event) => void handleStatus(donor.id, event.target.value as DonorStatus)}
                    >
                      {(Object.keys(copy.statuses) as DonorStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {copy.statuses[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{formatMoney(pnl.purchasePrice)}</td>
                  <td
                    className="py-3 pr-3 tabular-nums"
                    title={copy.revenueBreakdown(
                      formatMoney(pnl.revenue.fromParts),
                      formatMoney(pnl.revenue.fromMotors),
                      formatMoney(pnl.revenue.fromDonorSales),
                    )}
                  >
                    {formatMoney(pnl.soldRevenue)}
                    {pnl.unvaluedSoldMotorCount > 0 ? (
                      <span
                        className="ml-1 inline-flex align-middle text-warning-on-subtle"
                        title={copy.unvaluedMotors(pnl.unvaluedSoldMotorCount)}
                      >
                        <TriangleAlert className="size-3.5" aria-hidden />
                        <span className="sr-only">
                          {copy.unvaluedMotors(pnl.unvaluedSoldMotorCount)}
                        </span>
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{formatMoney(pnl.remainingValue)}</td>
                  <td
                    className={cn(
                      "py-3 pr-3 tabular-nums",
                      pnl.grossSoFar < 0 ? "text-destructive" : undefined,
                    )}
                  >
                    {formatMoney(pnl.grossSoFar)}
                  </td>
                  <td className="py-3 pr-3">
                    <Link
                      href={`/used-parts?donor=${encodeURIComponent(donor.id)}`}
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      {pnl.partCount} · {copy.addPart}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      className="text-sm underline-offset-4 hover:underline"
                      onClick={() => {
                        setMotorId("");
                        setEnginesDonor(donor);
                      }}
                    >
                      {pnl.motorCount} · {copy.linkEngine}
                    </button>
                    {pnl.soldMotorCount > 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {copy.enginesSold(pnl.soldMotorCount)}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={copy.edit}
                          title={copy.edit}
                          onClick={() => openEdit(donor)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={copy.remove}
                          title={copy.remove}
                          onClick={() => setRemoveTarget(donor)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DonorFormDialog
        open={editorOpen}
        donor={editorDonor}
        busy={busy}
        onOpenChange={(next) => {
          setEditorOpen(next);
          if (!next) setEditorDonor(null);
        }}
        onSubmit={(values) => void handleSubmit(values)}
      />

      <Dialog open={enginesDonor != null} onOpenChange={(next) => !next && setEnginesDonor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.linkedEngines}</DialogTitle>
            <DialogDescription>
              {enginesDonor ? donorLabel(enginesDonor) : copy.pickEngine}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {linkedMotors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.noLinkedEngines}</p>
            ) : (
              <ul className="grid gap-1.5">
                {linkedMotors.map((motor) => (
                  <li
                    key={motor.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm">{motorLabel(motor)}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || !canEdit}
                      onClick={() => void handleUnlinkEngine(motor.id)}
                    >
                      {copy.unlinkEngine}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {canEdit ? (
              <div className="grid gap-1.5">
                <Label htmlFor="donor-link-engine">{copy.linkEngine}</Label>
                <div className="flex gap-2">
                  <select
                    id="donor-link-engine"
                    className="h-9 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm"
                    value={motorId}
                    onChange={(event) => setMotorId(event.target.value)}
                  >
                    <option value="">{copy.pickEngine}</option>
                    {unlinkedMotors.map((motor) => (
                      <option key={motor.id} value={motor.id}>
                        {motorLabel(motor)}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    disabled={busy || !motorId}
                    onClick={() => void handleLinkEngine()}
                  >
                    {busy ? copy.saving : copy.save}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEnginesDonor(null)}>
              {copy.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeTarget != null} onOpenChange={(next) => !next && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.removeTitle}</DialogTitle>
            <DialogDescription>
              {removeTarget ? donorLabel(removeTarget) : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {removeBlocked
              ? copy.removeBlocked(removeBlockers.parts, removeBlockers.motors)
              : copy.removeConfirm}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)}>
              {copy.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || removeBlocked}
              onClick={() => void handleRemove()}
            >
              {busy ? copy.removing : copy.remove}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
