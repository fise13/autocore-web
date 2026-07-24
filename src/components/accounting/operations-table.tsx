"use client";

import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import Link from "next/link";
import { useMemo } from "react";
import { FileStack } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FinancialOperation } from "@/domain/financial-operation";
import { useAppDisplayCurrency } from "@/hooks/use-app-display-currency";
import {
  operationAccountLabel,
  operationCategoryLabel,
  operationTypeLabel,
} from "@/lib/accounting/labels";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";
import { isAdvanceOperation } from "@/lib/accounting/advances";
import { cn } from "@/lib/utils";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { motionStagger } from "@/lib/motion";
import { WorkOrder } from "@/domain/work-order";
import {
  buildWorkOrderDisplayIndex,
  workOrderDisplayNumber,
} from "@/lib/work-order/work-order-display";

export type OperationsTableLabels = {
  dateLocale: "en" | "ru";
  empty: string;
  colDate: string;
  colType: string;
  colAccount: string;
  colCategory: string;
  colAmount: string;
  colDetails: string;
  colWorkOrder: string;
  colActions: string;
  advance: string;
  incomeFlow: string;
  expenseFlow: string;
  delete: string;
  workOrderTitle: (number: number) => string;
  typeBadge?: Record<string, string>;
  accountLabels?: Record<string, string>;
  categoryLabels?: Record<string, string>;
};

function getDefaultOperationsTableLabels(): OperationsTableLabels {
  const t = userCopy.accounting.operationsTable;
  return {
    dateLocale: getActiveUserCopyLocale(),
    empty: t.empty,
    colDate: t.colDate,
    colType: t.colType,
    colAccount: t.colAccount,
    colCategory: t.colCategory,
    colAmount: t.colAmount,
    colDetails: t.colDetails,
    colWorkOrder: t.colWorkOrder,
    colActions: t.colActions,
    advance: t.advance,
    incomeFlow: t.incomeFlow,
    expenseFlow: t.expenseFlow,
    delete: t.delete,
    workOrderTitle: t.workOrderTitle,
  };
}

type OperationsTableProps = {
  rows: FinancialOperation[];
  canEdit: boolean;
  onDelete: (id: string) => Promise<void>;
  onMotorSaleSelect?: (operation: FinancialOperation) => void;
  showWorkOrderColumn?: boolean;
  workOrders?: WorkOrder[];
  /** Show Доход/Расход flow badges for WO-linked categories. */
  emphasizeWorkOrderFlow?: boolean;
  labels?: OperationsTableLabels;
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

function workOrderFlowBadge(
  operation: FinancialOperation,
  labels: OperationsTableLabels,
): { label: string; className: string } | null {
  const category = operation.category ?? "";
  if (
    category === "work_order_income" ||
    category === "work_order" ||
    (Boolean(operation.relatedWorkOrderId) && (operation.type === "sale" || operation.type === "income"))
  ) {
    return {
      label: labels.incomeFlow,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (
    category === "work_order_parts_cost" ||
    category === "payroll" ||
    (Boolean(operation.relatedWorkOrderId) && operation.type === "expense")
  ) {
    return {
      label: labels.expenseFlow,
      className: "bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }
  return null;
}

function resolveTypeLabel(type: string, labels: OperationsTableLabels): string {
  return labels.typeBadge?.[type] ?? operationTypeLabel(type);
}

function resolveAccountLabel(account: string, labels: OperationsTableLabels): string {
  return labels.accountLabels?.[account] ?? operationAccountLabel(account);
}

function resolveCategoryLabel(category: string | null | undefined, labels: OperationsTableLabels): string {
  if (!category) return "—";
  const trimmed = category.trim();
  if (!trimmed) return "—";
  return labels.categoryLabels?.[trimmed] ?? operationCategoryLabel(trimmed);
}

export function OperationsTable({
  rows,
  canEdit,
  onDelete,
  onMotorSaleSelect,
  showWorkOrderColumn = false,
  workOrders = [],
  emphasizeWorkOrderFlow = false,
  labels: labelsProp,
}: OperationsTableProps) {
  const labels = labelsProp ?? getDefaultOperationsTableLabels();

  const { formatMoney } = useAppDisplayCurrency();
  const workOrderIndex = useMemo(() => buildWorkOrderDisplayIndex(workOrders), [workOrders]);
  const workOrderById = useMemo(
    () => new Map(workOrders.map((order) => [order.id, order])),
    [workOrders],
  );
  const dateFnsLocale = labels.dateLocale === "en" ? enUS : ru;

  if (rows.length === 0) {
    return (
      <div className="animate-autocore-fade-in-up rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {labels.empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card/80">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>{labels.colDate}</TableHead>
            <TableHead>{labels.colType}</TableHead>
            <TableHead>{labels.colAccount}</TableHead>
            <TableHead>{labels.colCategory}</TableHead>
            <TableHead className="text-right">{labels.colAmount}</TableHead>
            <TableHead>{labels.colDetails}</TableHead>
            {showWorkOrderColumn ? <TableHead>{labels.colWorkOrder}</TableHead> : null}
            <TableHead className="text-right">{labels.colActions}</TableHead>
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
                    locale: dateFnsLocale,
                  })}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      TYPE_BADGE[operation.type] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {resolveTypeLabel(operation.type, labels)}
                  </span>
                  {isAdvanceOperation(operation) ? (
                    <span className="ml-1.5 inline-flex rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                      {labels.advance}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{resolveAccountLabel(operation.account, labels)}</TableCell>
                <TableCell>
                  <span className={cn(motorSale && "font-medium text-primary")}>
                    {resolveCategoryLabel(operation.category, labels)}
                  </span>
                  {emphasizeWorkOrderFlow
                    ? (() => {
                        const flow = workOrderFlowBadge(operation, labels);
                        if (!flow) return null;
                        return (
                          <span
                            className={cn(
                              "ml-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                              flow.className,
                            )}
                          >
                            {flow.label}
                          </span>
                        );
                      })()
                    : null}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(operation.amount)}
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
                        {(() => {
                          const related =
                            workOrderById.get(operation.relatedWorkOrderId) ?? {
                              id: operation.relatedWorkOrderId,
                              number: "",
                            };
                          const n = workOrderDisplayNumber(related, workOrderIndex);
                          if (n > 0) return labels.workOrderTitle(n);
                          const trimmed = related.number.trim();
                          if (trimmed) return trimmed;
                          return labels.colWorkOrder;
                        })()}
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
                      {labels.delete}
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
