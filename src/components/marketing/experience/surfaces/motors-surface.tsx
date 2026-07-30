"use client";

import { Search } from "lucide-react";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
import { useLandingDemoSnapshot } from "@/components/marketing/modals/use-landing-demo-snapshot";
import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { Badge } from "@/components/ui/badge";
import { formatUsd, landingDemoInventory } from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

type MotorsSurfaceProps = {
  className?: string;
  variant?: "hero" | "loop" | "scene";
  highlight?: "motor" | "reserve" | "inventory";
};

export function MotorsSurface({
  className,
  variant = "hero",
  highlight = "motor",
}: MotorsSurfaceProps) {
  const chrome = useDemoChrome();
  const { landingDemoMotor } = useLandingDemoSnapshot();
  const showInventory = variant !== "hero" && highlight === "inventory";

  return (
    <ProductWindow
      title={chrome.grid.motorsTitle}
      className={cn("exp-surface", className)}
      contentClassName="p-0!"
    >
      <div className="border-b border-border/60 bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 py-1.5">
          <Search className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs text-foreground">
            {showInventory ? "FLT-OIL" : "G4KC"}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">{chrome.grid.demoData}</span>
        </div>
      </div>

      {showInventory ? (
        <InventoryTable columns={chrome.columns} />
      ) : (
        <MotorsTable
          motor={landingDemoMotor}
          columns={chrome.columns}
          status={chrome.status}
          highlightReserve={highlight === "reserve" || landingDemoMotor.status === "reserved"}
        />
      )}
    </ProductWindow>
  );
}

function MotorsTable({
  motor,
  columns,
  status,
  highlightReserve,
}: {
  motor: ReturnType<typeof useLandingDemoSnapshot>["landingDemoMotor"];
  columns: ReturnType<typeof useDemoChrome>["columns"];
  status: ReturnType<typeof useDemoChrome>["status"];
  highlightReserve: boolean;
}) {
  const m = motor;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border/70 bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">{columns.brand}</th>
            <th className="px-3 py-2 font-medium">{columns.engine}</th>
            <th className="px-3 py-2 font-medium">№</th>
            <th className="px-3 py-2 font-medium">{columns.place}</th>
            <th className="px-3 py-2 font-medium">{columns.qty}</th>
            <th className="px-3 py-2 font-medium">{columns.status}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            className={cn(
              "border-b border-border/50 bg-primary/[0.04]",
              highlightReserve && "ring-1 ring-inset ring-primary/25",
            )}
          >
            <td className="px-3 py-2.5 font-medium">{m.brandName}</td>
            <td className="px-3 py-2.5">
              <span className="font-medium">{m.engineCode}</span>
              <span className="ml-1.5 text-muted-foreground">{m.configuration}</span>
            </td>
            <td className="exp-mock-mono px-3 py-2.5 text-muted-foreground">{m.serialCode}</td>
            <td className="px-3 py-2.5 font-medium">{m.location}</td>
            <td className="exp-mock-mono px-3 py-2.5">{m.quantity}</td>
            <td className="px-3 py-2.5">
              <Badge variant="outline" className="font-normal">
                {highlightReserve && m.reservedFor
                  ? status.reservedFor(m.reservedFor)
                  : status.inStock}
              </Badge>
            </td>
          </tr>
          <tr className="text-muted-foreground/80">
            <td className="px-3 py-2" colSpan={6}>
              <span className="text-[10px]">{m.notes}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({
  columns,
}: {
  columns: ReturnType<typeof useDemoChrome>["columns"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border/70 bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">{columns.sku}</th>
            <th className="px-3 py-2 font-medium">{columns.name}</th>
            <th className="px-3 py-2 font-medium">{columns.onHand}</th>
            <th className="px-3 py-2 font-medium">{columns.reserve}</th>
            <th className="px-3 py-2 font-medium">{columns.available}</th>
            <th className="px-3 py-2 font-medium">{columns.place}</th>
            <th className="px-3 py-2 font-medium">{columns.price}</th>
          </tr>
        </thead>
        <tbody>
          {landingDemoInventory.map((item, index) => (
            <tr
              key={item.id}
              className={cn(
                "border-b border-border/50",
                index === 0 && "bg-primary/[0.04] ring-1 ring-inset ring-primary/20",
              )}
            >
              <td className="exp-mock-mono px-3 py-2.5">{item.sku}</td>
              <td className="px-3 py-2.5">
                <span className="font-medium">{item.name}</span>
                <span className="ml-1 text-muted-foreground">{item.brandName}</span>
              </td>
              <td className="exp-mock-mono px-3 py-2.5">{item.onHand}</td>
              <td className="exp-mock-mono px-3 py-2.5">{item.reserved}</td>
              <td className="exp-mock-mono px-3 py-2.5 font-medium">{item.available}</td>
              <td className="px-3 py-2.5">{item.location}</td>
              <td className="exp-mock-mono px-3 py-2.5">{formatUsd(item.sellPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
