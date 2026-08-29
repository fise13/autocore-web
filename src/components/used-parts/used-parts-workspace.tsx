"use client";

import { Loader2, Plus, Puzzle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { sellUsedPartWithFinancialOperationUseCase } from "@/application/use-cases/sell-used-part-with-financial-operation";
import { unsellUsedPartWithFinancialOperationUseCase } from "@/application/use-cases/unsell-used-part-with-financial-operation";
import { GridPhotoCell } from "@/components/grid/grid-photo-cell";
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
import { donorApplicability, donorLabel } from "@/domain/donor";
import type { UsedPart } from "@/domain/used-part";
import { useDonorsRealtime } from "@/hooks/use-donors-realtime";
import { useUsedPartsRealtime } from "@/hooks/use-used-parts-realtime";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { createUsedPartRepository } from "@/infrastructure/firestore/used-part-repository";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const usedPartRepository = createUsedPartRepository();
const financialRepository = createFinancialOperationRepository();

export function UsedPartsWorkspace() {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? "";
  const searchParams = useSearchParams();
  const donorFilter = searchParams.get("donor")?.trim() ?? "";
  const { parts, isLoading } = useUsedPartsRealtime(companyId);
  const { donors } = useDonorsRealtime(companyId);
  const { formatMoney } = useAppDisplayCurrency();
  const copy = userCopy.usedParts;
  const [createOpen, setCreateOpen] = useState(false);
  const [sellPart, setSellPart] = useState<UsedPart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [form, setForm] = useState({
    donorId: donorFilter,
    name: "",
    oem: "",
    condition: "90",
    sellPrice: "",
    location: "",
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [draftPhotoId] = useState(() => `draft-${crypto.randomUUID()}`);

  const donorsById = useMemo(() => new Map(donors.map((donor) => [donor.id, donor])), [donors]);
  const visible = donorFilter ? parts.filter((part) => part.donorId === donorFilter) : parts;

  async function handleCreate() {
    if (!profile?.id || !companyId) return;
    const donor = donorsById.get(form.donorId);
    if (!donor || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await usedPartRepository.create({
        companyId,
        createdByUserId: profile.id,
        donorId: donor.id,
        name: form.name,
        oemNumber: form.oem,
        conditionPercent: Number(form.condition) || undefined,
        sellPrice: Number(form.sellPrice) || 0,
        locationCode: form.location,
        applicability: donorApplicability(donor),
        photoUrls,
      });
      setCreateOpen(false);
      setPhotoUrls([]);
      setForm((current) => ({ ...current, name: "", oem: "", sellPrice: "", location: "" }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.createFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleSell() {
    if (!profile?.id || !sellPart) return;
    setBusy(true);
    setError(null);
    try {
      await sellUsedPartWithFinancialOperationUseCase(
        usedPartRepository,
        financialRepository,
        {
          companyId,
          part: sellPart,
          createdByUserId: profile.id,
          amount: Number(amount) || sellPart.sellPrice,
          account: "kaspi",
          paymentMethod: "transfer",
        },
      );
      setSellPart(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.sellFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn(part: UsedPart) {
    if (!profile?.id) return;
    setBusy(true);
    setError(null);
    try {
      await unsellUsedPartWithFinancialOperationUseCase(
        usedPartRepository,
        financialRepository,
        {
          companyId,
          part,
          createdByUserId: profile.id,
          amount: part.soldAmount ?? part.sellPrice,
          account: "kaspi",
          paymentMethod: "transfer",
        },
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.returnFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!companyId) {
    return <EmptyState icon={Puzzle} title={copy.title} description={copy.selectCompany} />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/donors" className={cn(buttonVariants({ variant: "outline" }))}>
            {userCopy.donors.title}
          </Link>
          <Button
            type="button"
            onClick={() => {
              setForm((current) => ({
                ...current,
                donorId: current.donorId || donorFilter,
              }));
              setCreateOpen(true);
            }}
            disabled={donors.length === 0}
          >
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
      ) : visible.length === 0 ? (
        <EmptyState icon={Puzzle} title={copy.empty} description={copy.emptyHint} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">{copy.name}</th>
                <th className="py-2 pr-3 font-medium">{copy.donor}</th>
                <th className="py-2 pr-3 font-medium">{copy.applicability}</th>
                <th className="py-2 pr-3 font-medium">{copy.location}</th>
                <th className="py-2 pr-3 font-medium">{copy.sellPrice}</th>
                <th className="py-2 pr-3 font-medium">{copy.status}</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visible.map((part) => {
                const donor = donorsById.get(part.donorId);
                return (
                  <tr key={part.id} className="border-b last:border-0">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{part.name}</div>
                      {part.oemNumber ? (
                        <div className="text-xs text-muted-foreground">{part.oemNumber}</div>
                      ) : null}
                      {part.photoUrls[0] ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {part.photoUrls.length} {copy.photo.toLowerCase()}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-xs">{donor ? donorLabel(donor) : part.donorId}</td>
                    <td className="py-3 pr-3 text-xs">{part.applicability}</td>
                    <td className="py-3 pr-3">{part.locationCode ?? "—"}</td>
                    <td className="py-3 pr-3 tabular-nums">{formatMoney(part.sellPrice)}</td>
                    <td className="py-3 pr-3">{copy.statuses[part.status]}</td>
                    <td className="py-3 text-right">
                      {part.status === "available" ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setAmount(String(part.sellPrice || ""));
                            setSellPart(part);
                          }}
                        >
                          {copy.sell}
                        </Button>
                      ) : part.status === "sold" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleReturn(part)}
                        >
                          {copy.returnPart}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.create}</DialogTitle>
            <DialogDescription>{copy.emptyHint}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>{copy.donor}</Label>
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                value={form.donorId}
                onChange={(event) => setForm((current) => ({ ...current, donorId: event.target.value }))}
              >
                <option value="">{copy.donor}</option>
                {donors.map((donor) => (
                  <option key={donor.id} value={donor.id}>
                    {donorLabel(donor)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>{copy.name}</Label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{copy.oem}</Label>
                <Input value={form.oem} onChange={(event) => setForm((current) => ({ ...current, oem: event.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>{copy.condition}</Label>
                <Input
                  value={form.condition}
                  onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{copy.sellPrice}</Label>
                <Input
                  value={form.sellPrice}
                  onChange={(event) => setForm((current) => ({ ...current, sellPrice: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{copy.location}</Label>
                <Input
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{copy.photo}</Label>
              <GridPhotoCell
                urls={photoUrls}
                companyId={companyId}
                entityKind="used-part"
                entityId={draftPhotoId}
                title={form.name || copy.create}
                onChange={setPhotoUrls}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {copy.cancel}
            </Button>
            <Button type="button" disabled={busy || !form.donorId || !form.name.trim()} onClick={() => void handleCreate()}>
              {busy ? copy.selling : copy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sellPart != null} onOpenChange={(next) => !next && setSellPart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.sell}</DialogTitle>
            <DialogDescription>{sellPart?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>{copy.amount}</Label>
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSellPart(null)}>
              {copy.cancel}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void handleSell()}>
              {busy ? copy.selling : copy.sell}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
