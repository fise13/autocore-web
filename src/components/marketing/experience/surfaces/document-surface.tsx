"use client";

import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import {
  formatKzt,
  landingDemoCompany,
  landingDemoMotor,
  landingDemoWorkOrders,
} from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

const order = landingDemoWorkOrders[0];

type DocumentSurfaceProps = {
  className?: string;
};

export function DocumentSurface({ className }: DocumentSurfaceProps) {
  return (
    <ProductWindow
      title="AutoCore · Документ"
      className={cn("exp-surface", className)}
      contentClassName="bg-muted/10"
    >
      <div className="mx-auto max-w-md rounded-md border border-border/80 bg-background p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <p className="text-sm font-semibold tracking-tight">{landingDemoCompany.name}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{landingDemoCompany.legalName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Акт</p>
            <p className="exp-mock-mono text-xs font-medium">{order.number}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-1 text-xs">
          <Row label="Клиент" value={order.clientName} />
          <Row label="Авто" value={order.vehicleLabel} />
          <Row label="VIN" value={order.vin} mono />
          <Row label="Двигатель" value={`${landingDemoMotor.engineCode} · ${landingDemoMotor.serialCode}`} />
        </div>

        <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
          {order.laborLines.map((line) => (
            <div key={line.title} className="flex justify-between gap-2 text-xs">
              <span>{line.title}</span>
              <span className="exp-mock-mono text-muted-foreground">{formatKzt(line.hours * line.unitPrice)}</span>
            </div>
          ))}
          {order.partLines.map((line) => (
            <div key={line.sku} className="flex justify-between gap-2 text-xs">
              <span>{line.name}</span>
              <span className="exp-mock-mono text-muted-foreground">{formatKzt(line.unitPrice)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-sm">
          <span className="font-medium">Итого</span>
          <span className="exp-mock-mono font-semibold">{formatKzt(order.grandTotal)} ₸</span>
        </div>
      </div>
    </ProductWindow>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium", mono && "exp-mock-mono")}>{value}</span>
    </div>
  );
}
