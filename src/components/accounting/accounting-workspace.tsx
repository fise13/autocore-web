"use client";

import { useCallback, useMemo, useState } from "react";
import { Cloud, Plus, Receipt } from "lucide-react";

import { calculateCashBalanceUseCase } from "@/application/use-cases/calculate-cash-balance";
import { createExpenseOperationUseCase } from "@/application/use-cases/create-expense-operation";
import { createIncomeOperationUseCase } from "@/application/use-cases/create-income-operation";
import { createRefundOperationUseCase } from "@/application/use-cases/create-refund-operation";
import { createSaleOperationUseCase } from "@/application/use-cases/create-sale-operation";
import { OverviewInsights } from "@/components/accounting/overview-insights";
import { OverviewCards } from "@/components/accounting/overview-cards";
import { NewOperationDialog } from "@/components/accounting/new-operation-dialog";
import { AdvancesOverview } from "@/components/accounting/advances-overview";
import { buildAccountingCategorySuggestions } from "@/components/accounting/accounting-category-suggestions";
import {
  advanceDirectionLabel,
  buildAdvanceSnapshot,
  filterAdvanceOperations,
  type AdvanceDirection,
} from "@/lib/accounting/advances";
import { OperationsTable } from "@/components/accounting/operations-table";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedTabsPanel } from "@/components/ui/animated-tabs-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateFinancialOperationInput, OperationType } from "@/domain/financial-operation";
import { useAccountingPreferences } from "@/hooks/use-accounting-preferences";
import { useDeepAction } from "@/hooks/use-deep-action";
import { userCopy } from "@/lib/user-copy";
import { useOperationsRealtime } from "@/hooks/use-operations-realtime";
import { can } from "@/lib/auth/permissions";
import { normalizeCompanyId } from "@/lib/company-id";
import { createFinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

const repository = createFinancialOperationRepository();

const TAB_ITEMS = [
  { value: "overview", label: "Обзор" },
  { value: "cashbox", label: "Касса" },
  { value: "expenses", label: "Расходы" },
  { value: "operations", label: "Операции" },
  { value: "advances", label: "Авансы" },
] as const;

export function AccountingWorkspace() {
  const { profile, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [tabEpoch, setTabEpoch] = useState(0);
  const [advanceDirection, setAdvanceDirection] = useState<AdvanceDirection>("all");
  const [operationDialogOpen, setOperationDialogOpen] = useState(false);
  const [operationDialogType, setOperationDialogType] = useState<OperationType>("expense");
  const companyId = normalizeCompanyId(profile?.companyId);
  const { preferences } = useAccountingPreferences(profile?.id ?? "");
  const categorySuggestions = useMemo(
    () => buildAccountingCategorySuggestions(preferences),
    [preferences],
  );

  const operationsQuery = useOperationsRealtime(repository, {
    companyId,
    type: "all",
    enabled: preferences.syncEnabled && !isLoading && can(profile, "accounting_view"),
  });

  const operations = useMemo(() => operationsQuery.data ?? [], [operationsQuery.data]);
  const balance = useMemo(() => calculateCashBalanceUseCase(operations), [operations]);

  const expenseRows = useMemo(() => operations.filter((item) => item.type === "expense"), [operations]);
  const cashboxRows = useMemo(() => operations.filter((item) => item.account === "cashbox"), [operations]);
  const advanceSnapshot = useMemo(() => buildAdvanceSnapshot(operations), [operations]);
  const advancesRows = useMemo(
    () => filterAdvanceOperations(operations, advanceDirection),
    [advanceDirection, operations],
  );
  const canEdit = can(profile, "accounting_edit");

  const openExpenseDialog = useCallback(() => {
    setOperationDialogType("expense");
    setOperationDialogOpen(true);
  }, []);

  useDeepAction({
    expectedAction: "expense",
    onAction: openExpenseDialog,
  });

  const showEmptyState =
    Boolean(companyId) &&
    !isLoading &&
    !operationsQuery.isError &&
    !operationsQuery.isLoading &&
    operations.length === 0;

  async function onCreateOperation(
    payload: Pick<
      CreateFinancialOperationInput,
      "type" | "amount" | "account" | "paymentMethod" | "category" | "comment"
    >,
  ) {
    if (!profile || !companyId) throw new Error("Компания не найдена");

    const basePayload: Omit<CreateFinancialOperationInput, "type"> = {
      companyId,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      account: payload.account,
      category: payload.category,
      comment: payload.comment,
      createdByUserId: profile.id,
    };

    switch (payload.type) {
      case "expense":
        await createExpenseOperationUseCase(repository, basePayload);
        break;
      case "income":
        await createIncomeOperationUseCase(repository, basePayload);
        break;
      case "sale":
        await createSaleOperationUseCase(repository, basePayload);
        break;
      case "refund":
        await createRefundOperationUseCase(repository, basePayload);
        break;
      default:
        await createIncomeOperationUseCase(repository, basePayload);
    }
  }

  async function onDelete(id: string) {
    if (!canEdit || !companyId || !profile?.id) return;
    await repository.remove(id, { companyId, actorUid: profile.id });
  }

  function onTabChange(value: string) {
    setActiveTab(value);
    setTabEpoch((current) => current + 1);
  }

  return (
    <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <header className="animate-autocore-fade-in-up flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Бухгалтерия</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="transition-colors">
            {operations.length} операций
          </Badge>
          <Badge
            variant={operationsQuery.isError ? "destructive" : "outline"}
            className="gap-1 transition-colors"
          >
            <Cloud className="size-3" />
            {operationsQuery.isError
              ? userCopy.sync.error
              : preferences.syncEnabled
                ? userCopy.sync.online
                : userCopy.sync.offline}
          </Badge>
          <NewOperationDialog
            disabled={!canEdit || !companyId}
            categorySuggestions={categorySuggestions}
            onCreate={onCreateOperation}
            open={operationDialogOpen}
            onOpenChange={setOperationDialogOpen}
            defaultType={operationDialogType}
          />
        </div>
      </header>

      {showEmptyState ? (
        <EmptyState
          icon={Receipt}
          title="Операций пока нет"
          description="Добавьте первую финансовую операцию — расход, приход или продажу."
          primaryAction={{
            label: "Добавить первую операцию",
            onClick: openExpenseDialog,
          }}
        />
      ) : null}

      {operationsQuery.isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">{userCopy.accounting.loadError}</CardTitle>
            <CardDescription>{operationsQuery.errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {userCopy.accounting.loadErrorHint}
          </CardContent>
        </Card>
      ) : null}

      {!companyId ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Компания не выбрана — операции недоступны.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={onTabChange} className="gap-4">
          <TabsList className="autocore-segmented-tabs h-9 w-full max-w-2xl justify-start gap-0.5 p-1 md:w-auto">
            {TAB_ITEMS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-7 flex-none px-3 transition-all duration-200 data-active:shadow-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "overview"} epoch={tabEpoch} className="space-y-4">
              <OverviewCards balance={balance} operations={operations} />
              <AdvancesOverview snapshot={advanceSnapshot} />
              {preferences.liveOverviewEnabled ? <OverviewInsights operations={operations} /> : null}
            </AnimatedTabsPanel>
          </TabsContent>

          <TabsContent value="cashbox" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "cashbox"} epoch={tabEpoch} className="space-y-4">
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-muted/20">
                  <CardTitle>Касса</CardTitle>
                  <CardDescription>Операции по счёту «Касса».</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <OperationsTable rows={cashboxRows} canEdit={canEdit} onDelete={onDelete} />
                </CardContent>
              </Card>
            </AnimatedTabsPanel>
          </TabsContent>

          <TabsContent value="expenses" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "expenses"} epoch={tabEpoch} className="space-y-4">
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-muted/20">
                  <CardTitle>Расходы</CardTitle>
                  <CardDescription>Все расходные операции компании.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <OperationsTable rows={expenseRows} canEdit={canEdit} onDelete={onDelete} />
                </CardContent>
              </Card>
            </AnimatedTabsPanel>
          </TabsContent>

          <TabsContent value="operations" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "operations"} epoch={tabEpoch} className="space-y-4">
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Все операции</CardTitle>
                      <CardDescription>Полный журнал финансовых записей.</CardDescription>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Plus className="size-3" />
                      {operations.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <OperationsTable rows={operations} canEdit={canEdit} onDelete={onDelete} />
                </CardContent>
              </Card>
            </AnimatedTabsPanel>
          </TabsContent>

          <TabsContent value="advances" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "advances"} epoch={tabEpoch} className="space-y-4">
              <AdvancesOverview snapshot={advanceSnapshot} />
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-muted/20">
                  <CardTitle>Журнал авансов</CardTitle>
                  <CardDescription>
                    Показываются операции, где в категории или комментарии есть признаки аванса.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {(["all", "received", "paid"] as const).map((direction) => (
                      <Button
                        key={direction}
                        size="sm"
                        variant={advanceDirection === direction ? "default" : "outline"}
                        onClick={() => setAdvanceDirection(direction)}
                      >
                        {advanceDirectionLabel(direction)}
                      </Button>
                    ))}
                  </div>
                  <OperationsTable rows={advancesRows} canEdit={canEdit} onDelete={onDelete} />
                </CardContent>
              </Card>
            </AnimatedTabsPanel>
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
