"use client";

import { memo, useMemo } from "react";
import { ClipboardList } from "lucide-react";

import { McModuleHeader } from "@/components/mission-control/mc-module-header";
import { WorkOrder } from "@/domain/work-order";
import { userCopy } from "@/lib/user-copy";
import { buildWorkOrderDisplayIndex, formatWorkOrderLabel } from "@/lib/work-order/work-order-display";

type WorkOrdersModuleProps = {
  orders: WorkOrder[];
  isLoading: boolean;
};

export const WorkOrdersModule = memo(function WorkOrdersModule({
  orders,
  isLoading,
}: WorkOrdersModuleProps) {
  const copy = userCopy.missionControl.modules.workOrders;
  const open = orders.filter((order) => !["completed", "delivered", "cancelled"].includes(order.status));
  const displayIndex = useMemo(() => buildWorkOrderDisplayIndex(orders), [orders]);
  const waitingParts = orders.filter((order) => order.status === "waiting_parts").length;
  const description =
    waitingParts > 0
      ? `${copy.openCount(open.length)} · ${copy.waitingParts(waitingParts)}`
      : copy.openCount(open.length);

  return (
    <article className="mc-module-card">
      <McModuleHeader
        icon={ClipboardList}
        title={copy.title}
        description={description}
        href="/work-orders"
        accent="violet"
      />
      <div className="mc-module-body pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : open.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <div className="space-y-1.5">
            {open.slice(0, 4).map((order) => (
              <div key={order.id} className="mc-list-row py-2">
                <p className="line-clamp-1 text-sm font-medium">{formatWorkOrderLabel(order, displayIndex)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.clientName || copy.clientFallback} · {order.licensePlate || order.vin || order.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
});
