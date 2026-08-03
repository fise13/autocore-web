"use client";

import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import Link from "next/link";

import { PayrollTransaction } from "@/domain/payroll-transaction";
import { WorkOrder } from "@/domain/work-order";
import { PayrollTable } from "@/components/accounting/payroll-table";
import {
  McPanel,
  McPanelBody,
  McPanelHeader,
} from "@/components/overview/dashboard/dashboard-panel";
import { money } from "@/components/work-orders/work-order-utils";
import { ROLE_LABELS } from "@/components/work-orders/work-order-copy";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  pending: userCopy.myEarnings.filters.pending,
  paid: userCopy.myEarnings.filters.paid,
  cancelled: userCopy.myEarnings.filters.cancelled,
} as const;

type MyEarningsTableSectionProps = {
  rows: PayrollTransaction[];
  workOrders: WorkOrder[];
  isLoading: boolean;
};

function rateLabel(row: PayrollTransaction): string {
  if (row.rateType === "percent") return `${row.rate}%`;
  if (row.rateType === "hourly") return userCopy.myEarnings.hourlyRate(row.rate);
  return `$${row.rate}`;
}

export function MyEarningsTableSection({ rows, workOrders, isLoading }: MyEarningsTableSectionProps) {
  const workOrderById = new Map(workOrders.map((order) => [order.id, order]));

  return (
    <McPanel className="shadow-none dark:ring-0">
      <McPanelHeader title={userCopy.myEarnings.tableTitle} />
      <McPanelBody className="gap-4 p-0 sm:p-0">
        <div className="hidden md:block">
          {rows.length === 0 && !isLoading ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {userCopy.myEarnings.emptyStates.noFiltered}
            </p>
          ) : (
            <PayrollTable rows={rows} employees={[]} workOrders={workOrders} showWorkOrderLink canEdit={false} />
          )}
        </div>

        <div className="flex flex-col gap-3 p-4 md:hidden">
          {rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {userCopy.myEarnings.emptyStates.noFiltered}
            </p>
          ) : (
            rows.map((row) => {
              const order = workOrderById.get(row.workOrderId);
              return (
                <div key={row.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold tabular-nums">{money(row.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(row.paidAt ?? row.createdAt, "d MMM yyyy", { locale: enUS })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        row.status === "paid" && "bg-emerald-500/10 text-emerald-700",
                        row.status === "pending" && "bg-amber-500/10 text-amber-700",
                        row.status === "cancelled" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {STATUS_LABELS[row.status]}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {order ? (
                      <Link href={`/work-orders?order=${order.id}`} className="font-medium text-primary hover:underline">
                        {userCopy.myEarnings.orderNumber(order.number)}
                      </Link>
                    ) : (
                      <p className="text-muted-foreground">{row.workOrderId}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[row.role]}{userCopy.myEarnings.rateSuffix(rateLabel(row))}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </McPanelBody>
    </McPanel>
  );
}
