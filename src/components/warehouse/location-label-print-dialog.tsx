"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WarehouseLocation } from "@/domain/warehouse-location";
import { isUnlocatedLocation } from "@/domain/warehouse-location";
import { buildLocationEntityLink } from "@/lib/warehouse/location-entity-link";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";
import { printCurrentPage } from "@/platform";

export type LocationLabelSize = "50x30" | "70x40" | "a6";

function sizePresets(): Record<
  LocationLabelSize,
  { label: string; qr: number; className: string }
> {
  const copy = userCopy.warehouse.dialogs.labelPrint;
  return {
    "50x30": { label: copy.size50x30, qr: 96, className: "w-[190px] min-h-[114px]" },
    "70x40": { label: copy.size70x40, qr: 120, className: "w-[264px] min-h-[152px]" },
    a6: { label: copy.sizeA6, qr: 160, className: "w-[320px] min-h-[220px]" },
  };
}

type LocationLabelPrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseName: string;
  locations: WarehouseLocation[];
  /** Pre-select these ids; empty = all printable. */
  selectedIds?: string[];
};

type LabelCard = {
  id: string;
  displayCode: string;
  humanLines: string[];
  payload: string;
  dataUrl: string | null;
};

function humanLinesFor(location: WarehouseLocation): string[] {
  if (location.label && location.label !== location.displayCode) {
    return [location.label];
  }
  const parts = location.path.length ? location.path : [location.code];
  if (parts.length <= 1) return [];
  const copy = userCopy.warehouse.dialogs.labelPrint;
  return parts.map((part, index) => {
    const kind =
      index === 0 ? copy.zone : index === 1 ? copy.rack : index === 2 ? copy.shelf : copy.bin;
    return `${kind} ${part}`;
  });
}

export function LocationLabelPrintDialog({
  open,
  onOpenChange,
  warehouseName,
  locations,
  selectedIds,
}: LocationLabelPrintDialogProps) {
  const [size, setSize] = useState<LocationLabelSize>("70x40");
  const [cards, setCards] = useState<LabelCard[]>([]);

  const printable = useMemo(() => {
    const base = locations.filter((location) => !isUnlocatedLocation(location));
    if (!selectedIds?.length) return base;
    const set = new Set(selectedIds);
    return base.filter((location) => set.has(location.id));
  }, [locations, selectedIds]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const presets = sizePresets();
    const preset = presets[size];

    void (async () => {
      const next: LabelCard[] = [];
      for (const location of printable) {
        const payload = location.barcode?.trim() || buildLocationEntityLink(location.id);
        let dataUrl: string | null = null;
        try {
          dataUrl = await QRCode.toDataURL(payload, {
            width: preset.qr,
            margin: 1,
            errorCorrectionLevel: "M",
            color: { dark: "#18181b", light: "#ffffff" },
          });
        } catch {
          dataUrl = null;
        }
        next.push({
          id: location.id,
          displayCode: location.displayCode,
          humanLines: humanLinesFor(location),
          payload,
          dataUrl,
        });
      }
      if (!cancelled) setCards(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, printable, size]);

  function handlePrint() {
    // Routed through the platform adapter: `window.print()` has no handler in
    // the desktop shell's WKWebView, so label sheets never reached a printer.
    void printCurrentPage();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl print:max-w-none print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-4 opacity-70" />
            {userCopy.warehouse.dialogs.labelPrint.title(warehouseName)}
          </DialogTitle>
          <DialogDescription>
            {userCopy.warehouse.dialogs.labelPrint.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 print:hidden">
          {(Object.keys(sizePresets()) as LocationLabelSize[]).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={size === key ? "default" : "outline"}
              onClick={() => setSize(key)}
            >
              {sizePresets()[key].label}
            </Button>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3 print:max-h-none print:overflow-visible print:border-0 print:bg-transparent print:p-0">
          {cards.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{userCopy.warehouse.dialogs.labelPrint.empty}</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-3 print:gap-2">
              {cards.map((card) => (
                <article
                  key={card.id}
                  className={cn(
                    "flex flex-col items-center justify-between gap-2 rounded-md border border-border bg-white p-3 text-zinc-900 shadow-sm print:break-inside-avoid print:shadow-none",
                    sizePresets()[size].className,
                  )}
                >
                  <p className="text-center text-lg font-bold tracking-tight tabular-nums">
                    {card.displayCode}
                  </p>
                  {card.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- QR data URL
                    <img
                      src={card.dataUrl}
                      alt={`QR ${card.displayCode}`}
                      width={sizePresets()[size].qr}
                      height={sizePresets()[size].qr}
                      className="rounded-sm"
                    />
                  ) : (
                    <div
                      className="animate-pulse rounded-sm bg-zinc-100"
                      style={{
                        width: sizePresets()[size].qr,
                        height: sizePresets()[size].qr,
                      }}
                    />
                  )}
                  {card.humanLines.length > 0 ? (
                    <div className="text-center text-[11px] leading-tight text-zinc-600">
                      {card.humanLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="print:hidden">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {userCopy.warehouse.dialogs.close}
          </Button>
          <Button type="button" disabled={cards.length === 0} onClick={handlePrint}>
            <Printer className="size-4" />
            {userCopy.warehouse.dialogs.labelPrint.print(cards.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
