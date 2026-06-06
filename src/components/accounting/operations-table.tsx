"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { useMemo } from "react";
import { FileStack } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FinancialOperation } from "@/domain/financial-operation";
import {
  operationAccountLabel,
  operationCategoryLabel,
  operationTypeLabel,
} from "@/lib/accounting/labels";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import { isAdvanceOperation } from "@/lib/accounting/advances";
import { cn } from "@/lib/utils";
import { motionStagger } from "@/lib/motion";
import { WorkOrder } from "@/domain/work-order";
import {
  buildWorkOrderDisplayIndex,
  formatWorkOrderLabel,
} from "@/lib/work-order/work-order-display";

type OperationsTableProps = {
  rows: FinancialOperation[];
  canEdit: boolean;
  onDelete: (id: string) => Promise<void>;
  onMotorSaleSelect?: (operation: FinancialOperation) => void;
  showWorkOrderColumn?: boolean;
  workOrders?: WorkOrder[];
};

const TYPE_BADGE: Record<string, string> = {
  sale: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  income: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  expense: "bg-red-500/10 text-red-700 dark:text-red-300",
  refund: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

function isMotorSaleOperation(operation: FinancialOperation): boolean {
  return (
    operation.category === MOTOR_SALE_CATEGORY ||
    (operation.type === "sale" && (operation.relatedMotorId != null || operation.relatedMotorID != null))
  );
}

export function OperationsTable({
  rows,
  canEdit,
  onDelete,
  onMotorSaleSelect,
  showWorkOrderColumn = false,
  workOrders = [],
}: OperationsTableProps) {
  const workOrderIndex = useMemo(() => buildWorkOrderDisplayIndex(workOrders), [workOrders]);
  const workOrderById = useMemo(
    () => new Map(workOrders.map((order) => [order.id, order])),
    [workOrders],
  );

  if (rows.length === 0) {
    return (
      <div className="animate-autocore-fade-in-up rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Пока нет операций в выбранном фильтре.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card/80">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>Дата</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Счёт</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead className="text-right">Сумма</TableHead>
            <TableHead>Детали</TableHead>
            {showWorkOrderColumn ? <TableHead>Заказ-наряд</TableHead> : null}
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((operation, index) => {
            const motorSale = isMotorSaleOperation(operation);
            const detail = operation.description || operation.comment || "—";

            return (
              <TableRow
                key={operation.id}
                className={cn(
                  "animate-autocore-fade-in-up transition-colors hover:bg-muted/35",
                  motorSale && onMotorSaleSelect && "cursor-pointer",
                )}
                style={{ animationDelay: motionStagger(Math.min(index, 12), 35) }}
                onClick={() => {
                  if (motorSale && onMotorSaleSelect) onMotorSaleSelect(operation);
                }}
              >
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {format(operation.createdAt, "dd.MM.yyyy HH:mm", {
                    locale: ru,
                  })}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      TYPE_BADGE[operation.type] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {operationTypeLabel(operation.type)}
                  </span>
                  {isAdvanceOperation(operation) ? (
                    <span className="ml-1.5 inline-flex rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                      аванс
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{operationAccountLabel(operation.account)}</TableCell>
                <TableCell>
                  <span className={cn(motorSale && "font-medium text-primary")}>
                    {operationCategoryLabel(operation.category)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {operation.amount.toLocaleString("ru-RU")} ₸
                </TableCell>
                <TableCell className="max-w-[260px] truncate">{detail}</TableCell>
                {showWorkOrderColumn ? (
                  <TableCell>
                    {operation.relatedWorkOrderId ? (
                      <Link
                        href={`/work-orders?order=${operation.relatedWorkOrderId}`}
                        className="text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {formatWorkOrderLabel(
                          workOrderById.get(operation.relatedWorkOrderId) ?? {
                            id: operation.relatedWorkOrderId,
                            number: "",
                          },
                          workOrderIndex,
                        )}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                ) : null}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {motorSale && onMotorSaleSelect ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMotorSaleSelect(operation);
                        }}
                      >
                        <FileStack className="size-3.5" />
                        PDF
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canEdit}
                      className="transition-all hover:border-destructive/40 hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onDelete(operation.id);
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
