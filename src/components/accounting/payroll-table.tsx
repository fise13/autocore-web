"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";

import { PayrollTransaction, PayrollTransactionStatus } from "@/domain/payroll-transaction";
import { CompanyEmployee } from "@/domain/rbac";
import { WorkOrder } from "@/domain/work-order";
import { ROLE_LABELS } from "@/components/work-orders/work-order-copy";
import { money } from "@/components/work-orders/work-order-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildWorkOrderDisplayIndex,
  employeeRoleLabel,
  formatWorkOrderLabel,
  resolveEmployeeName,
} from "@/lib/work-order/work-order-display";
import { cn } from "@/lib/utils";

type PayrollTableProps = {
  rows: PayrollTransaction[];
  employees: CompanyEmployee[];
  workOrders?: WorkOrder[];
  showWorkOrderLink?: boolean;
  canEdit?: boolean;
  onStatusChange?: (id: string, status: PayrollTransactionStatus) => void;
  updatingId?: string | null;
};

const STATUS_LABELS = {
  pending: "К выплате",
  paid: "Выплачено",
  cancelled: "Не выплачивать",
} as const;

function nextPayrollStatus(current: PayrollTransactionStatus): PayrollTransactionStatus {
  if (current === "pending") return "paid";
  if (current === "paid") return "cancelled";
  return "pending";
}

export function PayrollTable({
  rows,
  employees,
  workOrders = [],
  showWorkOrderLink = true,
  canEdit = false,
  onStatusChange,
  updatingId = null,
}: PayrollTableProps) {
  const workOrderById = useMemo(
    () => new Map(workOrders.map((order) => [order.id, order])),
    [workOrders],
  );
  const displayIndex = useMemo(() => buildWorkOrderDisplayIndex(workOrders), [workOrders]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Начислений зарплаты пока нет. Они появятся после завершения заказ-наряда с работами и исполнителями.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card/80">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>Дата</TableHead>
            <TableHead>Сотрудник</TableHead>
            <TableHead>Роль</TableHead>
            {showWorkOrderLink ? <TableHead>Заказ-наряд</TableHead> : null}
            <TableHead className="text-right">Ставка</TableHead>
            <TableHead className="text-right">Сумма</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isUpdating = updatingId === row.id;
            const workOrder = workOrderById.get(row.workOrderId);
            const roleLabel =
              employeeRoleLabel(row.employeeId, employees) ?? ROLE_LABELS[row.role] ?? row.role;
            const statusControl = (
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-medium transition-all duration-200",
                  row.status === "paid" && "bg-emerald-500/10 text-emerald-700",
                  row.status === "pending" && "bg-amber-500/10 text-amber-700",
                  row.status === "cancelled" && "bg-muted text-muted-foreground",
                  canEdit && onStatusChange && "cursor-pointer hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]",
                  isUpdating && "opacity-60",
                )}
              >
                {isUpdating ? "…" : STATUS_LABELS[row.status]}
              </span>
            );

            return (
              <TableRow key={row.id} className="animate-autocore-fade-in-up motion-reduce:animate-none">
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {format(row.createdAt, "dd.MM.yyyy", { locale: ru })}
                </TableCell>
                <TableCell className="font-medium">
                  {resolveEmployeeName(row.employeeId, employees) ?? "Сотрудник"}
                </TableCell>
                <TableCell>{roleLabel}</TableCell>
                {showWorkOrderLink ? (
                  <TableCell>
                    <Link href={`/work-orders?order=${row.workOrderId}`} className="text-primary hover:underline">
                      {workOrder
                        ? formatWorkOrderLabel(workOrder, displayIndex)
                        : `Заказ-наряд №${row.workOrderId.slice(0, 6)}`}
                    </Link>
                  </TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums">
                  {row.rateType === "percent"
                    ? `${row.rate}%`
                    : row.rateType === "hourly"
                      ? `${money(row.rate)}/ч`
                      : money(row.rate)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{money(row.amount)}</TableCell>
                <TableCell>
                  {canEdit && onStatusChange ? (
                    <button
                      type="button"
                      title="Нажмите, чтобы сменить статус: К выплате → Выплачено → Не выплачивать"
                      disabled={isUpdating}
                      onClick={() => onStatusChange(row.id, nextPayrollStatus(row.status))}
                      className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {statusControl}
                    </button>
                  ) : (
                    statusControl
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
