"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Banknote, Wallet } from "lucide-react";

import { FinancialOperation } from "@/domain/financial-operation";
import { PayrollTransaction } from "@/domain/payroll-transaction";
import { WorkOrder } from "@/domain/work-order";
import { CompanyEmployee } from "@/domain/rbac";
import { PayrollTable } from "@/components/accounting/payroll-table";
import { money } from "@/components/work-orders/work-order-utils";
import {
  operationCategoryLabel,
  operationTypeLabel,
} from "@/lib/accounting/labels";
import { cn } from "@/lib/utils";

type WorkOrderFinancePanelProps = {
  order: WorkOrder;
  operations: FinancialOperation[];
  payroll: PayrollTransaction[];
  employees: CompanyEmployee[];
};

export function WorkOrderFinancePanel({
  order,
  operations,
  payroll,
  employees,
}: WorkOrderFinancePanelProps) {
  const summary = useMemo(() => {
    const income = operations
      .filter((item) => item.type === "income" || item.type === "sale")
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = operations
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const payrollTotal = payroll.reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, payrollTotal, net: income - expense };
  }, [operations, payroll]);

  const isCompleted = ["completed", "delivered"].includes(order.status);

  return (
    <div className="space-y-4">
      {!isCompleted ? (
        <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Бухгалтерия и зарплаты появятся после завершения заказ-наряда (статус «Готов»).
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={Wallet}
          label="Доход"
          value={money(summary.income || order.pricing.grandTotal)}
          tone="positive"
        />
        <MetricCard
          icon={Banknote}
          label="Расходы"
          value={money(summary.expense)}
          tone="negative"
        />
        <MetricCard
          icon={Banknote}
          label="Зарплата механикам"
          value={money(summary.payrollTotal)}
          tone="neutral"
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Операции в бухгалтерии</h3>
          <Link
            href={`/accounting?tab=work_orders`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Открыть бухгалтерию
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
        {operations.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {isCompleted
              ? "Операции ещё обрабатываются сервером"
              : "Операции появятся после завершения заказа"}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {operations.map((operation) => (
              <li key={operation.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{operationCategoryLabel(operation.category)}</p>
                  <p className="text-xs text-muted-foreground">
                    {operationTypeLabel(operation.type)}
                    {operation.comment ? ` · ${operation.comment}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    operation.type === "expense" ? "text-red-600" : "text-emerald-700",
                  )}
                >
                  {operation.type === "expense" ? "−" : "+"}
                  {money(operation.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Начисления зарплаты</h3>
        <PayrollTable
          rows={payroll}
          employees={employees}
          workOrders={[order]}
          showWorkOrderLink={false}
        />
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-red-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}
