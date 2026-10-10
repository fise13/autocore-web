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
import { userCopy } from "@/lib/user-copy";

export type WorkOrderFinancePanelLabels = {
  notReady: string;
  income: string;
  expenses: string;
  payroll: string;
  operationsTitle: string;
  openAccounting: string;
  opsProcessing: string;
  opsAfterComplete: string;
  payrollTitle: string;
  payrollEmpty?: string;
  categoryLabels?: Record<string, string>;
  typeBadge?: Record<string, string>;
};

function getDefaultLabels(): WorkOrderFinancePanelLabels {
  const f = userCopy.workOrders.detail.finance;
  return {
    notReady: f.notReady,
    income: f.income,
    expenses: f.expenses,
    payroll: f.payroll,
    operationsTitle: f.operationsTitle,
    openAccounting: f.openAccounting,
    opsProcessing: f.opsProcessing,
    opsAfterComplete: f.opsAfterComplete,
    payrollTitle: f.payrollTitle,
    payrollEmpty: f.payrollEmpty,
  };
}

type WorkOrderFinancePanelProps = {
  order: WorkOrder;
  operations: FinancialOperation[];
  payroll: PayrollTransaction[];
  employees: CompanyEmployee[];
  labels?: WorkOrderFinancePanelLabels;
};

export function WorkOrderFinancePanel({
  order,
  operations,
  payroll,
  employees,
  labels = getDefaultLabels(),
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
          {labels.notReady}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={Wallet}
          label={labels.income}
          value={money(summary.income || order.pricing.grandTotal)}
          tone="positive"
        />
        <MetricCard
          icon={Banknote}
          label={labels.expenses}
          value={money(summary.expense)}
          tone="negative"
        />
        <MetricCard
          icon={Banknote}
          label={labels.payroll}
          value={money(summary.payrollTotal)}
          tone="neutral"
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{labels.operationsTitle}</h3>
          <Link
            href={`/accounting?tab=work_orders`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {labels.openAccounting}
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
        {operations.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {isCompleted ? labels.opsProcessing : labels.opsAfterComplete}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {operations.map((operation) => {
              const category =
                (operation.category && labels.categoryLabels?.[operation.category]) ||
                operationCategoryLabel(operation.category);
              const type =
                labels.typeBadge?.[operation.type] ?? operationTypeLabel(operation.type);
              return (
                <li key={operation.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{category}</p>
                    <p className="text-xs text-muted-foreground">
                      {type}
                      {operation.comment ? ` · ${operation.comment}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      operation.type === "expense" ? "text-danger-on-subtle" : "text-success-on-subtle",
                    )}
                  >
                    {operation.type === "expense" ? "−" : "+"}
                    {money(operation.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">{labels.payrollTitle}</h3>
        <PayrollTable
          rows={payroll}
          employees={employees}
          workOrders={[order]}
          showWorkOrderLink={false}
          emptyLabel={labels.payrollEmpty}
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
          tone === "positive" && "text-success-on-subtle",
          tone === "negative" && "text-danger-on-subtle",
        )}
      >
        {value}
      </p>
    </div>
  );
}
