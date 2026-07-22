"use client";

import { useMemo, useState } from "react";

import { calculateCashBalanceUseCase } from "@/application/use-cases/calculate-cash-balance";
import { OperationsTable } from "@/components/accounting/operations-table";
import { OverviewCards } from "@/components/accounting/overview-cards";
import { OverviewInsights } from "@/components/accounting/overview-insights";
import { AnimatedTabsPanel } from "@/components/ui/animated-tabs-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialOperation } from "@/domain/financial-operation";
import { demoDocumentContext } from "@/lib/marketing/demo-document-context";
import { formatKzt } from "@/lib/marketing/landing-demo-snapshot";
import { cn } from "@/lib/utils";

const order = demoDocumentContext.order;
const deliveredAt = order.deliveredAt ?? order.updatedAt;
const completedAt = order.completedAt ?? order.updatedAt;

/** Demo ledger — same operations language as AccountingWorkspace. */
const DEMO_OPERATIONS: FinancialOperation[] = [
  {
    id: "fin-wo-income",
    companyId: order.companyId,
    type: "sale",
    amount: order.pricing.grandTotal,
    paymentMethod: "cash",
    account: "cashbox",
    relatedWorkOrderId: order.id,
    relatedClientId: order.clientId,
    category: "work_order_income",
    createdAt: deliveredAt,
    createdByUserId: order.createdByUserId,
    comment: `Оплата · ${order.number}`,
    description: "Выручка по заказ-наряду",
  },
  {
    id: "fin-motor-sale",
    companyId: order.companyId,
    type: "sale",
    amount: order.pricing.motorsTotal,
    paymentMethod: "transfer",
    account: "kaspi",
    relatedWorkOrderId: order.id,
    relatedMotorId: order.motorLines[0]?.motorId ?? "motor-001",
    category: "motor_sale",
    createdAt: new Date(deliveredAt.getTime() - 3_600_000),
    createdByUserId: order.createdByUserId,
    comment: "Продажа двигателя G4KC",
    description: "Продажа мотора со склада",
  },
  {
    id: "fin-parts-cost",
    companyId: order.companyId,
    type: "expense",
    amount: order.pricing.partsTotal || 14_000,
    paymentMethod: "cash",
    account: "cashbox",
    relatedWorkOrderId: order.id,
    category: "work_order_parts_cost",
    createdAt: completedAt,
    createdByUserId: order.createdByUserId,
    comment: "Себестоимость запчастей",
  },
  {
    id: "fin-payroll",
    companyId: order.companyId,
    type: "expense",
    amount: 48_000,
    paymentMethod: "transfer",
    account: "kaspi",
    relatedWorkOrderId: order.id,
    category: "payroll",
    createdAt: completedAt,
    createdByUserId: order.createdByUserId,
    comment: "Начисление механикам",
  },
  {
    id: "fin-income-cash",
    companyId: order.companyId,
    type: "income",
    amount: 85_000,
    paymentMethod: "cash",
    account: "cashbox",
    createdAt: new Date(deliveredAt.getTime() - 86_400_000),
    createdByUserId: order.createdByUserId,
    comment: "Прочая выручка смены",
    category: "other_income",
  },
];

const workOrders = [order];

/**
 * Real accounting UI (OverviewCards + OperationsTable) — not Mission Control.
 */
export function ProductFinanceSurface({ className }: { className?: string }) {
  const [tab, setTab] = useState("overview");
  const [epoch, setEpoch] = useState(0);
  const operations = DEMO_OPERATIONS;
  const balance = useMemo(() => calculateCashBalanceUseCase(operations), [operations]);

  const workOrderRows = useMemo(
    () => operations.filter((item) => Boolean(item.relatedWorkOrderId)),
    [operations],
  );

  return (
    <div className={cn("product-finance-real", className)}>
      <div className="product-finance-real-bar">
        <div>
          <p className="product-finance-real-kicker">Финансы · демо-компания</p>
          <p className="product-finance-real-title">Операции уже в кассе</p>
        </div>
        <p className="product-finance-real-balance">
          Баланс {formatKzt(balance.total)} ₸
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(next) => {
          setTab(next);
          setEpoch((value) => value + 1);
        }}
        className="product-finance-real-tabs"
      >
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="operations">Операции</TabsTrigger>
          <TabsTrigger value="work_orders">Заказ-наряды</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-4">
          <AnimatedTabsPanel active={tab === "overview"} epoch={epoch}>
            <OverviewCards balance={balance} operations={operations} />
            <div className="mt-4">
              <OverviewInsights operations={operations} />
            </div>
          </AnimatedTabsPanel>
        </TabsContent>

        <TabsContent value="operations" className="mt-0">
          <AnimatedTabsPanel active={tab === "operations"} epoch={epoch}>
            <OperationsTable
              rows={operations}
              canEdit={false}
              onDelete={async () => undefined}
              showWorkOrderColumn
              workOrders={workOrders}
              emphasizeWorkOrderFlow
            />
          </AnimatedTabsPanel>
        </TabsContent>

        <TabsContent value="work_orders" className="mt-0">
          <AnimatedTabsPanel active={tab === "work_orders"} epoch={epoch}>
            <OperationsTable
              rows={workOrderRows}
              canEdit={false}
              onDelete={async () => undefined}
              showWorkOrderColumn
              workOrders={workOrders}
              emphasizeWorkOrderFlow
            />
          </AnimatedTabsPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
