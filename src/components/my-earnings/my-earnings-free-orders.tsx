"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/mission-control/dashboard/dashboard-panel";
import { WorkOrder } from "@/domain/work-order";
import { userCopy } from "@/lib/user-copy";

type MyEarningsFreeOrdersProps = {
  orders: WorkOrder[];
};

export function MyEarningsFreeOrders({ orders }: MyEarningsFreeOrdersProps) {
  if (orders.length === 0) return null;

  return (
    <McPanel className="shadow-none dark:ring-0">
      <McPanelHeader
        title={userCopy.myEarnings.freeOrdersTitle}
        description={userCopy.myEarnings.freeOrdersDescription}
      />
      <McPanelBody className="gap-0 p-0">
        <ul>
          {orders.map((order) => (
            <li key={order.id} className="border-t first:border-t-0">
              <Link
                href={`/work-orders?order=${order.id}`}
                className="flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    №{order.number} · {order.vehicleLabel ?? order.clientName ?? "Наряд"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.licensePlate || "Без номера"}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t px-6 py-3">
          <Link href="/work-orders" className="text-xs font-medium text-primary hover:underline">
            {userCopy.myEarnings.freeOrdersCta} →
          </Link>
        </div>
      </McPanelBody>
    </McPanel>
  );
}
