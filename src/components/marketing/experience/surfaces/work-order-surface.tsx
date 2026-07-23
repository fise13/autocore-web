"use client";

import { useDemoChrome } from "@/components/marketing/modals/use-demo-chrome";
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
  const chrome = useDemoChrome();
  const demo = chrome.workOrderUi.demo;
  const snap = chrome.motorsSnapshot;
  const statusLabels = chrome.statusLabels;
  const order = landingDemoWorkOrders.find((o) => o.id === orderId) ?? primary;
  const list = [primary, secondary];
  const openOnly = layout === "open";

  const localizeOrderNumber = (number: string) => {
    if (number.startsWith(snap.orderPrefixRu)) {
      return `${snap.orderPrefixEn}${number.slice(snap.orderPrefixRu.length)}`;
    }
    return number;
  };

  const localizeOrder = (item: (typeof landingDemoWorkOrders)[number]) => {
    const isPrimary = item.id === primary.id;
    return {
      number: isPrimary ? demo.orderNumber : localizeOrderNumber(item.number),
      clientName: isPrimary ? demo.clientName : item.clientName,
      comment: isPrimary ? demo.comment : item.comment,
      statusLabel: statusLabels[item.status] ?? item.statusLabel,
      laborLines: isPrimary
        ? [
            { ...item.laborLines[0], title: demo.labor1 },
            ...(item.laborLines[1] ? [{ ...item.laborLines[1], title: demo.labor2 }] : []),
          ]
        : item.laborLines,
      partLines: isPrimary
        ? item.partLines.map((line, index) => ({
            ...line,
            name: index === 0 ? demo.part1 : index === 1 ? demo.part2 : line.name,
          }))
        : item.partLines,
    };
  };

  const localized = localizeOrder(order);
  const localizedList = list.map((item) => ({ item, ...localizeOrder(item) }));

  return (
    <ProductWindow
      title={chrome.workOrder.windowTitle}
      className={cn("exp-surface", className)}
      contentClassName={cn(
        "grid gap-0 p-0!",
        openOnly ? "grid-cols-1" : "sm:grid-cols-[minmax(11rem,0.38fr)_1fr]",
      )}
    >
      {openOnly ? null : (
        <div className="border-b border-border/60 sm:border-r sm:border-b-0">
          <div className="border-b border-border/60 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            {chrome.workOrder.listTitle}
          </div>
          <ul>
            {localizedList.map(({ item, number, statusLabel, clientName }) => (
              <li
                key={item.id}
                className={cn(
                  "border-b border-border/40 px-3 py-2.5 text-xs",
                  item.id === order.id && "bg-primary/[0.05]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{number}</span>
                  <Badge variant="outline" className="font-normal">
                    {statusLabel}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{clientName}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{localized.number}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {localized.clientName} · {order.vehicleLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {localized.statusLabel}
            </Badge>
            <p className="exp-mock-mono text-sm font-semibold">{formatKzt(order.grandTotal)} ₸</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">{localized.comment}</p>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {chrome.common.works}
          </p>
          {localized.laborLines.map((line) => (
            <div key={line.title} className="flex items-center justify-between gap-2 text-xs">
              <span>{line.title}</span>
              <span className="exp-mock-mono text-muted-foreground">
                {chrome.workOrder.hoursAt(line.hours, formatKzt(line.unitPrice))}
              </span>
            </div>
          ))}
        </div>

        {localized.partLines.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {chrome.common.fromWarehouse}
            </p>
            {localized.partLines.map((line) => (
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
