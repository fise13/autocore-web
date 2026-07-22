"use client";

import { ProductWindow } from "@/components/marketing/experience/ui/product-window";
import { Badge } from "@/components/ui/badge";
import { formatKzt, landingDemoWorkOrders } from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

const primary = landingDemoWorkOrders[0];
const secondary = landingDemoWorkOrders[1];

type WorkOrderSurfaceProps = {
  className?: string;
  orderId?: "demo-wo-0142" | "demo-wo-0148";
  /** Open document only — no order list. */
  layout?: "split" | "open";
};

export function WorkOrderSurface({
  className,
  orderId = "demo-wo-0142",
  layout = "split",
}: WorkOrderSurfaceProps) {
  const order = landingDemoWorkOrders.find((o) => o.id === orderId) ?? primary;
  const list = [primary, secondary];
  const openOnly = layout === "open";

  return (
    <ProductWindow
      title="AutoCore · Заказ-наряд"
      className={cn("exp-surface", className)}
      contentClassName={cn(
        "grid gap-0 p-0!",
        openOnly ? "grid-cols-1" : "sm:grid-cols-[minmax(11rem,0.38fr)_1fr]",
      )}
    >
      {openOnly ? null : (
        <div className="border-b border-border/60 sm:border-r sm:border-b-0">
          <div className="border-b border-border/60 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            Наряды
          </div>
          <ul>
            {list.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "border-b border-border/40 px-3 py-2.5 text-xs",
                  item.id === order.id && "bg-primary/[0.05]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.number}</span>
                  <Badge variant="outline" className="font-normal">
                    {item.statusLabel}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{item.clientName}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{order.number}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {order.clientName} · {order.vehicleLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {order.statusLabel}
            </Badge>
            <p className="exp-mock-mono text-sm font-semibold">{formatKzt(order.grandTotal)} ₸</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">{order.comment}</p>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Работы</p>
          {order.laborLines.map((line) => (
            <div key={line.title} className="flex items-center justify-between gap-2 text-xs">
              <span>{line.title}</span>
              <span className="exp-mock-mono text-muted-foreground">
                {line.hours} ч · {formatKzt(line.unitPrice)}
              </span>
            </div>
          ))}
        </div>

        {order.partLines.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Со склада</p>
            {order.partLines.map((line) => (
              <div
                key={line.sku}
                className="flex items-center justify-between gap-2 rounded-md bg-primary/[0.04] px-2 py-1.5 text-xs"
              >
                <span>
                  <span className="exp-mock-mono text-muted-foreground">{line.sku}</span>
                  <span className="ml-2 font-medium">{line.name}</span>
                </span>
                <span className="exp-mock-mono">
                  ×{line.quantity} · {formatKzt(line.unitPrice)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </ProductWindow>
  );
}
