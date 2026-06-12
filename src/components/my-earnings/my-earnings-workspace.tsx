"use client";

import { useMemo } from "react";

import { PayrollTable } from "@/components/accounting/payroll-table";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { useMyPayrollTransactions } from "@/hooks/use-my-payroll-transactions";
import { useWorkOrdersRealtime } from "@/hooks/use-work-orders-realtime";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { createPayrollTransactionRepository } from "@/infrastructure/firestore/payroll-transaction-repository";
import { createWorkOrderRepository } from "@/infrastructure/firestore/work-order-repository";
import { Wallet } from "lucide-react";

const payrollRepository = createPayrollTransactionRepository();
const workOrderRepository = createWorkOrderRepository();

export function MyEarningsWorkspace() {
  const { profile, isLoading } = useAuth();
  const companyId = normalizeCompanyId(profile?.companyId);
  const employeeId = profile?.id ?? "";
  const allowed = can(profile, "payroll_view_own");

  const { transactions, isLoading: payrollLoading } = useMyPayrollTransactions(
    payrollRepository,
    companyId,
    employeeId,
    !isLoading && allowed,
  );
  const { orders } = useWorkOrdersRealtime(workOrderRepository, companyId, !isLoading && allowed);

  const summary = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let cancelled = 0;
    for (const row of transactions) {
      if (row.status === "paid") paid += row.amount;
      else if (row.status === "pending") pending += row.amount;
      else cancelled += row.amount;
    }
    return { pending, paid, cancelled };
  }, [transactions]);

  if (isLoading) return null;

  if (!allowed) {
    return (
      <EmptyState
        icon={Wallet}
        title="Нет доступа"
        description="Раздел «Мои начисления» доступен механикам и диагностам с правом просмотра своих выплат."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Мои начисления</h1>
        <p className="text-sm text-muted-foreground">
          Начисления по закрытым заказ-нарядам, где вы указаны исполнителем.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="К выплате" value={summary.pending} suffix=" ₸" tone="warning" icon={Wallet} />
        <KpiCard label="Выплачено" value={summary.paid} suffix=" ₸" tone="primary" icon={Wallet} />
        <KpiCard label="Не выплачивать" value={summary.cancelled} suffix=" ₸" icon={Wallet} />
      </div>

      <PayrollTable
        rows={transactions}
        employees={[]}
        workOrders={orders}
        showWorkOrderLink
        canEdit={false}
      />

      {payrollLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : null}
    </div>
  );
}
