"use client";

import { Car, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { donorApplicability, donorLabel, type DonorStatus, type DonorVehicle } from "@/domain/donor";
import { useDonorsRealtime } from "@/hooks/use-donors-realtime";
import { useMotorsRealtime } from "@/hooks/use-motors-realtime";
import { useUsedPartsRealtime } from "@/hooks/use-used-parts-realtime";
import { createDonorRepository } from "@/infrastructure/firestore/donor-repository";
import { createMotorRepository } from "@/infrastructure/firestore/motor-repository";
import { computeDonorPnl } from "@/lib/dismantler/compute-donor-pnl";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";

const donorRepository = createDonorRepository();
const motorRepository = createMotorRepository();

export function DonorsWorkspace() {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const uid = profile?.id ?? "";
  const { donors, isLoading } = useDonorsRealtime(companyId);
  const { parts } = useUsedPartsRealtime(companyId);
  const motorsQuery = useMotorsRealtime(motorRepository, {
    uid,
    companyId,
    enabled: Boolean(uid && companyId),
  });
  const motors = useMemo(() => motorsQuery.data ?? [], [motorsQuery.data]);
  const { formatMoney } = useAppDisplayCurrency();
  const copy = userCopy.donors;
  const [open, setOpen] = useState(false);
  const [linkDonor, setLinkDonor] = useState<DonorVehicle | null>(null);
  const [motorId, setMotorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vin: "",
    make: "",
    model: "",
    year: "",
    body: "",
    purchasePrice: "",
    source: "",
    yardLocation: "",
  });

  const rows = useMemo(
    () =>
      donors.map((donor) => ({
        donor,
        pnl: computeDonorPnl({ donor, parts, motors }),
        motorCount: motors.filter((motor) => motor.donorId === donor.id).length,
      })),
    [donors, parts, motors],
  );

  const unlinkedMotors = useMemo(
    () => motors.filter((motor) => !motor.deletedAt && !motor.donorId),
    [motors],
  );

  async function handleCreate() {
    if (!profile?.id || !companyId) return;
    setBusy(true);
    setError(null);
    try {
      const year = form.year.trim() ? Number(form.year) : undefined;
      await donorRepository.create({
        companyId,
        createdByUserId: profile.id,
        vin: form.vin,
        make: form.make || "—",
        model: form.model || "—",
        year: Number.isFinite(year) ? year : undefined,
        body: form.body,
        purchasePrice: Number(form.purchasePrice) || 0,
        source: form.source,
        yardLocation: form.yardLocation,
      });
      setOpen(false);
      setForm({
        vin: "",
        make: "",
        model: "",
        year: "",
        body: "",
        purchasePrice: "",
        source: "",
        yardLocation: "",
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.createFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkEngine() {
    if (!uid || !linkDonor || !motorId) return;
    setBusy(true);
    setError(null);
    try {
      await motorRepository.update(uid, motorId, { donorId: linkDonor.id });
      setLinkDonor(null);
      setMotorId("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.createFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(donorId: string, status: DonorStatus) {
    if (!companyId) return;
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
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            {copy.create}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {copy.loading}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Car} title={copy.empty} description={copy.emptyHint} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{copy.vin}</th>
                <th className="py-2 pr-3 font-medium">{copy.status}</th>
                <th className="py-2 pr-3 font-medium">{copy.bought}</th>
                <th className="py-2 pr-3 font-medium">{copy.sold}</th>
                <th className="py-2 pr-3 font-medium">{copy.remaining}</th>
                <th className="py-2 pr-3 font-medium">{copy.gross}</th>
                <th className="py-2 pr-3 font-medium">{copy.parts}</th>
                <th className="py-2 font-medium">{copy.engines}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ donor, pnl, motorCount }) => (
                <tr key={donor.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{donorLabel(donor)}</div>
                    <div className="text-xs text-muted-foreground">{donorApplicability(donor)}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={donor.status}
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
                  <td className="py-3 pr-3 tabular-nums">{formatMoney(pnl.soldRevenue)}</td>
                  <td className="py-3 pr-3 tabular-nums">{formatMoney(pnl.remainingValue)}</td>
                  <td className="py-3 pr-3 tabular-nums">{formatMoney(pnl.grossSoFar)}</td>
                  <td className="py-3 pr-3">
                    <Link
                      href={`/used-parts?donor=${encodeURIComponent(donor.id)}`}
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      {pnl.partCount} · {copy.addPart}
                    </Link>
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      className="text-sm underline-offset-4 hover:underline"
                      onClick={() => {
                        setMotorId("");
                        setLinkDonor(donor);
                      }}
                    >
                      {motorCount} · {copy.linkEngine}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.create}</DialogTitle>
            <DialogDescription>{copy.subtitle}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label={copy.vin} value={form.vin} onChange={(vin) => setForm((f) => ({ ...f, vin }))} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.make} value={form.make} onChange={(make) => setForm((f) => ({ ...f, make }))} />
              <Field label={copy.model} value={form.model} onChange={(model) => setForm((f) => ({ ...f, model }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.year} value={form.year} onChange={(year) => setForm((f) => ({ ...f, year }))} />
              <Field label={copy.body} value={form.body} onChange={(body) => setForm((f) => ({ ...f, body }))} />
            </div>
            <Field
              label={copy.purchasePrice}
              value={form.purchasePrice}
              onChange={(purchasePrice) => setForm((f) => ({ ...f, purchasePrice }))}
            />
            <Field label={copy.source} value={form.source} onChange={(source) => setForm((f) => ({ ...f, source }))} />
            <Field
              label={copy.yardLocation}
              value={form.yardLocation}
              onChange={(yardLocation) => setForm((f) => ({ ...f, yardLocation }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {copy.cancel}
            </Button>
            <Button type="button" disabled={busy || !form.make.trim()} onClick={() => void handleCreate()}>
              {busy ? copy.saving : copy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDonor != null} onOpenChange={(next) => !next && setLinkDonor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.linkEngine}</DialogTitle>
            <DialogDescription>{linkDonor ? donorLabel(linkDonor) : copy.pickEngine}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>{copy.pickEngine}</Label>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={motorId}
              onChange={(event) => setMotorId(event.target.value)}
            >
              <option value="">{copy.pickEngine}</option>
              {unlinkedMotors.map((motor) => (
                <option key={motor.id} value={motor.id}>
                  {[motor.brandName, motor.engineCode, motor.serialCode].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkDonor(null)}>
              {copy.cancel}
            </Button>
            <Button type="button" disabled={busy || !motorId} onClick={() => void handleLinkEngine()}>
              {busy ? copy.saving : copy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
