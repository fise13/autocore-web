"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/overview/dashboard/dashboard-panel";
import { STATUS_LABELS } from "@/components/work-orders/work-order-copy";
import { WorkOrder } from "@/domain/work-order";
import { userCopy } from "@/lib/user-copy";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type McMyOrdersPreviewProps = {
  orders: WorkOrder[];
  isLoading: boolean;
  className?: string;
};

export function McMyOrdersPreview({ orders, isLoading, className }: McMyOrdersPreviewProps) {
  if (isLoading) {
    return (
      <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
        <McPanelHeader title={userCopy.overview.employee.openOrdersTitle} />
        <McPanelBody className="gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-12 w-full" key={index} />
          ))}
        </McPanelBody>
      </McPanel>
    );
  }

  return (
    <McPanel className={cn("shadow-none md:col-span-2 dark:ring-0", className)}>
      <McPanelHeader
        title={userCopy.overview.employee.openOrdersTitle}
        action={
          <Link href="/work-orders" className="text-xs font-medium text-primary hover:underline">
            {userCopy.overview.employee.openOrdersViewAll}
          </Link>
        }
      />
      <McPanelBody className="gap-0 p-0">
        {orders.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">
            {userCopy.overview.employee.openOrdersEmpty}
          </p>
        ) : (
          <ul>
            {orders.map((order) => (
              <li key={order.id} className="border-t first:border-t-0">
                <Link
                  href={`/work-orders?order=${order.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      №{order.number} ·{" "}
                      {order.vehicleLabel ??
                        order.clientName ??
                        userCopy.overview.employee.orderFallback}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.licensePlate || userCopy.overview.employee.noPlate} ·{" "}
                      {STATUS_LABELS[order.status]}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </McPanelBody>
    </McPanel>
  );
}
